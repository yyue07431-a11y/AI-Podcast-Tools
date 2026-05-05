export default async function handler(req, res) {
  try {
    const { text, voice = "female" } = req.body;

    const appid = process.env.VOLC_APP_ID;
    const token = process.env.VOLC_ACCESS_TOKEN;
    const cluster = process.env.VOLC_CLUSTER || "volcano_tts";

    const voiceType =
      voice === "male" ? "BV002_streaming" : "BV001_streaming";

    const response = await fetch(
      "https://openspeech.bytedance.com/api/v1/tts",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer;${token}`,
        },
        body: JSON.stringify({
          app: {
            appid,
            token,
            cluster,
          },
          user: {
            uid: "podcast-user",
          },
          audio: {
            voice_type: voiceType,
            encoding: "mp3",
            speed_ratio: 1.0,
          },
          request: {
            reqid: Date.now().toString(),
            text,
            text_type: "plain",
          },
        }),
      }
    );

    const raw = await response.text();

    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      return res.status(500).json({
        error: "火山返回非JSON",
        detail: raw.slice(0, 200),
      });
    }

    if (data.code !== 3000) {
      return res.status(500).json({
        error: data.message,
        detail: data,
      });
    }

    // 🔥 核心：base64 → 音频
    const audioBuffer = Buffer.from(data.data, "base64");

    res.setHeader("Content-Type", "audio/mpeg");
    return res.status(200).send(audioBuffer);
  } catch (err) {
    return res.status(500).json({
      error: err.message,
    });
  }
}
