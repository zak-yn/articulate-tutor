// Web Audio API Linear PCM (WAV) Engine & Real-Time Waveform + Live Speech Recognition

function downsampleBuffer(buffer, sampleRate, outSampleRate = 16000) {
  if (outSampleRate === sampleRate) return buffer;
  const sampleRateRatio = sampleRate / outSampleRate;
  const newLength = Math.round(buffer.length / sampleRateRatio);
  const result = new Float32Array(newLength);
  let offsetResult = 0;
  let offsetBuffer = 0;
  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
    let accum = 0, count = 0;
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
      accum += buffer[i];
      count++;
    }
    result[offsetResult] = count > 0 ? accum / count : 0;
    offsetResult++;
    offsetBuffer = nextOffsetBuffer;
  }
  return result;
}

function encodeWAV(samples, sampleRate = 16000) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  function writeString(v, offset, str) {
    for (let i = 0; i < str.length; i++) {
      v.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true); // Subchunk1Size
  view.setUint16(20, 1, true);  // Linear PCM
  view.setUint16(22, 1, true);  // Mono channel
  view.setUint32(24, sampleRate, true); // 16,000 Hz
  view.setUint32(28, sampleRate * 2, true); // Byte rate (16000 * 2)
  view.setUint16(32, 2, true);  // Block align
  view.setUint16(34, 16, true); // 16-bit
  writeString(view, 36, "data");
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }

  return new Blob([view], { type: "audio/wav" });
}

export class AudioRecorder {
  constructor() {
    this.audioContext = null;
    this.source = null;
    this.analyser = null;
    this.scriptNode = null;
    this.pcmChunks = [];
    this.animFrameId = null;
    this.isRecording = false;
    this.stream = null;
    this.speechRecognition = null;
    this.currentTranscript = "";
  }

  async start({ onLiveTranscript, onVolumeChange } = {}) {
    if (this.isRecording) return;

    this.currentTranscript = "";
    this.pcmChunks = [];

    // 1. Acquire microphone stream
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });

    // 2. Setup AudioContext for real-time waveform visualizer & 16kHz PCM capture
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    try {
      this.audioContext = new AudioContextClass({ sampleRate: 16000 });
    } catch (e) {
      this.audioContext = new AudioContextClass();
    }

    if (this.audioContext.state === "suspended") {
      await this.audioContext.resume();
    }

    this.source = this.audioContext.createMediaStreamSource(this.stream);
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 64;
    this.source.connect(this.analyser);

    // Capture raw PCM audio buffers
    const bufferSize = 4096;
    this.scriptNode = this.audioContext.createScriptProcessor(bufferSize, 1, 1);
    this.scriptNode.onaudioprocess = (e) => {
      if (!this.isRecording) return;
      const input = e.inputBuffer.getChannelData(0);
      this.pcmChunks.push(new Float32Array(input));
    };
    this.source.connect(this.scriptNode);
    this.scriptNode.connect(this.audioContext.destination);

    // Waveform volume animation loop
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

    // 3. Setup browser SpeechRecognition for instant low-latency transcript
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRec) {
      try {
        this.speechRecognition = new SpeechRec();
        this.speechRecognition.continuous = true;
        this.speechRecognition.interimResults = true;
        this.speechRecognition.lang = "en-US";
        this.speechRecognition.maxAlternatives = 1;

        this.speechRecognition.onresult = (event) => {
          let text = "";
          for (let i = 0; i < event.results.length; ++i) {
            if (event.results[i] && event.results[i][0]) {
              text += event.results[i][0].transcript + " ";
            }
          }
          this.currentTranscript = text.trim();
          if (onLiveTranscript) onLiveTranscript(this.currentTranscript);
        };

        this.speechRecognition.onerror = (e) => {
          console.warn("SpeechRecognition notice:", e.error);
        };

        this.speechRecognition.start();
      } catch (e) {
        console.warn("SpeechRecognition init error:", e);
      }
    }

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

    // Short 120ms buffer to allow last audio packets and recognition events to flush
    await new Promise(r => setTimeout(r, 120));

    this.isRecording = false;

    // Disconnect audio nodes
    if (this.scriptNode) {
      this.scriptNode.disconnect();
      this.scriptNode = null;
    }
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }

    // Merge PCM chunks
    let totalLength = 0;
    for (let i = 0; i < this.pcmChunks.length; i++) {
      totalLength += this.pcmChunks[i].length;
    }
    const merged = new Float32Array(totalLength);
    let offset = 0;
    for (let i = 0; i < this.pcmChunks.length; i++) {
      merged.set(this.pcmChunks[i], offset);
      offset += this.pcmChunks[i].length;
    }

    const currentRate = this.audioContext ? this.audioContext.sampleRate : 16000;
    const downsampled = downsampleBuffer(merged, currentRate, 16000);
    const wavBlob = encodeWAV(downsampled, 16000);

    // Clean up media stream & context
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    if (this.audioContext && this.audioContext.state !== "closed") {
      this.audioContext.close();
      this.audioContext = null;
    }

    return {
      blob: wavBlob,
      transcript: (this.currentTranscript || "").trim()
    };
  }
}
