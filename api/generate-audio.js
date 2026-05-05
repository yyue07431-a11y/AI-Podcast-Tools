export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  try {
    const { text, voiceId } = req.body || {};

    if (!text || !String(text).trim()) {
      return res.status(400).json({ error: "Missing text" });
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "Missing ELEVENLABS_API_KEY" });
    }

    const finalVoiceId = voiceId || "21m00Tcm4TlvDq8ikWAM";

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${finalVoiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text: String(text).slice(0, 2500),
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      },
    );

    if (!response.ok) {
      const rawText = await response.text();

      return res.status(response.status).json({
        error: "ElevenLabs TTS failed",
        detail: rawText,
      });
    }

    const audioBuffer = await response.arrayBuffer();

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "no-store");

    return res.status(200).send(Buffer.from(audioBuffer));
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Audio generation failed",
    });
  }
}
