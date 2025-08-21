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
  title: "Can’t Hurt Me",
  author: "David Goggins",
  introduction:
    "Can’t Hurt Me is a powerful book about mental strength, discipline, and overcoming pain. David Goggins shares his life story—from a difficult childhood to becoming a Navy SEAL and ultra-athlete. The book teaches that you can become stronger by facing your fears, pushing past your limits, and taking control of your mind. It’s not just a story—it’s a message that you are in control of your life.",
  image:
    "https://m.media-amazon.com/images/I/81YJFNc54lL._UF894,1000_QL80_.jpg",

  sections: [
    {
      title: "A Very Hard Childhood",
      paragraphs: [
        "David Goggins had a difficult life when he was young.",
        "His father was violent and made him work long hours. He was often scared and tired.",
        "David also experienced racism and bullying at school.",
        "He felt small, weak, and different. He didn’t believe in himself.",
        "But one day, he decided: 'I don’t want to live like this anymore.' That decision changed everything.",
      ],
    },
    {
      title: "Your Past Does Not Define You",
      paragraphs: [
        "David teaches that your past doesn’t control your future.",
        "Even if life is hard, even if people treat you badly — you can change.",
        "It’s not easy. You have to fight. But the pain can help you grow.",
        "David used his pain to become stronger, not weaker.",
      ],
    },
    {
      title: "Your Mind Is a Muscle",
      paragraphs: [
        "David says that your mind is like a muscle — you can train it.",
        "Most people stop when things get hard. But David says, 'You still have 60% more inside.'",
        "He calls this the 40% Rule: When you think you’re done, you’ve only used 40% of your true power.",
        "To grow, you must do hard things, even when you want to quit.",
      ],
    },
    {
      title: "Callusing the Mind",
      paragraphs: [
        "When you lift weights, your hands get stronger. They get calluses.",
        "David says the same can happen with your mind.",
        "When you do painful things again and again — like running long distances, training in the cold, or facing your fears — you get mentally tougher.",
        "This is called 'callusing the mind.' Pain teaches you. Discomfort becomes your teacher, not your enemy.",
      ],
    },
    {
      title: "The Accountability Mirror",
      paragraphs: [
        "One of David’s best tools was something very simple: a mirror.",
        "Every night, he stood in front of the mirror and told himself the truth.",
        "If he was lazy, he said it. If he was weak, he said it.",
        "But he also wrote goals on small notes and stuck them to the mirror.",
        "He called this the 'Accountability Mirror.' It helped him stay honest — and focused.",
        "You can do the same: Look in the mirror. Be honest. Set goals. Chase them.",
      ],
    },
    {
      title: "Taking Souls",
      paragraphs: [
        "This is one of the most powerful ideas in the book.",
        "'Taking souls' means doing something so amazing that others are shocked.",
        "For example, if someone thinks you will quit — you don’t. You go even harder. You show them how strong you are.",
        "David used this to earn respect from people who didn’t believe in him.",
        "He didn’t speak much — he let his actions speak.",
        "This teaches us: Work in silence. Shock them with results.",
      ],
    },
    {
      title: "The Cookie Jar",
      paragraphs: [
        "When things got tough, David used a trick: He remembered all the times he had been strong before.",
        "He called this the 'Cookie Jar.'",
        "Each 'cookie' was a memory of victory — like passing a test, finishing a race, or pushing through pain.",
        "When he felt like quitting, he 'took a cookie' and remembered: 'I’ve done hard things before. I can do it again.'",
        "You can make your own cookie jar in your mind. Fill it with victories — big or small. Use them when life is hard.",
      ],
    },
    {
      title: "Discipline Over Motivation",
      paragraphs: [
        "David says: 'Motivation is weak. Discipline is strong.'",
        "Motivation comes and goes. Some days you feel excited, some days you don’t.",
        "But discipline is different. It means doing the work, even when you don’t feel like it.",
        "David didn’t wait to feel ready. He just got up and worked.",
        "He woke up early. He trained in pain. He did what others refused to do.",
        "This is how real change happens — through discipline, not motivation.",
      ],
    },
    {
      title: "Pain Is the Path",
      paragraphs: [
        "Most people run away from pain. But David says: Run into it.",
        "Why? Because pain is the way forward. It teaches you what you’re made of.",
        "It helps you grow. It makes you strong.",
        "David became a Navy SEAL, an ultra-runner, and a top athlete — not because he was special — but because he accepted pain as part of the journey.",
        "You can do hard things too. But first, you must choose the hard path.",
      ],
    },
    {
      title: "Final Message: You Are in Control",
      paragraphs: [
        "“Can’t Hurt Me” is not just about David’s life. It’s a message for you.",
        "It says: You can choose to grow. You can become stronger. You can change your story.",
        "Your past doesn’t control you. Fear doesn’t control you. You are in control.",
        "You don’t need to be perfect. You just need to try — every day.",
        "With honesty, discipline, and courage, nothing can stop you.",
        "Not even pain. Not even fear. Because once you become mentally strong... Nothing can hurt you.",
      ],
    },
  ],
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
