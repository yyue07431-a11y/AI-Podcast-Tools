export default async function handler(req, res) {
  try {
    const { text } = req.body;

    const response = await fetch(
      "https://openspeech.bytedance.com/api/v3/tts/unidirectional",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer;${process.env.VOLC_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          app: {
            appid: process.env.VOLC_APP_ID,
          },
          user: {
            uid: "podcast-user",
          },
          audio: {
            voice_type: "zh_female_vv_uranus_bigtts", // 🔥 大模型音色
            encoding: "mp3",
            speed_ratio: 1.0,
          },
          request: {
            reqid: Date.now().toString(),
            text: text.slice(0, 2000),
            text_type: "plain",
          },
        }),
      }
    );

    if (!response.ok) {
  const err = await response.text();

  return res.status(response.status).json({
    error: "V3 TTS failed",
    status: response.status,
    detail: err.slice(0, 1000),
  });
}

    // 🔥 关键：直接流转发（不用再 base64）
    res.setHeader("Content-Type", "audio/mpeg");

    const reader = response.body.getReader();
    const chunks = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }

    const buffer = Buffer.concat(chunks);
    return res.status(200).send(buffer);
  } catch (err) {
    return res.status(500).json({
      error: err.message,
    });
  }
}
