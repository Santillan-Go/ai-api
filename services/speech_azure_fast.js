import fs from "fs";
import sdk from "microsoft-cognitiveservices-speech-sdk";
import dotenv from "dotenv";

dotenv.config();

export const pronunciationAssessmentWithFile = ({audioFile, reference_text}) => {
    return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
            reject(new Error("Pronunciation assessment timed out after 20 seconds"));
        }, 20000);
        
        try {
            console.log("🎙️  Starting fast pronunciation assessment...");
            
            if (!audioFile || !fs.existsSync(audioFile)) {
                clearTimeout(timeoutId);
                reject(new Error("Audio file not found"));
                return;
            }
            
            if (!process.env.SUBSCRIPTION_KEY || !reference_text) {
                clearTimeout(timeoutId);
                reject(new Error("Missing required configuration"));
                return;
            }
            
            console.log(`📁 Loading audio file: ${audioFile}`);
            const audioConfig = sdk.AudioConfig.fromWavFileInput(fs.readFileSync(audioFile));
            const speechConfig = sdk.SpeechConfig.fromSubscription(process.env.SUBSCRIPTION_KEY, "eastus2");
            speechConfig.speechRecognitionLanguage = "en-US";
            
            // Create pronunciation assessment config
            const pronunciationConfig = new sdk.PronunciationAssessmentConfig(
                reference_text,
                sdk.PronunciationAssessmentGradingSystem.HundredMark,
                sdk.PronunciationAssessmentGranularity.Phoneme,
                true
            );
            pronunciationConfig.enableProsodyAssessment = true;
            
            // Create recognizer
            const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);
            pronunciationConfig.applyTo(recognizer);
            
            console.log("⚡ Starting single-shot recognition (faster)...");
            
            // Use recognizeOnceAsync instead of continuous recognition
            recognizer.recognizeOnceAsync(
                (result) => {
                    clearTimeout(timeoutId);
                    recognizer.close();
                    
                    if (result.reason === sdk.ResultReason.RecognizedSpeech) {
                        console.log("✅ Recognition successful");
                        
                        const pronunciationResult = sdk.PronunciationAssessmentResult.fromResult(result);
                        const jsonResult = JSON.parse(result.properties.getProperty(sdk.PropertyId.SpeechServiceResponse_JsonResult));
                        
                        console.log("📊 Scores:", {
                            pronunciation: pronunciationResult.pronunciationScore,
                            accuracy: pronunciationResult.accuracyScore,
                            fluency: pronunciationResult.fluencyScore,
                            completeness: pronunciationResult.completenessScore,
                            prosody: pronunciationResult.prosodyScore
                        });
                        
                        const words = jsonResult.NBest[0].Words.map(word => {
                            return {
                                word: word.Word,
                                accuracyScore: word.PronunciationAssessment.AccuracyScore,
                                errorType: word.PronunciationAssessment.ErrorType,
                                // Phonemes are at word level, not inside PronunciationAssessment
                                phonemes: word.Phonemes ? word.Phonemes.map(phoneme => ({
                                    phoneme: phoneme.Phoneme,
                                    accuracyScore: phoneme.PronunciationAssessment?.AccuracyScore || 0,
                                    offset: phoneme.Offset,
                                    duration: phoneme.Duration
                                })) : [],
                                // Also include syllables for more detail
                                syllables: word.Syllables ? word.Syllables.map(syllable => ({
                                    syllable: syllable.Syllable,
                                    grapheme: syllable.Grapheme, // The written letters
                                    accuracyScore: syllable.PronunciationAssessment?.AccuracyScore || 0
                                })) : []
                            };
                        });
                        
                        console.log("📝 Detailed word analysis:", JSON.stringify(words, null, 2));
                        
                        resolve({
                            scores: {
                                pronScore: Math.round(pronunciationResult.pronunciationScore),
                                accuracyScore: Math.round(pronunciationResult.accuracyScore),
                                fluencyScore: Math.round(pronunciationResult.fluencyScore),
                                compScore: Math.round(pronunciationResult.completenessScore),
                                prosodyScore: Math.round(pronunciationResult.prosodyScore || 0)
                            },
                            words: words,
                            recognizedText: result.text
                        });
                    } else if (result.reason === sdk.ResultReason.NoMatch) {
                        console.log("⚠️  No speech detected");
                        reject(new Error("No speech detected in audio file"));
                    } else {
                        console.log("❌ Recognition failed:", sdk.ResultReason[result.reason]);
                        reject(new Error("Speech recognition failed"));
                    }
                },
                (error) => {
                    clearTimeout(timeoutId);
                    recognizer.close();
                    console.error("❌ Recognition error:", error);
                    reject(new Error(`Recognition error: ${error}`));
                }
            );
            
        } catch (error) {
            clearTimeout(timeoutId);
            console.error("❌ Fatal error:", error);
            reject(error);
        }
    });
};
