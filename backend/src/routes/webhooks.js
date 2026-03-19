import { Router } from "express";
import { db, admin } from "../lib/firebase.js";

const router = Router();

router.post("/lipana", async (req, res) => {
  try {
    const payload = typeof req.body === "string"
      ? JSON.parse(req.body) : req.body;

    console.log("Lipana webhook:", JSON.stringify(payload, null, 2));

    const { transactionId, status, amount } = payload;
    if (!transactionId) return res.status(400).json({ received: false });

    const snap = await db.collection("eventInvites")
      .where("mpesaCheckoutId", "==", transactionId).get();

    if (snap.empty) return res.status(200).json({ received: true });

    const doc = snap.docs[0];

    if (status === "SUCCESS") {
      await db.collection("eventInvites").doc(doc.id).update({
        paymentStatus: "PAID",
        paidAmount: parseFloat(amount) || 0,
        paidAt: admin.firestore.FieldValue.serverTimestamp(),
        transactionId,
      });
    } else if (status === "FAILED" || status === "CANCELLED") {
      await db.collection("eventInvites").doc(doc.id).update({
        paymentStatus: "FAILED",
      });
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error("Webhook error:", err);
    res.status(500).json({ received: false });
  }
});

export default router;