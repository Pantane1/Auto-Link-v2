import { Router } from "express";
import { db, admin } from "../lib/firebase.js";
import { authenticate, requireVerified } from "../middleware/auth.js";
import { generateLocationHcode } from "../lib/hcode.js";
import { v4 as uuidv4 } from "uuid";

const router = Router();

router.get("/", authenticate, async (req, res) => {
  try {
    const snap = await db.collection("groups").orderBy("createdAt", "desc").get();
    const groups = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ success: true, data: groups });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to load groups." });
  }
});

router.get("/mine", authenticate, async (req, res) => {
  try {
    const snap = await db.collection("groupMembers")
      .where("userId", "==", req.user.id).get();

    const memberships = await Promise.all(
      snap.docs.map(async (d) => {
        const data = d.data();
        const groupSnap = await db.collection("groups").doc(data.groupId).get();
        return {
          id: d.id, ...data,
          group: groupSnap.exists ? { id: groupSnap.id, ...groupSnap.data() } : null,
        };
      })
    );

    res.json({ success: true, data: memberships.filter(m => m.group) });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to load groups." });
  }
});

router.get("/by-username/:username", async (req, res) => {
  try {
    const snap = await db.collection("groups")
      .where("username", "==", req.params.username).get();
    if (snap.empty) return res.status(404).json({ success: false, message: "Group not found." });
    const doc = snap.docs[0];
    res.json({ success: true, data: { id: doc.id, ...doc.data() } });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to load group." });
  }
});

router.get("/:id", authenticate, async (req, res) => {
  try {
    const groupSnap = await db.collection("groups").doc(req.params.id).get();
    if (!groupSnap.exists) return res.status(404).json({ success: false, message: "Group not found." });

    const membersSnap = await db.collection("groupMembers")
      .where("groupId", "==", req.params.id).get();

    const members = await Promise.all(
      membersSnap.docs.map(async (d) => {
        const data = d.data();
        const userSnap = await db.collection("users").doc(data.userId).get();
        return {
          id: d.id, ...data,
          user: userSnap.exists ? {
            id: userSnap.id,
            fullName: userSnap.data().fullName,
            hcode: userSnap.data().hcode,
            profilePicUrl: userSnap.data().profilePicUrl,
          } : null,
        };
      })
    );

    const eventsSnap = await db.collection("events")
      .where("groupId", "==", req.params.id)
      .orderBy("createdAt", "desc").limit(10).get();

    const events = eventsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    res.json({
      success: true,
      data: { id: groupSnap.id, ...groupSnap.data(), members, events },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to load group." });
  }
});

router.post("/", authenticate, requireVerified, async (req, res) => {
  try {
    const { name, username, hcode } = req.body;
    if (!name || !username) {
      return res.status(400).json({ success: false, message: "Name and username are required." });
    }

    const existing = await db.collection("groups")
      .where("username", "==", username.toLowerCase()).get();
    if (!existing.empty) {
      return res.status(409).json({ success: false, message: "This group handle is already taken." });
    }

    const groupId = uuidv4();
    const memberId = uuidv4();

    await Promise.all([
      db.collection("groups").doc(groupId).set({
        name,
        username: username.toLowerCase(),
        hcode: hcode || generateLocationHcode(),
        createdBy: req.user.id,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      }),
      db.collection("groupMembers").doc(memberId).set({
        groupId, userId: req.user.id, role: "ADMIN",
        joinedAt: admin.firestore.FieldValue.serverTimestamp(),
      }),
    ]);

    res.status(201).json({ success: true, data: { id: groupId, name, username } });
  } catch (err) {
    console.error("Create group error:", err);
    res.status(500).json({ success: false, message: "Failed to create group." });
  }
});

router.post("/:id/join", authenticate, requireVerified, async (req, res) => {
  try {
    const existing = await db.collection("groupMembers")
      .where("groupId", "==", req.params.id)
      .where("userId", "==", req.user.id).get();

    if (!existing.empty) {
      return res.status(409).json({ success: false, message: "You are already in this group." });
    }

    await db.collection("groupMembers").doc(uuidv4()).set({
      groupId: req.params.id, userId: req.user.id, role: "MEMBER",
      joinedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({ success: true, message: "You have joined the group." });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to join group." });
  }
});

router.delete("/:id/leave", authenticate, async (req, res) => {
  try {
    const snap = await db.collection("groupMembers")
      .where("groupId", "==", req.params.id)
      .where("userId", "==", req.user.id).get();

    if (!snap.empty) {
      await db.collection("groupMembers").doc(snap.docs[0].id).delete();
    }

    res.json({ success: true, message: "You have left the group." });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to leave group." });
  }
});

export default router;