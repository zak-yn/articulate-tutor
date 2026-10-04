// Azure Speech SDK Pronunciation Assessment Adapter (Optional cloud enhancement)

const AZURE_TIMEOUT_MS = 8000;

export async function assessWithAzureSpeech(audioBuffer, referenceText = "") {
  const azureKey = process.env.AZURE_SPEECH_KEY || "";
  const azureRegion = process.env.AZURE_SPEECH_REGION || "japaneast";

  if (!azureKey) {
    return null; // Gracefully fallback to internal phonetics engine
  }

  try {
    const mod = await import("microsoft-cognitiveservices-speech-sdk");
    const speechsdk = mod.default || mod;

    return new Promise((outerResolve) => {
      let settled = false;
      let recognizer = null;
      const resolve = (value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        outerResolve(value);
      };
      // Hard ceiling: never let a stalled Azure session block the conversation
      const timer = setTimeout(() => {
        console.warn(`Azure Speech timed out after ${AZURE_TIMEOUT_MS}ms`);
        try { recognizer?.close(); } catch (e) {}
        resolve(null);
      }, AZURE_TIMEOUT_MS);

      try {
        const speechConfig = speechsdk.SpeechConfig.fromSubscription(azureKey, azureRegion);
        speechConfig.speechRecognitionLanguage = "en-US";
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

        recognizer = new speechsdk.SpeechRecognizer(speechConfig, audioConfig);
        pronConfig.applyTo(recognizer);

        recognizer.recognizeOnceAsync(
          (result) => {
            try { recognizer.close(); } catch (e) {}
            if (result.reason === speechsdk.ResultReason.RecognizedSpeech) {
              const pronResult = speechsdk.PronunciationAssessmentResult.fromResult(result);
              let resJson = null;
              try {
                const rawJson = result.properties.getProperty(speechsdk.PropertyId.SpeechServiceResponse_JsonResult);
                if (rawJson) resJson = JSON.parse(rawJson);
              } catch (e) {}

              const nBest = resJson?.NBest?.[0] || {};
              const pronAssessment = nBest.PronAssessment || {};

              const accuracy = Math.round(pronAssessment.AccuracyScore ?? pronResult?.accuracyScore ?? 0);
              const fluency = Math.round(pronAssessment.FluencyScore ?? pronResult?.fluencyScore ?? 0);
              const prosody = Math.round(pronAssessment.ProsodyScore ?? pronResult?.prosodyScore ?? 0);
              const pronScore = Math.round(pronAssessment.PronScore ?? pronResult?.pronunciationScore ?? ((accuracy + fluency + prosody) / 3));

              const words = (nBest.Words || []).map(w => {
                const wPron = w.PronAssessment || {};
                const wAcc = Math.round(wPron.AccuracyScore ?? w.AccuracyScore ?? accuracy);
                return {
                  word: w.Word,
                  accuracy_score: wAcc,
                  error_type: wPron.ErrorType || "None",
                  phonemes: (w.Phonemes || []).map(ph => {
                    const phPron = ph.PronAssessment || {};
                    return {
                      phoneme: ph.Phoneme,
                      ipa: `/${ph.Phoneme}/`,
                      accuracy: Math.round(phPron.AccuracyScore ?? wAcc)
                    };
                  })
                };
              });

              resolve({
                recognized_text: result.text,
                overall_accuracy: accuracy,
                fluency_score: fluency,
                prosody_score: prosody,
                pronunciation_score: pronScore,
                words
              });
            } else {
              resolve(null);
            }
          },
          (err) => {
            console.warn("Azure Speech recognition failed:", err);
            try { recognizer.close(); } catch (e) {}
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
