import { Icons } from "./icons.js";
import { AudioRecorder } from "./audioRecorder.js";
import { AudioPlayer } from "./audioPlayer.js";
import { FsrsDatabase } from "./fsrsDb.js";

const DEFAULT_SCENARIO = {
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
};

class ArticulateApp {
  constructor() {
    this.recorder = new AudioRecorder();
    this.player = new AudioPlayer();
    this.db = new FsrsDatabase();

    this.activeMode = "roleplay"; // 'roleplay' | 'gym' | 'drill' | 'vault'
    this.catalog = {
      roleplayScenarios: [DEFAULT_SCENARIO],
      speakingDrills: [],
      minimalPairs: []
    };

    this.activeScenario = DEFAULT_SCENARIO;
    this.activeGymPair = null;
    this.activeDrillPrompt = null;

    this.history = [];
    this.selectedWord = null;
    this.isLoading = false;

    this.init();
  }

  init() {
    this.renderIcons();
    this.bindEvents();
    // Instant zero-latency rendering of default scenario
    this.startScenarioSession();
    this.updateVaultBadge();
    // Non-blocking background sync of full catalog and server health
    this.fetchStatusAndCatalog();
  }

  renderIcons() {
    document.querySelectorAll("[data-icon]").forEach(el => {
      const name = el.getAttribute("data-icon");
      const cls = el.getAttribute("data-icon-class") || "w-4 h-4";
      if (Icons[name]) {
        el.innerHTML = Icons[name](cls);
      }
    });
  }

