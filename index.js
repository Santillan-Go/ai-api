import { AzureOpenAI } from "openai";
import express from "express";
import cors from "cors";

import dotenv from "dotenv";
//import TranscriptAPI from 'youtube-transcript-api';
// Import the functions you need from the SDKs you need
import { v2 as cloudinary } from "cloudinary";

import { getSubtitles } from "youtube-captions-scraper";

import { uploadAudioToCloudinary } from "./services/cloudinary.js";

import { db } from "./services/firebase.js"; // adjust path if needed
import {
  get_prompt_a1_for_audio,
  get_promt_json_flashcard,
} from "./prompts.js";

dotenv.config();

const port = process.env.PORT || 3000;
const apiKey = process.env.API_KEY;
const app = express();

app.use(express.json());
app.use(
  cors({
    origin: true,

    methods: ["POST"],
  })
);

// Cloudinary

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
});

const apiVersion = "2024-04-01-preview";
const deployment = "gpt-4o";

const client = new AzureOpenAI({
  apiKey: apiKey,
  endpoint: "https://quickcard-ai.openai.azure.com/",
  apiVersion: apiVersion,
  deployment,
});

app.get("/", async (req, res) => {
  res.json({ message: "Hello" });
});
app.post("/generate-text", async (req, res) => {
  const { messages } = req.body;

  try {
    // const response = await client.completions.create({
    //   model: "gpt-4o", // Specify your model
    //   prompt: prompt,
    //   max_tokens: 100,
    // });
    const lastMessageUser = messages[messages.length - 1];
    let systemMessage = {};
    if (lastMessageUser["isACard"]) {
      systemMessage = {
        role: "system",
        content: `Responde como un experto educativo. Si el usuario pide una flashcard, responde con un objeto JSON válido, sin envolverlo en markdown, sin usar comillas escapadas innecesarias ni \n que no correspondan. Ensure that deltaBack and deltaFront uses only Delta JSON formatting. El objeto debe tener:
{
  "response": "Aquí tienes tu flashcard",
  "isACard": true,
  "deltaFront": "[{"insert":"Thrive","attributes":{"bold":true,"align":"center","italic":true,"color":"#FF1E88E5"}},{"insert":"\n","attributes":{"bold":true,"align":"center","header":3}},{"insert":/θraɪv/\n","attributes":{"bold":true,"italic":true,"align":"center"}},{"insert":"The sunflowers thrived in the sunny garden. 🌻☀️\n","attributes":{"bold":true,"align":"center"}}, {"insert": "\n"}]",
  "deltaBack": "[{"insert":"Meaning","attributes":{"bold":true,"align":"center","italic":true,"color":"#FF1E88E5"}},{"insert":"\n","attributes":{"bold":true,"align":"center","header":3}},{"insert":"To grow or develop successfully.  To flourish.  To prosper. ✨\n","attributes":{"align":"center"}}, {"insert": "\n"}]"
  "mainWord":"Thrive" => la palabra que quiere el usuario puede ser una palabra o frase; ponla aquí
}
En las propiedades del delta no las envuelvas(con \\), no asi:\"insert\. Al final de cada delta agrega: {"insert": "\n"}. Devuelve un objeto JSON válido. Usa siempre "\\n" (doble barra invertida y n) como salto de línea dentro de los valores de "insert". No uses saltos reales de línea dentro de strings. Devuelve arrays JSON reales, no strings. No escapes innecesariamente. No uses comillas dentro de comillas. Devuelve solo el JSON, sin explicación.`,
      };
    } else {
      systemMessage = {
        role: "system",
        content: get_promt_json_flashcard("Take"),
      };
    }

    const recentMessages = [systemMessage, ...messages.slice(-8)];

    const response = await client.chat.completions.create({
      messages: recentMessages,
      max_tokens: 4096,
      temperature: 1,
      top_p: 1,
      model: "gpt-4o",
    });

    if (response?.error !== undefined && response.status !== "200") {
      throw response.error;
    }

    console.log(response.choices[0].message.content);
    // console.log(
    //   `[{"insert":"Improve","attributes":{"bold":true,"italic":true,"color":"#FF43A047"}},{"insert":"\n","attributes":{"header":3,"align":"center"}},{"insert":"\n","attributes":{"align":"center"}},{"insert":"I have to improve english skill"},{"insert":"\n","attributes":{"align":"center"}}]`
    // );
    const content = response.choices[0].message.content;
    if (!lastMessageUser["isACard"]) {
      res.json({ response: content });
    } else {
      const parsed = JSON.parse(content); // <- esto lo convierte de string a objeto
      res.json(parsed);
    }
  } catch (error) {
    console.log({ error });
    res.status(500).json({ error: error.message });
  }
});

