export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed. Use POST.",
    });
  }

  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "Missing ELEVENLABS_API_KEY in Vercel environment variables.",
      });
    }

    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const { text, voiceId } = body;

    if (!text || !String(text).trim()) {
      return res.status(400).json({
        error: "Missing text.",
      });
    }

    const finalText = String(text).slice(0, 2500);
    const finalVoiceId = voiceId || "21m00Tcm4TlvDq8ikWAM";

    const elevenRes = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${finalVoiceId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": apiKey,
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text: finalText,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.45,
            similarity_boost: 0.8,
            style: 0.35,
            use_speaker_boost: true,
          },
        }),
      },
    );

    if (!elevenRes.ok) {
      const errorText = await elevenRes.text();
      return res.status(elevenRes.status).json({
        error: "ElevenLabs API error",
        detail: errorText,
      });
    }

    const audioBuffer = await elevenRes.arrayBuffer();

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "no-store");

    return res.status(200).send(Buffer.from(audioBuffer));
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Internal server error",
    });
  }
}
