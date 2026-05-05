function createReqId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function cleanText(text = "") {
  return String(text)
    .replace(/^#+\s?/gm, "")
    .replace(/\*\*/g, "")
    .replace(/【.*?】/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 2500);
}

function getVoiceType(voice = "female") {
  const voiceMap = {
    female: process.env.VOLC_VOICE_FEMALE || process.env.VOLC_VOICE_TYPE || "BV001_streaming",
    male: process.env.VOLC_VOICE_MALE || process.env.VOLC_VOICE_TYPE || "BV002_streaming",
    dual: process.env.VOLC_VOICE_FEMALE || process.env.VOLC_VOICE_TYPE || "BV001_streaming",
  };

  return voiceMap[voice] || voiceMap.female;
}

function buildDualPodcastText(text = "") {
  const cleaned = cleanText(text);

  const hasDialogue =
    /(^|\n)(A|B|主持人|嘉宾|主播A|主播B)[：:]/.test(cleaned);

  if (hasDialogue) {
    return cleaned;
  }

  return `
主持人A：欢迎来到今天的 AI Podcast。今天我们聊一个正在被很多人讨论的话题。

嘉宾B：是的，这个话题背后不只是一个热点，而是内容生产方式正在发生变化。

主持人A：我们先从核心背景说起。${cleaned.slice(0, 1500)}

嘉宾B：这里真正值得关注的是，它对创作者、平台和用户都会产生影响。创作者需要更快找到选题，平台需要更高质量的内容，而用户则需要更清晰的信息筛选。

主持人A：所以总结一下，今天这个选题的价值不只是“发生了什么”，而是它提醒我们，热点正在变成一种可以被系统化生产和再加工的内容资产。

嘉宾B：这也是 AI 播客工具的意义：降低从选题、写稿到生成音频的门槛，让创作者更快进入表达状态。
`.trim();
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  try {
    const {
      text,
      mode = "single",
      voice = "female",
      speed = 1.0,
      title = "podcast-audio",
    } = req.body || {};

    if (!text || !String(text).trim()) {
      return res.status(400).json({ error: "Missing text" });
    }

    const appid = process.env.VOLC_APP_ID;
    const token = process.env.VOLC_ACCESS_TOKEN;
    const cluster = process.env.VOLC_CLUSTER || "volcano_tts";

    if (!appid || !token) {
      return res.status(500).json({
        error: "Missing Volcengine credentials",
        detail: "请在 Vercel 环境变量里配置 VOLC_APP_ID 和 VOLC_ACCESS_TOKEN。",
      });
    }

    const finalText = mode === "dual" ? buildDualPodcastText(text) : cleanText(text);
    const reqid = createReqId();
    const voiceType = getVoiceType(voice);

    const response = await fetch("https://openspeech.bytedance.com/api/v1/tts", {
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
          uid: "ai-podcast-user",
        },
        audio: {
          voice_type: voiceType,
          encoding: "mp3",
          speed_ratio: Number(speed) || 1.0,
          volume_ratio: 1.0,
          pitch_ratio: 1.0,
        },
        request: {
          reqid,
          text: finalText,
          text_type: "plain",
          operation: "query",
          with_frontend: 1,
          frontend_type: "unitTson",
        },
      }),
    });

    const raw = await response.text();

    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      return res.status(500).json({
        error: "Volcengine returned non-JSON response",
        detail: raw.slice(0, 500),
      });
    }

    if (!response.ok || data.code !== 3000) {
      return res.status(response.ok ? 500 : response.status).json({
        error: data.message || data.Message || "Volcengine TTS failed",
        detail: data,
      });
    }

    if (!data.data) {
      return res.status(500).json({
        error: "No audio data returned",
        detail: data,
      });
    }

    const audioBuffer = Buffer.from(data.data, "base64");

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${encodeURIComponent(title)}.mp3"`,
    );

    return res.status(200).send(audioBuffer);
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Audio generation failed",
    });
  }
}