function ensureFinalNewline(deltaArray) {
  if (!deltaArray.length) return deltaArray;

  const last = deltaArray[deltaArray.length - 1];

  // Si el último insert no termina en \n, agrégalo
  if (typeof last.insert === "string" && !last.insert.endsWith("\n")) {
    last.insert += "\n";
  } else if (typeof last.insert !== "string") {
    // si no es texto (emoji, image, etc.), añade un nuevo insert con \n
    deltaArray.push({ insert: "\n" });
  }

  return deltaArray;
}

// Ruta para generar flashcards
app.post("/generate-flashcards", async (req, res) => {
  const { words, level } = req.body;
  if (!words || !Array.isArray(words) || words.length === 0 || !level) {
    return res.status(400).json({ error: "Missing words or level" });
  }

  //GIVE THE 5 WORDS
  // THEN ASK TO GPT TO GIVE YOU THOSE 2 FLASHCARDS(CON SUS PROPIEDADES); IN A ARRAY
  //ITERAMOS CADA FLASHCARD PARA CREAR EL SCRIPT CON LA PALABRA PRINCIPAL; EL SCRIPT CREADO CON GPT-4O; ALMACENAMOS ESTO EN UN ARRAY(LOCAL)
  // ITERAMOS  PARA CREAR AUDIOS PARA CADA FLASCARD CREADA
  //GUARDAMOS EL AUDIO EN CLOUDINARY
  //LUEGO GUARDAMOS LOS AUDIOS(CON SU PROPIEDADES) Y LAS FLASHCARDS(CON SUS PROPIEDADES) EN FIREBASE( RELACIONADAS CON UNA PROPIEDAD)
  try {
    const flashcards = [];
    const audios = [];
    for (const word of words) {
      // 1. Obtener flashcard desde OpenAI
      const gptResponse = await client.chat.completions.create({
        messages: [
          {
            role: "system",
            content: get_promt_json_flashcard(word),
          },
        ],
        max_tokens: 4096,
        temperature: 1,
        top_p: 1,
        model: "gpt-4o",
      });
      console.log(gptResponse.choices[0].message.content);
      //CREATE AN ID FOR THE FLASHCARD; IT'S GONNA BE USED TO MATCH WITH AN AUDIO
      console.log(`Creating flashcard for: ${word}`);

      try {
        const flashcard = JSON.parse(gptResponse.choices[0].message.content);
        if (flashcard["mainWord"]) {
          // const audioBuffer = await generateAudios(flashcard["frontAudioText"]);
          // const audioUrl = await uploadAudioToCloudinary(
          //   audioBuffer,
          //   `${flashcard["mainWord"]}0A1`
          // );
          const id = crypto.randomUUID();
          flashcards.push({
            id,
            ...flashcard,
            //   frontAudioUrl: audioUrl,
          });
        }
      } catch (e) {
        console.error("Invalid JSON from GPT:", e);
      }

      // const flashcard = JSON.parse(gptResponse.choices[0].message.content);
      // if (flashcard["mainWord"]) {
      //   const id = crypto.randomUUID();
      //   flashcards.push({
      //     id,
      //     ...flashcard,
      //   });
      // }
    }

    const flashcardsWithAudio = await Promise.all(
      flashcards.map(async (flashcard) => {
        try {
          const audioBuffer = await generateAudios(flashcard["frontAudioText"]);
          const audioUrl = await uploadAudioToCloudinary(
            audioBuffer,
            `${flashcard["mainWord"]}0A1`
          );

          return {
            ...flashcard,
            frontAudioUrl: audioUrl,
          };
        } catch (err) {
          console.error(
            `Error generating audio for ${flashcard["mainWord"]}:`,
            err
          );
          return null; // puedes filtrar estos después
        }
      })
    );

    // Elimina los que fallaron
    const validFlashcards = flashcardsWithAudio.filter(Boolean);

    for (const flashcard of validFlashcards) {
      // 2. Crear guion para audio
      const scriptResponse = await client.chat.completions.create({
        messages: [
          {
            role: "system",
            content: get_prompt_a1_for_audio(flashcard["mainWord"]),
          },
        ],
        max_tokens: 4096,
        temperature: 1,
        top_p: 1,
        model: "gpt-4o",
      });

      const script = scriptResponse.choices[0].message.content;
      console.log(`Generated script for ${flashcard.mainWord}:`, script);
      const id = crypto.randomUUID();
      audios.push({
        id,
        mainWord: flashcard["mainWord"],
        idCard: flashcard["id"],
        transcriptAudio: script,
      });
    }
    // ITERAMOS  PARA CREAR AUDIOS PARA CADA GUION CREADA
    //CREATE A NEW VARIABLES TO COPY AUDIOS

    await Promise.all(
      audios.map(async (audio) => {
        try {
          const audioBuffer = await generateAudios(audio.transcriptAudio);
          const audioUrl = await uploadAudioToCloudinary(
            audioBuffer,
            audio.mainWord
          );
          console.log(`Audio uploaded to: ${audioUrl}`);

          const audioIndex = audios.findIndex((a) => a.id === audio.id);
          if (audioIndex !== -1) {
            audios[audioIndex] = {
              ...audio,
              urlAudio: audioUrl,
            };
          }
        } catch (error) {
          console.error(`Error generating audio for ${audio.mainWord}:`, error);
        }
      })
    );

    //LUEGO GUARDAMOS LOS AUDIOS(CON SU PROPIEDADES) Y LAS FLASHCARDS(CON SUS PROPIEDADES) EN FIREBASE( RELACIONADAS CON UNA PROPIEDAD)

    // for (const flashcard of validFlashcards) {
    //   // Get the matching audio
    //   const audio = audios.find((a) => a.idCard === flashcard.id);
    //   if (!audio) continue;
    //   const now = new Date();
    //   const isoString = now.toISOString();
    //   // Save flashcard
    //   // Save flashcard
    //   const deltaFront = ensureFinalNewline(flashcard.deltaFront);
    //   const deltaBack = ensureFinalNewline(flashcard.deltaBack);
    //   flashcard["deltaFront"] = deltaFront;
    //   flashcard["deltaBack"] = deltaBack;

    //   await db
    //     .collection("flashcards")
    //     .doc(flashcard.id) // You can generate IDs like `A1_flashcardId1` if you want
    //     .set({
    //       ...flashcard,
    //       lastReviewedDate: isoString,
    //       nextReviewDate: isoString,
    //       interval: 0,
    //       easeFactor: 2.5,
    //       repetitionCount: 0,
    //       lapses: 0,
    //       score: 0,
    //       level, // Keep this so you can filter/query flashcards by level later
    //     });

    //   // Save audio
    //   await db
    //     .collection("audios")
    //     .doc(audio.id) // Or format like `A1_audioId1`
    //     .set({
    //       ...audio,
    //       lastReviewedDate: isoString,
    //       nextReviewDate: isoString,
    //       interval: 0,
    //       easeFactor: 2.5,
    //       repetitionCount: 0,
    //       score: 0,
    //       level, // optional but useful
    //     });
    // }

    res.json({ validFlashcards, audios });
    //res.status(200).json({ flashcards, audios });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error creating flashcards" });
  }
});
app.listen(port, async () => {
  console.log("Server running on port 3000");
});

