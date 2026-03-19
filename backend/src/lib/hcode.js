import { db } from "./firebase.js";

export async function generateUserHcode() {
  let hcode;
  let exists = true;
  while (exists) {
    const num = Math.floor(10 + Math.random() * 90);
    hcode = `USER-${num}`;
    const snap = await db.collection("users").where("hcode", "==", hcode).get();
    exists = !snap.empty;
  }
  return hcode;
}

export function generateLocationHcode() {
  const num = Math.floor(100 + Math.random() * 900);
  return `LOC-${num}`;
}

export function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}