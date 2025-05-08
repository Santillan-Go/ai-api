// generateFlashcards.js
import { AzureOpenAI } from "openai";
import dotenv from "dotenv";
import fs from "fs";
import fetch from "node-fetch";
import cloudinary from "cloudinary";
import admin from "firebase-admin";

// Init env vars
dotenv.config();

// Init Azure OpenAI
const client = new AzureOpenAI({
  apiKey: process.env.API_KEY,
  endpoint: "https://quickcard-ai.openai.azure.com/",
  apiVersion: "2024-04-01-preview",
  deployment: "gpt-4o",
});

// Init Firebase
admin.initializeApp({
  credential: admin.credential.cert(
    JSON.parse(process.env.FIREBASE_CREDENTIAL)
  ),
});
const db = admin.firestore();

// Init Cloudinary
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
});

const palabras = ["hello", "apple", "book", "water", "friend"];

const generateFlashcards = async (palabras) => {
  const prompt = `Genera flashcards para estas palabras A1: ${palabras.join(
    ", "
  )}. Cada flashcard debe incluir: front, back, ejemplo y pronunciación fonética. Devuelve un array JSON de objetos.`;
  const res = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
  });
  return JSON.parse(res.choices[0].message.content);
};

const generateScriptForAudio = async (flashcard) => {
  const prompt = `Crea un mini guion (tipo podcast de 30 segs) explicando la palabra "${flashcard.front}" que significa "${flashcard.back}". Usa su ejemplo: "${flashcard.example}". Conversacional y educativo.`;
  const res = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
  });
  return res.choices[0].message.content;
};

const generateElevenLabsAudio = async (script) => {
  const res = await fetch(
    "https://api.elevenlabs.io/v1/text-to-speech/YOUR_VOICE_ID",
    {
      method: "POST",
      headers: {
        "xi-api-key": process.env.ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: script,
        voice_settings: { stability: 0.4, similarity_boost: 0.7 },
      }),
    }
  );
  return Buffer.from(await res.arrayBuffer());
};

const uploadToCloudinary = (buffer, name) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.v2.uploader.upload_stream(
      { resource_type: "video", public_id: `audios/${name}` },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    const stream = require("stream");
    const passthrough = new stream.PassThrough();
    passthrough.end(buffer);
    passthrough.pipe(uploadStream);
  });
};

const saveToFirebase = async (flashcard, audio, script) => {
  const cardRef = db.collection("libraryCards").doc();
  const audioRef = db.collection("audios").doc();
  await cardRef.set({ ...flashcard, id: cardRef.id });
  await audioRef.set({
    idCard: cardRef.id,
    transcriptAudio: script,
    urlAudio: audio.secure_url,
  });
};

const run = async () => {
  const flashcards = await generateFlashcards(palabras);
  for (const card of flashcards) {
    const script = await generateScriptForAudio(card);
    const audioBuffer = await generateElevenLabsAudio(script);
    const uploaded = await uploadToCloudinary(audioBuffer, card.front);
    await saveToFirebase(card, uploaded, script);
    console.log(`✅ Flashcard "${card.front}" creada y guardada.`);
  }
};

run();

/*
class Card {
  String id; // Unique identifier for the card
  String front; // Front text (question/word)
  String back; // Back text (answer/meaning)
  DateTime lastReviewedDate; // The last time the card was reviewed
  DateTime nextReviewDate; // When this card should be reviewed next
  int interval; // Interval in days until the next review
  double easeFactor; // Multiplier for adjusting intervals (e.g., 130%)
  int repetitionCount; // Number of times this card has been reviewed
  int score; // The last score the user gave (e.g., 0 = again, 1 = hard, 2 = good)
  final int lapses;

  Card({
    required this.id,
    required this.front,
    required this.back,
    required this.lastReviewedDate,
    required this.nextReviewDate,
    required this.interval,
    required this.easeFactor,
    required this.repetitionCount,
    required this.lapses,
    required this.score,
  });} ",Y la del audio "class Audio {
  String id; // Unique identifier for the card
  String idCard;
  String urlAudio;
  DateTime lastReviewedDate; // The last time the card was reviewed
  DateTime nextReviewDate; // When this card should be reviewed next
  int interval; // Interval in days until the next review
  double easeFactor; // Multiplier for adjusting intervals (e.g., 130%)
  int repetitionCount; // Number of times this card has been reviewed
  int score; // The last score the user gave (e.g., 0 = again, 1 = hard, 2 = good)
  String transcriptAudio;
  Audio({
    required this.id,
    required this.idCard,
    required this.urlAudio,
    required this.lastReviewedDate,
    required this.nextReviewDate,
    required this.interval,
    required this.easeFactor,
    required this.transcriptAudio,
    required this.repetitionCount,
    required this.score,
  });}

*/
