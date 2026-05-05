import { useRef, useState } from "react";

const pages = [
  { id: "discover", label: "发现选题", icon: "◌" },
  { id: "draft", label: "脚本草稿", icon: "✎" },
  { id: "audio", label: "音频生成", icon: "▶" },
  { id: "clips", label: "Clip Studio", icon: "✦" },
];

const categories = ["全部", "政治", "名人", "娱乐", "社会", "科技", "商业"];

const trendingTopics = [
  {
    id: "1",
    title: "AI音乐生成引发版权争议",
    source: "X",
    platform: "X",
    category: "科技",
    heat: 92,
    tags: ["AI版权", "音乐产业", "创作者收益"],
    summary: "AI 音乐生成正在冲击版权归属、平台分发和创作者收益分配。",
  },
  {
    id: "2",
    title: "某明星新综艺热度上升",
    source: "微博",
    platform: "微博",
    category: "娱乐",
    heat: 88,
    tags: ["明星综艺", "粉丝传播", "娱乐营销"],
    summary: "明星综艺内容在微博和短视频平台形成二次传播，适合做娱乐观察型播客。",
  },
  {
    id: "3",
    title: "Google Trends 显示 Creator Economy 搜索上升",
    source: "Google Trends RSS",
    platform: "Google Trends",
    category: "商业",
    heat: 81,
    tags: ["创作者经济", "内容变现", "个人品牌"],
    summary: "创作者经济搜索热度上升，说明内容变现、个人品牌和 AI 工具链仍有讨论空间。",
  },
  {
    id: "4",
    title: "小红书热议普通人副业内容创作",
    source: "小红书",
    platform: "小红书",
    category: "社会",
    heat: 79,
    tags: ["普通人副业", "内容焦虑", "平台机会"],
    summary: "普通人通过内容平台做副业成为讨论热点，适合切入焦虑、机会与平台机制。",
  },
];

const initialScript = `开场 Hook
欢迎来到今天的节目。过去一年里，AI 不只是一个工具，而是逐渐成为内容团队的新同事。它会提纲、会润色、甚至会主动拆解分发策略。

核心讨论
这一轮内容生产升级的关键，不是单点能力提升，而是工作流被重新设计。选题、脚本、配音、剪辑和分发正在进入同一个自动化链路。

案例拆解
比如一个播客团队可以先根据热点抓取趋势，再让 AI 生成初稿，随后根据受众画像生成多个版本，最后输出长音频和短视频切片。`;

const voiceOptions = [
  { name: "主播 A · 沉稳科技感", language: "中文", speed: "1.0x" },
  { name: "主播 B · 轻快新闻感", language: "中文", speed: "1.1x" },
  { name: "嘉宾 C · 深度访谈感", language: "中文", speed: "0.95x" },
];

const modelOptions = [
  { id: "kimi", name: "Kimi" },
  { id: "gpt", name: "GPT" },
  { id: "deepseek", name: "DeepSeek" },
  { id: "claude", name: "Claude" },
];

function normalizeCategory(category = "") {
  const text = String(category || "");
  if (categories.includes(text)) return text;
  if (text.includes("政")) return "政治";
  if (text.includes("名人") || text.includes("明星") || text.includes("艺人")) return "名人";
  if (text.includes("娱") || text.includes("综艺") || text.includes("影视")) return "娱乐";
  if (text.includes("社会") || text.includes("民生")) return "社会";
  if (text.includes("商") || text.includes("财经") || text.includes("消费") || text.includes("创业")) return "商业";
  return "科技";
}

function normalizeTags(topic) {
  if (Array.isArray(topic.aiTags) && topic.aiTags.length > 0) return topic.aiTags;
  if (Array.isArray(topic.tags) && topic.tags.length > 0) return topic.tags;
  if (Array.isArray(topic.keywords) && topic.keywords.length > 0) return topic.keywords;
  return ["热点观察", "内容选题", "播客素材"];
}

