import OpenAI from "openai";

// Client is initialized once at module load — this is fine for the base URL/config.
// The API key is read from process.env at call-time via the guard below.
const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

export const chatWithAI = async (req, res) => {
  try {
    // Bug 16: Guard against unconfigured key so callers get a clean 503, not a cryptic 500
    if (!process.env.GROQ_API_KEY) {
      return res.status(503).json({ error: "AI service not configured" });
    }

    const { message } = req.body;

    if (!message?.trim()) {
      return res.status(400).json({ error: "Message is required" });
    }

    const response = await client.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content: `
You are a healthcare assistant.
DO NOT diagnose diseases.
Provide general health tips, precautions, and lifestyle advice.
Clearly say when the user should consult a doctor.
Always add a medical disclaimer at the end. Within 2 or 3 lines.
          `,
        },
        {
          role: "user",
          content: message.trim(),
        },
      ],
      temperature: 0.6,
      max_tokens: 500,
    });

    res.json({
      reply: response.choices[0].message.content,
    });
  } catch (err) {
    console.error("Groq Error:", err);
    res.status(500).json({ error: "AI service failed" });
  }
};
