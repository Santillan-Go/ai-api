import { AzureOpenAI } from "openai";
import express from "express";
import cors from "cors";

import dotenv from "dotenv";
//import TranscriptAPI from 'youtube-transcript-api';
// Import the functions you need from the SDKs you need
import { v2 as cloudinary } from "cloudinary";

//import { getSubtitles } from "youtube-captions-scraper";
import { getSubtitles } from "./helper/youtube_scraper.js";
import { uploadAudioToCloudinary } from "./services/cloudinary.js";

import { db } from "./services/firebase.js"; // adjust path if needed
import {
  create_flashcard_word,
  create_flashcard_word_long,
  create_test_user,
  create_test_user_a1_to_a2,
  get_prompt_a1_for_audio,
  get_promt_json_flashcard,
} from "./prompts.js";
import { createAudioBooks, transcribeUrl } from "./books/create_audio_books.js";
import { generateAudios } from "./services/generate_audio.js";

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

app.get("/responses", async (req, res) => {
  try {
    // Get reference to the collection
    const userResponsesRef = db.collection("user_responses");

    // Convertir el snapshot a un array de documentos
    const responses = [];
    snapshot.forEach((doc) => {
      responses.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    res.json({
      message: "Responses fetched successfully",
      responses: responses, // Ahora es un array de documentos
    });
  } catch (error) {
    console.error("❌ Error:", error);
  }
});
app.post("/generate-text", async (req, res) => {
  const { messages, level } = req.body;

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
  "mainWord":"Thrive" => la palabra que quiere el usuario puede ser una palabra o frase; ponla aquí,
  "frontAudioText": Incluye el contenido(palabra principal en inglés y el ejemplo clave en inglés) que usaste en deltaFront, ejemplo: Take. Take your time.
}
En las propiedades del delta no las envuelvas(con \\), no asi:\"insert\. Al final de cada delta agrega: {"insert": "\n"}. Devuelve un objeto JSON válido. Usa siempre "\\n" (doble barra invertida y n) como salto de línea dentro de los valores de "insert". No uses saltos reales de línea dentro de strings. Devuelve arrays JSON reales, no strings. No escapes innecesariamente. No uses comillas dentro de comillas. Devuelve solo el JSON, sin explicación.

reglas:
Consider the user's level english:${level}
si la palabra/frase que quiere el usuario está en español traducela primero al inglés antes de crear la flashcard
`,
      };
    } else {
      systemMessage = {
        role: "system",
        content: `Debes de responder como una persona que ayuda al usuario que está aprendiendo inglés; entonces tus respuesta deben de ser en inglés o solo que el usuario te diga que respondas en otro idioma. Se directo, claro, no escribas mucho, no des respuestas tan largas. Toma en cuenta el nivel de inglés del usuario:${level}, para tus respuestas.`,
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
        let content = gptResponse.choices[0].message.content;
        if (content.startsWith("```json")) {
          content = content
            .replace(/^```json\s*/, "")
            .replace(/```$/, "")
            .trim();
        }
        const flashcard = JSON.parse(content);
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
// app.listen(port, async () => {
//   console.log(`Server running on http://localhost:${port}`);
// });
function isLongPhrase(text) {
  return text.trim().split(/\s+/).length >= 4;
}

app.post("/create-flashcard-word-phrase", async (req, res) => {
  //PARAMETERS: word, level, caracteritics
  const { word, level, caracteritics, contextWord } = req.body;
  console.log({ word, level, caracteritics, contextWord });

  let caracteriticsUser =
    caracteritics ?? "Meaning in english, Example in spanish";
  try {
    let systemMessage = {};
    if (word == null) {
      systemMessage = {
        role: "system",
        content: create_flashcard_word(
          "Get",
          level,
          caracteriticsUser,
          contextWord
        ),
      };
    } else {
      if (isLongPhrase(word)) {
        systemMessage = {
          role: "system",
          content: create_flashcard_word_long(word, level, contextWord),
        };
      } else {
        systemMessage = {
          role: "system",
          content: create_flashcard_word(
            word,
            level,
            caracteriticsUser,
            contextWord
          ),
        };
      }
    }

    const recentMessages = [systemMessage];

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

    let content = response.choices[0].message.content;
    if (content.startsWith("```json")) {
      content = content
        .replace(/^```json\s*/, "")
        .replace(/```$/, "")
        .trim();
    }
    //  const parsed = JSON.parse(content); // <- esto lo convierte de string a objeto
    res.json(JSON.parse(content));
  } catch (error) {
    console.log({ error });
    res.status(500).json({ error: error.message });
  }
});

app.post("/test", async (req, res) => {
  const { word, level } = req.body;
  try {
    // const response = await client.completions.create({
    //   model: "gpt-4o", // Specify your model
    //   prompt: prompt,
    //   max_tokens: 100,
    // });
    //  const lastMessageUser = messages[messages.length - 1];
    let systemMessage = {};
    if (word == null) {
      systemMessage = {
        role: "system",
        content: create_flashcard_word("Get", level),
      };
    } else {
      systemMessage = {
        role: "system",
        content: create_flashcard_word(word, level),
      };
    }

    const recentMessages = [systemMessage];

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

    let content = response.choices[0].message.content;
    if (content.startsWith("```json")) {
      content = content
        .replace(/^```json\s*/, "")
        .replace(/```$/, "")
        .trim();
    }
    //  const parsed = JSON.parse(content); // <- esto lo convierte de string a objeto
    res.json(JSON.parse(content));
  } catch (error) {
    console.log({ error });
    res.status(500).json({ error: error.message });
  }
});
app.listen(port, "0.0.0.0", () => {
  console.log(`Server running on port ${port}`);
});

app.get("/create-transcript", async (req, res) => {
  try {
    const result = await transcribeUrl();
    res.json({ result });
  } catch (error) {
    res.json({ message: error });
  }
});

app.get("/create-audio-book", async (req, res) => {
  try {
    const resultTranscript = await createAudioBooks();
    res.json({
      message: "Audio book created successfully",
      transcript: resultTranscript,
    });
  } catch (error) {
    res.json({ message: error });
  }
});

app.get("/get-book-transcript/:id", async (req, res) => {
  //transcript_books
  try {
    // get ID from request parameters
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: "Missing book ID" });
    }
    const transcriptBook = await db
      .collection("transcript_books")
      .doc(id)
      .get();

    if (!transcriptBook.exists) {
      return res.status(404).json({ error: "Book not found" });
    }

    //transcript is like:
    /*
    {
    audio_url:
"https://res.cloudinary.com/dzjisimpi/video/upload/v1749053338/quickcard-audios/quickcard-audios/Atomic%20Habits_4.mp3"
,
paragraphs:[
{
start:0
end:19.795
sentences:[{
end:4.16,
start:0,
text:"Atomic habits are the small changes that lead to remarkable results."
}]
}
]
}
    */
    res.json({
      message: "Book transcript fetched successfully",
      id: transcriptBook.id,
      transcript: transcriptBook.data().transcript,
    });
  } catch (error) {
    res.json({ message: error.message }); // Handle the error appropriately
  }
});

