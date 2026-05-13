export const JARED = {
  name: "Jared Moskowitz",
  role: "Senior iOS Engineer",
  org: "Hinge",
  studio: "Moskowitz Labs",
  email: "jared@jaredmoskowitz.com",
  site: "jaredmoskowitz.com",
  location: "New York",
  social: {
    github:   "github.com/jaredmoskowitz",
    linkedin: "linkedin.com/in/jaredtroymoskowitz",
    twitter:  "x.com/jaredmoskowitz",
  },
  intro: {
    tag:  "Senior iOS engineer and former founder. Native mobile, AI product, and agentic systems.",
    long: "I ship apps. Senior iOS engineer at Hinge by day — AI-native builder the rest of the time. I drove Claude Code adoption across Hinge before it was mainstream, shipped AI features to millions of users, and I'm building Sesh and Today on the side. I care about the millisecond animations land and the product decision hiding inside every technical choice.",
  },
  experience: [
    {
      company: "Hinge",
      role:    "Senior iOS Engineer",
      range:   "2022 — Present",
      city:    "New York",
      bullets: [
        "Led EAA accessibility compliance across iOS — coordinated 500+ issue remediations in 6 months, co-authored team style guide, used AI tooling to generate structured tickets at scale.",
        "First engineer at Hinge to ship on both iOS and Android — learned Kotlin with Cursor and AI tooling to deliver Second Chances cross-platform on a tight deadline.",
        "Migrated SMS auth from Firebase to Twilio, saving ~$60K/month. Cut cold launch time by ~40% via async module initialization.",
        "Shipped Warm Intros (generative AI conversation starters), Audio Transcripts (real-time voice note transcription), and Personal Interview (won Judges' Choice at hackathon).",
        "iOS AI Champion across Hinge and Match Group — drove Claude Code, Cursor, and Sweetpad adoption; gave public talk to all Match Group iOS engineers.",
      ],
    },
    {
      company: "Very Legit LLC",
      role:    "Founder & Lead iOS Engineer",
      range:   "2019 — 2022",
      city:    "Brooklyn",
      bullets: [
        "Solo-founded a consumer app studio. Built and shipped DripDrop, a social video app, writing 22,000+ lines of Swift end-to-end — recording, playback, social graph, and the full release pipeline.",
        "Built a Flutter philanthropic payments app (Venmo-like UX for charitable giving) on iOS and Android.",
        "Operated customer-first and data-driven: defined the user, pivoted fast, shipped under real constraints.",
      ],
    },
    {
      company: "Amazon",
      role:    "Full-Stack Engineer, Amazon Fresh",
      range:   "2018 — 2019",
      city:    "New York",
      bullets: [
        "Part of the team that launched Amazon Fresh as free with Prime — one of Amazon's biggest consumer bets that year.",
        "Built an internal tool automating ad campaign tracking, eliminating 800+ hours of manual spreadsheet work per year.",
        "Shipped menu bar changes across mobile and web reaching 120M+ daily users.",
      ],
    },
    {
      company: "Microsoft",
      role:    "macOS Engineer, Outlook for Mac",
      range:   "2017 — 2018",
      city:    "Silicon Valley",
      bullets: [
        "Built and shipped calendar, tasks, and contacts features for Outlook for Mac, reaching 4M+ users.",
        "Contributed across the Mac client codebase in Objective-C and Swift.",
      ],
    },
  ],
  featured: [
    {
      name:  "Sesh",
      tag:   "AI-native music library management for A&Rs and music managers.",
      desc:  "React Native (Expo) + Next.js monorepo. Supabase backend with RLS, 14 tables, fractional indexing for drag-and-drop. Cloudflare R2 storage. AI chat powered by Gemini 2.5 Flash with tool-calling architecture — findSongs, createPlaylist — so the model operates directly on the user's library. Tier-gated subscriptions. Live on App Store and web.",
      stack: ["React Native", "Expo", "Next.js", "TypeScript", "Supabase", "Gemini API", "Turborepo"],
      links: [{ label: "App Store", url: "https://seshapp.live/" }, { label: "Site", url: "https://seshapp.live/" }],
      year:  "2026",
    },
    {
      name:  "Today",
      tag:   "A daily focus app that respects the day you actually have.",
      desc:  "Minimalist iOS todo + Pomodoro timer. Native SwiftUI, MVVM + Coordinator, offline-first with Supabase sync and calendar integration. Built with a custom agentic development harness — four named agent roles (Implementer, SpecReviewer, CodeQualityReviewer, CraftReviewer) with explicit criteria, architecture docs as source of truth. High craft focus on motion and typography.",
      stack: ["SwiftUI", "Swift Concurrency", "Supabase", "Claude Code"],
      links: [{ label: "App Store", url: "https://todaydailyfocus.com/" }, { label: "Site", url: "https://todaydailyfocus.com/" }],
      year:  "2026",
    },
  ],
  secondary: [
    {
      name:  "Moskowitz Labs",
      tag:   "AI agent pipeline that builds and deploys client websites.",
      desc:  "7-skill Claude Code agent system: research → design → SEO → build → QA → deploy → update. Multi-tenant Next.js 16 on Vercel with Supabase JSONB configs. Sites go from client intake to live in a fraction of traditional agency time.",
      stack: ["Next.js 16", "React 19", "Supabase", "Claude Code", "Vercel", "Turborepo"],
      links: [{ label: "Site", url: "https://moskowitzlabs.com/" }],
    },
    {
      name:  "Prediction Market Platform",
      tag:   "Autonomous signal detection and trading engine.",
      desc:  "Five-subsystem architecture with a multi-stage Claude evaluation pipeline: keyword prefilter → Haiku triage → Sonnet adversarial analysis. Monte Carlo backtesting with 93+ test files, per-heuristic metrics (AUC, F1), and AI-in-the-loop config cycles.",
      stack: ["Python", "Claude API", "Next.js", "PostgreSQL"],
      links: [{ label: "Private", url: "#" }],
    },
    {
      name:  "workwithjared.ai",
      tag:   "AI consulting for founders — this site.",
      desc:  "Bespoke AI consulting: intake → audit → build together → handoff. Helps founders move from basic prompting into real tool-building and orchestration. This site is the live artifact.",
      stack: ["Next.js", "TypeScript", "Tailwind", "Vercel"],
      links: [{ label: "GitHub", url: "#" }],
    },
    {
      name:  "DripDrop",
      tag:   "Solo-built social video iOS app.",
      desc:  "22,000+ lines of Swift. Video recording, playback, social graph, usage tracking — full stack from zero to App Store, solo.",
      stack: ["Swift", "UIKit", "App Store"],
      links: [{ label: "Archive", url: "#" }],
    },
  ],
  skills: {
    Mobile:         ["Swift", "Swift Concurrency", "UIKit", "SwiftUI", "VIPER", "MVVM", "Kotlin", "React Native", "Flutter", "WidgetKit", "Accessibility"],
    "Web & Backend": ["TypeScript", "Next.js", "Node.js", "Python", "React", "Supabase", "PostgreSQL", "REST APIs", "Vercel"],
    "AI & LLMs":    ["Claude Code", "Agentic workflows", "Tool-calling", "Claude API", "Gemini API", "OpenAI API", "Prompt engineering", "RAG"],
    Tools:          ["Xcode", "Git", "Figma", "Lokalise", "Turborepo", "App Store Connect", "Firebase", "Linear"],
  },
  commits: [
    { repo: "jaredmoskowitz/sesh",          msg: "ai: tool-calling findSongs now filters by BPM range",               when: "3h ago",    sha: "9c4a1bd" },
    { repo: "jaredmoskowitz/today",         msg: "motion: spring curve on task completion feels right now",           when: "yesterday", sha: "1f0c2e7" },
    { repo: "jaredmoskowitz/workwithjared", msg: "activity: real commits hooked up from profile.yaml",               when: "2d ago",    sha: "ae3119f" },
    { repo: "moskowitzlabs/platform",       msg: "agent: QA skill now validates design tokens before deploy",        when: "3d ago",    sha: "5b88c11" },
    { repo: "jaredmoskowitz/sesh",          msg: "subscriptions: tier-gated token budgets with cost analytics",      when: "4d ago",    sha: "c7711a4" },
    { repo: "jaredmoskowitz/today",         msg: "supabase: offline-first sync handles conflict resolution",         when: "5d ago",    sha: "20fa3c9" },
    { repo: "moskowitzlabs/platform",       msg: "ssr: ISR tag-based revalidation keeps content fresh instantly",   when: "1w ago",    sha: "84dd06e" },
    { repo: "jaredmoskowitz/sesh",          msg: "fractional-indexing: drag-and-drop order persists across sessions", when: "1w ago",  sha: "f12bb71" },
  ],
  thoughts: [
    {
      date: "May 9, 2026",
      tags: ["ai", "tooling"],
      body: "The best thing about Claude Code isn't the code it writes — it's the forcing function to write specs. You can't direct an agent without knowing what you want. Most engineers skip that step.",
    },
    {
      date: "May 4, 2026",
      tags: ["ios", "craft"],
      body: "Spring curves are the typography of motion. Most apps use the system defaults and call it done. The apps I remember spent an afternoon on this.",
    },
    {
      date: "Apr 28, 2026",
      tags: ["ai", "product"],
      body: "Tool-calling is where AI goes from assistant to collaborator. findSongs, createPlaylist — the model isn't telling you what to do, it's doing it. That's a different product category entirely.",
    },
    {
      date: "Apr 21, 2026",
      tags: ["craft", "taste"],
      body: "The empty-state screen is where I judge an app. If you wrote three real sentences here, I trust the rest of your product.",
    },
  ],
  reading: [
    { title: "The Grug Brained Developer",                             source: "grugbrain.dev",          date: "May 11" },
    { title: "Hard truths about scaling a startup",                    source: "lethain.com",            date: "May 10" },
    { title: "Why Apple's M-series chips are so good at single-thread", source: "eclecticlight.co",     date: "May 8" },
    { title: "Speculative decoding, illustrated",                      source: "huggingface.co",         date: "May 5" },
    { title: "The case against the average user",                      source: "asmartbear.com",         date: "May 2" },
    { title: "Designing for the iPad cursor",                          source: "developer.apple.com",    date: "Apr 29" },
  ],
  stats: [
    { n: 47,  label: "commits this month" },
    { n: 28,  label: "public repos" },
    { n: 4,   label: "apps shipped" },
    { n: 13,  label: "years building" },
    { n: 312, label: "PRs merged this year" },
  ],
  events: [
    { type: "commit",  sha: "9c4a1bd", text: "ai: tool-calling findSongs now filters by BPM range",           source: "sesh",              time: "3h ago" },
    { type: "deploy",  text: "main@1f0c2e7 → vercel",                                                          source: "workwithjared",     time: "4h ago",  status: "ok" },
    { type: "playing", text: "Burial — Untrue",                                                                 source: "Apple Music",        time: "now" },
    { type: "ship",    text: "Today v1.2 → App Store",                                                         source: "App Store Connect",  time: "5d ago" },
    { type: "commit",  sha: "1f0c2e7", text: "motion: spring curve on task completion feels right now",        source: "today",             time: "1d ago" },
    { type: "thought", text: "the empty-state screen is where I judge an app.",                                source: "thoughts.jsonl",    time: "21d ago" },
    { type: "deploy",  text: "main@ae3119f → vercel",                                                          source: "workwithjared",     time: "2d ago",  status: "ok" },
    { type: "commit",  sha: "ae3119f", text: "activity: real commits hooked up from profile.yaml",            source: "workwithjared",     time: "2d ago" },
    { type: "reading", text: "The Grug Brained Developer",                                                     source: "grugbrain.dev",     time: "2d ago" },
    { type: "commit",  sha: "5b88c11", text: "agent: QA skill now validates design tokens before deploy",     source: "moskowitzlabs",     time: "3d ago" },
    { type: "playing", text: "Yo La Tengo — Black Flowers",                                                    source: "Apple Music",        time: "yesterday" },
    { type: "commit",  sha: "c7711a4", text: "subscriptions: tier-gated token budgets with cost analytics",   source: "sesh",              time: "4d ago" },
    { type: "deploy",  text: "main@84dd06e → vercel",                                                          source: "moskowitzlabs",     time: "1w ago",  status: "ok" },
  ],
} as const;

