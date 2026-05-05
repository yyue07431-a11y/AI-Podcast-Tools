import googleTrends from "google-trends-api";

export default async function handler(req, res) {
  try {
    // 1️⃣ 获取 Google Trends 热点
    const trends = await googleTrends.dailyTrends({
      geo: "US",
    });

    const parsed = JSON.parse(trends);

    const realTrends =
      parsed.default.trendingSearchesDays[0].trendingSearches.map((item) => ({
        title: item.title.query,
        source: "Google Trends",
        platform: "Google Trends",
      }));

    // 2️⃣ 用 AI 补充标签 & 分类
    const apiKey = process.env.KIMI_API_KEY;

    const prompt = `
请对以下热点做分析，补充分类、标签和摘要：

${realTrends.map((t) => t.title).join("\n")}

返回 JSON：
{
 "trends":[
   {
     "title":"",
     "category":"科技/商业/娱乐/社会/政治/名人",
     "tags":["","",""],
     "summary":""
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
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();
    const content = data.choices[0].message.content;

    const aiResult = JSON.parse(content);

    // 3️⃣ 合并真实数据 + AI分析
    const finalTrends = aiResult.trends.map((t, i) => ({
      id: String(Date.now() + i),
      title: t.title,
      source: realTrends[i]?.source,
      platform: realTrends[i]?.platform,
      category: t.category,
      heat: Math.floor(Math.random() * 20) + 80,
      tags: t.tags,
      summary: t.summary,
    }));

    res.status(200).json({ trends: finalTrends });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
