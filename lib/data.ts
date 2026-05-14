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
    long: "I ship apps. Senior iOS engineer at Hinge — I drove Claude Code adoption before most people knew it existed, shipped generative AI features to millions of users, and was the first engineer there to ship on both iOS and Android. I'm also building Sesh and Today on the side. I've been coding for 13 years and I still care about the exact frame an animation lands on.",
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
      stack: ["React Native", "Expo", "Next.js", "TypeScript", "Supabase", "Gemini API", "Cursor", "Turborepo"],
      links: [{ label: "App Store", url: "https://seshapp.live/" }, { label: "Site", url: "https://seshapp.live/" }],
      year:  "2026",
    },
    {
      name:  "Today",
      tag:   "A daily focus app that respects the day you actually have.",
      desc:  "Minimalist iOS todo + Pomodoro timer. Native SwiftUI, MVVM + Coordinator, offline-first with Supabase sync and calendar integration. Built with a custom agentic development harness — four named agent roles (Implementer, SpecReviewer, CodeQualityReviewer, CraftReviewer) with explicit criteria, architecture docs as source of truth. High craft focus on motion and typography.",
      stack: ["SwiftUI", "Swift Concurrency", "Supabase", "Claude Code", "Codex"],
      links: [{ label: "App Store", url: "https://todaydailyfocus.com/" }, { label: "Site", url: "https://todaydailyfocus.com/" }],
      year:  "2026",
    },
  ],
  secondary: [
    {
      name:  "workwithjared.ai",
      tag:   "AI consulting for founders.",
      desc:  "Bespoke AI consulting: intake → audit → build together → handoff. Helps founders move from basic prompting into real tool-building and orchestration. This site is the live artifact.",
      stack: ["Next.js", "TypeScript", "Tailwind", "Vercel"],
      links: [{ label: "Site", url: "https://workwithjared.ai/" }],
    },
    {
      name:  "Moskowitz Labs",
      tag:   "A web agency where AI does the building.",
      desc:  "Clients get a finished, live website — without the traditional agency timeline or price tag. AI handles research, design, copywriting, build, QA, and deployment. The output is indistinguishable from bespoke work. The timeline isn't.",
      stack: ["Next.js 16", "React 19", "Supabase", "Claude Code", "Vercel", "Turborepo"],
      links: [{ label: "Site", url: "https://moskowitzlabs.com/" }],
    },
    {
      name:  "Captain",
      tag:   "Pirate-guided task orchestration for Claude Code.",
      desc:  "A state machine skill for Claude Code that breaks any complex task into lettered nodes, tracks progress on an ASCII helm, checkpoints to git at every step, and puts you in control of when to review, rewind, or redirect.",
      stack: ["Claude Code", "TypeScript"],
      links: [{ label: "GitHub", url: "https://github.com/jaredmoskowitz/captain" }],
    },
    {
      name:  "VeryLegit Marketplace",
      tag:   "Productivity and personality plugins for Claude Code.",
      desc:  "A curated plugin marketplace for Claude Code. Skills include captain (task orchestration), debate (adversarial plan review), wtf (angry quick questions), tldr (brutal simplification), bear-notes, iOS simulator control, and more.",
      stack: ["Claude Code", "TypeScript"],
      links: [{ label: "GitHub", url: "https://github.com/VeryLegit/verylegit-marketplace" }],
    },
    {
      name:  "SwipeClean",
      tag:   "Clean your Gmail inbox by swiping through senders.",
      desc:  "Native iOS and Android app — no backend. Scans your last 6 months of Gmail, groups by sender, scores using heuristics and on-device ML, and lets you swipe left to block or right to keep. Blocked senders are auto-filtered to trash.",
      stack: ["SwiftUI", "Jetpack Compose", "Core ML", "Gmail API"],
      links: [{ label: "In progress", url: "#" }],
    },
    {
      name:  "Prediction Market Platform",
      tag:   "Autonomous signal detection and trading engine.",
      desc:  "Five-subsystem architecture with a multi-stage Claude evaluation pipeline: keyword prefilter → Haiku triage → Sonnet adversarial analysis. Monte Carlo backtesting with 93+ test files, per-heuristic metrics (AUC, F1), and AI-in-the-loop config cycles.",
      stack: ["Python", "Claude API", "Next.js", "PostgreSQL"],
      links: [{ label: "Private", url: "#" }],
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
    "AI & LLMs":    ["Claude Code", "Cursor", "Codex", "Agentic workflows", "Agentic harnesses", "Tool-calling", "Claude API", "Gemini API", "OpenAI API", "Prompt engineering", "RAG"],
    Tools:          ["Xcode", "Git", "Figma", "Lokalise", "Turborepo", "App Store Connect", "Firebase"],
    Leadership:     ["Spec-driven development", "Mentoring", "Technical writing"],
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