app.get("/get-books", async (req, res) => {
  try {
    const books = await db.collection("library_books").get();

    res.json({
      message: "Books fetched successfully",
      books: books.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })),
    });
  } catch (error) {
    res.json({ message: error.message }); // Handle the error appropriately
  }
});

export default app;

const YOUTUBE_API_KEY = "hola";

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
  console.log(data.items[0]?.contentDetails?.caption);
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
    // console.log(error);
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
      // console.log(error);
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
    const transcriptMap = result.map(({ text, start }) => ({ text, start }));
    const justText = transcriptMap.map(({ text }) => text).join(" "); // Remove the second parameter
    console.log(justText);
    // console.log(result);

    res.json(transcriptMap);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/translate-text", async (req, res) => {
  const { text } = req.body;
  console.log({ text });
  try {
    let systemMessage = {
      role: "system",
      content: `Traduce este texto al español de forma natural y gramaticalmente correcta, como si estuvieras enseñando a un estudiante de inglés. Solo responde con la traducción, sin explicaciones:\n\n"${text}`,
    };
    //content: `Traduce este texto al español de forma natural y gramaticalmente correcta, como si estuvieras enseñando a un estudiante de inglés. Solo responde con la traducción, sin explicaciones:\n\n"${text}"`

    const recentMessages = [systemMessage];

    const response = await client.chat.completions.create({
      messages: recentMessages,
      max_tokens: 4096,
      temperature: 0.7, // Slightly more controlled, avoids creative but incorrect translations
      top_p: 1,
      model: "gpt-4o",
    });

    if (response?.error !== undefined && response.status !== "200") {
      throw response.error;
    }

    console.log(response.choices[0].message.content);

    const content = response.choices[0].message.content;

    res.json({ response: content });
  } catch (error) {
    console.log({ error });
    res.status(500).json({ error: error.message });
  }
});

app.post("/create-test-user", async (req, res) => {
  const { transcript, level } = req.body;

  try {
    let finalPrompt =
      level.includes("A1") || level.includes("A2")
        ? create_test_user_a1_to_a2(transcript, level)
        : create_test_user(transcript, level);
    let systemMessage = {
      role: "system",
      content: finalPrompt,
    };

    const recentMessages = [systemMessage];

    const response = await client.chat.completions.create({
      messages: recentMessages,
      max_tokens: 4096,
      temperature: 0.7, // Slightly more controlled, avoids creative but incorrect translations
      top_p: 1,
      model: "gpt-4o",
    });

    if (response?.error !== undefined && response.status !== "200") {
      throw response.error;
    }

    console.log(response.choices[0].message.content);

    let content = response.choices[0].message.content;
    // Elimina ```json y ```
    if (content.startsWith("```json")) {
      content = content
        .replace(/^```json\s*/, "")
        .replace(/```$/, "")
        .trim();
    }

    res.json({ response: JSON.parse(content) });
  } catch (error) {
    console.log({ error });
    res.status(500).json({ error: error.message });
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
