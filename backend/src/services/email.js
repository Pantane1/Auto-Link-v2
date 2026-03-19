import { Resend } from "resend";

const FROM = process.env.RESEND_FROM || "onboarding@resend.dev";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

export async function sendVerificationEmail(to, name, code) {
  await getResend().emails.send({
    from: FROM,
    to,
    subject: `${code} — Your Auto-Link verification code`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#090b10;color:#e8eaf0;padding:40px;border-radius:16px;">
        <h1 style="color:#00e676;font-size:24px;margin-bottom:8px;">Auto-Link</h1>
        <p style="color:#9ca3af;font-size:13px;margin-bottom:32px;">Secure Community Coordination</p>
        <h2 style="font-size:18px;margin-bottom:8px;">Verify your email, ${name}</h2>
        <p style="color:#9ca3af;font-size:14px;margin-bottom:24px;">Enter this code in the app to activate your account:</p>
        <div style="background:#0e1118;border:1px solid rgba(0,230,118,0.2);border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
          <span style="font-family:monospace;font-size:36px;font-weight:700;letter-spacing:12px;color:#00e676;">${code}</span>
        </div>
        <p style="color:#6b7280;font-size:12px;">This code expires in 24 hours. If you did not create an Auto-Link account, ignore this email.</p>
      </div>
    `,
  });
}

export async function sendEventInviteEmail(to, name, event) {
  const { title, meetingHcode, meetingDateTime, amountPerMember } = event;
  const date = new Date(meetingDateTime).toLocaleString("en-KE", {
    weekday: "long", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  await getResend().emails.send({
    from: FROM,
    to,
    subject: `You are invited: ${title}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#090b10;color:#e8eaf0;padding:40px;border-radius:16px;">
        <h1 style="color:#00e676;font-size:24px;margin-bottom:8px;">Auto-Link</h1>
        <p style="color:#9ca3af;font-size:13px;margin-bottom:32px;">Secure Community Coordination</p>
        <h2 style="font-size:20px;margin-bottom:4px;">You are invited, ${name}!</h2>
        <p style="color:#9ca3af;font-size:14px;margin-bottom:32px;">You have been added to a meetup.</p>
        <div style="background:#0e1118;border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:24px;margin-bottom:24px;">
          <p style="margin:0 0 12px;font-size:18px;font-weight:700;">${title}</p>
          <p style="margin:0 0 8px;color:#9ca3af;font-size:13px;">Location: <span style="color:#00e676;font-family:monospace;">${meetingHcode}</span></p>
          <p style="margin:0 0 8px;color:#9ca3af;font-size:13px;">${date}</p>
          <p style="margin:0;color:#9ca3af;font-size:13px;">Contribution: <span style="color:#00e676;font-weight:700;">KES ${amountPerMember}</span></p>
        </div>
        <a href="${FRONTEND_URL}" style="display:block;background:#00e676;color:#000;text-align:center;padding:14px;border-radius:10px;font-weight:700;text-decoration:none;">
          Open Auto-Link and Pay
        </a>
      </div>
    `,
  });
}