function App() {
  const [activePage, setActivePage] = useState("discover");
  const [topics, setTopics] = useState(trendingTopics);
  const [selectedTopicIds, setSelectedTopicIds] = useState(["1"]);
  const [selectedCategory, setSelectedCategory] = useState("全部");
  const [scriptText, setScriptText] = useState(initialScript);
  const [inputText, setInputText] = useState("请根据当前热点，生成一段适合中文播客的节目脚本。");
  const [selectedModel, setSelectedModel] = useState("kimi");
  const [messages, setMessages] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");
  const [isRefreshingTrends, setIsRefreshingTrends] = useState(false);
  const [trendsError, setTrendsError] = useState("");

  const selectedTopics = topics.filter((topic) => selectedTopicIds.includes(topic.id));
  const primaryTopic = selectedTopics[0] || topics[0];

  const dashboardStats = {
    draftsThisWeek: Math.max(1, Math.ceil(messages.length / 2) + 6),
    audioGenerated: 14,
    highScoreClips: 26,
  };

  const pageTitle = pages.find((page) => page.id === activePage)?.label ?? "AI Podcast Studio";

  const toggleTopic = (topicId) => {
    setSelectedTopicIds((prev) =>
      prev.includes(topicId)
        ? prev.filter((id) => id !== topicId)
        : [...prev, topicId],
    );
  };

  const handleRefreshTrends = async () => {
    setIsRefreshingTrends(true);
    setTrendsError("");

    try {
      const res = await fetch("/api/generate-trends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          niche: "AI, marketing, podcast, creator economy",
          language: "中文",
          requireAiTags: true,
          tagRule: "请为每个热点生成更贴合主题的3个中文标签，不要泛泛写AI/热点/播客。",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(typeof data?.error === "string" ? data.error : "刷新趋势失败，请检查 generate-trends 接口");
      }

      const newTopics = Array.isArray(data.trends) ? data.trends : [];

      const formattedTopics = newTopics.map((topic, index) => ({
        id: String(Date.now() + index),
        title: topic.title || `AI 播客选题 ${index + 1}`,
        source: topic.source || "AI 聚合",
        platform: topic.platform || topic.source || "AI 聚合",
        category: normalizeCategory(topic.category || topic.tag || topic.type),
        heat: topic.heat || Math.floor(Math.random() * 20) + 75,
        tags: normalizeTags(topic),
        summary: topic.summary || topic.reason || "该选题具备热点讨论度，适合展开播客内容。",
      }));

      if (formattedTopics.length === 0) throw new Error("接口返回为空");

      setTopics(formattedTopics);
      setSelectedTopicIds([formattedTopics[0].id]);
      setSelectedCategory("全部");
    } catch (error) {
      setTrendsError(error.message || "刷新趋势失败");
    } finally {
      setIsRefreshingTrends(false);
    }
  };

  const handleGenerateScript = async (customInstruction = inputText) => {
    const selectedTopicText = selectedTopics
      .map(
        (topic) =>
          `【${topic.platform}｜${normalizeCategory(topic.category)}】${topic.title}
摘要：${topic.summary}
AI标签：${normalizeTags(topic).join("、")}`,
      )
      .join("\n\n");

    const finalInput = `
你是一个专业中文播客编剧。请进行真实多轮对话式创作：你必须基于“当前脚本 + 历史对话 + 用户最新指令”修改脚本，而不是每次重新生成无关内容。

当前脚本：
${scriptText || "暂无当前脚本"}

已选择热点：
${selectedTopicText || "暂无已选择热点"}

用户最新指令：
${customInstruction}

输出要求：
1. 如果用户要求修改，请直接输出修改后的完整脚本。
2. 如果用户要求生成，请基于已选择热点生成融合多主题脚本。
3. 保留当前脚本中有价值的结构和观点。
4. 根据用户指令调整语气、长度、语言、结构。
5. 不要解释你做了什么，只输出最终可用的播客脚本。
`;

    setIsGenerating(true);
    setGenerateError("");

    try {
      const newMessages = [...messages, { role: "user", content: customInstruction }];
      setMessages(newMessages);

      const res = await fetch("/api/generate-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: finalInput,
          model: selectedModel,
          messages: newMessages,
          currentScript: scriptText,
          selectedTopics,
        }),
      });

      const rawText = await res.text();

