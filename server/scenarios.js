// Pre-configured training datasets for Gym, Drills, and Roleplay

export const MINIMAL_PAIRS = [
  {
    id: "th_s",
    targetPhonemes: ["θ", "s"],
    title: "Unvoiced TH /θ/ vs. S /s/",
    explanation: "Place your tongue tip gently between your upper and lower teeth for /θ/. For /s/, keep your tongue behind your teeth and force air through a narrow channel.",
    pairs: [
      { wordA: "think", wordB: "sink", sentenceA: "I think about the problem.", sentenceB: "The boat will sink in deep water." },
      { wordA: "thick", wordB: "sick", sentenceA: "This book has thick pages.", sentenceB: "He felt sick after dinner." },
      { wordA: "thought", wordB: "sought", sentenceA: "She thought carefully.", sentenceB: "They sought new opportunities." },
      { wordA: "theme", wordB: "seem", sentenceA: "What is the theme today?", sentenceB: "You seem very energetic." }
    ]
  },
  {
    id: "ee_ih",
    targetPhonemes: ["iː", "ɪ"],
    title: "Tense EE /iː/ vs. Lax I /ɪ/",
    explanation: "For /iː/ (sheet, beach), smile and stretch your lips wide with high tongue tension. For /ɪ/ (shit, bitch, sit), drop your jaw slightly and relax your tongue completely.",
    pairs: [
      { wordA: "sheet", wordB: "shit", sentenceA: "Please hand me that clean sheet of paper.", sentenceB: "Don't step in the dog shit outside." },
      { wordA: "beach", wordB: "bitch", sentenceA: "We walked along the sunny beach.", sentenceB: "Please stop complaining and bitching." },
      { wordA: "leave", wordB: "live", sentenceA: "When will the train leave?", sentenceB: "Where do you live currently?" },
      { wordA: "sheep", wordB: "ship", sentenceA: "The white sheep grazed peacefully.", sentenceB: "The cargo ship docked at midnight." }
    ]
  },
  {
    id: "r_l",
    targetPhonemes: ["ɹ", "l"],
    title: "Liquid R /ɹ/ vs. Lateral L /l/",
    explanation: "For /ɹ/, curl or bunch your tongue without touching the roof of your mouth. For /l/, press your tongue tip firmly against the alveolar ridge behind your top teeth.",
    pairs: [
      { wordA: "right", wordB: "light", sentenceA: "You made the right decision.", sentenceB: "Turn off the ceiling light." },
      { wordA: "read", wordB: "lead", sentenceA: "I read an inspiring article.", sentenceB: "He will lead the engineering team." },
      { wordA: "raw", wordB: "law", sentenceA: "Do you eat raw fish?", sentenceB: "Respect the rule of law." },
      { wordA: "arrive", wordB: "alive", sentenceA: "We will arrive shortly.", sentenceB: "The plant is still alive." }
    ]
  },
  {
    id: "v_b",
    targetPhonemes: ["v", "b"],
    title: "Labiodental V /v/ vs. Bilabial B /b/",
    explanation: "For /v/, rest your top teeth on your lower lip and vibrate your vocal cords. For /b/, press both lips together and release a burst of voiced air.",
    pairs: [
      { wordA: "berry", wordB: "very", sentenceA: "Pick a fresh berry from the bush.", sentenceB: "This coffee is very hot." },
      { wordA: "best", wordB: "vest", sentenceA: "Do your best on the project.", sentenceB: "He wore a reflective safety vest." },
      { wordA: "ban", wordB: "van", sentenceA: "The city placed a ban on plastic bags.", sentenceB: "We rented a cargo van for moving." }
    ]
  },
  {
    id: "ae_uh",
    targetPhonemes: ["æ", "ʌ"],
    title: "Open Front AE /æ/ vs. Central Short U /ʌ/",
    explanation: "For /æ/ (cat, bad), open your mouth wide vertically and horizontally. For /ʌ/ (cut, bud), keep your mouth relaxed with mid-low tongue opening.",
    pairs: [
      { wordA: "cat", wordB: "cut", sentenceA: "The playful cat jumped up.", sentenceB: "Carefully cut the ribbon." },
      { wordA: "bad", wordB: "bud", sentenceA: "That was a bad mistake.", sentenceB: "The rose bud is blooming." },
      { wordA: "ankle", wordB: "uncle", sentenceA: "She sprained her left ankle.", sentenceB: "My uncle lives in Chicago." }
    ]
  }
];

