// Azure Speech SDK Pronunciation Assessment Adapter (Optional cloud enhancement)

export async function assessWithAzureSpeech(audioBuffer, referenceText = "") {
  const azureKey = process.env.AZURE_SPEECH_KEY || "";
  const azureRegion = process.env.AZURE_SPEECH_REGION || "japaneast";

  if (!azureKey) {
    return null; // Gracefully fallback to internal phonetics engine
  }

  try {
    const mod = await import("microsoft-cognitiveservices-speech-sdk");
    const speechsdk = mod.default || mod;

    return new Promise((resolve) => {
      try {
        const speechConfig = speechsdk.SpeechConfig.fromSubscription(azureKey, azureRegion);
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