  bindEvents() {
    // Mode navigation
    document.querySelectorAll(".tab-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const mode = btn.getAttribute("data-mode");
        if (mode) this.switchMode(mode);
      });
    });

    // Push to talk button (Supports both click-toggle and hold-to-talk)
    const pttBtn = document.getElementById("btn-ptt");
    if (pttBtn) {
      let isHold = false;
      let holdTimer = null;

      // Click to toggle
      pttBtn.addEventListener("click", () => {
        if (!isHold) {
          if (this.recorder.isRecording) {
            this.stopRecording();
          } else {
            this.startRecording();
          }
        }
        isHold = false;
      });

      // Pointer down / touch hold
      pttBtn.addEventListener("pointerdown", () => {
        holdTimer = setTimeout(() => {
          isHold = true;
          if (!this.recorder.isRecording) this.startRecording();
        }, 250);
      });

      window.addEventListener("pointerup", () => {
        clearTimeout(holdTimer);
        if (isHold && this.recorder.isRecording) {
          this.stopRecording();
          isHold = false;
        }
      });
    }

    // Modal Close
    document.getElementById("btn-modal-close")?.addEventListener("click", () => this.closePhonemeModal());
    document.getElementById("btn-modal-gotit")?.addEventListener("click", () => this.closePhonemeModal());
    document.getElementById("modal-overlay")?.addEventListener("click", (e) => {
      if (e.target.id === "modal-overlay") this.closePhonemeModal();
    });

    // Spacebar to talk
    window.addEventListener("keydown", (e) => {
      if (e.code === "Space" && e.target === document.body && !this.isLoading) {
        e.preventDefault();
        if (!this.recorder.isRecording) this.startRecording();
      }
    });

    window.addEventListener("keyup", (e) => {
      if (e.code === "Space" && e.target === document.body && this.recorder.isRecording) {
        e.preventDefault();
        this.stopRecording();
      }
    });

    // Text input form submission
    const textForm = document.getElementById("text-input-form");
    const textInput = document.getElementById("chat-text-input");
    if (textForm && textInput) {
      textForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const text = textInput.value.trim();
        if (text && !this.isLoading) {
          textInput.value = "";
          this.processTurn(null, text);
        }
      });
    }
  }

  async fetchStatusAndCatalog() {
    try {
      const [scenRes, statusRes] = await Promise.all([
        fetch("/api/scenarios").catch(() => null),
        fetch("/api/status").catch(() => null)
      ]);
      if (scenRes && scenRes.ok) {
        this.catalog = await scenRes.json();
        if (this.catalog.roleplayScenarios && this.catalog.roleplayScenarios.length > 0) {
          this.activeScenario = this.catalog.roleplayScenarios[0];
          this.renderRoleplayContext();
        }
        this.activeGymPair = this.catalog.minimalPairs?.[0] || null;
        this.activeDrillPrompt = this.catalog.speakingDrills?.[0]?.prompts?.[0] || null;
      }
      if (statusRes && statusRes.ok) {
        const stat = await statusRes.json();
        const badgeText = document.getElementById("system-status-text");
        if (badgeText) {
          if (stat.azure_speech_configured && stat.gemini_configured) {
            badgeText.textContent = "Azure & Gemini Active";
          } else if (stat.azure_speech_configured) {
            badgeText.textContent = "Azure Speech Active";
          } else {
            badgeText.textContent = "Gemini Active";
          }
        }
      }
    } catch (e) {
      console.warn("Failed to load catalog or status:", e);
    }
  }

  switchMode(mode) {
    this.activeMode = mode;
    document.querySelectorAll(".tab-btn").forEach(b => {
      b.classList.toggle("active", b.getAttribute("data-mode") === mode);
    });

    const contextBar = document.getElementById("context-bar");
    const chatWorkspace = document.getElementById("chat-workspace");
    const audioDock = document.getElementById("audio-dock");
    const scaffoldingBar = document.getElementById("scaffolding-bar");
    const briefingEl = document.getElementById("scenario-briefing");

    if (briefingEl && mode !== "roleplay") {
      briefingEl.style.display = "none";
    }

    if (mode === "vault") {
      contextBar.style.display = "none";
      scaffoldingBar.style.display = "none";
      audioDock.style.display = "none";
      this.renderVault(chatWorkspace);
      return;
    }

    contextBar.style.display = "flex";
    scaffoldingBar.style.display = "flex";
    audioDock.style.display = "flex";

    if (mode === "roleplay") {
      this.renderRoleplayContext();
      this.renderTimeline();
    } else if (mode === "gym") {
      this.renderGymContext();
      this.renderGymWorkspace();
    } else if (mode === "drill") {
      this.renderDrillContext();
      this.renderDrillWorkspace();
    }
  }

  startScenarioSession() {
    if (!this.activeScenario) return;
    this.history = [
      {
        role: "tutor",
        spoken_response: this.activeScenario.initialGreeting,
        corrections: [],
        scaffolding_hints: this.activeScenario.scaffoldingHints || []
      }
    ];
    this.renderRoleplayContext();
    this.renderTimeline();
    this.renderScaffolding(this.activeScenario.scaffoldingHints);
    // Voice playback for tutor intro
    this.player.speak(this.activeScenario.initialGreeting);
  }

  renderRoleplayContext() {
    const titleEl = document.getElementById("context-title-text");
    const selectorBtn = document.getElementById("context-selector-btn");
    const briefingEl = document.getElementById("scenario-briefing");

    if (this.activeScenario) {
      titleEl.textContent = `${this.activeScenario.title} (${this.activeScenario.level})`;
      selectorBtn.textContent = "Change Scenario";
      selectorBtn.onclick = () => this.showScenarioPicker();

      if (briefingEl) {
        briefingEl.style.display = "flex";
        briefingEl.innerHTML = `
          <div class="briefing-row">
            <span class="briefing-tag">状況・設定</span>
            <span class="briefing-text">${this.activeScenario.settingJa || this.activeScenario.context}</span>
          </div>
          <div class="briefing-row">
            <span class="briefing-tag">あなたの役</span>
            <span class="briefing-text">${this.activeScenario.yourRoleJa || "Conversational Partner"}</span>
            <span class="briefing-tag" style="margin-left: 10px;">相手</span>
            <span class="briefing-text">${this.activeScenario.partnerJa || this.activeScenario.persona}</span>
          </div>
          <div class="briefing-row">
            <span class="briefing-tag">ゴール</span>
            <span class="briefing-goal">${this.activeScenario.goalJa || this.activeScenario.systemGoal}</span>
          </div>
        `;
      }
    }
  }

  renderGymContext() {
    const titleEl = document.getElementById("context-title-text");
    const selectorBtn = document.getElementById("context-selector-btn");
    if (this.activeGymPair) {
      titleEl.textContent = `Gym: ${this.activeGymPair.title}`;
      selectorBtn.textContent = "Change Phoneme";
      selectorBtn.onclick = () => this.showGymPicker();
    }
  }

  renderDrillContext() {
    const titleEl = document.getElementById("context-title-text");
    const selectorBtn = document.getElementById("context-selector-btn");
    titleEl.textContent = "High-Cadence Speaking Drills (Speak Mode)";
    selectorBtn.textContent = "Next Drill";
    selectorBtn.onclick = () => this.nextDrill();
  }

  renderTimeline() {
    const ws = document.getElementById("chat-workspace");
    ws.innerHTML = "";

    this.history.forEach((turn, idx) => {
      const container = document.createElement("div");
      container.className = "turn-container";

      if (turn.role === "user") {
        container.innerHTML = this.buildUserTurnHTML(turn);
      } else {
        container.innerHTML = this.buildTutorTurnHTML(turn, idx);
      }

      ws.appendChild(container);
    });

    // Bind word score clicks
    ws.querySelectorAll(".word-chip").forEach(chip => {
      chip.addEventListener("click", () => {
        const turnIdx = parseInt(chip.getAttribute("data-turn-idx"), 10);
        const wordIdx = parseInt(chip.getAttribute("data-word-idx"), 10);
        const turn = this.history[turnIdx];
        if (turn?.pronunciation?.words?.[wordIdx]) {
          this.openPhonemeModal(turn.pronunciation.words[wordIdx]);
        }
      });
    });

    // Bind replay buttons
    ws.querySelectorAll(".btn-replay-voice").forEach(btn => {
      btn.addEventListener("click", () => {
        const turnIdx = parseInt(btn.getAttribute("data-turn-idx"), 10);
        const turn = this.history[turnIdx];
        if (turn) {
          this.player.speak(turn.spoken_response, { audioBase64: turn.audio_base64 });
        }
      });
    });

    ws.scrollTop = ws.scrollHeight;
  }

  buildUserTurnHTML(turn) {
    const words = turn.pronunciation?.words || [];
    let wordsHtml = "";

    if (words.length > 0) {
      wordsHtml = words.map((w, wIdx) => {
        let level = "high";
        if (w.accuracy_score < 60) level = "low";
        else if (w.accuracy_score < 80) level = "mid";

        return `<button class="word-chip ${level}" data-turn-idx="${this.history.indexOf(turn)}" data-word-idx="${wIdx}" title="Score: ${Math.round(w.accuracy_score)}%">
          ${w.word}
        </button>`;
      }).join(" ");
    } else {
      wordsHtml = `<p class="user-raw-text">${turn.text || ""}</p>`;
    }

    const pScore = turn.pronunciation?.pronunciation_score ? Math.round(turn.pronunciation.pronunciation_score) : 85;
    const fScore = turn.pronunciation?.fluency_score ? Math.round(turn.pronunciation.fluency_score) : 85;
    const prosScore = turn.pronunciation?.prosody_score ? Math.round(turn.pronunciation.prosody_score) : 85;

    return `
      <div class="user-turn">
        <div class="user-words-row">${wordsHtml}</div>
        <div class="turn-metrics">
          <div class="metric-item">Pronunciation: <span>${pScore}%</span></div>
          <div class="metric-item">Fluency: <span>${fScore}%</span></div>
          <div class="metric-item">Prosody: <span>${prosScore}%</span></div>
        </div>
      </div>
    `;
  }

  buildTutorTurnHTML(turn, idx) {
    const recastingHtml = (turn.corrections && turn.corrections.length > 0) ? `
      <div class="recasting-box">
        <div class="recasting-header">${Icons.sparkles("w-3.5 h-3.5")} Better Native Expressions</div>
        ${turn.corrections.map(c => `
          <div class="correction-entry">
            <span class="correction-original">${c.original}</span>
            <span class="correction-improved">${c.improved}</span>
            <p class="correction-reason">${c.explanation}</p>
          </div>
        `).join("")}
      </div>
    ` : "";

    return `
      <div class="tutor-turn">
        <div class="tutor-speech-header">
          <span class="tutor-label">${Icons.shieldCheck("w-3.5 h-3.5")} Articulate Tutor <span style="font-size: 10px; color: var(--accent-emerald); font-weight: normal; margin-left: 4px;">• Studio Neural Voice</span></span>
          <button class="btn-replay-voice" data-turn-idx="${idx}" title="Replay voice">
            ${Icons.volume("w-4 h-4")}
          </button>
        </div>
        <p class="tutor-spoken-text">${turn.spoken_response}</p>
        ${recastingHtml}
      </div>
    `;
  }

  renderScaffolding(hints = []) {
    const container = document.getElementById("scaffolding-chips");
    if (!container) return;
    container.innerHTML = "";

    hints.forEach(hint => {
      const chip = document.createElement("button");
      chip.className = "scaffold-chip";
      chip.textContent = hint;
      chip.onclick = () => {
        const input = document.getElementById("chat-text-input");
        if (input) {
          input.value = hint;
          input.focus();
        }
        this.player.speak(hint);
      };
      container.appendChild(chip);
    });
  }

  async startRecording() {
    if (this.isLoading) return;

    const pttBtn = document.getElementById("btn-ptt");
    const caption = document.getElementById("ptt-caption");
    const bars = document.querySelectorAll(".waveform-bar");

    try {
      await this.recorder.start({
        onLiveTranscript: (text) => {
          caption.textContent = `"${text.slice(-30)}..."`;
        },
        onVolumeChange: (vol, freqArray) => {
          bars.forEach((bar, i) => {
            const val = freqArray[i % freqArray.length] / 255;
            bar.style.height = `${Math.max(4, val * 24)}px`;
            bar.classList.toggle("active", val > 0.2);
          });
        }
      });

      pttBtn.classList.add("recording");
      caption.textContent = "Listening... Tap to Complete";
    } catch (err) {
      console.error("Mic start failed:", err);
      caption.textContent = "Microphone access blocked";
    }
  }

  async stopRecording() {
    const pttBtn = document.getElementById("btn-ptt");
    const caption = document.getElementById("ptt-caption");
    const bars = document.querySelectorAll(".waveform-bar");

    bars.forEach(b => {
      b.style.height = "4px";
      b.classList.remove("active");
    });

    pttBtn.classList.remove("recording");
    pttBtn.classList.add("loading");
    caption.textContent = "Analyzing speech...";
    this.isLoading = true;

    try {
      const recResult = await this.recorder.stop();
      if (!recResult || (!recResult.blob && !recResult.transcript)) {
        this.resetPttState();
        return;
      }

      await this.processTurn(recResult.blob, recResult.transcript);
    } catch (e) {
      console.error("Turn submission error:", e);
    } finally {
      this.resetPttState();
    }
  }

  resetPttState() {
    const pttBtn = document.getElementById("btn-ptt");
    const caption = document.getElementById("ptt-caption");
    pttBtn.classList.remove("recording", "loading");
    caption.textContent = this.player.isSpeaking ? "Tutor speaking..." : "Tap or Hold Space to Speak";
    this.isLoading = false;
  }

  async processTurn(audioBlob, liveTranscript) {
    const dueItems = this.db.getDueItems(4).map(i => i.word);
    const caption = document.getElementById("ptt-caption");
    if (caption) caption.textContent = "Coaching your reply...";

    const formData = new FormData();
    if (audioBlob) {
      formData.append("audio", audioBlob, "recording.wav");
    }
    formData.append("transcript", liveTranscript || "");
    formData.append("mode", this.activeMode);
    formData.append("scenario", this.activeScenario?.title || "Conversational English");
    formData.append("history", JSON.stringify(this.history.map(h => ({
      role: h.role,
      text: h.spoken_response || h.text || ""
    }))));
    formData.append("due_words", JSON.stringify(dueItems));

    const res = await fetch("/api/turn", {
      method: "POST",
      body: formData
    });

    if (!res.ok) {
      throw new Error(`Server returned ${res.status}`);
    }

    const data = await res.json();

    // 1. Add User Turn to History
    this.history.push({
      role: "user",
      text: data.user_transcript,
      pronunciation: data.pronunciation
    });

    // 2. Track weak words & errors in FSRS memory
    if (data.pronunciation?.words) {
      data.pronunciation.words.forEach(w => {
        if (w.accuracy_score < 75) {
          const topPhoneme = w.phonemes?.find(p => p.accuracy < 70)?.phoneme || "";
          this.db.recordAttempt(w.word, w.accuracy_score, "pronunciation", topPhoneme);
        }
      });
      this.updateVaultBadge();
    }

    // 3. Add Tutor Turn to History (including synthesized studio neural audio)
    const tutorTurn = data.tutor_turn || {};
    this.history.push({
      role: "tutor",
      spoken_response: tutorTurn.spoken_response,
      corrections: tutorTurn.corrections || [],
      scaffolding_hints: tutorTurn.scaffolding_hints || [],
      audio_base64: data.audio_base64
    });

    // 4. Update UI & Speak with Azure Studio Neural Voice
    this.renderTimeline();
    this.renderScaffolding(tutorTurn.scaffolding_hints);

    if (tutorTurn.spoken_response) {
      if (caption) caption.textContent = "Tutor speaking...";
      this.player.speak(tutorTurn.spoken_response, {
        audioBase64: data.audio_base64,
        onEnd: () => {
          if (caption) caption.textContent = "Tap or Hold Space to Speak";
        }
      });
    }
  }

  openPhonemeModal(wordObj) {
    this.selectedWord = wordObj;
    const modal = document.getElementById("modal-overlay");
    if (!modal) return;

    document.getElementById("modal-word-title").textContent = wordObj.word;
    document.getElementById("modal-accuracy-score").textContent = `Accuracy: ${Math.round(wordObj.accuracy_score)}%`;

    const grid = document.getElementById("phoneme-grid");
    grid.innerHTML = "";

    const phonemes = wordObj.phonemes || [];
    phonemes.forEach(ph => {
      const cell = document.createElement("div");
      cell.className = "phoneme-cell";
      let level = "high";
      if (ph.accuracy < 65) level = "low";
      else if (ph.accuracy < 80) level = "mid";

      cell.innerHTML = `
        <span class="phoneme-symbol">${ph.ipa || "/" + ph.phoneme + "/"}</span>
        <span class="phoneme-score ${level}">${Math.round(ph.accuracy)}%</span>
      `;
      grid.appendChild(cell);
    });

    // Find weakest phoneme guide
    const weakest = phonemes.slice().sort((a, b) => a.accuracy - b.accuracy)[0];
    const guideBox = document.getElementById("articulatory-box");
    if (weakest && weakest.guide) {
      guideBox.style.display = "block";
      document.getElementById("articulatory-title").textContent = weakest.guide.name;
      document.getElementById("articulatory-tips").textContent = weakest.guide.tips;
      document.getElementById("articulatory-errors").textContent = `Common pitfall: ${weakest.guide.commonError}`;
    } else {
      guideBox.style.display = "none";
    }

    modal.classList.add("open");
  }

  closePhonemeModal() {
    const modal = document.getElementById("modal-overlay");
    if (modal) modal.classList.remove("open");
  }

  // --- Gym Mode Workspace ---
  renderGymWorkspace() {
    const ws = document.getElementById("chat-workspace");
    ws.innerHTML = "";

    if (!this.activeGymPair) return;

    const card = document.createElement("div");
    card.className = "gym-card";
    card.innerHTML = `
      <div class="card-tag">Phonetic Articulatory Gym (ELSA Mode)</div>
      <h3 class="card-title">${this.activeGymPair.title}</h3>
      <p class="card-desc">${this.activeGymPair.explanation}</p>
      <div class="minimal-pairs-grid">
        ${this.activeGymPair.pairs.map(p => `
          <button class="pair-btn" data-word="${p.wordA}" data-sent="${p.sentenceA}">
            <span class="pair-word">/${this.activeGymPair.targetPhonemes[0]}/ ${p.wordA}</span>
            <span class="pair-sentence">${p.sentenceA}</span>
          </button>
          <button class="pair-btn" data-word="${p.wordB}" data-sent="${p.sentenceB}">
            <span class="pair-word">/${this.activeGymPair.targetPhonemes[1]}/ ${p.wordB}</span>
            <span class="pair-sentence">${p.sentenceB}</span>
          </button>
        `).join("")}
      </div>
    `;

    ws.appendChild(card);

    // Bind pair buttons
    card.querySelectorAll(".pair-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const sentence = btn.getAttribute("data-sent");
        this.player.speak(sentence);
      });
    });
  }

  // --- Drills Mode Workspace ---
  renderDrillWorkspace() {
    const ws = document.getElementById("chat-workspace");
    ws.innerHTML = "";

    const drill = this.catalog.speakingDrills[0];
    if (!drill) return;

    const card = document.createElement("div");
    card.className = "drill-card";
    card.innerHTML = `
      <div class="card-tag">Rapid Response Cadence Drill (Speak Mode)</div>
      <h3 class="card-title">${drill.category}</h3>
      <p class="card-desc">${drill.description}</p>
      <div style="margin-top: 14px;">
        ${drill.prompts.map((pr, idx) => `
          <div style="padding: 12px; background: var(--bg-surface); border: 1px solid var(--border-hairline); border-radius: var(--radius-sm); margin-bottom: 8px;">
            <div style="font-weight: 600; font-size: 13px; color: var(--accent-amber); margin-bottom: 4px;">Stimulus #${idx + 1}</div>
            <p style="font-size: 13.5px; color: var(--text-main); margin-bottom: 6px;">${pr.stimulus}</p>
            <div style="font-size: 11.5px; color: var(--text-dim);">Formula target: <i>${pr.targetFormula}</i></div>
          </div>
        `).join("")}
      </div>
    `;

    ws.appendChild(card);
  }

  // --- FSRS Vault View ---
  renderVault(container) {
    container.innerHTML = "";
    const items = this.db.getAllItems();
    const dueCount = this.db.getDueItems().length;

    const wrapper = document.createElement("div");
    wrapper.style.width = "100%";
    wrapper.innerHTML = `
      <div class="vault-header">
        <div>
          <h2 style="font-size: 18px; font-weight: 600; color: var(--text-main);">Spaced Repetition Memory Vault</h2>
          <p style="font-size: 12px; color: var(--text-dim); margin-top: 2px;">FSRS algorithm tracking weak sounds & expressions</p>
        </div>
        <div class="vault-retention-pill ${dueCount > 0 ? 'due' : 'learned'}">
          ${dueCount} Due for Practice
        </div>
      </div>
      <div>
        ${items.length === 0 ? `<p style="color: var(--text-dim); font-size: 13px; padding: 20px 0;">No items tracked yet. Practice speaking in Roleplay or Gym to automatically log words.</p>` : ""}
        ${items.map(i => {
          const isDue = i.nextReview <= Date.now();
          return `
            <div class="vault-item-row">
              <div class="vault-item-left">
                <span class="vault-word">${i.word} ${i.targetPhoneme ? `<span style="font-family: var(--font-mono); color: var(--accent-amber); font-size: 12px;">/${i.targetPhoneme}/</span>` : ""}</span>
                <span class="vault-meta">Last accuracy: ${Math.round(i.lastAccuracy)}% • Reps: ${i.reps} • ${i.notes || "Phoneme precision drill"}</span>
              </div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span class="vault-retention-pill ${isDue ? 'due' : 'learned'}">${isDue ? 'Due Now' : 'Scheduled'}</span>
                <button class="btn-vault-test pair-btn" data-word="${i.word}" style="padding: 4px 8px; font-size: 11px;">
                  Listen
                </button>
              </div>
            </div>
          `;
        }).join("")}
      </div>
    `;

    container.appendChild(wrapper);

    wrapper.querySelectorAll(".btn-vault-test").forEach(btn => {
      btn.addEventListener("click", () => {
        this.player.speak(btn.getAttribute("data-word"));
      });
    });
  }

  updateVaultBadge() {
    const badge = document.getElementById("vault-badge");
    if (!badge) return;
    const due = this.db.getDueItems().length;
    badge.textContent = due;
    badge.style.display = due > 0 ? "inline-block" : "none";
  }

  showScenarioPicker() {
    if (!this.catalog.roleplayScenarios.length) return;
    const nextIdx = (this.catalog.roleplayScenarios.indexOf(this.activeScenario) + 1) % this.catalog.roleplayScenarios.length;
    this.activeScenario = this.catalog.roleplayScenarios[nextIdx];
    this.startScenarioSession();
  }

  showGymPicker() {
    if (!this.catalog.minimalPairs.length) return;
    const nextIdx = (this.catalog.minimalPairs.indexOf(this.activeGymPair) + 1) % this.catalog.minimalPairs.length;
    this.activeGymPair = this.catalog.minimalPairs[nextIdx];
    this.renderGymContext();
    this.renderGymWorkspace();
  }

  nextDrill() {
    this.renderDrillWorkspace();
  }
}

// Instantiate on DOM ready
document.addEventListener("DOMContentLoaded", () => {
  window.app = new ArticulateApp();
});
