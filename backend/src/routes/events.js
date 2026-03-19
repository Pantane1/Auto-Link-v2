import { Router } from "express";
import { db, admin } from "../lib/firebase.js";
import { authenticate, requireVerified } from "../middleware/auth.js";
import { sendEventInviteEmail } from "../services/email.js";
import { sendBulkSMS } from "../services/sms.js";
import { generateSMSWithAI } from "../services/ai.js";
import { v4 as uuidv4 } from "uuid";

const router = Router();

router.post("/", authenticate, requireVerified, async (req, res) => {
  try {
    const { groupId, title, meetingHcode, meetingDateTime, amountPerMember, invitedUserIds } = req.body;

    const memberSnap = await db.collection("groupMembers")
      .where("groupId", "==", groupId)
      .where("userId", "==", req.user.id).get();

    if (memberSnap.empty || memberSnap.docs[0].data().role !== "ADMIN") {
      return res.status(403).json({ success: false, message: "Only group admins can initiate events." });
    }

    const eventId = uuidv4();
    await db.collection("events").doc(eventId).set({
      groupId, title, meetingHcode,
      meetingDateTime: admin.firestore.Timestamp.fromDate(new Date(meetingDateTime)),
      amountPerMember: parseFloat(amountPerMember),
      createdBy: req.user.id,
      status: "ACTIVE",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    if (invitedUserIds?.length) {
      const batch = db.batch();
      for (const userId of invitedUserIds) {
        const inviteRef = db.collection("eventInvites").doc(uuidv4());
        batch.set(inviteRef, {
          eventId, invitedUserId: userId,
          paymentStatus: "PENDING",
          eventStatus: "ACTIVE",
          paidAmount: 0,
          emailSent: false, smsSent: false,
          wasAbsent: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
      await batch.commit();

      const usersSnap = await db.collection("users")
        .where(admin.firestore.FieldPath.documentId(), "in", invitedUserIds).get();

      for (const doc of usersSnap.docs) {
        const u = doc.data();
        sendEventInviteEmail(u.email, u.fullName, {
          title, meetingHcode, meetingDateTime, amountPerMember,
        }).catch(console.error);
      }
    }

    res.status(201).json({ success: true, data: { id: eventId } });
  } catch (err) {
    console.error("Create event error:", err);
    res.status(500).json({ success: false, message: "Failed to create event." });
  }
});

router.get("/group/:groupId", authenticate, async (req, res) => {
  try {
    const snap = await db.collection("events")
      .where("groupId", "==", req.params.groupId)
      .orderBy("createdAt", "desc").get();
    const events = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ success: true, data: events });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to load events." });
  }
});

router.get("/:id", authenticate, async (req, res) => {
  try {
    const eventSnap = await db.collection("events").doc(req.params.id).get();
    if (!eventSnap.exists) return res.status(404).json({ success: false, message: "Event not found." });

    const invitesSnap = await db.collection("eventInvites")
      .where("eventId", "==", req.params.id).get();

    const invites = await Promise.all(
      invitesSnap.docs.map(async (d) => {
        const data = d.data();
        const userSnap = await db.collection("users").doc(data.invitedUserId).get();
        return {
          id: d.id, ...data,
          user: userSnap.exists ? {
            id: userSnap.id,
            fullName: userSnap.data().fullName,
            hcode: userSnap.data().hcode,
            phone: userSnap.data().phone,
            profilePicUrl: userSnap.data().profilePicUrl,
          } : null,
        };
      })
    );

    const reportSnap = await db.collection("eventReports")
      .where("eventId", "==", req.params.id).get();
    const report = reportSnap.empty ? null : { id: reportSnap.docs[0].id, ...reportSnap.docs[0].data() };

    res.json({
      success: true,
      data: { id: eventSnap.id, ...eventSnap.data(), invites, report },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to load event." });
  }
});

router.post("/:id/sms", authenticate, requireVerified, async (req, res) => {
  try {
    const { message, useAI } = req.body;
    const eventSnap = await db.collection("events").doc(req.params.id).get();
    if (!eventSnap.exists || eventSnap.data().createdBy !== req.user.id) {
      return res.status(403).json({ success: false, message: "Not authorized." });
    }

    const event = { id: eventSnap.id, ...eventSnap.data() };
    const finalMessage = useAI ? await generateSMSWithAI(event) : message;

    const paidSnap = await db.collection("eventInvites")
      .where("eventId", "==", req.params.id)
      .where("paymentStatus", "==", "PAID").get();

    if (paidSnap.empty) {
      return res.status(400).json({ success: false, message: "No paid members to send SMS to." });
    }

    const phones = await Promise.all(
      paidSnap.docs.map(async (d) => {
        const userSnap = await db.collection("users").doc(d.data().invitedUserId).get();
        return userSnap.exists ? userSnap.data().phone : null;
      })
    );
    const validPhones = phones.filter(Boolean);

    await sendBulkSMS(validPhones, finalMessage);

    await db.collection("smsLogs").doc(uuidv4()).set({
      eventId: req.params.id,
      sentBy: req.user.id,
      message: finalMessage,
      totalSent: validPhones.length,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({ success: true, message: `SMS sent to ${validPhones.length} members.` });
  } catch (err) {
    console.error("SMS error:", err);
    res.status(500).json({ success: false, message: "Failed to send SMS." });
  }
});

router.post("/:id/close", authenticate, requireVerified, async (req, res) => {
  try {
    const { absenteeIds, goodsCounts, aops } = req.body;
    const eventSnap = await db.collection("events").doc(req.params.id).get();

    if (!eventSnap.exists || eventSnap.data().createdBy !== req.user.id) {
      return res.status(403).json({ success: false, message: "Not authorized." });
    }
    if (eventSnap.data().status === "CLOSED") {
      return res.status(400).json({ success: false, message: "Event already closed." });
    }

    const endTime = new Date();
    const createdAt = eventSnap.data().createdAt.toDate();
    const durationMinutes = Math.round((endTime - createdAt) / 60000);

    const batch = db.batch();

    batch.update(db.collection("events").doc(req.params.id), {
      status: "CLOSED",
      endTime: admin.firestore.Timestamp.fromDate(endTime),
      durationMinutes,
    });

    batch.set(db.collection("eventReports").doc(uuidv4()), {
      eventId: req.params.id,
      allPresent: !absenteeIds?.length,
      absenteeIds: absenteeIds || [],
      goodsCounts: goodsCounts || {},
      aops: aops || [],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    if (absenteeIds?.length) {
      const invitesSnap = await db.collection("eventInvites")
        .where("eventId", "==", req.params.id)
        .where("invitedUserId", "in", absenteeIds).get();

      for (const doc of invitesSnap.docs) {
        batch.update(doc.ref, { wasAbsent: true, eventStatus: "CLOSED" });
      }
    }

    const allInvitesSnap = await db.collection("eventInvites")
      .where("eventId", "==", req.params.id).get();
    for (const doc of allInvitesSnap.docs) {
      batch.update(doc.ref, { eventStatus: "CLOSED" });
    }

    await batch.commit();
    res.json({ success: true, message: "Event closed successfully." });
  } catch (err) {
    console.error("Close event error:", err);
    res.status(500).json({ success: false, message: "Failed to close event." });
  }
});

export default router;