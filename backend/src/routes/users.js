import { Router } from "express";
import { db } from "../lib/firebase.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

router.get("/me", authenticate, async (req, res) => {
  res.json({ success: true, data: req.user });
});

router.get("/me/stats", authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    const [membershipsSnap, invitesSnap] = await Promise.all([
      db.collection("groupMembers").where("userId", "==", userId).get(),
      db.collection("eventInvites").where("invitedUserId", "==", userId).get(),
    ]);

    const groupCount = membershipsSnap.size;
    const invites = invitesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    let attended = 0;
    let missed = 0;
    let pendingInvites = 0;

    for (const invite of invites) {
      if (invite.paymentStatus === "PENDING" && invite.eventStatus === "ACTIVE") {
        pendingInvites++;
      }
      if (invite.paymentStatus === "PAID" && invite.eventStatus === "CLOSED") {
        if (invite.wasAbsent) missed++;
        else attended++;
      }
    }

    res.json({ success: true, data: { attended, missed, groupCount, pendingInvites } });
  } catch (err) {
    console.error("Stats error:", err);
    res.status(500).json({ success: false, message: "Failed to load stats." });
  }
});

router.get("/me/invites", authenticate, async (req, res) => {
  try {
    const snap = await db.collection("eventInvites")
      .where("invitedUserId", "==", req.user.id)
      .where("eventStatus", "==", "ACTIVE")
      .orderBy("createdAt", "desc")
      .get();

    const invites = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ success: true, data: invites });
  } catch (err) {
    console.error("Invites error:", err);
    res.status(500).json({ success: false, message: "Failed to load invites." });
  }
});

export default router;