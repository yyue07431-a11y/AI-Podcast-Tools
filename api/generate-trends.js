export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed. Use POST or GET." });
  }

  try {
    const apiKey = process.env.KIMI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "Missing KIMI_API_KEY",
        detail: "请在 Vercel Project → Settings → Environment Variables 添加 KIMI_API_KEY，然后重新部署。",
      });
    }

    const body = req.body || {};
    const geo = body.geo || "US";
    const language = body.language || "中文";

    const rssUrl = `https://trends.google.com/trending/rss?geo=${geo}`;

    const rssRes = await fetch(rssUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Accept: "application/rss+xml, application/xml, text/xml",
      },
    });

    const xml = await rssRes.text();

    if (!rssRes.ok) {
      return res.status(500).json({
        error: "Failed to fetch Google Trends RSS",
        status: rssRes.status,
        preview: xml.slice(0, 300),
      });
    }

    const rawTrends = parseGoogleTrendsRss(xml).slice(0, 12);

    if (!rawTrends.length) {
      return res.status(500).json({
        error: "No trends parsed from Google Trends RSS",
        xmlPreview: xml.slice(0, 500),
      });
    }

    const trendsText = rawTrends
      .map((item, index) => {
        return `${index + 1}. ${item.title}
搜索热度：${item.traffic || "未知"}
相关新闻：${item.news || "暂无"}`;
      })
      .join("\n\n");

    const prompt = `
你是一个播客选题策划助手。

下面是真实 Google Trends RSS 趋势数据：
${trendsText}

请基于这些真实趋势，生成 8 个适合${language}播客的选题。

要求：
1. 必须结合上面的真实趋势
2. title 要像播客标题，不要只是关键词
3. summary 说明为什么值得聊
4. tag 用 2-4 个字
5. momentum 保留搜索热度信息
6. keywords 给 3 个关键词
7. 只返回 JSON 数组，不要 Markdown，不要解释

返回格式：
[
  {
    "title": "播客选题标题",
    "tag": "科技",
    "momentum": "20K+ searches",
    "summary": "这个选题为什么值得聊，以及可以从哪些角度展开。",
    "keywords": ["关键词1", "关键词2", "关键词3"]
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
            content: "你是专业播客选题策划助手。你必须只返回严格 JSON 数组。",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.6,
      }),
    });

    const kimiData = await kimiResponse.json();

    if (!kimiResponse.ok) {
      return res.status(kimiResponse.status).json({
        error: "Kimi API error",
        detail: kimiData,
      });
    }

    const content = kimiData.choices?.[0]?.message?.content || "";

    let trends;
    try {
      trends = JSON.parse(content);
    } catch {
      const match = content.match(/\[[\s\S]*\]/);
      if (!match) {
        return res.status(500).json({
          error: "Kimi response is not valid JSON",
          raw: content,
          sourceTrends: rawTrends,
        });
      }
      trends = JSON.parse(match[0]);
    }

    return res.status(200).json({
      source: "Google Trends RSS",
      geo,
      rawTrends,
      trends,
    });
  } catch (error) {
    return res.status(500).json({
      error: "Internal server error",
      detail: error.message,
    });
  }
}

function parseGoogleTrendsRss(xml) {
  const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];

  return items.map((item) => {
    const title = cleanXml(getTag(item, "title"));
    const link = cleanXml(getTag(item, "link"));
    const traffic = cleanXml(
      getTag(item, "ht:approx_traffic") || getTag(item, "approx_traffic")
    );

    const newsTitles = [];
    const newsRegex = /<ht:news_item_title>([\s\S]*?)<\/ht:news_item_title>/g;
    let match;

    while ((match = newsRegex.exec(item)) !== null) {
      newsTitles.push(cleanXml(match[1]));
    }

    return {
      title,
      link,
      traffic,
      news: newsTitles.slice(0, 3).join("；"),
    };
  }).filter((item) => item.title);
}

function getTag(xml, tagName) {
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`);
  const match = xml.match(regex);
  return match ? match[1] : "";
}

function cleanXml(value = "") {
  return value
    .replace(/<!\[CDATA\[/g, "")
    .replace(/\]\]>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}
