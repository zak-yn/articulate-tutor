import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";

import { generateTutorTurn, transcribeAudioWithGemini } from "./server/gemini.js";
import { evaluatePronunciation } from "./server/phonetics.js";
import { assessWithAzureSpeech } from "./server/azureSpeech.js";
import { synthesizeNeuralSpeech } from "./server/tts.js";
import { MINIMAL_PAIRS, SPEAKING_DRILLS, ROLEPLAY_SCENARIOS } from "./server/scenarios.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3005;

// Configure Multer for in-memory audio upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 } // 15MB max
});

app.use(cors());
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

// Static frontend assets
app.use(express.static(path.join(__dirname, "public")));

// --- API ROUTES ---

// Health & System Status
app.get("/api/status", (req, res) => {
  res.json({
    status: "ok",
    app: "Articulate: AI English Voice Tutor",
    version: "1.0.0",
    gemini_configured: !!process.env.GEMINI_API_KEY,
    gemini_model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
    azure_speech_configured: !!process.env.AZURE_SPEECH_KEY,
    azure_speech_region: process.env.AZURE_SPEECH_REGION || "japaneast",
    modes: ["gym", "drill", "roleplay"],
    timestamp: new Date().toISOString()
  });
});

// Learning Catalog (Gym Minimal Pairs, Drills, Roleplays)
app.get("/api/scenarios", (req, res) => {
  res.json({
    minimalPairs: MINIMAL_PAIRS,
    speakingDrills: SPEAKING_DRILLS,
    roleplayScenarios: ROLEPLAY_SCENARIOS
  });
});

// Single Phoneme / Sentence Assessment (Instant Gym Feedback)
app.post("/api/assess-phoneme", upload.single("audio"), async (req, res) => {
  try {
    const transcript = req.body.transcript || "";
    const referenceText = req.body.reference_text || "";
    const targetPhoneme = req.body.target_phoneme || "";

    let assessment = null;
    if (req.file && req.file.buffer && process.env.AZURE_SPEECH_KEY) {
      assessment = await assessWithAzureSpeech(req.file.buffer, referenceText);
    }

    if (!assessment) {
      assessment = evaluatePronunciation(transcript || referenceText, referenceText, targetPhoneme);
    }

    res.json(assessment);
  } catch (err) {
    console.error("Pronunciation assessment failed:", err);
    res.status(500).json({ error: "Failed to evaluate pronunciation" });
  }
});

// Unified Conversational Turn (ASR + Pronunciation Assessment + LLM Reasoning)
app.post("/api/turn", upload.single("audio"), async (req, res) => {
  try {
    const mode = req.body.mode || "roleplay";
    const scenario = req.body.scenario || "Job Interview at a Tech Company";
    const transcript = req.body.transcript || "";
    const referenceText = req.body.reference_text || "";
    const targetPhoneme = req.body.target_phoneme || "";

    let history = [];
    try {
      if (req.body.history) {
        history = typeof req.body.history === "string" ? JSON.parse(req.body.history) : req.body.history;
      }
    } catch (e) {
      history = [];
    }

    let dueWords = [];
    try {
      if (req.body.due_words) {
        dueWords = typeof req.body.due_words === "string" ? JSON.parse(req.body.due_words) : req.body.due_words;
      }
    } catch (e) {
      dueWords = [];
    }

    // 1. Determine spoken transcript with multi-level fallbacks
    let userTranscript = (transcript || "").trim();
    let pronunciationData = null;
    let tutorTurn = null;

    // Fast-path: When userTranscript is already provided by real-time client ASR or typed input
    if (userTranscript) {
      const hasAudio = req.file && req.file.buffer && process.env.AZURE_SPEECH_KEY;
      const [azurePron, geminiTutor] = await Promise.all([
        hasAudio
          ? assessWithAzureSpeech(req.file.buffer, referenceText || userTranscript).catch(() => null)
          : Promise.resolve(null),
        generateTutorTurn({
          mode,
          scenario,
          transcript: userTranscript,
          history,
          dueWords
        })
      ]);

      pronunciationData = azurePron || evaluatePronunciation(userTranscript, referenceText, targetPhoneme);
      tutorTurn = geminiTutor;
    } else {
      // Audio-only fallback: Transcribe speech from audio first
      if (req.file && req.file.buffer && process.env.AZURE_SPEECH_KEY) {
        pronunciationData = await assessWithAzureSpeech(req.file.buffer, referenceText);
        if (pronunciationData && pronunciationData.recognized_text) {
          userTranscript = pronunciationData.recognized_text;
        }
      }

      if (!userTranscript && req.file && req.file.buffer) {
        userTranscript = await transcribeAudioWithGemini(req.file.buffer, req.file.mimetype || "audio/wav");
      }

      if (!userTranscript) {
        return res.json({
          user_transcript: "(No speech detected)",
          pronunciation: null,
          tutor_turn: {
            spoken_response: "I didn't quite catch that. Please hold the microphone while speaking, or type your message in the chat box.",
            corrections: [],
            scaffolding_hints: [
              "Let me try speaking again.",
              "Can you hear me now?",
              "Let's continue our conversation."
            ],
            goal_achieved: false
          },
          audio_base64: null
        });
      }

      if (!pronunciationData) {
        pronunciationData = evaluatePronunciation(userTranscript, referenceText, targetPhoneme);
      }

      tutorTurn = await generateTutorTurn({
        mode,
        scenario,
        transcript: userTranscript,
        history,
        dueWords
      });
    }

    // High-speed response: Return text, scoring, and recasting immediately.
    // Client AudioPlayer fetches Neural TTS asynchronously without freezing the UI.
    res.json({
      user_transcript: userTranscript,
      pronunciation: pronunciationData,
      tutor_turn: tutorTurn,
      audio_base64: null
    });
  } catch (err) {
    console.error("Turn processing error:", err);
    res.status(500).json({
      error: "Internal server error during turn processing",
      details: err.message
    });
  }
});

// Standalone Neural Voice Synthesizer API
app.post("/api/tts", async (req, res) => {
  try {
    const text = req.body.text || "";
    const voice = req.body.voice || "en-US-AvaMultilingualNeural";
    const audioDataUrl = await synthesizeNeuralSpeech(text, voice);
    if (!audioDataUrl) {
      return res.status(500).json({ error: "Failed to synthesize neural speech" });
    }
    res.json({ audio_base64: audioDataUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fallback all other GET routes to SPA index.html
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`[Articulate] Server listening on port ${PORT} (http://localhost:${PORT})`);
});
