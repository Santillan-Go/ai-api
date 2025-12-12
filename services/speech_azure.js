import fs from "fs";
import sdk from "microsoft-cognitiveservices-speech-sdk";
import dotenv from "dotenv";
import _ from "lodash";
import difflib from "difflib";

dotenv.config();

export const pronunciationAssessmentContinuousWithFile = ({audioFile, reference_text}) => {
    return new Promise((resolve, reject) => {
        // Set a safety timeout (8 seconds to stay within Vercel's 10s limit)
        const timeoutId = setTimeout(() => {
            reject(new Error("Pronunciation assessment timed out after 8 seconds"));
        }, 8000);
        
        try {
            console.log("🎙️  Starting pronunciation assessment...");
            
            if (!audioFile) {
                clearTimeout(timeoutId);
                reject(new Error("audioFile parameter is required"));
                return;
            }
            
            if (!fs.existsSync(audioFile)) {
                clearTimeout(timeoutId);
                reject(new Error(`Audio file "${audioFile}" not found!`));
                return;
            }
            
            console.log(`📁 Loading audio file: ${audioFile}`);
            var audioConfig = sdk.AudioConfig.fromWavFileInput(fs.readFileSync(audioFile));
            
            if (!process.env.SUBSCRIPTION_KEY) {
                clearTimeout(timeoutId);
                reject(new Error("SUBSCRIPTION_KEY not found in .env file!"));
                return;
            }
            
            if(!reference_text) {
                clearTimeout(timeoutId);
                reject(new Error("reference_text is required for pronunciation assessment!"));
                return;
            }
            
            var speechConfig = sdk.SpeechConfig.fromSubscription(process.env.SUBSCRIPTION_KEY, "eastus2");
            console.log("✅ Azure Speech config initialized");

     
 //   var reference_text = "Today was a beautiful day.";
    // create pronunciation assessment config, set grading system, granularity and if enable miscue based on your requirement.
    const pronunciationAssessmentConfig = new sdk.PronunciationAssessmentConfig(
        reference_text,
        sdk.PronunciationAssessmentGradingSystem.HundredMark,
        sdk.PronunciationAssessmentGranularity.Phoneme,
        true
    );
    pronunciationAssessmentConfig.enableProsodyAssessment = true;

    var language = "en-US"
    speechConfig.speechRecognitionLanguage = language;

    // create the speech recognizer.
    var reco = new sdk.SpeechRecognizer(speechConfig, audioConfig);
    pronunciationAssessmentConfig.applyTo(reco);
    
    const scoreNumber = {
        accuracyScore: 0,
        fluencyScore: 0,
        compScore: 0,
        prosodyScore: 0,
    };
    const allWords = [];
    var currentText = [];
    var startOffset = 0;
    var recognizedWords = [];
    var fluencyScores = [];
    var prosodyScores = [];
    var durations = [];
    var jo = {};
        
    // Before beginning speech recognition, setup the callbacks to be invoked when an event occurs.

    // The event recognizing signals that an intermediate recognition result is received.
    // You will receive one or more recognizing events as a speech phrase is recognized, with each containing
    // more recognized speech. The event will contain the text for the recognition since the last phrase was recognized.
    reco.recognizing = function (s, e) {
        var str = "(recognizing) Reason: " + sdk.ResultReason[e.result.reason] + " Text: " + e.result.text;
        console.log(str);
    };

    // The event recognized signals that a final recognition result is received.
    // This is the final event that a phrase has been recognized.
    // For continuous recognition, you will get one recognized event for each phrase recognized.
    reco.recognized = function (s, e) {
        console.log("pronunciation assessment for: ", e.result.text);
        var pronunciation_result = sdk.PronunciationAssessmentResult.fromResult(e.result);
        console.log(" Accuracy score: ", pronunciation_result.accuracyScore, '',
            "pronunciation score: ", pronunciation_result.pronunciationScore, '',
            "completeness score : ", pronunciation_result.completenessScore, '',
            "fluency score: ", pronunciation_result.fluencyScore
        );

        jo = JSON.parse(e.result.properties.getProperty(sdk.PropertyId.SpeechServiceResponse_JsonResult));
        const nb = jo["NBest"][0];
        startOffset = nb.Words[0].Offset;
        const localtext = _.map(nb.Words, (item) => item.Word.toLowerCase());
        currentText = currentText.concat(localtext);
        fluencyScores.push(nb.PronunciationAssessment.FluencyScore);
        prosodyScores.push(nb.PronunciationAssessment.ProsodyScore);
        const isSucceeded = jo.RecognitionStatus === 'Success';
        const nBestWords = jo.NBest[0].Words;
        const durationList = [];
        _.forEach(nBestWords, (word) => {
            recognizedWords.push(word);
            durationList.push(word.Duration);
        });
        durations.push(_.sum(durationList));

        if (isSucceeded && nBestWords) {
            allWords.push(...nBestWords);
        }
    };

    function calculateOverallPronunciationScore() {
        const resText = currentText.join(" ");        
        let wholelyricsArry = [];
        let resTextArray = [];

        if (["zh-cn"].includes(language.toLowerCase())) {
            const resTextProcessed = (resText.toLocaleLowerCase() ?? "").replace(new RegExp("[^a-zA-Z0-9一-龥']+", "g"), " ");
            const wholelyrics = (reference_text.toLocaleLowerCase() ?? "").replace(new RegExp("[^a-zA-Z0-9一-龥']+", "g"), " ");
            const segment = new Segment();
            segment.useDefault();
            segment.loadDict('wildcard.txt');
            _.map(segment.doSegment(wholelyrics, {stripPunctuation: true}), (res) => wholelyricsArry.push(res['w']));
            _.map(segment.doSegment(resTextProcessed, {stripPunctuation: true}), (res) => resTextArray.push(res['w']));
        } else {
           let resTextProcessed = (resText.toLocaleLowerCase() ?? "").replace(new RegExp("[!\"#$%&()*+,\\-./:;<=>?@\\[\\\\\\]^_`{|}~]+", "g"), "").replace(new RegExp("\\\\]+", "g"), "");
            let wholelyrics = (reference_text.toLocaleLowerCase() ?? "").replace(new RegExp("[!\"#$%&()*+,\\-./:;<=>?@\\[\\\\\\]^_`{|}~]+", "g"), "").replace(new RegExp("\\\\]+", "g"), "");         
            wholelyricsArry = wholelyrics.split(" ");
            resTextArray = resTextProcessed.split(" ");
        }
        const wholelyricsArryRes = _.map(
            _.filter(wholelyricsArry, (item) => !!item),
            (item) => item.trim()
        );
      
        // We need to compare with the reference text after received all recognized words to get these error words.
        const diff = new difflib.SequenceMatcher(null, wholelyricsArryRes, resTextArray);
        const lastWords = [];
        for (const d of diff.getOpcodes()) {
            if (d[0] == "insert" || d[0] == "replace") {
                if (["zh-cn"].includes(language.toLowerCase())) {
                    for (let j = d[3], count = 0; j < d[4]; count++) {
                    let len = 0;
                    let bfind = false;
                    _.map(allWords, (item, index) => {
                        if (
                        (len == j ||
                            (index + 1 < allWords.length &&
                            allWords[index].Word.length > 1 &&
                            j > len &&
                            j < len + allWords[index + 1].Word.length)) &&
                        !bfind
                        ) {
                        const wordNew = _.cloneDeep(allWords[index]);
                        if (
                            allWords &&
                            allWords.length > 0 &&
                            allWords[index].PronunciationAssessment.ErrorType !== "Insertion"
                        ) {
                            wordNew.PronunciationAssessment.ErrorType = "Insertion";
                        }
                        lastWords.push(wordNew);
                        bfind = true;
                        j += allWords[index].Word.length;
                        }
                        len = len + item.Word.length;
                    });
                }
                } else {
                    for (let j = d[3]; j < d[4]; j++) {
                        if (allWords && allWords.length > 0 && allWords[j].PronunciationAssessment.ErrorType !== "Insertion") {
                            allWords[j].PronunciationAssessment.ErrorType = "Insertion";
                        }
                        lastWords.push(allWords[j]);
                    }
                }
            }
            if (d[0] == "delete" || d[0] == "replace") {
                if (
                    d[2] == wholelyricsArryRes.length &&
                    !(
                        jo.RecognitionStatus == "Success" ||
                        jo.RecognitionStatus == "Failed"
                    )
                )
                continue;
                for (let i = d[1]; i < d[2]; i++) {
                    const word = {
                        Word: wholelyricsArryRes[i],
                        PronunciationAssessment: {
                            ErrorType: "Omission",
                        },
                    };
                    lastWords.push(word);
                }
            }
            if (d[0] == "equal") {
                for (let k = d[3], count = 0; k < d[4]; count++) {
                    if (["zh-cn"].includes(language.toLowerCase())) {
                        let len = 0;
                        let bfind = false;
                        _.map(allWords, (item, index) => {
                            if (len >= k && !bfind) {
                                if (allWords[index].PronunciationAssessment.ErrorType !== "None") {
                                    allWords[index].PronunciationAssessment.ErrorType = "None";
                                }
                                lastWords.push(allWords[index]);
                                bfind = true;
                                k += allWords[index].Word.length;
                            }
                            len = len + item.Word.length;
                        });
                    } else {
                        lastWords.push(allWords[k]);
                        k++;
                    }
                }
            }
        }

        let reference_words = [];
        if (["zh-cn"].includes(language.toLowerCase())) {
            reference_words = allWords;
        }else{
            reference_words = wholelyricsArryRes;
        }

        let recognizedWordsRes = []
        _.forEach(recognizedWords, (word) => {
            if (word.PronunciationAssessment.ErrorType == "None") {
                recognizedWordsRes.push(word)
            }
        });
        
        let compScore = Number(((recognizedWordsRes.length / reference_words.length) * 100).toFixed(0));
        if (compScore > 100) {
            compScore = 100;
        }
        scoreNumber.compScore = compScore;

        const accuracyScores = [];
        _.forEach(lastWords, (word) => {
            if (word && word?.PronunciationAssessment?.ErrorType != "Insertion") {
                accuracyScores.push(Number(word?.PronunciationAssessment.AccuracyScore ?? 0));
            }
        });
        scoreNumber.accuracyScore = Number((_.sum(accuracyScores) / accuracyScores.length).toFixed(0));

        if (startOffset) {
            const sumRes = [];
            _.forEach(fluencyScores, (x, index) => {
                sumRes.push(x * durations[index]);
            });
            scoreNumber.fluencyScore = _.sum(sumRes) / _.sum(durations);
        }
        scoreNumber.prosodyScore = Number((_.sum(prosodyScores) / prosodyScores.length).toFixed(0));

        const sortScore = Object.keys(scoreNumber).sort(function (a, b) {
            return scoreNumber[a] - scoreNumber[b];
        });
        if (
            jo.RecognitionStatus == "Success" ||
            jo.RecognitionStatus == "Failed"
        ) {
            scoreNumber.pronScore = Number(
                (
                    scoreNumber[sortScore["0"]] * 0.4 +
                    scoreNumber[sortScore["1"]] * 0.2 +
                    scoreNumber[sortScore["2"]] * 0.2 +
                    scoreNumber[sortScore["3"]] * 0.2
                ).toFixed(0)
            );
        } else {
            scoreNumber.pronScore = Number(
                (scoreNumber.accuracyScore * 0.5 + scoreNumber.fluencyScore * 0.5).toFixed(0)
            );
        }

        console.log("    Paragraph pronunciation score: ", scoreNumber.pronScore, ", accuracy score: ", scoreNumber.accuracyScore, ", completeness score: ", scoreNumber.compScore, ", fluency score: ", scoreNumber.fluencyScore, ", prosody score: ", scoreNumber.prosodyScore);

        _.forEach(lastWords, (word, ind) => {
            console.log("    ", ind + 1, ": word: ", word.Word, "	accuracy score: ", word.PronunciationAssessment.AccuracyScore, "	error type: ", word.PronunciationAssessment.ErrorType, ";");
        });

        // Return the results
        return {
            scores: scoreNumber,
            words: lastWords,
            recognizedText: currentText.join(" ")
        };
    };

    // The event signals that the service has stopped processing speech.
    // https://docs.microsoft.com/javascript/api/microsoft-cognitiveservices-speech-sdk/speechrecognitioncanceledeventargs?view=azure-node-latest
    // This can happen for two broad classes of reasons.
    // 1. An error is encountered.
    //    In this case the .errorDetails property will contain a textual representation of the error.
    // 2. Speech was detected to have ended.
    //    This can be caused by the end of the specified file being reached, or ~20 seconds of silence from a microphone input.
    reco.canceled = function (s, e) {
        console.log("🛑 Recognition canceled");
        if (e.reason === sdk.CancellationReason.Error) {
            var str = "❌ (cancel) Reason: " + sdk.CancellationReason[e.reason] + ": " + e.errorDetails;
            console.error(str);
        } else {
            console.log("ℹ️  Cancellation reason:", sdk.CancellationReason[e.reason]);
        }
        reco.stopContinuousRecognitionAsync();
    };

    // Signals that a new session has started with the speech service
    reco.sessionStarted = function (s, e) {
        console.log("🎬 Session started");
    };

    // Signals the end of a session with the speech service.
    reco.sessionStopped = function (s, e) {
        console.log("🏁 Session stopped");
        clearTimeout(timeoutId); // Clear the timeout
        reco.stopContinuousRecognitionAsync();
        reco.close();
        
        const finalScore = calculateOverallPronunciationScore();
        resolve(finalScore); // Return the results
    };

    console.log("▶️  Starting continuous recognition...");
    reco.startContinuousRecognitionAsync();
        
        } catch (error) {
            console.error("❌ Fatal error in pronunciation assessment:", error.message);
            console.error(error.stack);
            clearTimeout(timeoutId);
            reject(error);
        }
    });
}