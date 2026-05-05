export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  try {
    const {
      script,
      selectedTopics = [],
      durationPreference = "AI 自动判断",
      platformPreference = "AI 自动判断",
      tagPreference = "AI 自动生成",
      autoStrategy = true,
    } = req.body || {};

    if (!script) {
      return res.status(400).json({ error: "Missing script" });
    }

    const apiKey = process.env.KIMI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "Missing KIMI_API_KEY" });
    }

    const topicText = selectedTopics
      .map(
        (topic) =>
          `【${topic.platform || "未知平台"}】${topic.title}
分类：${topic.category || "未分类"}
摘要：${topic.summary || ""}
标签：${Array.isArray(topic.tags) ? topic.tags.join("、") : ""}`,
      )
      .join("\n\n");

    const prompt = `
你是一个短视频热点切片策略专家。

请基于“已选择热点”和“播客脚本”，生成 3-5 个适合短视频传播的热点切片。

已选择热点：
${topicText || "暂无热点"}

用户偏好：
- 时长偏好：${durationPreference}
- 平台偏好：${platformPreference}
- 标签偏好：${tagPreference}
- 是否自动判断策略：${autoStrategy ? "是" : "否"}

播客脚本：
${script}

每个切片必须包含：
1. title：切片标题
2. relatedHotTopic：关联热点
3. content：可直接用于短视频口播/字幕的片段内容
4. reason：为什么这个片段适合传播
5. score：传播潜力分数，0-100
6. duration：根据内容自动判断建议时长，例如 "28秒"、"45秒"
7. platform：根据内容自动判断最适合平台，例如 "小红书"、"抖音"、"TikTok"、"YouTube Shorts"、"视频号"
8. tags：根据切片内容自动生成 3-5 个中文标签，不要泛泛写“热点”“播客”

请严格返回 JSON，不要输出 markdown，不要解释：
{
  "clips": [
    {
      "title": "",
      "relatedHotTopic": "",
      "content": "",
      "reason": "",
      "score": 88,
      "duration": "35秒",
      "platform": "小红书",
      "tags": ["标签1", "标签2", "标签3"]
    }
  ]
}
`;

    const response = await fetch("https://api.moonshot.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "moonshot-v1-8k",
        messages: [
          {
            role: "system",
            content:
              "你是一个专业短视频切片策略专家，只返回合法 JSON，不要输出 markdown。",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.6,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.error?.message || "Kimi API request failed",
        detail: data,
      });
    }

    const content = data.choices?.[0]?.message?.content || "";

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      if (!match) {
        throw new Error("AI 返回内容不是 JSON");
      }
      parsed = JSON.parse(match[0]);
    }

    return res.status(200).json({
      clips: Array.isArray(parsed.clips) ? parsed.clips : [],
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "切片生成失败",
    });
  }
}
