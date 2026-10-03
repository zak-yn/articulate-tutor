// High-Definition Neural Voice & Speech Synthesis Manager

export class AudioPlayer {
  constructor() {
    this.synth = window.speechSynthesis;
    this.currentAudio = null;
    this.isSpeaking = false;
    this.lastSpokenText = "";
    this.lastAudioBase64 = null;
    this.activeVoice = "en-US-AvaMultilingualNeural"; // Studio Neural Voice
  }

  /**
   * Speaks text using Azure Neural Voice (MP3) with fallback to SpeechSynthesis
   */
  async speak(text, { audioBase64 = null, voice = null, onStart, onEnd } = {}) {
    if (!text && !audioBase64) return;

    this.stop();
    this.lastSpokenText = text;
    this.lastAudioBase64 = audioBase64;
    const targetVoice = voice || this.activeVoice;

    // 1. If audio base64 is already provided by /api/turn
    if (audioBase64) {
      this.playAudioData(audioBase64, onStart, onEnd);
      return;
    }

    // 2. Fetch Azure Studio Neural Voice from /api/tts
    try {
      if (onStart) onStart();
      this.isSpeaking = true;

      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice: targetVoice })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.audio_base64) {
          this.lastAudioBase64 = data.audio_base64;
          this.playAudioData(data.audio_base64, null, onEnd);
          return;
        }
      }
    } catch (e) {
      console.warn("Server Neural TTS request error, falling back to local voice:", e);
    }

    // 3. Fallback to browser SpeechSynthesis only if offline/network error
    this.fallbackBrowserSpeak(text, onStart, onEnd);
  }

  playAudioData(dataUrl, onStart, onEnd) {
    try {
      this.currentAudio = new Audio(dataUrl);
      this.isSpeaking = true;
      if (onStart) onStart();

      this.currentAudio.onended = () => {
        this.isSpeaking = false;
        this.currentAudio = null;
        if (onEnd) onEnd();
      };

      this.currentAudio.onerror = (err) => {
        console.warn("Audio playback error, trying fallback:", err);
        this.isSpeaking = false;
        this.currentAudio = null;
        if (onEnd) onEnd();
      };

      this.currentAudio.play().catch(e => {
        console.warn("Autoplay was prevented by browser policy:", e);
        this.isSpeaking = false;
        if (onEnd) onEnd();
      });
    } catch (e) {
      console.warn("Audio initialization error:", e);
      this.fallbackBrowserSpeak(this.lastSpokenText, onStart, onEnd);
    }
  }

  fallbackBrowserSpeak(text, onStart, onEnd) {
    if (!this.synth) {
      if (onEnd) onEnd();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.95;

    const voices = this.synth.getVoices();
    const neuralVoice = voices.find(v => v.lang.startsWith("en") && (v.name.includes("Natural") || v.name.includes("Neural")))
      || voices.find(v => v.lang.startsWith("en-US"))
      || voices[0];
    if (neuralVoice) utterance.voice = neuralVoice;

    utterance.onstart = () => {
      this.isSpeaking = true;
      if (onStart) onStart();
    };
    utterance.onend = () => {
      this.isSpeaking = false;
      if (onEnd) onEnd();
    };
    utterance.onerror = () => {
      this.isSpeaking = false;
      if (onEnd) onEnd();
    };

    this.synth.speak(utterance);
  }

  stop() {
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      } catch (e) {}
      this.currentAudio = null;
    }

    if (this.synth && this.synth.speaking) {
      this.synth.cancel();
    }
    this.isSpeaking = false;
  }

  replay(callbacks) {
    if (this.lastAudioBase64) {
      this.playAudioData(this.lastAudioBase64, callbacks?.onStart, callbacks?.onEnd);
    } else if (this.lastSpokenText) {
      this.speak(this.lastSpokenText, callbacks);
    }
  }
}
