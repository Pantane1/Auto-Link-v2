export async function sendBulkSMS(phones, message) {
  if (!process.env.AT_API_KEY || process.env.AT_API_KEY === "placeholder") {
    console.log("SMS skipped — AT_API_KEY is placeholder. Would send to:", phones);
    return { skipped: true };
  }
  const { default: AfricasTalking } = await import("africastalking");
  const at = AfricasTalking({
    apiKey: process.env.AT_API_KEY,
    username: process.env.AT_USERNAME,
  });
  const recipients = phones.map((p) =>
    p.startsWith("+") ? p : p.startsWith("0") ? "+254" + p.slice(1) : p
  );
  const result = await at.SMS.send({
    to: recipients, message,
    from: process.env.AT_SENDER_ID || "AUTO-LINK",
  });
  console.log("SMS sent:", JSON.stringify(result, null, 2));
  return result;
}

export async function sendSingleSMS(phone, message) {
  return sendBulkSMS([phone], message);
}