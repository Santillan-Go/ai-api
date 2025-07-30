import { createClient } from "@deepgram/sdk";
import dotenv from "dotenv";
import { db } from "../services/firebase.js";

import { uploadAudioToCloudinary } from "../services/cloudinary.js";
import { generateAudios } from "../services/generate_audio.js";
dotenv.config();

const transcribeUrl = async (url) => {
  const deepgram = createClient(process.env.DEEPGRAM_API_KEY);

  const { result, error } = await deepgram.listen.prerecorded.transcribeUrl(
    {
      url,
    },
    {
      model: "nova-3",
      smart_format: true,
    }
  );

  if (error) throw error;
  if (!error) {
    console.dir({
      transcript:
        result.results.channels[0].alternatives[0].paragraphs.paragraphs,
    });
    return result.results.channels[0].alternatives[0].paragraphs.paragraphs;
  }
};
const createAudioBooks = async () => {
  const transcript = [];
  const exampleBookMapped = exampleBookSummary.sections.map(
    (section) => `${section.title}. ${section.paragraphs.join(" ")}`
  );

  const id_book = crypto.randomUUID(); // solo una vez
  const { title, author, introduction, image } = exampleBookSummary;

  try {
    for (let i = 0; i < exampleBookMapped.length; i++) {
      const audioText = exampleBookMapped[i];

      try {
        // 1. Generar audio
        const audioBuffer = await generateAudios(audioText);

        // 2. Subir a Cloudinary
        const audioUrl = await uploadAudioToCloudinary(
          audioBuffer,
          `${title}_${i}_04/06/2025`
        );

        console.log(`✅ Audio ${i} subido a: ${audioUrl}`);

        // 3. Transcribir con Deepgram
        const paragraphs = await transcribeUrl(audioUrl);

        // 4. Guardar en el transcript array
        transcript.push({
          audio_url: audioUrl,
          paragraphs,
        });
      } catch (error) {
        console.error(`❌ Error en sección ${i}:`, error.message || error);
      }
    }

    // Guardar libro y transcript en Firebase
    await db.collection("library_books").doc(id_book).set({
      title,
      author,
      introduction,
      id: id_book,
      image,
    });

    await db.collection("transcript_books").doc(id_book).set({
      idBook: id_book,
      transcript,
    });

    return transcript;
  } catch (error) {
    console.error(
      "❌ Error general en createAudioBooks:",
      error.message || error
    );
    throw new Error(`Error in createAudioBooks: ${error.message}`);
  }
};

// const createAudioBooks = async () => {
//   const transcript = [];
//   const exampleBookMapped = exampleBookSummary.sections.map(
//     (section) => `${section.title}. ${section.paragraphs.join(" ")}`
//   );

//   const id_book = crypto.randomUUID(); // solo una vez
//   const { title, author, introduction, image } = exampleBookSummary;

//   try {
//     await Promise.all(
//       exampleBookMapped.map(async (audio, i) => {
//         try {
//           const audioBuffer = await generateAudios(audio);

//           const audioUrl = await uploadAudioToCloudinary(
//             audioBuffer,
//             `${title}_${i}`
//           );

//           console.log(`Audio uploaded to: ${audioUrl}`);
//           const paragraphs = await transcribeUrl(audioUrl);

//           transcript.push({
//             audio_url: audioUrl,
//             paragraphs,
//           });
//         } catch (error) {
//           console.error(`Error generating audio for section ${i}:`, error);
//         }
//       })
//     );

//     await db.collection("library_books").doc(id_book).set({
//       title,
//       author,
//       introduction,
//       id: id_book,
//       image,
//     });

//     await db.collection("transcript_books").doc(id_book).set({
//       idBook: id_book,
//       transcript,
//     });

//     return transcript;
//   } catch (error) {
//     console.error("Error in createAudioBook:", error);
//     throw new Error(`Error in createAudioBooks: ${error.message}`);
//   }
// };

