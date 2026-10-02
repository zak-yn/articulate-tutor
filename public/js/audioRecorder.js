// Web Audio API & MediaRecorder Engine with Live Waveform & Instant ASR

export class AudioRecorder {
  constructor() {
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.audioContext = null;
    this.analyser = null;
    this.animFrameId = null;
    this.isRecording = false;
    this.stream = null;
    this.speechRecognition = null;
    this.liveTranscript = "";
  }

  async start({ onLiveTranscript, onVolumeChange } = {}) {
    if (this.isRecording) return;

    this.liveTranscript = "";
    this.audioChunks = [];

    // 1. Acquire microphone stream
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: 16000,
        echoCancellation: true,
        noiseSuppression: true
      }
    });

    // 2. Setup AudioContext for real-time waveform visualizer
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    this.audioContext = new AudioContextClass();
    const source = this.audioContext.createMediaStreamSource(this.stream);
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 64;
    source.connect(this.analyser);

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    const updateVolume = () => {
      if (!this.isRecording) return;
      this.analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const avg = sum / dataArray.length;
      const normalized = Math.min(1, avg / 128);
      if (onVolumeChange) onVolumeChange(normalized, dataArray);
      this.animFrameId = requestAnimationFrame(updateVolume);
    };
    this.animFrameId = requestAnimationFrame(updateVolume);

    // 3. Setup browser SpeechRecognition for instant low-latency preview
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRec) {
      try {
        this.speechRecognition = new SpeechRec();
        this.speechRecognition.continuous = true;
        this.speechRecognition.interimResults = true;
        this.speechRecognition.lang = "en-US";

        this.speechRecognition.onresult = (event) => {
          let interim = "";
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              this.liveTranscript += event.results[i][0].transcript + " ";
            } else {
              interim += event.results[i][0].transcript;
            }
          }
          const full = (this.liveTranscript + interim).trim();
          if (onLiveTranscript) onLiveTranscript(full);
        };

        this.speechRecognition.onerror = (e) => {
          // Graceful fallback: silent ignore, server ASR will handle
        };

        this.speechRecognition.start();
      } catch (e) {
        console.warn("SpeechRecognition init error:", e);
      }
    }

    // 4. Setup MediaRecorder for binary audio stream capture
    let mimeType = "audio/webm;codecs=opus";
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
    }

    this.mediaRecorder = new MediaRecorder(this.stream, { mimeType });
    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        this.audioChunks.push(e.data);
      }
    };

    this.mediaRecorder.start(100);
    this.isRecording = true;
  }

  async stop() {
    if (!this.isRecording) return null;

    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    if (this.speechRecognition) {
      try {
        this.speechRecognition.stop();
      } catch (e) {}
    }

    return new Promise((resolve) => {
      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: this.mediaRecorder.mimeType });

        // Clean up audio tracks
        if (this.stream) {
          this.stream.getTracks().forEach((track) => track.stop());
          this.stream = null;
        }
        if (this.audioContext && this.audioContext.state !== "closed") {
          this.audioContext.close();
        }

        this.isRecording = false;
        resolve({
          blob: audioBlob,
          transcript: this.liveTranscript.trim()
        });
      };

      this.mediaRecorder.stop();
    });
  }
}