export const SPEAKING_DRILLS = [
  {
    id: "polite_softening",
    category: "Executive & Workplace Softening",
    description: "Transform blunt direct commands into diplomatic, high-EQ business phrasing.",
    prompts: [
      {
        stimulus: "Tell the team: 'Give me your presentation slides by 3 PM.'",
        targetFormula: "I was wondering if you might be able to share your presentation slides by 3 PM?",
        tips: "Use 'I was wondering if...' or 'Would you mind sharing...'"
      },
      {
        stimulus: "Tell a stakeholder: 'That idea won't work in production.'",
        targetFormula: "I see what you're aiming for, but I have a few concerns about how that might scale in production.",
        tips: "Acknowledge the intent before introducing operational constraints."
      },
      {
        stimulus: "Tell a colleague: 'You forgot to update the documentation.'",
        targetFormula: "Could you take a quick pass over the documentation when you get a chance?",
        tips: "Frame as an invitation rather than an accusation."
      }
    ]
  },
  {
    id: "active_passive",
    category: "Academic & Analytical Recasting",
    description: "Convert active agency statements into formal, objective passive observations.",
    prompts: [
      {
        stimulus: "Active: 'The engineers observed multiple database latency spikes during peak load.'",
        targetFormula: "Multiple database latency spikes were observed during peak load.",
        tips: "Focus on the phenomenon rather than the observers."
      },
      {
        stimulus: "Active: 'The executive committee approved the quarterly budget expansion.'",
        targetFormula: "The quarterly budget expansion has been approved by the executive committee.",
        tips: "Place the budget initiative at the sentence head."
      }
    ]
  },
  {
    id: "hesitation_negotiation",
    category: "Tactical Hesitation & Floor-Holding",
    description: "Use native floor-holding discourse markers while formulating high-stakes arguments.",
    prompts: [
      {
        stimulus: "You are asked an unexpected question about next quarter's revenue forecast in an executive meeting.",
        targetFormula: "That's a critical point to consider. Looking at our recent customer retention metrics, what immediately stands out is...",
        tips: "Buy 3 seconds of formulation time with validation and transition phrases."
      }
    ]
  }
];

