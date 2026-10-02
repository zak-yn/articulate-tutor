// Azure Speech SDK Pronunciation Assessment Adapter (Optional cloud enhancement)

const AZURE_KEY = process.env.AZURE_SPEECH_KEY || "";
const AZURE_REGION = process.env.AZURE_SPEECH_REGION || "eastus";

export async function assessWithAzureSpeech(audioBuffer, referenceText = "") {
  if (!AZURE_KEY) {
    return null; // Gracefully fallback to internal phonetics engine
  }

  try {
    // Dynamic import to avoid crash if native SDK is not present
    const speechsdk = await import("microsoft-cognitiveservices-speech-sdk");

    return new Promise((resolve) => {
      try {
        const speechConfig = speechsdk.SpeechConfig.fromSubscription(AZURE_KEY, AZURE_REGION);
        const pushStream = speechsdk.AudioInputStream.createPushStream();
        pushStream.write(audioBuffer);
        pushStream.close();

        const audioConfig = speechsdk.AudioConfig.fromStreamInput(pushStream);
        const pronConfig = new speechsdk.PronunciationAssessmentConfig(
          referenceText || "",
          speechsdk.PronunciationAssessmentGradingSystem.HundredMark,
          speechsdk.PronunciationAssessmentGranularity.Phoneme,
          true
        );
        pronConfig.enableProsodyAssessment = true;

        const recognizer = new speechsdk.SpeechRecognizer(speechConfig, audioConfig);
        pronConfig.applyTo(recognizer);

        recognizer.recognizeOnceAsync(
          (result) => {
            recognizer.close();
            if (result.reason === speechsdk.ResultReason.RecognizedSpeech) {
              const resJson = JSON.parse(result.properties.getProperty(speechsdk.PropertyId.SpeechServiceResponse_JsonResult));
              const nBest = resJson?.NBest?.[0] || {};
              resolve({
                recognized_text: result.text,
                overall_accuracy: nBest.AccuracyScore || 85,
                fluency_score: nBest.FluencyScore || 85,
                prosody_score: nBest.ProsodyScore || 85,
                pronunciation_score: nBest.PronScore || 85,
                words: (nBest.Words || []).map(w => ({
                  word: w.Word,
                  accuracy_score: w.AccuracyScore || 85,
                  error_type: w.ErrorType || "None",
                  phonemes: (w.Phonemes || []).map(ph => ({
                    phoneme: ph.Phoneme,
                    ipa: `/${ph.Phoneme}/`,
                    accuracy: ph.AccuracyScore || 85
                  }))
                }))
              });
            } else {
              resolve(null);
            }
          },
          (err) => {
            console.warn("Azure Speech recognition failed:", err);
            recognizer.close();
            resolve(null);
          }
        );
      } catch (err) {
        console.warn("Azure initialization error:", err.message);
        resolve(null);
      }
    });
  } catch (e) {
    return null;
  }
}