export default app;

async function generateAudios(text) {
  const apiKey = process.env.ELEVENLAB_KEY;
  try {
    const response = await fetch(
      "https://api.elevenlabs.io/v1/text-to-speech/TX3LPaxmHKxFdv7VOQHJ",
      {
        method: "POST",
        body: JSON.stringify({
          text,
          model_id: "eleven_turbo_v2_5",
          voice_id: "TX3LPaxmHKxFdv7VOQHJ",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 1.0,
          },
        }),
        headers: {
          accept: "audio/mpeg",
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const audioBuffer = await response.arrayBuffer();
    return audioBuffer;
  } catch (error) {
    console.error("Error generating audio:", error);
    throw error;
  }
}

const YOUTUBE_API_KEY = "AIzaSyB4JJlR0DbGgWc5APCfRtH-5YmLJnUMmfk";

function parseISODuration(duration) {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);

  const hours = parseInt(match[1] || 0, 10);
  const minutes = parseInt(match[2] || 0, 10);
  const seconds = parseInt(match[3] || 0, 10);

  return hours * 3600 + minutes * 60 + seconds;
}

// Función para obtener detalles de un video
async function getVideoDetails(videoId) {
  const url = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoId}&key=${YOUTUBE_API_KEY}`;
  const response = await fetch(url);
  const data = await response.json();
  if (data.items[0]?.contentDetails?.caption === "true") {
    const seconds = parseISODuration(data.items[0]?.contentDetails.duration);
    return {
      hasSubtitles: data.items[0]?.contentDetails?.caption === "true",
      seconds: seconds,
    }; // Retorna true o false
  } else {
    return { hasSubtitles: false, seconds: 0 };
  }
}

app.get("/search-videos/:query", async (req, res) => {
  const { query } = req.params;
  if (!query) {
    return res.status(400).json({ error: "Missing query parameter" });
  }

  try {
    // 1. Buscar videos
    const searchResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=100&q=${query}&key=${YOUTUBE_API_KEY}`
    );
    const searchData = await searchResponse.json();

    const videos = [];
    console.log(searchData.items[0]);
    // 2. Para cada video, obtener detalles y verificar subtítulos
    for (const item of searchData.items) {
      const videoId = item.id.videoId;
      const hasCaptions = await getVideoDetails(videoId);
      if (item.id.videoId == searchData.items[0].id.videoId) {
        console.log(hasCaptions);
      }

      if (hasCaptions.hasSubtitles) {
        // Solo incluimos videos que tienen subtítulos
        videos.push({
          videoId,
          title: item.snippet.title,
          //description: item.snippet.description,
          thumbnailUrl: item.snippet.thumbnails.medium.url,
          //  channelTitle: item.snippet.channelTitle,
          // publishTime: item.snippet.publishTime,
          duration: hasCaptions.seconds,
        });
      }
    }

    res.json({ videos });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

