// High-Fidelity Neural Text-to-Speech Engine using Azure AI Neural Voices

export async function synthesizeNeuralSpeech(text, voiceName = "en-US-AvaMultilingualNeural") {
  const azureKey = process.env.AZURE_SPEECH_KEY || "";
  const azureRegion = process.env.AZURE_SPEECH_REGION || "japaneast";

  if (!azureKey || !text) {
    return null;
  }

  try {
    const mod = await import("microsoft-cognitiveservices-speech-sdk");
    const sdk = mod.default || mod;

    const speechConfig = sdk.SpeechConfig.fromSubscription(azureKey, azureRegion);
    speechConfig.speechSynthesisVoiceName = voiceName;
    speechConfig.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3;

    const synthesizer = new sdk.SpeechSynthesizer(speechConfig, null);

    return new Promise((resolve) => {
      synthesizer.speakTextAsync(
        text,
        (result) => {
          synthesizer.close();
          if (result && result.audioData && result.audioData.byteLength > 0) {
            const buffer = Buffer.from(result.audioData);
            const base64 = buffer.toString("base64");
            resolve(`data:audio/mp3;base64,${base64}`);
          } else {
            resolve(null);
          }
        },
        (err) => {
          console.warn("Azure TTS synthesis failed:", err);
          synthesizer.close();
          resolve(null);
        }
      );
    });
  } catch (err) {
    console.warn("Azure TTS initialization error:", err.message);
    return null;
  }
}
