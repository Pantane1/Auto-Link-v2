import { Resend } from "resend";

const FROM = process.env.RESEND_FROM || "onboarding@resend.dev";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

export async function sendVerificationEmail(to, name, code) {
  try {
    await getResend().emails.send({
      from: FROM, to,
      subject: `${code} — Your Auto-Link verification code`,
      html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#090b10;color:#e8eaf0;padding:40px;border-radius:16px;">
        <h1 style="color:#00e676;">Auto-Link</h1>
        <h2>Verify your email, ${name}</h2>
        <div style="background:#0e1118;border:1px solid rgba(0,230,118,0.2);border-radius:12px;padding:24px;text-align:center;margin:24px 0;">
          <span style="font-family:monospace;font-size:36px;font-weight:700;letter-spacing:12px;color:#00e676;">${code}</span>
        </div>
        <p style="color:#6b7280;font-size:12px;">Expires in 24 hours.</p>
      </div>`,
    });
  } catch (err) {
    console.error("Email send error:", err);
  }
}

export async function sendEventInviteEmail(to, name, event) {
  try {
    const { title, meetingHcode, meetingDateTime, amountPerMember } = event;
    const date = new Date(meetingDateTime).toLocaleString("en-KE", {
      weekday: "long", month: "long", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
    await getResend().emails.send({
      from: FROM, to,
      subject: `You are invited: ${title}`,
      html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#090b10;color:#e8eaf0;padding:40px;border-radius:16px;">
        <h1 style="color:#00e676;">Auto-Link</h1>
        <h2>You are invited, ${name}!</h2>
        <div style="background:#0e1118;border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:24px;margin:24px 0;">
          <p style="font-size:18px;font-weight:700;">${title}</p>
          <p style="color:#9ca3af;">Location: <span style="color:#00e676;font-family:monospace;">${meetingHcode}</span></p>
          <p style="color:#9ca3af;">${date}</p>
          <p style="color:#9ca3af;">Contribution: <span style="color:#00e676;font-weight:700;">KES ${amountPerMember}</span></p>
        </div>
        <a href="${FRONTEND_URL}" style="display:block;background:#00e676;color:#000;text-align:center;padding:14px;border-radius:10px;font-weight:700;text-decoration:none;">Open Auto-Link and Pay</a>
      </div>`,
    });
  } catch (err) {
    console.error("Invite email error:", err);
  }
}