export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { text } = req.body || {};

    if (!text || !String(text).trim()) {
      return res.status(400).json({ error: "Missing text" });
    }

    const appid = process.env.VOLC_APP_ID;
    const apiKey = process.env.VOLC_API_KEY;
    const resourceId = process.env.VOLC_RESOURCE_ID;

    if (!appid || !apiKey || !resourceId) {
      return res.status(500).json({
        error: "Missing Volcengine config",
        detail: "请检查 VOLC_APP_ID / VOLC_API_KEY / VOLC_RESOURCE_ID",
      });
    }

    const response = await fetch(
      "https://openspeech.bytedance.com/api/v3/tts/unidirectional",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Api-App-Key": appid,
          "X-Api-Access-Key": apiKey,
          "X-Api-Resource-Id": resourceId,
        },
        body: JSON.stringify({
          app: {
            appid,
          },
          user: {
            uid: "podcast-user",
          },
          audio: {
            voice_type: "zh_female_vv_uranus_bigtts",
            encoding: "mp3",
            speed_ratio: 1.0,
            volume_ratio: 1.0,
            pitch_ratio: 1.0,
          },
          request: {
            reqid: Date.now().toString(),
            text: String(text).slice(0, 2000),
            text_type: "plain",
          },
        }),
      },
    );

    if (!response.ok) {
      const err = await response.text();

      console.error("Volc V3 status:", response.status);
      console.error("Volc V3 error:", err);

      return res.status(response.status).json({
        error: "V3 TTS failed",
        status: response.status,
        detail: err,
      });
    }

    const reader = response.body.getReader();
    const chunks = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(Buffer.from(value));
    }

    const audioBuffer = Buffer.concat(chunks);

    if (!audioBuffer.length) {
      return res.status(500).json({
        error: "Empty audio response",
      });
    }

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "no-store");

    return res.status(200).send(audioBuffer);
  } catch (err) {
    console.error("TTS handler error:", err);

    return res.status(500).json({
      error: err.message || "Audio generation failed",
    });
  }
}