const createAudioBook = async () => {
  /*
IN FIREBASE:
library_books
 title
  author
  introduction
  id
  image

   transcript_books
  id_book
  transcript:[
  //sections
  {
  audio_url,
  paragraphs:[]
  }
  ]
  */

  const transcript = [];
  //correct this
  const exampleBookMapped = exampleBookSummary.sections.map(
    (section) => `${section.title}. ${section.paragraphs.join(" ")}`
  );

  try {
    await Promise.all(
      exampleBookMapped.map(async (audio) => {
        try {
          const audioBuffer = await generateAudios(audio);
          const audioUrl = await uploadAudioToCloudinary(audioBuffer, "new");
          console.log(`Audio uploaded to: ${audioUrl}`);
          const paragraphs = await transcribeUrl(audioUrl);
          transcript.push({
            audio_url: audioUrl,
            paragraphs,
          });

          const id_book = crypto.randomUUID();
          const { title, author, introduction } = exampleBookSummary;

          await db
            .collection("library_books")
            .doc(id_book) // You can generate IDs like `A1_flashcardId1` if you want
            .set({
              title,
              author,
              introduction,
              id: id_book,
              image, //USE A URL
            });
          await db
            .collection("transcript_books")
            .doc(id_book) // Or format like `A1_audioId1`
            .set({
              idBook: id_book,
              transcript,
            });
          // }
        } catch (error) {
          console.error(`Error generating audio for ${audio.mainWord}:`, error);
        }
      })
    );
  } catch (error) {}
};

/*
IN FIREBASE:
library_books
 title
  author
  introduction
  id
  image


  transcript_books
  id_book
  transcript:[
  //sections
  {
  audio_url,
  paragraphs:[]
  }
  ]
  

*/

/*

STEPS TO CREATE THE AUDIOBOOKS

1:MAP SECTIONS, AND JOIN THE PARAGRAPHS,

2:THEN ONCE JOIN PASS IT TO ELEVENLAB

3:CREATE THE TRANSCRIPT FOR EACH SECTION MAPPED

4: SAVE THE PARAGRAPHS CREATED FROM DEEPGRAM IN TRANSCRIPT:
{
audio_url
paragraphs:[[],[]]
}
https://m.media-amazon.com/images/I/81yF0ycIo6L._SL1500_.jpg
*/

