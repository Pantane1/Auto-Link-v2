export async function generateSMSWithAI(event) {
  try {
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const date = new Date(event.meetingDateTime).toLocaleString("en-KE", {
      weekday: "short", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
    const prompt = `Write a short professional SMS invite for a Kenyan community meetup.
Event: "${event.title}", Date: ${date}, Location: ${event.meetingHcode}, Contribution: KES ${event.amountPerMember}
Keep under 160 characters. Friendly tone.`;
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash", contents: prompt,
    });
    return response.text?.trim() || fallbackSMS(event);
  } catch (err) {
    console.error("Gemini error:", err);
    return fallbackSMS(event);
  }
}

function fallbackSMS(event) {
  const date = new Date(event.meetingDateTime).toLocaleDateString("en-KE");
  return `Auto-Link: Invited to "${event.title}" on ${date} at ${event.meetingHcode}. KES ${event.amountPerMember}. Open app to pay.`;
}