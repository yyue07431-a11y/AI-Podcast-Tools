import { useState } from "react";

const pages = [
  { id: "discover", label: "发现选题", icon: "◌" },
  { id: "draft", label: "脚本草稿", icon: "✎" },
  { id: "audio", label: "音频生成", icon: "▶" },
  { id: "clips", label: "Clip Studio", icon: "✦" },
];

const trendingTopics = [
  {
    title: "AI Agent 正在如何改变内容生产工作流",
    tag: "热门",
    momentum: "+32%",
    summary: "聚焦团队协作、自动化执行与多代理编排的最新讨论热度。",
    keywords: ["Agent", "Workflow", "Automation"],
  },
  {
    title: "多模态播客：声音、字幕与短视频联动",
    tag: "增长快",
    momentum: "+24%",
    summary: "从长音频到短内容分发，讨论如何一次生成多平台素材。",
    keywords: ["Multimodal", "Short Clips", "Distribution"],
  },
  {
    title: "AI 创业公司融资窗口是否回暖",
    tag: "商业",
    momentum: "+18%",
    summary: "适合做行业解读型节目，结合数据、案例和投资视角展开。",
    keywords: ["Startup", "Funding", "Market"],
  },
  {
    title: "开发者为什么重新重视语音交互产品",
    tag: "洞察",
    momentum: "+15%",
    summary: "从用户体验到设备生态，语音界面的关注度正在回升。",
    keywords: ["Voice UI", "Product", "UX"],
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

const clips = [
  {
    title: "AI 不是工具，而是新同事",
    time: "00:12 - 00:34",
    score: 94,
    reason: "情绪起势强，适合首屏短视频开场。",
  },
  {
    title: "工作流被重新设计",
    time: "02:15 - 02:45",
    score: 89,
    reason: "观点清晰，关键词密集，适合知识型内容截取。",
  },
  {
    title: "一次生成多平台素材",
    time: "05:02 - 05:28",
    score: 84,
    reason: "具备方法论总结感，适合作为转化片段。",
  },
];

function App() {
  const [activePage, setActivePage] = useState("discover");
  const [topics, setTopics] = useState(trendingTopics);
  const [selectedTopic, setSelectedTopic] = useState(trendingTopics[0]);
  const [scriptText, setScriptText] = useState(initialScript);
  const [assistantMode, setAssistantMode] = useState("润色语气");
  const [inputText, setInputText] = useState(
    "请根据当前热点，生成一段适合中文播客的节目脚本。",
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");
  const [isRefreshingTrends, setIsRefreshingTrends] = useState(false);
  const [trendsError, setTrendsError] = useState("");

  const pageTitle =
    pages.find((page) => page.id === activePage)?.label ?? "AI Podcast Studio";

  const handleRefreshTrends = async () => {
    setIsRefreshingTrends(true);
    setTrendsError("");

    try {
      const res = await fetch("/api/generate-trends", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          niche: "AI, marketing, podcast, creator economy",
          language: "中文",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          typeof data?.error === "string"
            ? data.error
            : "刷新趋势失败，请检查 generate-trends 接口",
        );
      }

      const newTopics = Array.isArray(data.trends) ? data.trends : [];

      const formattedTopics = newTopics.map((topic, index) => ({
        title: topic.title || `AI 播客选题 ${index + 1}`,
        tag: topic.tag || "AI 推荐",
        momentum: topic.momentum || `+${Math.floor(Math.random() * 20) + 10}%`,
        summary: topic.summary || topic.reason || "该选题具备热点讨论度，适合展开播客内容。",
        keywords: Array.isArray(topic.keywords)
          ? topic.keywords
          : ["AI", "Podcast", "Trend"],
      }));

      if (formattedTopics.length === 0) {
        throw new Error("接口返回为空");
      }

      setTopics(formattedTopics);
      setSelectedTopic(formattedTopics[0]);
    } catch (error) {
      console.error(error);
      setTrendsError(error.message || "刷新趋势失败");
    } finally {
      setIsRefreshingTrends(false);
    }
  };

  const handleGenerateScript = async () => {
    const finalInput = `
选题：${selectedTopic.title}
选题摘要：${selectedTopic.summary}
用户补充内容：${inputText}
`;

    if (!finalInput.trim()) return;

    setIsGenerating(true);
    setGenerateError("");

    try {
      const res = await fetch("/api/generate-script", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: finalInput,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "脚本生成失败");
      }

      setScriptText(data.script || "");
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
            {pages.map((page) => {
              const isActive = page.id === activePage;
              return (
                <button
                  key={page.id}
                  type="button"
                  onClick={() => setActivePage(page.id)}
                  className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition ${
                    isActive
                      ? "bg-ink text-white shadow-panel"
                      : "bg-slate-50 text-slate-600 hover:bg-white hover:text-ink"
                  }`}
                >
                  <span className="text-lg">{page.icon}</span>
                  <span className="font-medium">{page.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="mt-8 rounded-3xl bg-gradient-to-br from-brand-500 to-coral p-5 text-white shadow-panel">
            <p className="text-sm opacity-80">本周效率</p>
            <p className="mt-2 text-3xl font-semibold">12.4h</p>
            <p className="mt-3 text-sm leading-6 text-white/80">
              从选题到切片，一套工作流完成播客内容生产。
            </p>
          </div>
        </aside>

        <main className="flex-1 p-5 lg:p-8">
          <header className="mb-6 flex flex-col gap-4 rounded-[28px] border border-white/60 bg-white/80 p-6 shadow-panel backdrop-blur lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Workspace</p>
              <h2 className="mt-2 text-3xl font-semibold">{pageTitle}</h2>
              <p className="mt-2 text-sm text-slate-500">
                面向中文播客创作的 AI 工作台，已接入真实 AI 脚本生成接口。
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <MetricCard label="今日草稿" value="08" />
              <MetricCard label="生成音频" value="14" />
              <MetricCard label="高分切片" value="26" />
            </div>
          </header>

          {activePage === "discover" && (
            <DiscoverPage
              topics={topics}
              selectedTopic={selectedTopic}
              onSelectTopic={setSelectedTopic}
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
              selectedTopic={selectedTopic}
              scriptText={scriptText}
              onScriptTextChange={setScriptText}
              assistantMode={assistantMode}
              onAssistantModeChange={setAssistantMode}
              inputText={inputText}
              onInputTextChange={setInputText}
              onGenerateScript={handleGenerateScript}
              isGenerating={isGenerating}
              generateError={generateError}
            />
          )}

          {activePage === "audio" && (
            <AudioPage
              voices={voiceOptions}
              scriptText={scriptText}
              selectedTopic={selectedTopic}
            />
          )}

          {activePage === "clips" && <ClipsPage clips={clips} />}
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
  selectedTopic,
  onSelectTopic,
  inputText,
  onInputTextChange,
  onGenerateScript,
  isGenerating,
  generateError,
  onRefreshTrends,
  isRefreshingTrends,
  trendsError,
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold">趋势选题</h3>
            <p className="mt-1 text-sm text-slate-500">抓取近期讨论热度，帮助快速决定节目方向。</p>
          </div>
          <button
            type="button"
            onClick={onRefreshTrends}
            disabled={isRefreshingTrends}
            className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isRefreshingTrends ? "刷新中..." : "刷新趋势"}
          </button>
        </div>

        {trendsError && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {trendsError}
          </div>
        )}

        <div className="mt-6 space-y-4">
          {topics.map((topic) => {
            const isSelected = topic.title === selectedTopic.title;
            return (
              <button
                key={topic.title}
                type="button"
                onClick={() => onSelectTopic(topic)}
                className={`w-full rounded-3xl border p-5 text-left transition ${
                  isSelected
                    ? "border-brand-500 bg-brand-50"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                        {topic.tag}
                      </span>
                      <span className="text-xs font-medium text-pine">{topic.momentum}</span>
                    </div>
                    <h4 className="mt-3 text-lg font-semibold">{topic.title}</h4>
                    <p className="mt-2 text-sm leading-6 text-slate-500">{topic.summary}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {topic.keywords.map((keyword) => (
                      <span
                        key={keyword}
                        className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-500"
                      >
                        {keyword}
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
          <p className="text-sm text-slate-400">当前选题</p>
          <h3 className="mt-2 text-2xl font-semibold">{selectedTopic.title}</h3>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            推荐从「背景趋势 - 行业变化 - 案例拆解 - 方法总结」的结构展开，兼顾信息密度和可听性。
          </p>
        </div>

        <div className="mt-6">
          <label className="text-sm font-medium text-slate-600">补充热点内容 / 文章正文</label>
          <textarea
            value={inputText}
            onChange={(event) => onInputTextChange(event.target.value)}
            placeholder="粘贴新闻、社媒热点、文章摘要，AI 会基于该内容生成播客脚本。"
            className="mt-3 min-h-[150px] w-full rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700 outline-none transition focus:border-brand-500 focus:bg-white"
          />
        </div>

        {generateError && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {generateError}
          </div>
        )}

        <div className="mt-6 space-y-4">
          <div className="rounded-3xl bg-slate-50 p-5">
            <p className="text-sm font-medium text-slate-500">推荐节目形式</p>
            <p className="mt-2 text-lg font-semibold">单人解读 + 案例点评</p>
          </div>
          <button
            type="button"
            onClick={onGenerateScript}
            disabled={isGenerating}
            className="w-full rounded-2xl bg-brand-600 px-4 py-3 font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isGenerating ? "AI 正在生成脚本..." : "用该选题生成脚本"}
          </button>
        </div>
      </Card>
    </div>
  );
}

function DraftPage({
  selectedTopic,
  scriptText,
  onScriptTextChange,
  assistantMode,
  onAssistantModeChange,
  inputText,
  onInputTextChange,
  onGenerateScript,
  isGenerating,
  generateError,
}) {
  const assists = ["润色语气", "扩展案例", "精简为 5 分钟", "改成访谈风格"];

  return (
    <div className="grid gap-6 xl:grid-cols-[0.72fr_1.28fr]">
      <Card>
        <h3 className="text-xl font-semibold">AI 助手</h3>
        <p className="mt-1 text-sm text-slate-500">围绕当前主题，对脚本进行生成、重写、扩展或压缩。</p>

        <div className="mt-6 rounded-3xl bg-slate-50 p-5">
          <p className="text-sm text-slate-500">当前主题</p>
          <p className="mt-2 text-lg font-semibold leading-8">{selectedTopic.title}</p>
        </div>

        <div className="mt-6">
          <label className="text-sm font-medium text-slate-600">输入内容</label>
          <textarea
            value={inputText}
            onChange={(event) => onInputTextChange(event.target.value)}
            className="mt-3 min-h-[130px] w-full rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700 outline-none transition focus:border-brand-500 focus:bg-white"
          />
        </div>

        <div className="mt-6 space-y-3">
          {assists.map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => onAssistantModeChange(mode)}
              className={`w-full rounded-2xl border px-4 py-3 text-left ${
                assistantMode === mode
                  ? "border-ink bg-ink text-white"
                  : "border-slate-200 bg-white text-slate-700"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>

        {generateError && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {generateError}
          </div>
        )}

        <button
          type="button"
          onClick={onGenerateScript}
          disabled={isGenerating}
          className="mt-6 w-full rounded-2xl bg-coral px-4 py-3 font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isGenerating ? "生成中..." : "运行 AI 生成"}
        </button>
      </Card>

      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-xl font-semibold">播客脚本</h3>
            <p className="mt-1 text-sm text-slate-500">支持手动编辑，也可用 AI 辅助优化脚本结构。</p>
          </div>
          <div className="flex gap-3">
            <button className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600">
              保存版本
            </button>
            <button
              type="button"
              onClick={onGenerateScript}
              disabled={isGenerating}
              className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {isGenerating ? "生成中" : "自动续写"}
            </button>
          </div>
        </div>

        <textarea
          value={scriptText}
          onChange={(event) => onScriptTextChange(event.target.value)}
          className="mt-6 min-h-[420px] w-full rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm leading-7 text-slate-700 outline-none transition focus:border-brand-500 focus:bg-white"
        />
      </Card>
    </div>
  );
}

function AudioPage({ voices, scriptText, selectedTopic }) {
  const [selectedVoiceIndex, setSelectedVoiceIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioError, setAudioError] = useState("");

  const currentVoice = voices[selectedVoiceIndex];

  const handlePlayAudio = () => {
    setAudioError("");

    if (!scriptText || !scriptText.trim()) {
      setAudioError("请先在脚本草稿页生成或填写播客脚本。");
      return;
    }

    if (!window.speechSynthesis) {
      setAudioError("当前浏览器不支持语音播放，请使用 Chrome 浏览器测试。");
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(scriptText);
    utterance.lang = "zh-CN";

    const browserVoices = window.speechSynthesis.getVoices();
    const chineseVoice =
      browserVoices.find((voice) => voice.lang.includes("zh")) ||
      browserVoices[0];

    if (chineseVoice) {
      utterance.voice = chineseVoice;
    }

    if (selectedVoiceIndex === 0) {
      utterance.rate = 1;
      utterance.pitch = 1;
    }

    if (selectedVoiceIndex === 1) {
      utterance.rate = 1.1;
      utterance.pitch = 1.05;
    }

    if (selectedVoiceIndex === 2) {
      utterance.rate = 0.95;
      utterance.pitch = 0.95;
    }

    utterance.onstart = () => {
      setIsPlaying(true);
    };

    utterance.onend = () => {
      setIsPlaying(false);
    };

    utterance.onerror = () => {
      setIsPlaying(false);
      setAudioError("音频播放失败，请刷新页面后重试。");
    };

    window.speechSynthesis.speak(utterance);
  };

  const handleStopAudio = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[0.88fr_1.12fr]">
      <Card>
        <h3 className="text-xl font-semibold">语音参数</h3>
        <p className="mt-1 text-sm text-slate-500">为播客脚本选择声音、节奏和背景样式。</p>

        <div className="mt-6 space-y-4">
          {voices.map((voice, index) => (
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
          onClick={handlePlayAudio}
          className="mt-6 w-full rounded-2xl bg-brand-600 px-4 py-3 font-medium text-white"
        >
          {isPlaying ? "重新生成并播放" : "生成音频"}
        </button>

        <button
          type="button"
          onClick={handleStopAudio}
          className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-medium text-slate-700"
        >
          停止播放
        </button>
      </Card>

      <Card>
        <div className="rounded-[30px] bg-gradient-to-br from-ink via-slate-800 to-brand-700 p-6 text-white">
          <p className="text-sm text-white/70">生成预览</p>
          <h3 className="mt-2 text-2xl font-semibold">
            {selectedTopic?.title || "AI Podcast Episode #08"}
          </h3>

          <div className="mt-8 rounded-3xl bg-white/10 p-5">
            <div className="flex items-center justify-between text-sm text-white/80">
              <span>{isPlaying ? "Playing" : "00:00"}</span>
              <span>{currentVoice?.speed || "1.0x"}</span>
            </div>

            <div className="mt-3 h-2 rounded-full bg-white/15">
              <div
                className={`h-2 rounded-full bg-gold transition-all duration-500 ${
                  isPlaying ? "w-2/3" : "w-1/3"
                }`}
              />
            </div>

            <div className="mt-6 flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={handleStopAudio}
                className="rounded-full bg-white/10 px-4 py-3"
              >
                ↺
              </button>

              <button
                type="button"
                onClick={handlePlayAudio}
                className="rounded-full bg-white px-6 py-3 font-semibold text-ink"
              >
                {isPlaying ? "播放中" : "播放"}
              </button>

              <button
                type="button"
                onClick={handleStopAudio}
                className="rounded-full bg-white/10 px-4 py-3"
              >
                ↻
              </button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function ClipsPage({ clips }) {
  return (
    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold">高分切片</h3>
            <p className="mt-1 text-sm text-slate-500">根据传播潜力、信息密度和情绪峰值给出评分。</p>
          </div>
          <button className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-white">
            重新评分
          </button>
        </div>

        <div className="mt-6 space-y-4">
          {clips.map((clip) => (
            <div key={clip.title} className="rounded-3xl border border-slate-200 bg-white p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h4 className="text-lg font-semibold">{clip.title}</h4>
                  <p className="mt-2 text-sm text-slate-500">{clip.time}</p>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{clip.reason}</p>
                </div>
                <div className="rounded-2xl bg-brand-50 px-4 py-3 text-center">
                  <p className="text-xs text-slate-500">Score</p>
                  <p className="mt-1 text-2xl font-semibold text-brand-700">{clip.score}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h3 className="text-xl font-semibold">切片策略面板</h3>
        <p className="mt-1 text-sm text-slate-500">生成适合短视频、社媒预告和信息卡片的内容片段。</p>

        <div className="mt-6 space-y-4">
          <div className="rounded-3xl bg-slate-50 p-5">
            <p className="text-sm text-slate-500">推荐主标题</p>
            <p className="mt-2 text-lg font-semibold">AI 正在变成内容团队的新同事</p>
          </div>
          <div className="rounded-3xl bg-slate-50 p-5">
            <p className="text-sm text-slate-500">适合平台</p>
            <p className="mt-2 text-lg font-semibold">小红书 / 抖音 / 视频号</p>
          </div>
          <div className="rounded-3xl bg-slate-50 p-5">
            <p className="text-sm text-slate-500">推荐字幕样式</p>
            <p className="mt-2 text-lg font-semibold">大字重点词 + 双行节奏字幕</p>
          </div>
        </div>

        <button className="mt-6 w-full rounded-2xl bg-coral px-4 py-3 font-medium text-white">
          导出全部切片
        </button>
      </Card>
    </div>
  );
}

export default App;