let data;
try {
  data = JSON.parse(rawText);
} catch {
  throw new Error(rawText || "后端返回的不是 JSON，请检查 generate-trends 接口");
}

      if (!res.ok) throw new Error(data?.error || "脚本生成失败");

      const newScript = data.script || "";
      setScriptText(newScript);
      setMessages([...newMessages, { role: "assistant", content: newScript }]);
      setActivePage("draft");
    } catch (error) {
      setGenerateError(error.message || "生成失败，请稍后重试");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-mist text-ink">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,_rgba(29,155,240,0.20),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(255,122,89,0.16),_transparent_22%)]" />
      <div className="fixed inset-0 -z-10 bg-soft-grid bg-[size:44px_44px] opacity-40" />

      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside className="w-full border-b border-slate-200 bg-white/75 p-5 backdrop-blur lg:w-72 lg:border-b-0 lg:border-r">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ink text-lg font-semibold text-white">
              AP
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">内容工作台</p>
              <h1 className="text-xl font-semibold">AI Podcast Studio</h1>
            </div>
          </div>

          <nav className="mt-8 space-y-2">
            {pages.map((page) => (
              <button
                key={page.id}
                type="button"
                onClick={() => setActivePage(page.id)}
                className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition ${
                  page.id === activePage
                    ? "bg-ink text-white shadow-panel"
                    : "bg-slate-50 text-slate-600 hover:bg-white hover:text-ink"
                }`}
              >
                <span className="text-lg">{page.icon}</span>
                <span className="font-medium">{page.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        <main className="flex-1 p-5 lg:p-8">
          <header className="mb-6 flex flex-col gap-4 rounded-[28px] border border-white/60 bg-white/80 p-6 shadow-panel backdrop-blur lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Workspace</p>
              <h2 className="mt-2 text-3xl font-semibold">{pageTitle}</h2>
              <p className="mt-2 text-sm text-slate-500">
                聚合国内外热点，10 分钟完成选题、初稿、音频和高分切片。
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <MetricCard label="本周草稿" value={dashboardStats.draftsThisWeek} />
              <MetricCard label="生成音频" value={dashboardStats.audioGenerated} />
              <MetricCard label="高分切片" value={dashboardStats.highScoreClips} />
            </div>
          </header>

          {activePage === "discover" && (
            <DiscoverPage
              topics={topics}
              selectedTopicIds={selectedTopicIds}
              selectedTopics={selectedTopics}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              onToggleTopic={toggleTopic}
              inputText={inputText}
              onInputTextChange={setInputText}
              onGenerateScript={handleGenerateScript}
              isGenerating={isGenerating}
              generateError={generateError}
              onRefreshTrends={handleRefreshTrends}
              isRefreshingTrends={isRefreshingTrends}
              trendsError={trendsError}
            />
          )}

          {activePage === "draft" && (
            <DraftPage
              selectedTopics={selectedTopics}
              scriptText={scriptText}
              onScriptTextChange={setScriptText}
              inputText={inputText}
              onInputTextChange={setInputText}
              selectedModel={selectedModel}
              onSelectedModelChange={setSelectedModel}
              messages={messages}
              onGenerateScript={handleGenerateScript}
              isGenerating={isGenerating}
              generateError={generateError}
            />
          )}

          {activePage === "audio" && (
            <AudioPage voices={voiceOptions} scriptText={scriptText} selectedTopic={primaryTopic} />
          )}

          {activePage === "clips" && (
            <ClipsPage scriptText={scriptText} selectedTopics={selectedTopics} />
          )}
        </main>
      </div>
    </div>
  );
}

function MetricCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}

function Card({ className = "", children }) {
  return (
    <section className={`rounded-[28px] border border-white/70 bg-white/85 p-6 shadow-panel ${className}`}>
      {children}
    </section>
  );
}

function DiscoverPage({
  topics,
  selectedTopicIds,
  selectedTopics,
  selectedCategory,
  onSelectCategory,
  onToggleTopic,
  inputText,
  onInputTextChange,
  onGenerateScript,
  isGenerating,
  generateError,
  onRefreshTrends,
  isRefreshingTrends,
  trendsError,
}) {
  const filteredTopics =
    selectedCategory === "全部"
      ? topics
      : topics.filter((topic) => normalizeCategory(topic.category || topic.tag || topic.type) === selectedCategory);

  const selectedPlatforms = [...new Set(selectedTopics.map((topic) => topic.platform))];

  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-xl font-semibold">热点抓取</h3>
            <p className="mt-1 text-sm text-slate-500">
              聚合 X、Instagram、Google Trends RSS、微博、小红书、头条等热点来源。
            </p>
          </div>
          <button
            type="button"
            onClick={onRefreshTrends}
            disabled={isRefreshingTrends}
            className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isRefreshingTrends ? "AI 分析中..." : "AI 刷新热点"}
          </button>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => onSelectCategory(category)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                selectedCategory === category
                  ? "bg-ink text-white"
                  : "border border-slate-200 bg-white text-slate-600"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {trendsError && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {trendsError}
          </div>
        )}

        {filteredTopics.length === 0 && (
          <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <p className="text-sm font-medium text-slate-600">该分类下暂无选题</p>
            <p className="mt-2 text-sm text-slate-500">
              可以切换到「全部」，或点击「AI 刷新热点」重新获取。
            </p>
          </div>
        )}

        <div className="mt-6 space-y-4">
          {filteredTopics.map((topic) => {
            const isSelected = selectedTopicIds.includes(topic.id);
            const safeCategory = normalizeCategory(topic.category || topic.tag || topic.type);
            const safeTags = normalizeTags(topic);

            return (
              <button
                key={topic.id}
                type="button"
                onClick={() => onToggleTopic(topic.id)}
                className={`w-full rounded-3xl border p-5 text-left transition ${
                  isSelected
                    ? "border-brand-500 bg-brand-50"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                        {safeCategory}
                      </span>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-brand-700">
                        {topic.platform}
                      </span>
                      <span className="text-xs font-medium text-pine">Heat {topic.heat}</span>
                    </div>
                    <h4 className="mt-3 text-lg font-semibold">{topic.title}</h4>
                    <p className="mt-2 text-sm leading-6 text-slate-500">{topic.summary}</p>
                  </div>

                  <div className="flex flex-wrap gap-2 sm:max-w-[230px] sm:justify-end">
                    {safeTags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-500"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      <Card className="flex flex-col justify-between">
        <div>
          <p className="text-sm text-slate-400">已选择热点</p>
          <h3 className="mt-2 text-2xl font-semibold">{selectedTopics.length} 个主题</h3>

          <div className="mt-4 flex flex-wrap gap-2">
            {selectedPlatforms.map((platform) => (
              <span key={platform} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                来源：{platform}
              </span>
            ))}
          </div>

          <div className="mt-5 space-y-3">
            {selectedTopics.map((topic) => (
              <div key={topic.id} className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm font-semibold">{topic.title}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {topic.platform} / {normalizeCategory(topic.category)}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {normalizeTags(topic).map((tag) => (
                    <span key={tag} className="rounded-full bg-white px-2 py-1 text-[11px] text-slate-500">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {selectedTopics.length === 0 && (
            <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
              请至少选择一个热点。
            </p>
          )}
        </div>

        <div className="mt-6">
          <label className="text-sm font-medium text-slate-600">补充指令 / 内容</label>
          <textarea
            value={inputText}
            onChange={(event) => onInputTextChange(event.target.value)}
            placeholder="例如：请融合国内外热点，生成一个更有观点的商业播客脚本。"
            className="mt-3 min-h-[150px] w-full rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700 outline-none transition focus:border-brand-500 focus:bg-white"
          />
        </div>

        {generateError && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {generateError}
          </div>
        )}

        <button
          type="button"
          onClick={() => onGenerateScript(inputText)}
          disabled={isGenerating || selectedTopics.length === 0}
          className="mt-6 w-full rounded-2xl bg-brand-600 px-4 py-3 font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isGenerating ? "AI 正在融合生成..." : "生成融合脚本"}
        </button>
      </Card>
    </div>
  );
}

function DraftPage({
  selectedTopics,
  scriptText,
  onScriptTextChange,
  inputText,
  onInputTextChange,
  selectedModel,
  onSelectedModelChange,
  messages,
  onGenerateScript,
  isGenerating,
  generateError,
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[0.72fr_1.28fr]">
      <Card className="flex min-h-[720px] flex-col">
        <div>
          <h3 className="text-xl font-semibold">AI 对话式脚本生成</h3>
          <p className="mt-1 text-sm text-slate-500">
            真实多轮对话：当前脚本、历史对话和新指令会一起传给模型。
          </p>

          <div className="mt-6 rounded-3xl bg-slate-50 p-5">
            <p className="text-sm text-slate-500">当前融合主题</p>
            <div className="mt-3 space-y-2">
              {selectedTopics.map((topic) => (
                <p key={topic.id} className="text-sm font-medium leading-6">
                  【{topic.platform}】{topic.title}
                </p>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <label className="text-sm font-medium text-slate-600">选择模型</label>
            <select
              value={selectedModel}
              onChange={(event) => onSelectedModelChange(event.target.value)}
              className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-brand-500"
            >
              {modelOptions.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-6">
            <label className="text-sm font-medium text-slate-600">输入新指令</label>
            <textarea
              value={inputText}
              onChange={(event) => onInputTextChange(event.target.value)}
              placeholder="例如：把当前脚本改成更犀利的商业评论风格，并保留原来的结构。"
              className="mt-3 min-h-[130px] w-full rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700 outline-none transition focus:border-brand-500 focus:bg-white"
            />
          </div>

          {generateError && (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {generateError}
            </div>
          )}

          <button
            type="button"
            onClick={() => onGenerateScript(inputText)}
            disabled={isGenerating}
            className="mt-6 w-full rounded-2xl bg-coral px-4 py-3 font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isGenerating ? "AI 修改中..." : "发送给 AI"}
          </button>
        </div>

        <div className="mt-6 flex-1 rounded-3xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-600">历史对话</p>
            <p className="text-xs text-slate-400">{messages.length} 条记录</p>
          </div>

          <div className="mt-3 max-h-72 space-y-3 overflow-y-auto pr-1">
            {messages.length === 0 && (
              <div className="rounded-2xl bg-white p-4 text-sm text-slate-500">
                暂无历史对话。发送指令后，这里会滚动保存你的要求和 AI 返回版本。
              </div>
            )}

            {messages.map((message, index) => (
              <details
                key={index}
                className={`rounded-2xl p-3 text-sm leading-6 ${
                  message.role === "user"
                    ? "bg-white text-slate-700"
                    : "bg-brand-50 text-slate-700"
                }`}
              >
                <summary className="cursor-pointer text-sm font-medium">
                  {message.role === "user"
                    ? `我的指令 ${Math.ceil((index + 1) / 2)}`
                    : `AI 回复 ${Math.ceil((index + 1) / 2)}`}
                </summary>

                <div className="mt-3 max-h-56 overflow-y-auto whitespace-pre-wrap rounded-2xl bg-white/80 p-3 text-sm leading-7">
                  {message.content}
                </div>

                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(message.content)}
                  className="mt-3 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600"
                >
                  复制
                </button>
              </details>
            ))}
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-xl font-semibold">播客脚本</h3>
            <p className="mt-1 text-sm text-slate-500">可直接编辑当前脚本，下一轮 AI 会基于这里的最新内容继续修改。</p>
          </div>
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(scriptText)}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600"
          >
            复制当前脚本
          </button>
        </div>

        <textarea
          value={scriptText}
          onChange={(event) => onScriptTextChange(event.target.value)}
          className="mt-6 min-h-[620px] w-full rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm leading-7 text-slate-700 outline-none transition focus:border-brand-500 focus:bg-white"
        />
      </Card>
    </div>
  );
}

function AudioPage({ voices, scriptText, selectedTopic }) {
  const [selectedVoiceIndex, setSelectedVoiceIndex] = useState(0);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioError, setAudioError] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [progress, setProgress] = useState(0);
  const audioRef = useRef(null);

  const elevenVoices = [
    {
      name: "女主播 · 清晰自然",
      voiceId: "bhJUNIXWQQ94l8eI2VUf",
      language: "中文 / 英文",
      speed: "1.0x",
    },
    {
      name: "男主播 · 温柔叙事",
      voiceId: "MI36FIkp9wRP7cpWKPTl",
      language: "中文 / 英文",
      speed: "1.0x",
    },
    {
      name: "男主播 · 沉稳厚重",
      voiceId: "DowyQ68vDpgFYdWVGjc3",
      language: "中文 / 英文",
      speed: "1.0x",
    },
  ];

  const currentVoice = elevenVoices[selectedVoiceIndex];

  const handleGenerateAudio = async () => {
    setAudioError("");
    setProgress(0);

    if (!scriptText?.trim()) {
      setAudioError("请先在脚本草稿页生成或填写播客脚本。");
      return;
    }

    try {
      setIsGeneratingAudio(true);
      setIsPlaying(false);

      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        setAudioUrl("");
      }

      const res = await fetch("/api/generate-audio", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: scriptText,
          voiceId: currentVoice.voiceId,
        }),
      });

      if (!res.ok) {
        const rawText = await res.text();

        let data = null;
        try {
          data = JSON.parse(rawText);
        } catch {
          data = null;
        }

        const message =
          data?.error && data?.detail
            ? `${data.error}: ${
                typeof data.detail === "string"
                  ? data.detail
                  : JSON.stringify(data.detail)
              }`
            : data?.error || data?.message || rawText || "音频生成失败";

        throw new Error(message);
      }

      const blob = await res.blob();

      if (!blob || blob.size === 0) {
        throw new Error("音频为空，请检查 ElevenLabs 返回。");
      }

      const url = URL.createObjectURL(blob);
      setAudioUrl(url);

      setTimeout(async () => {
        try {
          if (audioRef.current) {
            audioRef.current.src = url;
            await audioRef.current.play();
            setIsPlaying(true);
          }
        } catch {
          setAudioError("音频已生成，但浏览器阻止了自动播放，请点击播放。");
        }
      }, 300);
    } catch (error) {
      setAudioError(error.message || "音频生成失败");
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const handleTogglePlay = async () => {
    if (!audioRef.current || !audioUrl) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      try {
        await audioRef.current.play();
        setIsPlaying(true);
      } catch {
        setAudioError("播放失败，请重新生成音频或检查浏览器权限。");
      }
    }
  };

  const handleResetAudio = () => {
    if (!audioRef.current) return;

    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    setIsPlaying(false);
    setProgress(0);
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[0.88fr_1.12fr]">
      <Card>
        <h3 className="text-xl font-semibold">语音参数</h3>
        <p className="mt-1 text-sm text-slate-500">
          使用 ElevenLabs 生成播客音频，支持生成后自动播放。
        </p>

        <div className="mt-6 space-y-4">
          {elevenVoices.map((voice, index) => (
            <button
              type="button"
              key={voice.name}
              onClick={() => setSelectedVoiceIndex(index)}
              className={`w-full rounded-3xl border p-5 text-left transition ${
                selectedVoiceIndex === index
                  ? "border-brand-500 bg-brand-50"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">{voice.name}</h4>
                <span className="text-xs text-slate-500">{voice.speed}</span>
              </div>
              <p className="mt-2 text-sm text-slate-500">{voice.language}</p>
            </button>
          ))}
        </div>

        {audioError && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {audioError}
          </div>
        )}

        <button
          type="button"
          onClick={handleGenerateAudio}
          disabled={isGeneratingAudio}
          className="mt-6 w-full rounded-2xl bg-brand-600 px-4 py-3 font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isGeneratingAudio ? "正在生成音频..." : "生成音频"}
        </button>
      </Card>

      <Card>
        <div className="rounded-[30px] bg-gradient-to-br from-ink via-slate-800 to-brand-700 p-6 text-white">
          <p className="text-sm text-white/70">生成预览</p>
          <h3 className="mt-2 text-2xl font-semibold">
            {selectedTopic?.title || "AI Podcast Episode"}
          </h3>

          <audio
            ref={audioRef}
            src={audioUrl}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onTimeUpdate={(event) => {
              const audio = event.currentTarget;
              if (audio.duration) {
                setProgress(Math.min((audio.currentTime / audio.duration) * 100, 100));
              }
            }}
            onEnded={() => {
              setIsPlaying(false);
              setProgress(100);
            }}
          />

          <div className="mt-8 rounded-3xl bg-white/10 p-5">
            <div className="flex items-center justify-between text-sm text-white/80">
              <span>
                {isGeneratingAudio
                  ? "Generating"
                  : isPlaying
                    ? "Playing"
                    : audioUrl
                      ? "Ready"
                      : "Not generated"}
              </span>
              <span>{currentVoice?.name}</span>
            </div>

            <div className="mt-3 h-2 rounded-full bg-white/15">
              <div
                className="h-2 rounded-full bg-gold transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
              <button
                type="button"
                onClick={handleTogglePlay}
                disabled={!audioUrl}
                className="rounded-full bg-white px-8 py-3 text-sm font-semibold text-ink shadow-lg transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPlaying ? "暂停" : "播放"}
              </button>

              <button
                type="button"
                onClick={handleResetAudio}
                disabled={!audioUrl}
                className="rounded-full bg-white/10 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40"
              >
                重置
              </button>

              <a
                href={audioUrl || undefined}
                download="podcast-audio.mp3"
                className={`rounded-full bg-white/10 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/20 ${
                  !audioUrl ? "pointer-events-none opacity-40" : ""
                }`}
              >
                下载
              </a>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
function ClipsPage({ scriptText, selectedTopics }) {
  const [generatedClips, setGeneratedClips] = useState([]);
  const [isGeneratingClips, setIsGeneratingClips] = useState(false);
  const [clipsError, setClipsError] = useState("");
  const [clipDuration, setClipDuration] = useState("AI 自动判断");
  const [platform, setPlatform] = useState("AI 自动判断");
  const [clipTags, setClipTags] = useState("AI 自动生成");

  const handleGenerateClips = async () => {
    setIsGeneratingClips(true);
    setClipsError("");

    if (!scriptText?.trim()) {
      setClipsError("请先在脚本草稿页生成或填写播客脚本。");
      setIsGeneratingClips(false);
      return;
    }

    try {
      const res = await fetch("/api/generate-clips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          script: scriptText,
          selectedTopics,
          durationPreference: clipDuration,
          platformPreference: platform,
          tagPreference: clipTags,
          autoStrategy: true,
          requirement:
            "请基于热点和脚本内容，生成热点切片片段，并为每个片段自动给出建议时长、适合平台和内容标签。",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(typeof data?.error === "string" ? data.error : "切片生成失败，请检查 generate-clips 接口");
      }

      const clips = Array.isArray(data.clips) ? data.clips : [];
      if (clips.length === 0) throw new Error("接口返回为空，没有生成切片。");

      setGeneratedClips(clips);
    } catch (error) {
      setClipsError(error.message || "切片生成失败");
    } finally {
      setIsGeneratingClips(false);
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold">热点高分切片</h3>
            <p className="mt-1 text-sm text-slate-500">
              AI 根据热点和脚本内容，提取适合传播的片段，并自动生成时长、平台和标签。
            </p>
          </div>
          <button
            type="button"
            onClick={handleGenerateClips}
            disabled={isGeneratingClips}
            className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isGeneratingClips ? "生成中..." : "生成热点切片"}
          </button>
        </div>

        {clipsError && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {clipsError}
          </div>
        )}

        {generatedClips.length === 0 && !clipsError && (
          <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <p className="text-sm font-medium text-slate-600">还没有生成热点切片</p>
            <p className="mt-2 text-sm text-slate-500">
              点击「生成热点切片」后，AI 会结合热点和脚本内容生成片段策略。
            </p>
          </div>
        )}

        <div className="mt-6 space-y-4">
          {generatedClips.map((clip, index) => {
            const tags = Array.isArray(clip.tags) ? clip.tags : [];
            return (
              <div key={index} className="rounded-3xl border border-slate-200 bg-white p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h4 className="text-lg font-semibold">
                      {clip.title || clip.hotspot || `热点切片 ${index + 1}`}
                    </h4>

                    <p className="mt-2 text-sm text-slate-500">
                      {clip.duration || clip.time || "AI 建议时长"} / {clip.platform || "AI 建议平台"}
                    </p>

                    {clip.relatedHotTopic && (
                      <p className="mt-2 text-xs text-brand-700">
                        关联热点：{clip.relatedHotTopic}
                      </p>
                    )}

                    {tags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {tags.map((tag) => (
                          <span key={tag} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {clip.content && (
                      <div className="mt-3 rounded-2xl bg-slate-50 p-4 text-sm leading-7 text-slate-700">
                        {clip.content}
                      </div>
                    )}

                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      {clip.reason || "该片段和热点相关度高，适合用于短视频传播。"}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-brand-50 px-4 py-3 text-center">
                    <p className="text-xs text-slate-500">Score</p>
                    <p className="mt-1 text-2xl font-semibold text-brand-700">{clip.score || 88}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card>
        <h3 className="text-xl font-semibold">切片策略面板</h3>
        <p className="mt-1 text-sm text-slate-500">默认由 AI 自动判断，也可以输入偏好。</p>

        <div className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-600">切片时长偏好</label>
            <input
              value={clipDuration}
              onChange={(event) => setClipDuration(event.target.value)}
              placeholder="例如：AI 自动判断 / 30秒 / 45秒"
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-600">发布平台偏好</label>
            <select
              value={platform}
              onChange={(event) => setPlatform(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-brand-500"
            >
              <option value="AI 自动判断">AI 自动判断</option>
              <option value="抖音">抖音</option>
              <option value="小红书">小红书</option>
              <option value="TikTok">TikTok</option>
              <option value="YouTube Shorts">YouTube Shorts</option>
              <option value="视频号">视频号</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-600">内容标签偏好</label>
            <input
              value={clipTags}
              onChange={(event) => setClipTags(event.target.value)}
              placeholder="例如：AI 自动生成 / AI,热点,商业"
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-brand-500"
            />
          </div>

          <div className="rounded-3xl bg-slate-50 p-5">
            <p className="text-sm text-slate-500">当前脚本长度</p>
            <p className="mt-2 text-lg font-semibold">{scriptText ? `${scriptText.length} 字符` : "暂无脚本"}</p>
          </div>

          <div className="rounded-3xl bg-slate-50 p-5">
            <p className="text-sm text-slate-500">已选择热点</p>
            <div className="mt-3 space-y-2">
              {selectedTopics.map((topic) => (
                <p key={topic.id} className="text-sm font-medium leading-6">
                  【{topic.platform}】{topic.title}
                </p>
              ))}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGenerateClips}
          disabled={isGeneratingClips}
          className="mt-6 w-full rounded-2xl bg-coral px-4 py-3 font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isGeneratingClips ? "AI 正在分析热点..." : "AI 生成热点切片"}
        </button>
      </Card>
    </div>
  );
}

export default App;
