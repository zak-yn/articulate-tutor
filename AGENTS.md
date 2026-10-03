# Articulate: AI English Voice Tutor & Phonetic Coach (PWA)

A voice-first, dual-channel AI English tutoring Progressive Web App engineered for sub-word phonemic accuracy, high-cadence stimulus-response drills, and realistic conversational roleplays, backed by **Google Gemini Flash**, **Render**, **GitHub**, and **Spaced Repetition (FSRS / SM-2)**.

---

## 1. Architecture & Tech Stack
- **Repository**: [https://github.com/zak-yn/articulate-tutor](https://github.com/zak-yn/articulate-tutor)
- **Deployment**: Render Web Service (`render.yaml`) auto-deploying from `main` as `articulate-tutor` ([https://articulate-tutor.onrender.com](https://articulate-tutor.onrender.com)).
- **AI Pedagogical Engine**: Google Gemini Flash (`gemini-2.5-flash`) generating dual-channel structured feedback (spoken dialog, grammar recasting, dynamic scaffolding, CEFR leveling).
- **Phonetic Assessment**: Sub-word phoneme scoring (IPA breakdown, prosody, fluency) with Azure Cognitive Services Speech SDK bridge and zero-cost local phonetic aligner.
- **Audio & Speech**: HTML5 AudioWorklet / MediaRecorder, real-time waveform visualizer, and Web Speech Neural synthesis (`en-US-JennyNeural`, `en-US-GuyNeural`).
- **Memory & Retention**: LocalStorage & IndexedDB FSRS / SM-2 spaced repetition tracking weak phonemes and vocabulary.

---

## 2. Directory Structure & Responsibilities
```
AI English Tutor/
├── public/                       # Static PWA assets served by Express
│   ├── css/style.css             # Anti-AI architectural dark mode (#090B0E, #12151C, #E09F3E)
│   ├── js/
│   │   ├── icons.js              # Minimalist 1.5px stroke vector SVG icons
│   │   ├── audioRecorder.js      # MediaRecorder, Web Audio Analyser & real-time waveform
│   │   ├── audioPlayer.js        # SpeechSynthesis with neural voices & replay controls
│   │   ├── fsrsDb.js             # FSRS / SM-2 spaced repetition memory & due item scheduler
│   │   └── app.js                # Core controller, mode switching, IPA modal, timeline
│   ├── icons/                    # PWA 192x192 & 512x512 app icons
│   ├── manifest.webmanifest      # Standalone PWA configuration
│   ├── sw.js                     # Service Worker offline asset cache
│   └── index.html                # Semantic HTML5 mobile-first shell
├── server/
│   ├── gemini.js                 # Gemini Flash pedagogical tutor engine & prompt orchestrator
│   ├── phonetics.js              # Sub-word IPA generator, articulatory guide & scoring
│   ├── scenarios.js              # Curated Gym minimal pairs, Speak drills & Loora roleplays
│   └── azureSpeech.js            # Optional Azure Pronunciation Assessment SDK adapter
├── server.js                     # Express API & static server (port 3000 / 10000)
├── render.yaml                   # Render web service blueprint deployment
├── .env.example                  # Environment credentials template
└── AGENTS.md                     # Single source of truth (<200 lines)
```

---

## 3. Core Training Modes
1. **Accent & Phoneme Gym (ELSA Mode)**:
   - Minimal pair drills (`/θ/` vs `/s/`, `/iː/` vs `/ɪ/`, `/ɹ/` vs `/l/`, `/v/` vs `/b/`, `/æ/` vs `/ʌ/`).
   - Interactive IPA modal with articulatory tongue/lip positioning guidance and pitfall warnings.
2. **High-Cadence Speaking Drills (Speak Mode)**:
   - Stimulus-response agility (passive transformations, executive softening, tactical hesitation).
3. **Immersive Roleplay & Scenarios (Loora / Praktika Mode)**:
   - Tech interviews, salary negotiations, live production outages, and specialty coffee orders.
   - Dual-channel output: spoken audio + metalinguistic recasting + dynamic sentence starters.
4. **Memory Vault (FSRS)**:
   - Tracks words and weak sounds with calculated retention intervals and priority prompt injection.

---

## 4. API Specifications & Endpoints
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/status` | System health, model configuration, and Azure Speech status |
| `GET` | `/api/scenarios` | Returns catalog of minimal pairs, drills, and roleplay simulations |
| `POST` | `/api/turn` | Unified conversational turn (Multipart: audio blob + mode + history) |
| `POST` | `/api/assess-phoneme`| Direct sub-word pronunciation evaluation for single exercises |

---

## 5. Anti-AI Design & Aesthetic Mandates
- **Palette**: Deep charcoal surfaces (`#090B0E`, `#12151C`, `#181C26`), hairline borders (`rgba(255,255,255,0.08)`), warm amber (`#E09F3E`), emerald (`#10B981`), rose (`#F43F5E`).
- **Zero Emojis in Chrome**: Strict usage of 1.5px stroke vector SVG icons (`icons.js`).
- **Tactile Density**: 6px-10px corner radiuses, reactive waveform visualizer, colored word chips.

---

## 6. Autonomous Verification Steps
1. Run `node server.js` and verify port 3000 binds with 0 errors.
2. Verify `/api/status` and `/api/scenarios` return valid JSON.
3. Verify `/api/turn` executes dual-channel analysis and returns valid structured output.
4. Execute Playwright / Chrome DevTools sensor test:
   - Validate UI layout, mode switching (Roleplay, Gym, Drills, Vault).
   - Test IPA modal display and articulatory guide rendering.
   - Test waveform visualization and PWA manifest.

---

## 7. Changelog
- **2026-10-04**: Fixed syntax error in client event handler & verified active Azure status.
  - Closed missing `});` in `keyup` listener within `public/js/app.js` that caused initial script load failure.
  - Verified local and Render `/api/status` confirming Azure AI Speech & Gemini 3.5 Flash Lite both fully active.
  - Autonomous Playwright sensory check validated full scenario rendering and "Azure & Gemini Active" badge.
- **2026-10-03**: Integrated & configured Azure AI Speech F0 service.
  - Added `microsoft-cognitiveservices-speech-sdk` to backend dependencies.
  - Activated Azure Pronunciation Assessment API in `japaneast` for sub-word phoneme scoring and prosody diagnostics.
  - Added Azure Studio Neural Voice (`en-US-AvaMultilingualNeural`) in `server/tts.js` for ultra-natural human cadence.
  - Synchronized Azure credentials across local `.env` and Render production service.
- **2026-10-02**: Initial architecture & production deployment.
  - Deployed GitHub repository: `zak-yn/articulate-tutor`.
  - Deployed Render Web Service: `articulate-tutor` ([https://articulate-tutor.onrender.com](https://articulate-tutor.onrender.com)).
  - Built full PWA with 3 training modes, sub-word IPA modal, FSRS memory vault, and dynamic wave visualizer.
