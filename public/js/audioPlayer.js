// Speech Synthesis & Audio Output Manager

export class AudioPlayer {
  constructor() {
    this.synth = window.speechSynthesis;
    this.preferredVoice = null;
    this.isSpeaking = false;
    this.lastSpokenText = "";
    this.rate = 1.0;
    this.pitch = 1.0;
    this.initVoices();
  }

  initVoices() {
    if (!this.synth) return;

    const findVoice = () => {
      const voices = this.synth.getVoices();
      // Search for high quality neural / natural voices
      this.preferredVoice = voices.find(v => v.lang.startsWith("en") && (v.name.includes("Jenny") || v.name.includes("Natural") || v.name.includes("Neural")))
        || voices.find(v => v.lang.startsWith("en") && (v.name.includes("Google") || v.name.includes("Samantha") || v.name.includes("Guy")))
        || voices.find(v => v.lang.startsWith("en-US"))
        || voices.find(v => v.lang.startsWith("en"))
        || voices[0];
    };

    findVoice();
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = findVoice;
    }
  }

  speak(text, { onStart, onEnd, onBoundary } = {}) {
    if (!this.synth || !text) return;

    this.stop();
    this.lastSpokenText = text;

    const utterance = new SpeechSynthesisUtterance(text);
    if (this.preferredVoice) {
      utterance.voice = this.preferredVoice;
    }
    utterance.rate = this.rate;
    utterance.pitch = this.pitch;
    utterance.lang = "en-US";

    utterance.onstart = () => {
      this.isSpeaking = true;
      if (onStart) onStart();
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      if (onEnd) onEnd();
    };

    utterance.onerror = (e) => {
      this.isSpeaking = false;
      if (onEnd) onEnd();
    };

    if (onBoundary) {
      utterance.onboundary = (e) => onBoundary(e);
    }

    this.synth.speak(utterance);
  }

  stop() {
    if (this.synth && this.synth.speaking) {
      this.synth.cancel();
      this.isSpeaking = false;
    }
  }

  replay(callbacks) {
    if (this.lastSpokenText) {
      this.speak(this.lastSpokenText, callbacks);
    }
  }
}