const exampleBookSummary = {
  title: "Atomic Habits",
  author: "James Clear",
  image: "https://m.media-amazon.com/images/I/81yF0ycIo6L._SL1500_.jpg",
  introduction:
    "Atomic Habits is a book about how small habits can lead to big changes. James Clear explains how to build good habits and break bad ones. The book gives simple steps that anyone can follow. It shows how small actions every day can help you reach your goals over time.",
  sections: [
    {
      title: "Why Small Habits Matter",
      paragraphs: [
        "Many people think big changes need big actions. But this book shows that small habits, done daily, can make a huge difference. A 1% improvement every day adds up to a lot over time.",
        "James Clear calls these small changes 'atomic habits'. They are tiny, but they have great power when you repeat them. They are like building blocks for a better life.",
        "If you do something good every day, it becomes part of who you are. These small habits help you grow slowly and steadily. You may not see fast results, but they are real and strong.",
      ],
    },
    {
      title: "The Power of Identity",
      paragraphs: [
        "Changing your habits is not just about what you do. It’s also about who you want to become. Instead of saying 'I want to run,' say 'I am a runner.'",
        "When you see yourself in a new way, your habits follow. Your actions start to match your identity. If you believe you are healthy, you will make healthy choices.",
        "Start with the person you want to be. Then ask, 'What does that person do every day?' This helps you build strong habits that last.",
      ],
    },
    {
      title: "How Habits Work",
      paragraphs: [
        "Every habit has four parts: cue, craving, response, and reward. The cue is what starts the habit. The craving is your desire. The response is your action. The reward is the result you get.",
        "For example, your phone buzzes (cue), you want to see the message (craving), you check your phone (response), and you feel happy (reward).",
        "Understanding this cycle helps you create good habits. If you know what causes your habits, you can change them more easily.",
      ],
    },
    {
      title: "Make Habits Obvious",
      paragraphs: [
        "To build good habits, you need clear cues. Make your habits easy to see. For example, if you want to drink more water, put a bottle on your desk.",
        "Use something called habit stacking. This means you add a new habit to something you already do. For example, 'After I brush my teeth, I will read one page of a book.'",
        "The clearer and easier the habit is, the more likely you will do it. You won’t forget it if it’s part of your daily life.",
      ],
    },
    {
      title: "Make Habits Attractive",
      paragraphs: [
        "We like doing things that feel good. To build better habits, try to make them fun or rewarding. This makes your brain want to do them again.",
        "One way to do this is to pair a habit with something you enjoy. For example, listen to music only when you exercise. This makes you look forward to it.",
        "When habits feel good, you are more likely to stick with them. Over time, they become a natural part of your life.",
      ],
    },
    {
      title: "Make Habits Easy",
      paragraphs: [
        "People often stop new habits because they feel hard. Make your habits simple and small. Start with something you can do in two minutes.",
        "This is called the 'Two-Minute Rule'. For example, instead of saying 'I will read for 30 minutes,' say 'I will read one page.' Starting small makes it easy to begin.",
        "When something feels easy, your brain doesn’t fight it. Once you start, it’s easier to keep going. Starting is the most important step.",
      ],
    },
    {
      title: "Make Habits Satisfying",
      paragraphs: [
        "If a habit feels good, your brain remembers it. Give yourself a small reward after doing a habit. This helps your brain learn it’s a good thing.",
        "For example, after finishing a workout, check it off on a calendar. Seeing your progress feels nice and makes you want to continue.",
        "Making habits satisfying helps you stick to them. The more you enjoy the habit, the easier it is to repeat it.",
      ],
    },
    {
      title: "Break Bad Habits",
      paragraphs: [
        "To stop a bad habit, do the opposite of building a good one. Make it invisible, unattractive, hard, and not satisfying.",
        "For example, if you want to stop eating junk food, don’t keep it in your house. If you can’t see it, you won’t eat it.",
        "Also, think about the bad side of the habit. Make it harder to do, like locking your phone away during work. These steps help stop bad behaviors.",
      ],
    },
    {
      title: "The Importance of Environment",
      paragraphs: [
        "Your environment affects your habits. If your space is full of distractions, it’s hard to focus. If it’s clean and ready, good habits are easier.",
        "For example, if you want to cook healthy meals, keep your kitchen tidy and have healthy food ready. This makes it easier to start.",
        "You can also create different spaces for different actions. One chair for reading, one table for working. This helps your brain build clear habits.",
      ],
    },
    {
      title: "Keep Going, Even If It's Slow",
      paragraphs: [
        "Change takes time. You may not see results right away, but that’s okay. Keep going, even if progress feels slow.",
        "Habits grow like a seed. At first, you don’t see anything. But with time and care, they grow strong.",
        "Stay patient. Trust the process. Every small step is a win. Over time, you will see big changes in your life.",
      ],
    },
  ],
  conclusion:
    "Atomic Habits teaches us that small steps lead to big success. You don’t need to be perfect — just a little better each day. Good habits can shape your future. Stay patient, keep practicing, and believe in your power to change.",
};

export { transcribeUrl, createAudioBooks };
const transcribeFile = async () => {
  const deepgram = createClient(process.env.DEEPGRAM_API_KEY);

  const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
    fs.readFileSync("your_audio_file.wav"),
    {
      model: "nova-3",
      smart_format: true,
    }
  );

  if (error) throw error;
  if (!error) console.dir(result, { depth: null });
};