export const ROLEPLAY_SCENARIOS = [
  {
    id: "specialty_cafe",
    title: "Artisanal Coffee Roaster & Order Customization",
    category: "Daily Life & Travel",
    level: "Intermediate (B1-B2)",
    persona: "Liam, Head Barista at a specialty roastery in Melbourne",
    settingJa: "オーストラリア・メルボルンの人気スペシャリティコーヒー店。カウンターでバリスタのLiamと話しながら注文する場面です。",
    yourRoleJa: "カフェを訪れた旅行者・カスタマー",
    partnerJa: "Liam（フレンドリーなヘッドバリスタ）",
    goalJa: "挨拶を交わし、好みのコーヒー（豆の種類やミルクのカスタム）を自然な英語で注文する。",
    context: "Order a complex specialty pourover and customize your dairy preference while discussing tasting notes.",
    systemGoal: "Practice natural conversational speed, food ordering nuances, and clarifying questions.",
    initialGreeting: "Hi there! Welcome into Monolith Coffee. How's your morning going? What can I get brewing for you today?",
    scaffoldingHints: [
      "Good morning! I'm doing well, thanks. What do you have on batch brew today?",
      "Could I get a flat white with oat milk, please?",
      "I'd love to try a pourover with floral or fruity notes—what do you recommend?"
    ]
  },
  {
    id: "tech_interview",
    title: "Senior Engineering Behavioral Interview",
    category: "Career & Tech",
    level: "Advanced (C1)",
    persona: "Sarah, VP of Engineering at a San Francisco AI startup",
    settingJa: "サンフランシスコの急成長AIスタートアップの最終採用面接。VP of EngineeringのSarahとの1対1の面接です。",
    yourRoleJa: "シニアエンジニア応募者（転職候補者）",
    partnerJa: "Sarah（エンジニアリング統轄責任者）",
    goalJa: "簡単な自己紹介の後、過去の開発で製品納期と技術的トレードオフをどう調整したかを英語で説明する。",
    context: "Sarah is evaluating your system design trade-offs, architecture decisions, and conflict resolution skills under pressure.",
    systemGoal: "Test the candidate's ability to articulate trade-offs between speed-to-market and long-term tech debt.",
    initialGreeting: "Hi there! Thanks so much for taking the time to speak with me today. I hope your week has been going well. To kick off our interview, could you briefly introduce yourself and what you've been working on recently?",
    scaffoldingHints: [
      "Thanks for having me, Sarah. I'm a software engineer focused on distributed systems and backend architecture...",
      "In my most recent role, I led the migration of our real-time processing pipeline...",
      "I'm excited about this role because I really enjoy tackling high-concurrency challenges..."
    ]
  },
  {
    id: "daily_standup",
    title: "Daily Standup & Sprint Status Check-in",
    category: "Workplace & Agile",
    level: "Intermediate (B2)",
    persona: "Elena, Agile Technical Lead",
    settingJa: "グローバル開発チームのリモート朝会（Daily Standup）。昨日の進捗と今日の予定、ブロッカー（課題）を共有する場面です。",
    yourRoleJa: "開発チームのメンバー",
    partnerJa: "Elena（気さくなテックリード兼スクラムマスター）",
    goalJa: "「昨日完了したこと」「今日着手すること」「困っている点」を簡潔に報告する。",
    context: "Quick synchronous status alignment on current sprint tasks, dependencies, and code reviews.",
    systemGoal: "Practice concise executive reporting, past-tense completion markers, and proactive requests for assistance.",
    initialGreeting: "Morning everyone! Let's do a quick round for today's standup. How are things looking on your side with yesterday's PR and the API integration?",
    scaffoldingHints: [
      "Morning Elena. Yesterday I finished refactoring the authentication middleware...",
      "Today I'm planning to write unit tests and merge the PR before staging deploy...",
      "I don't have any major blockers, but I might need someone to take a quick look at my PR..."
    ]
  },
  {
    id: "salary_negotiation",
    title: "Executive Compensation & Equity Negotiation",
    category: "Business & Negotiation",
    level: "Upper-Intermediate (B2-C1)",
    persona: "Marcus, Senior Director of Talent Acquisition",
    settingJa: "内定通知を受け取った後の条件面談。採用ディレクターのMarcusと、提示された基本給と株式付与について交渉する場面です。",
    yourRoleJa: "内定を獲得した候補者",
    partnerJa: "Marcus（人事・採用ディレクター）",
    goalJa: "内定への感謝を伝えつつ、市場相場や実績を根拠に基本給や株式の再検討を礼儀正しく打診する。",
    context: "You just received an initial offer letter. You need to negotiate a base salary bump and additional equity refreshers without sounding combative.",
    systemGoal: "Help the user practice polite firmness, referencing market value and past measurable impact.",
    initialGreeting: "Hi there! We are thrilled to extend this formal offer to you. As outlined in the letter, we're offering a base of $160k with standard vesting. How does everything look from your perspective?",
    scaffoldingHints: [
      "Thank you so much for this offer, Marcus. I'm truly excited about the team's mission...",
      "Based on my recent achievements and current market data for this scope...",
      "I was hoping to explore whether there is flexibility around the base salary and equity..."
    ]
  },
  {
    id: "system_outage",
    title: "Live Production Outage Incident Command",
    category: "Crisis Management",
    level: "Advanced (C1)",
    persona: "Alex, Chief Technology Officer",
    settingJa: "本番決済サーバーで504エラーが急増中の緊急インシデント会議。CTOのAlexに対処方針を報告する場面です。",
    yourRoleJa: "オンコール担当リードエンジニア",
    partnerJa: "Alex（CTO / 最高技術責任者）",
    goalJa: "現在の障害状況の仮説と、直近のフェイルオーバー・ロールバックの対応策を落ち着いて伝える。",
    context: "The primary European payment gateway is throwing 504 Gateway Timeouts. Traffic is dropping and customers are reporting failed checkouts.",
    systemGoal: "Exercise concise, calm technical communication and triage status updates.",
    initialGreeting: "Alex here. The incident response dashboard is showing a 40% spike in 504 errors on the checkout endpoint. What is our current hypothesis and what immediate mitigation steps are underway?",
    scaffoldingHints: [
      "We've identified a connection pool exhaustion in the downstream auth service...",
      "As an immediate failover, we've rerouted non-critical traffic to our fallback cluster...",
      "We're currently rolling back the latest release canary while monitoring error rates..."
    ]
  },
  {
    id: "networking_mixer",
    title: "Tech Mixer & Professional Networking",
    category: "Social & Networking",
    level: "Intermediate-Advanced (B2)",
    persona: "David, Angel Investor & ex-founder",
    settingJa: "サンフランシスコのテック交流会（ミキサー）。テラスでエンジェル投資家のDavidに話しかけられた場面です。",
    yourRoleJa: "プロダクト開発者・起業家",
    partnerJa: "David（元創業者 / エンジェル投資家）",
    goalJa: "会話のきっかけを掴み、自分が取り組んでいるプロジェクトを簡潔に紹介して相手に質問を返す。",
    context: "You are mingling at an evening demo night in downtown San Francisco. Break the ice and explain your vision in 60 seconds.",
    systemGoal: "Practice dynamic elevator pitches, active listening, and reciprocal questions.",
    initialGreeting: "Hey! Mind if I join you by the terrace? Quite an energetic crowd tonight. What kind of problems are you tackling with your current project?",
    scaffoldingHints: [
      "Nice to meet you! I'm currently building a voice-first AI tutor...",
      "We're focused on bridging the gap between passive listening and active speaking...",
      "What areas in tech are you personally most excited about right now?"
    ]
  }
];
