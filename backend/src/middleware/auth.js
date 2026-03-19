import jwt from "jsonwebtoken";
import { db } from "../lib/firebase.js";

export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "No token provided." });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const userSnap = await db.collection("users").doc(decoded.userId).get();
    if (!userSnap.exists) {
      return res.status(401).json({ success: false, message: "User not found." });
    }

    const user = { id: userSnap.id, ...userSnap.data() };
    delete user.passwordHash;
    delete user.verificationCode;
    delete user.verificationExp;

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Invalid or expired token." });
  }
}

export function requireVerified(req, res, next) {
  if (!req.user.isVerified) {
    return res.status(403).json({ success: false, message: "Please verify your email first." });
  }
  next();
}