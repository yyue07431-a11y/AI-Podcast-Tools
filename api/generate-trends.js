export default async function handler(req, res) {
  // 允许跨域和预检请求
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed. Use POST.",
    });
  }

  try {
    const apiKey = process.env.KIMI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "Missing KIMI_API_KEY in Vercel environment variables.",
      });
    }

    const { niche, language } = req.body || {};

    const prompt = `
你是一个播客选题策划助手。

请根据以下信息，生成 8 个适合做播客的热门选题：

领域：${niche || "AI, technology, business, marketing"}
语言：${language || "中文"}

要求：
1. 选题要有热点感、讨论度和播客延展性
2. 每个选题包含 title 和 reason
3. title 要简洁、有吸引力
4. reason 说明为什么这个选题适合做播客
5. 只返回 JSON，不要返回 Markdown，不要解释

返回格式如下：
[
  {
    "title": "选题标题",
    "reason": "推荐理由"
  }
]
`;

    const kimiResponse = await fetch("https://api.moonshot.cn/v1/chat/completions", {
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
            content: "你是一个专业的播客内容策划助手，只返回严格 JSON。",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.8,
      }),
    });

    const data = await kimiResponse.json();

    if (!kimiResponse.ok) {
      return res.status(kimiResponse.status).json({
        error: data,
      });
    }

    const content = data.choices?.[0]?.message?.content || "";

    let trends;

    try {
      trends = JSON.parse(content);
    } catch (err) {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        trends = JSON.parse(jsonMatch[0]);
      } else {
        return res.status(500).json({
          error: "Kimi response is not valid JSON.",
          raw: content,
        });
      }
    }

    return res.status(200).json({
      trends,
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Internal server error",
    });
  }
}
