export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  try {
    const {
      niche = "AI, marketing, podcast, creator economy",
      language = "中文",
    } = req.body || {};

    const apiKey = process.env.KIMI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "Missing KIMI_API_KEY" });
    }

    const prompt = `
你是一个播客选题策划助手。

请模拟聚合以下平台的热点：
X、Instagram、Google Trends RSS、微博、小红书、头条。

方向：
${niche}

语言：
${language}

请生成 8 个适合播客创作的热点选题。

每个热点必须包含：
1. title：热点标题
2. source：来源平台
3. platform：来源平台
4. category：只能从以下分类选择一个：政治、名人、娱乐、社会、科技、商业
5. heat：热度分数，0-100
6. summary：为什么适合做播客
7. tags：3 个高度贴合主题的中文标签，不要泛泛写“AI”“热点”“播客”

请严格返回 JSON，不要输出 markdown：
{
  "trends": [
    {
      "title": "",
      "source": "",
      "platform": "",
      "category": "",
      "heat": 88,
      "summary": "",
      "tags": ["", "", ""]
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
              "你是一个热点选题策划助手，只返回合法 JSON，不要输出 markdown。",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.75,
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
      trends: Array.isArray(parsed.trends) ? parsed.trends : [],
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "趋势生成失败",
    });
  }
}