export type SiteData = typeof JARED;

export const SCHEMES = [
  { id: "amber",    name: "Amber",    darkBg: "#0e0f0e", lightBg: "#f4f1e8", darkAccent: "#f0bb5b", lightAccent: "#9a5e0e" },
  { id: "phosphor", name: "Phosphor", darkBg: "#070a08", lightBg: "#edf3ec", darkAccent: "#7fdb91", lightAccent: "#2c7a3c" },
  { id: "ink",      name: "Ink",      darkBg: "#0a0c11", lightBg: "#eef1f6", darkAccent: "#7eb6ff", lightAccent: "#2455b8" },
  { id: "crimson",  name: "Crimson",  darkBg: "#100a0a", lightBg: "#f3ede9", darkAccent: "#e8786a", lightAccent: "#a73a28" },
  { id: "violet",   name: "Violet",   darkBg: "#0d0a14", lightBg: "#f0edf6", darkAccent: "#b594ff", lightAccent: "#5b3a9e" },
  { id: "mono",     name: "Mono",     darkBg: "#0a0a0a", lightBg: "#efefed", darkAccent: "#ededed", lightAccent: "#0a0a0a" },
] as const;

export type SchemeId = typeof SCHEMES[number]["id"];

export const EVENT_META: Record<string, { tag: string; glyph: string }> = {
  commit:  { tag: "git",    glyph: "$" },
  deploy:  { tag: "deploy", glyph: "↑" },
  ship:    { tag: "ship",   glyph: "✦" },
  playing: { tag: "♫",      glyph: "♫" },
  thought: { tag: "note",   glyph: "✎" },
  reading: { tag: "read",   glyph: "⌥" },
};

export const EE_RESPONSES: Record<string, string[]> = {
  whoami: ["$ whoami", "> visitor — welcome.", "> tell me what you're building →", "> jared@jaredmoskowitz.com"],
  sudo:   ["$ sudo",   "> permission denied. (not your machine.)"],
  vim:    ["$ vim",    "> :q to exit. (you'd have to close the tab.)"],
  ls:     ["$ ls ~",   "> whoami  work  shipped  stack  now  ping"],
};
