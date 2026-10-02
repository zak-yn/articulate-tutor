// Google Gemini Pedagogical Tutor Engine

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

const SYSTEM_PROMPT = `You are Articulate, an elite, adaptive AI English Tutor and Executive Speech Coach.
You operate across three distinct pedagogical modes:
1. 'roleplay': Realistic workplace, business, or daily life simulations. Do not lecture. Mirror natural native conversational pace (1 to 3 punchy sentences max). Keep the exchange dynamic and reciprocal.
2. 'drill': High-cadence speaking drills (e.g. passive transformation, workplace softening, hesitation markers). Provide direct feedback on the student's attempt and offer the next immediate challenge.
3. 'gym': Accent and pronunciation coach. Focus on phonemic accuracy, minimal pairs, and articulatory mechanics (tongue and lip placement).

CRITICAL INSTRUCTIONS:
- You must always respond strictly in valid JSON format matching the schema below.
- Keep 'spoken_response' concise, conversational, and natural (1 to 3 sentences max) so it sounds human when synthesized to speech.
- In 'corrections', detect missing prepositions, wrong tenses, unnatural collocations, or stiff phrasing without breaking conversational immersion.
- Suggest 2 to 3 dynamic 'scaffolding_hints' (sentence starters showing how the student can reply effectively).
- If 'due_words' are provided, subtly steer the conversation to give the student an opportunity to practice using them.

OUTPUT JSON SCHEMA:
{
  "spoken_response": "string",
  "corrections": [
    {
      "original": "string",
      "improved": "string",
      "explanation": "string"
    }
  ],
  "scaffolding_hints": ["string", "string", "string"],
  "cefr_assessment": {
    "level": "B1" | "B2" | "C1" | "C2",
    "strengths": "string",
    "focus_area": "string"
  },
  "goal_achieved": false
}`;

/**
 * Generates an adaptive tutor turn using Google Gemini API
 */
export async function generateTutorTurn({
  mode = "roleplay",
  scenario = "Job Interview at a Tech Company",
  transcript = "",
  history = [],
  dueWords = []
}) {
  if (!GEMINI_API_KEY) {
    return generateFallbackTurn(mode, scenario, transcript, dueWords);
  }

  const promptMessages = [];

  // Build context
  let contextDirective = `Active Mode: ${mode}. Active Scenario: ${scenario}.`;
  if (dueWords && dueWords.length > 0) {
    contextDirective += ` Priority review vocabulary to elicit naturally: ${dueWords.join(", ")}.`;
  }

  // Conversation history (limit to last 6 turns for low latency and high relevance)
  const recentHistory = (history || []).slice(-6).map(h => ({
    role: h.role === "user" ? "user" : "model",
    parts: [{ text: h.text || h.spoken_response || "" }]
  }));

  const userTurn = {
    role: "user",
    parts: [{ text: `[System Context: ${contextDirective}]\nStudent said: "${transcript}"` }]
  };

  const contents = [
    { role: "user", parts: [{ text: SYSTEM_PROMPT }] },
    { role: "model", parts: [{ text: "Understood. I will strictly act as Articulate and output only valid JSON following your specified schema." }] },
    ...recentHistory,
    userTurn
  ];

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 800,
          responseMimeType: "application/json"
        }
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn("Gemini API error:", res.status, errText);
      return generateFallbackTurn(mode, scenario, transcript, dueWords);
    }

    const data = await res.json();
    const candidate = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidate) {
      return generateFallbackTurn(mode, scenario, transcript, dueWords);
    }

    const parsed = JSON.parse(candidate);
    return parsed;
  } catch (err) {
    console.error("Gemini invocation failed, falling back to local heuristic:", err.message);
    return generateFallbackTurn(mode, scenario, transcript, dueWords);
  }
}

/**
 * Intelligent deterministic fallback when API key is unavailable or during network disconnects
 */
function generateFallbackTurn(mode, scenario, transcript, dueWords = []) {
  const clean = (transcript || "").toLowerCase();

  if (mode === "gym") {
    return {
      spoken_response: "Good attempt! Notice how your tongue position changes between these sounds. Let's repeat the target word with extra breath support.",
      corrections: clean.includes("sink") || clean.includes("think") ? [
        {
          original: "sink",
          improved: "think",
          explanation: "Ensure the tongue tip peeks slightly between your teeth for the unvoiced /θ/ rather than retracting behind teeth for /s/."
        }
      ] : [],
      scaffolding_hints: [
        "Let me try the minimal pair one more time.",
        "Could you exaggerate the tongue position for me?",
        "Can I hear the contrast again?"
      ],
      cefr_assessment: {
        level: "B2",
        strengths: "Consistent vowel duration",
        focus_area: "Interdental fricative articulation"
      },
      goal_achieved: false
    };
  }

  if (mode === "drill") {
    return {
      spoken_response: "Excellent cadence! That sounded much more diplomatic. Now try rephrasing with an introductory hedge like 'From our perspective'.",
      corrections: [
        {
          original: "We cannot do this now",
          improved: "Given our current bandwidth, it might be challenging to prioritize this immediately.",
          explanation: "Softens a direct refusal while maintaining clear executive boundaries."
        }
      ],
      scaffolding_hints: [
        "From our perspective, bandwidth is constrained right now.",
        "I was wondering if we could defer this to next sprint?",
        "Could we explore a staged compromise instead?"
      ],
      cefr_assessment: {
        level: "B2",
        strengths: "Immediate stimulus response",
        focus_area: "Executive softening markers"
      },
      goal_achieved: false
    };
  }

  // Default Roleplay
  return {
    spoken_response: `That's a very compelling point. When tackling ${scenario}, how do you usually measure the long-term impact on your key metrics?`,
    corrections: clean.includes("i have") && clean.includes("years") ? [
      {
        original: "I have 5 years experience",
        improved: "I have 5 years of experience (or: I bring 5 years of domain expertise)",
        explanation: "In natural English, use 'years of experience' or strengthen the verb with 'bring / offer'."
      }
    ] : [],
    scaffolding_hints: [
      "We closely track latency, customer churn, and delivery velocity.",
      "In my experience, the biggest risk is over-engineering too early.",
      "We run bi-weekly retrospectives to recalibrate our goals."
    ],
    cefr_assessment: {
      level: "B2",
      strengths: "Natural turn-taking and conversational engagement",
      focus_area: "Prepositional accuracy in technical explanations"
    },
    goal_achieved: false
  };
}
