export default async function handler(req, res) {
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

    const { geo = "US", language = "中文" } = req.body || {};

    const rssUrl = `https://trends.google.com/trending/rss?geo=${encodeURIComponent(
      geo,
    )}`;

    const rssRes = await fetch(rssUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 AI-Podcast-Tools/1.0",
      },
    });

    if (!rssRes.ok) {
      return res.status(500).json({
        error: `Failed to fetch Google Trends RSS: ${rssRes.status}`,
      });
    }

    const xml = await rssRes.text();
    const rawTrends = parseGoogleTrendsRss(xml).slice(0, 12);

    if (!rawTrends.length) {
      return res.status(500).json({
        error: "No trends found from Google Trends RSS.",
      });
    }

    const trendsText = rawTrends
      .map((item, index) => {
        return `${index + 1}. ${item.title}
搜索热度：${item.traffic || "未知"}
相关新闻：${item.news || "暂无"}
链接：${item.link || ""}`;
      })
      .join("\n\n");

    const prompt = `
你是一个播客选题策划助手。

下面是从 Google Trends RSS 获取到的真实趋势搜索词和相关新闻：
${trendsText}

请基于这些真实趋势，生成 8 个适合中文播客的选题。

要求：
1. 必须结合真实趋势，不要凭空编造热点
2. 每个选题要适合做播客，有讨论空间
3. title 要像播客标题，不能只是关键词
4. summary 说明这个选题可以怎么展开
5. tag 用 2-4 个字，例如：科技、商业、社会、娱乐、国际、AI
6. momentum 保留搜索热度信息，例如 "+50K searches" 或 "热门上升"
7. keywords 给 3 个关键词
8. 只返回 JSON，不要 Markdown，不要解释

返回格式：
[
  {
    "title": "播客选题标题",
    "tag": "科技",
    "momentum": "+50K searches",
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
            content: "你是一个专业播客选题策划助手，只返回严格 JSON。",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
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
          sourceTrends: rawTrends,
        });
      }
    }

    return res.status(200).json({
      source: "Google Trends RSS",
      geo,
      rawTrends,
      trends,
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Internal server error",
    });
  }
}

function parseGoogleTrendsRss(xml) {
  const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];

  return items.map((item) => {
    const title = cleanXml(getTag(item, "title"));
    const link = cleanXml(getTag(item, "link"));
    const traffic =
      cleanXml(getTag(item, "ht:approx_traffic")) ||
      cleanXml(getTag(item, "approx_traffic"));

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
  });
}

function getTag(xml, tagName) {
  const escapedTag = tagName.replace(":", "\\:");
  const regex = new RegExp(`<${escapedTag}[^>]*>([\\s\\S]*?)<\\/${escapedTag}>`);
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
