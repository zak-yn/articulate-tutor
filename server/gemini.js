// Google Gemini Pedagogical Tutor Engine
import dotenv from "dotenv";
dotenv.config();

const SYSTEM_PROMPT = `You are Articulate, an elite, adaptive AI English Tutor and Executive Speech Coach.
You engage in natural, flowing conversational English across three distinct pedagogical modes:
1. 'roleplay': Realistic workplace, business, or daily life simulations. Act as the specified persona (e.g. interviewer, CTO, colleague). Respond directly and naturally to what the student ACTUALLY said.
   - If the student just greets (e.g. "hello", "hi"), warmly acknowledge it and invite them to share their perspective or story.
   - If the student answers a question, demonstrate active listening by commenting on a specific detail they mentioned, then ask a natural follow-up question.
   - Do NOT talk in rigid robotic templates or repeat the scenario title verbatim.
   - Keep spoken_response concise, conversational, and natural (1 to 3 punchy sentences max) so it sounds human when synthesized to speech.
2. 'drill': High-cadence speaking drills (e.g. passive transformation, workplace softening, hesitation markers). Provide direct feedback on the student's attempt and offer the next immediate challenge.
3. 'gym': Accent and pronunciation coach. Focus on phonemic accuracy, minimal pairs, and articulatory mechanics (tongue and lip placement).

CRITICAL INSTRUCTIONS:
- You must always respond strictly in valid JSON format matching the schema below.
- Keep 'spoken_response' natural and conversational (1 to 3 sentences max).
- In 'corrections', detect missing prepositions, wrong tenses, unnatural collocations, or stiff phrasing without breaking conversational immersion. If the student's sentence was already natural, 'corrections' should be an empty array [].
- Suggest 2 to 3 dynamic 'scaffolding_hints' (contextual sentence starters showing how the student can reply effectively).
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

const CANDIDATE_MODELS = [
  process.env.GEMINI_MODEL || "gemini-3.5-flash-lite",
  "gemini-3.8-flash",
  "gemini-3.5-flash-lite"
];

/**
 * Generates an adaptive tutor turn using Google Gemini API
 */
export async function generateTutorTurn({
  mode = "roleplay",
  scenario = "Senior Engineering Behavioral Interview",
  transcript = "",
  history = [],
  dueWords = []
}) {
  const apiKey = process.env.GEMINI_API_KEY || "";
  if (!apiKey) {
    return generateFallbackTurn(mode, scenario, transcript, dueWords);
  }

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
    parts: [{ text: `[Context: ${contextDirective}]\nStudent said: "${transcript}"` }]
  };

  const contents = [
    { role: "user", parts: [{ text: SYSTEM_PROMPT }] },
    { role: "model", parts: [{ text: "Understood. I will strictly act as Articulate and output only valid JSON following your specified schema." }] },
    ...recentHistory,
    userTurn
  ];

  // Try candidate models in order of speed and stability
  for (const model of CANDIDATE_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
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
        console.warn(`Gemini model ${model} returned status ${res.status}:`, errText);
        continue; // Try next candidate model
      }

      const data = await res.json();
      const candidate = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!candidate) continue;

      const parsed = JSON.parse(candidate);
      return parsed;
    } catch (err) {
      console.warn(`Gemini invocation failed on ${model}:`, err.message);
    }
  }

  return generateFallbackTurn(mode, scenario, transcript, dueWords);
}

/**
 * Deterministic fallback if all cloud models are unreachable
 */
function generateFallbackTurn(mode, scenario, transcript, dueWords = []) {
  const clean = (transcript || "").toLowerCase().trim();

  if (clean === "hello" || clean === "hi" || clean === "hey") {
    return {
      spoken_response: "Hello! Great to connect with you. Whenever you're ready, let me know what you'd like to focus on today.",
      corrections: [],
      scaffolding_hints: [
        "I'd like to practice explaining a complex system.",
        "Could you ask me a behavioral question about conflict resolution?",
        "Let's simulate a salary negotiation."
      ],
      cefr_assessment: {
        level: "B2",
        strengths: "Clear greeting and initiative",
        focus_area: "Expanding into complete narrative statements"
      },
      goal_achieved: false
    };
  }

  if (mode === "gym") {
    return {
      spoken_response: "Good attempt! Notice how your tongue position changes between these sounds. Let's repeat the target word with extra breath support.",
      corrections: [],
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

  return {
    spoken_response: `That's very interesting. Could you elaborate on what specific challenges you encountered while working through that?`,
    corrections: [],
    scaffolding_hints: [
      "The primary bottleneck was database connection pooling under high load.",
      "We had to align three cross-functional engineering squads.",
      "Our main concern was maintaining zero data loss during failover."
    ],
    cefr_assessment: {
      level: "B2",
      strengths: "Natural conversational engagement",
      focus_area: "Technical precision and vocabulary depth"
    },
    goal_achieved: false
  };
}
