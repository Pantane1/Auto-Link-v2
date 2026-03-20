import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { db, admin } from "../lib/firebase.js";
import { generateUserHcode, generateVerificationCode } from "../lib/hcode.js";
import { v4 as uuidv4 } from "uuid";

const router = Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

async function verifyRecaptcha(token) {
  const res = await fetch(
    `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${token}`,
    { method: "POST" }
  );
  const data = await res.json();
  return data.success && data.score >= 0.5;
}

function signToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

router.post("/register", async (req, res) => {
  try {
    const { fullName, username, email, phone, password, recaptchaToken } = req.body;
    if (!recaptchaToken || !(await verifyRecaptcha(recaptchaToken))) {
      return res.status(400).json({ success: false, message: "reCAPTCHA verification failed." });
    }
    const [emailSnap, phoneSnap, usernameSnap] = await Promise.all([
      db.collection("users").where("email", "==", email).get(),
      db.collection("users").where("phone", "==", phone).get(),
      db.collection("users").where("username", "==", username).get(),
    ]);
    if (!emailSnap.empty) return res.status(409).json({ success: false, message: "This email is already registered." });
    if (!phoneSnap.empty) return res.status(409).json({ success: false, message: "This phone number is already registered." });
    if (!usernameSnap.empty) return res.status(409).json({ success: false, message: "This username is already taken." });
    const passwordHash = await bcrypt.hash(password, 12);
    const hcode = await generateUserHcode();
    const userId = uuidv4();
    await db.collection("users").doc(userId).set({
      fullName, username, email, phone,
      passwordHash, hcode,
      isVerified: true,
      profilePicUrl: null,
      googleId: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    const token = signToken(userId);
    return res.status(201).json({
      success: true,
      message: "Account created!",
      token,
      user: { id: userId, fullName, username, email, hcode, isVerified: true },
    });
  } catch (err) {
    console.error("Register error:", err);
    return res.status(500).json({ success: false, message: "Registration failed." });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password, recaptchaToken } = req.body;
    if (!recaptchaToken || !(await verifyRecaptcha(recaptchaToken))) {
      return res.status(400).json({ success: false, message: "reCAPTCHA verification failed." });
    }
    const snap = await db.collection("users").where("email", "==", email).get();
    if (snap.empty) {
      return res.status(401).json({ success: false, message: "Invalid email or password." });
    }
    const userDoc = snap.docs[0];
    const user = { id: userDoc.id, ...userDoc.data() };
    if (!user.passwordHash) {
      return res.status(401).json({ success: false, message: "Please sign in with Google." });
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ success: false, message: "Invalid email or password." });
    }
    const token = signToken(user.id);
    return res.json({
      success: true, token,
      user: {
        id: user.id, fullName: user.fullName, username: user.username,
        email: user.email, phone: user.phone, hcode: user.hcode,
        isVerified: user.isVerified, profilePicUrl: user.profilePicUrl,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ success: false, message: "Login failed." });
  }
});

router.post("/verify-email", async (req, res) => {
  try {
    const { email, code } = req.body;
    const snap = await db.collection("users").where("email", "==", email).get();
    if (snap.empty) return res.status(400).json({ success: false, message: "User not found." });
    const doc = snap.docs[0];
    const user = doc.data();
    if (user.verificationCode !== code) {
      return res.status(400).json({ success: false, message: "Invalid verification code." });
    }
    await db.collection("users").doc(doc.id).update({
      isVerified: true, verificationCode: null, verificationExp: null,
    });
    return res.json({ success: true, message: "Email verified!" });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Verification failed." });
  }
});

router.post("/resend-verification", async (req, res) => {
  try {
    const { email } = req.body;
    const snap = await db.collection("users").where("email", "==", email).get();
    if (snap.empty) return res.status(400).json({ success: false, message: "User not found." });
    const doc = snap.docs[0];
    const user = doc.data();
    if (user.isVerified) return res.status(400).json({ success: false, message: "Already verified." });
    const verificationCode = generateVerificationCode();
    const verificationExp = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await db.collection("users").doc(doc.id).update({
      verificationCode,
      verificationExp: admin.firestore.Timestamp.fromDate(verificationExp),
    });
    return res.json({ success: true, message: "New code sent." });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to resend." });
  }
});

router.post("/google", async (req, res) => {
  try {
    const { idToken, phone, recaptchaToken } = req.body;
    if (!recaptchaToken || !(await verifyRecaptcha(recaptchaToken))) {
      return res.status(400).json({ success: false, message: "reCAPTCHA verification failed." });
    }
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;
    const snap = await db.collection("users").where("email", "==", email).get();
    let userId, userData;
    if (!snap.empty) {
      const doc = snap.docs[0];
      userId = doc.id;
      userData = doc.data();
      if (!userData.googleId) {
        await db.collection("users").doc(userId).update({
          googleId, profilePicUrl: picture, isVerified: true,
        });
        userData = { ...userData, googleId, profilePicUrl: picture, isVerified: true };
      }
    } else {
      if (!phone) {
        return res.status(200).json({
          success: false, requiresPhone: true,
          message: "Please provide your phone number to complete registration.",
          googleData: { googleId, email, name, picture },
        });
      }
      const hcode = await generateUserHcode();
      const username = email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "") + Math.floor(Math.random() * 99);
      userId = uuidv4();
      userData = {
        fullName: name, username, email, phone,
        googleId, profilePicUrl: picture,
        hcode, isVerified: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      await db.collection("users").doc(userId).set(userData);
    }
    const token = signToken(userId);
    return res.json({
      success: true, token,
      user: {
        id: userId, fullName: userData.fullName, username: userData.username,
        email: userData.email, phone: userData.phone, hcode: userData.hcode,
        isVerified: userData.isVerified, profilePicUrl: userData.profilePicUrl,
      },
    });
  } catch (err) {
    console.error("Google auth error:", err);
    return res.status(500).json({ success: false, message: "Google sign-in failed." });
  }
});

export default router;