async function fetchCaptions(videoId) {
  try {
    // Intentar primero con 'en-US'
    const captions = await getSubtitles({
      videoID: videoId,
      lang: "en-US",
    });
    console.log("Subtítulos encontrados en en-US");
    return captions;
  } catch (error) {
    console.log(error);
    console.warn("No se encontraron en en-US, intentando en en...");
    try {
      // Intentar con 'en' si falla 'en-US'
      const captions = await getSubtitles({
        videoID: videoId,
        lang: "en",
      });
      console.log("Subtítulos encontrados en en");
      return captions;
    } catch (error) {
      console.log(error);
      console.error("No se encontraron subtítulos disponibles.");
      return [];
    }
  }
}
//ID hgYhws0AHcg
app.get("/get-transcript/:videoId", async (req, res) => {
  try {
    const { videoId } = req.params;

    // const transcript = await YoutubeTranscript.fetchTranscript(videoId);

    const result = await fetchCaptions(videoId);

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
});

//TRY CATCH FOR AUDIO

// for (const audio of audios) {
//   try {
//     const audioBuffer = await generateAudios(audio.transcriptAudio);
//     const audioUrl = await uploadAudioToCloudinary(
//       audioBuffer,
//       audio.mainWord
//     );
//     console.log(`Audio uploaded to: ${audioUrl}`);
//     // Find and update the matching audio object with the binary data
//     const audioIndex = audios.findIndex((a) => a.id === audio.id);
//     if (audioIndex !== -1) {
//       audios[audioIndex] = {
//         ...audio,
//         urlAudio: audioUrl,
//       };
//     }
//   } catch (error) {
//     console.error(`Error generating audio for ${audio.mainWord}:`, error);
//   }
// }

/*
FLASHCARD'S PROPERTIES
{
   id,
   front,
   back,
   lastReviewedDate,
   nextReviewDate,
   interval,
   easeFactor,
   repetitionCount,
   lapses,
   score,
  }

   AUDIO'S PROPERTIES {
    id,
    idCard,
    urlAudio,
    lastReviewedDate,
    nextReviewDate,
    interval,
    easeFactor,
    transcriptAudio,
    repetitionCount,
    score,
  }
    */
