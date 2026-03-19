import { Router } from "express";
import { Lipana } from "@lipana/sdk";
import { db, admin } from "../lib/firebase.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

function getLipana() {
  return new Lipana({ apiKey: process.env.LIPANA_SECRET_KEY, environment: "production" });
}

router.post("/pay", authenticate, async (req, res) => {
  try {
    const { eventId } = req.body;

    const inviteSnap = await db.collection("eventInvites")
      .where("eventId", "==", eventId)
      .where("invitedUserId", "==", req.user.id).get();

    if (inviteSnap.empty) {
      return res.status(404).json({ success: false, message: "You are not invited to this event." });
    }

    const inviteDoc = inviteSnap.docs[0];
    const invite = inviteDoc.data();

    if (invite.paymentStatus === "PAID") {
      return res.status(400).json({ success: false, message: "You have already paid." });
    }

    const eventSnap = await db.collection("events").doc(eventId).get();
    const event = eventSnap.data();

    const normalizedPhone = req.user.phone.startsWith("0")
      ? "+254" + req.user.phone.slice(1)
      : req.user.phone;

    const stkResponse = await getLipana().transactions.initiateStkPush({
      phone: normalizedPhone,
      amount: event.amountPerMember,
    });

    await db.collection("eventInvites").doc(inviteDoc.id).update({
      mpesaCheckoutId: stkResponse.transactionId,
      paymentStatus: "PENDING",
    });

    res.json({
      success: true,
      transactionId: stkResponse.transactionId,
      message: "STK Push sent. Enter your M-Pesa PIN to confirm.",
    });
  } catch (err) {
    console.error("Payment error:", err);
    res.status(500).json({ success: false, message: err?.message || "Payment failed." });
  }
});

router.get("/status/:eventId", authenticate, async (req, res) => {
  try {
    const snap = await db.collection("eventInvites")
      .where("eventId", "==", req.params.eventId)
      .where("invitedUserId", "==", req.user.id).get();

    if (snap.empty) {
      return res.status(404).json({ success: false, message: "Invite not found." });
    }

    const data = snap.docs[0].data();
    res.json({
      success: true,
      data: {
        paymentStatus: data.paymentStatus,
        paidAmount: data.paidAmount,
        paidAt: data.paidAt,
        transactionId: data.transactionId,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to get status." });
  }
});

export default router;