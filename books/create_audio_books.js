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
  title: "Influence: The Psychology of Persuasion",
  author: "Robert B. Cialdini",
  introduction:
    "Influence: The Psychology of Persuasion is a book about why people say yes and how influence works in everyday life. Robert Cialdini explains that humans often make decisions automatically, without thinking deeply. Marketers, salespeople, and leaders understand this — and they use specific psychological principles to persuade others. This book teaches how these principles work, how they affect our decisions, and how you can recognize influence so you can protect yourself and use persuasion more ethically and effectively.",
  image:
    "https://m.media-amazon.com/images/I/71kRzYq2zZL._UF894,1000_QL80_.jpg",

  sections: [
    {
      title: "We Are Not as Rational as We Think",
      paragraphs: [
        "Most people believe they make decisions logically and carefully.",
        "However, Cialdini explains that this is often not true.",
        "Because the world is complex and full of information, our brains look for shortcuts.",
        "These mental shortcuts help us save time and energy.",
        "But they also make us predictable and easy to influence.",
        "Much of our behavior happens automatically, without conscious thought.",
      ],
    },
    {
      title: "The Principle of Reciprocity",
      paragraphs: [
        "Reciprocity means that we feel the need to give back when someone gives us something.",
        "If someone helps us, gives us a gift, or does us a favor, we feel uncomfortable saying no.",
        "This rule exists in every culture and helps society function.",
        "However, it can also be used to manipulate people.",
        "For example, small gifts can create a strong sense of obligation.",
        "Understanding reciprocity helps you notice when influence is being used on you.",
      ],
    },
    {
      title: "Commitment and Consistency",
      paragraphs: [
        "People want to be consistent with their past actions and decisions.",
        "Once we commit to something, even in a small way, we feel pressure to continue.",
        "This is because consistency makes us feel reliable and stable.",
        "Cialdini explains that written or public commitments are especially powerful.",
        "Salespeople often use small requests first, then ask for bigger ones later.",
        "Being aware of this principle helps you pause before saying yes automatically.",
      ],
    },
    {
      title: "Social Proof",
      paragraphs: [
        "Social proof means we look to others to decide what is correct.",
        "When we are unsure, we copy the behavior of the group.",
        "This is why reviews, ratings, and popularity matter so much.",
        "If many people do something, we assume it must be right.",
        "Cialdini shows that social proof becomes stronger in uncertain situations.",
        "Learning this helps you think independently instead of following the crowd.",
      ],
    },
    {
      title: "Liking",
      paragraphs: [
        "We are more easily influenced by people we like.",
        "We like people who are similar to us, who compliment us, or who cooperate with us.",
        "Physical attractiveness and friendly behavior also increase persuasion.",
        "This is why salespeople try to build rapport before selling.",
        "Cialdini explains that liking creates trust, even when it should not.",
        "Being aware of this helps you separate the message from the person.",
      ],
    },
    {
      title: "Authority",
      paragraphs: [
        "People tend to obey authority figures.",
        "Titles, uniforms, and symbols of expertise strongly influence behavior.",
        "We are taught from a young age to respect authority.",
        "Because of this, we often stop thinking critically when authority is present.",
        "Cialdini warns that authority can be real or fake.",
        "Questioning authority respectfully is an important skill.",
      ],
    },
    {
      title: "Scarcity",
      paragraphs: [
        "Scarcity means that people want things more when they are rare or limited.",
        "Limited time offers and low availability increase desire.",
        "We fear missing opportunities more than we value gaining benefits.",
        "Cialdini explains that scarcity triggers emotional reactions.",
        "This can lead to rushed and poor decisions.",
        "Recognizing scarcity tactics helps you slow down and think clearly.",
      ],
    },
    {
      title: "Unity",
      paragraphs: [
        "Unity is about shared identity and belonging.",
        "People are more influenced by those they see as part of their group.",
        "Family, culture, teams, and communities create strong bonds.",
        "Cialdini explains that unity increases trust and cooperation.",
        "However, it can also be used to pressure people.",
        "Understanding unity helps you recognize emotional influence.",
      ],
    },
    {
      title: "Using Influence Ethically",
      paragraphs: [
        "Cialdini emphasizes that influence itself is not bad.",
        "Persuasion can be used to help, teach, and inspire.",
        "The problem appears when influence is used dishonestly.",
        "Ethical persuasion respects freedom of choice.",
        "Understanding these principles gives you control.",
        "You can protect yourself and communicate more effectively.",
      ],
    },
    {
      title: "Final Message: Awareness Is Power",
      paragraphs: [
        "Influence shows that human behavior follows clear patterns.",
        "Once you understand these patterns, you see the world differently.",
        "You notice persuasion in marketing, work, and daily life.",
        "This awareness gives you freedom.",
        "You can choose when to say yes and when to say no.",
        "By understanding influence, you become harder to manipulate and better at communicating.",
      ],
    },
  ],
};


// const exampleBookSummary = {
//   title: "Deep Work",
//   author: "Cal Newport",
//   introduction:
//     "Deep Work is a book about focus, discipline, and doing meaningful work in a distracted world. Cal Newport explains that the ability to concentrate deeply is becoming rare — and therefore very valuable. By training your focus and protecting your attention, you can produce better results, learn faster, and feel more satisfied with your work and your life.",
//   image:
//     "https://m.media-amazon.com/images/I/81q+X5N8A6L._SY466_.jpg",

//   sections: [
//     {
//       title: "The World Is Distracted",
//       paragraphs: [
//         "We live in a world full of distractions.",
//         "Phones, messages, emails, and social media are always competing for our attention.",
//         "Many people switch tasks every few minutes without realizing it.",
//         "Cal Newport explains that this constant distraction makes us less productive.",
//         "It also makes it harder to think deeply or do meaningful work.",
//         "Over time, our ability to focus becomes weaker if we never train it.",
//       ],
//     },
//     {
//       title: "What Is Deep Work?",
//       paragraphs: [
//         "Deep work is the ability to focus without distraction on a demanding task.",
//         "It is the kind of work that pushes your brain to its limits.",
//         "This type of focus helps you learn difficult things and create high-quality results.",
//         "Writing, programming, studying, and solving complex problems all require deep work.",
//         "In contrast, shallow work includes emails, meetings, and scrolling on your phone.",
//         "Shallow work feels busy, but it rarely creates real value.",
//       ],
//     },
//     {
//       title: "Deep Work Is Becoming Rare",
//       paragraphs: [
//         "Fewer people are able to concentrate deeply for long periods of time.",
//         "Open offices, constant communication, and multitasking make focus difficult.",
//         "Many jobs reward fast replies instead of real results.",
//         "Because of this, deep work is slowly disappearing.",
//         "But this is also good news.",
//         "When something becomes rare, it becomes more valuable.",
//       ],
//     },
//     {
//       title: "Deep Work Is Extremely Valuable",
//       paragraphs: [
//         "People who can focus deeply produce better work in less time.",
//         "They learn faster and improve their skills more quickly.",
//         "In the modern economy, these abilities are highly rewarded.",
//         "Cal Newport argues that focus is a key skill for the future.",
//         "Those who master deep work will stand out.",
//         "Those who do not may struggle to compete.",
//       ],
//     },
//     {
//       title: "The Myth of Multitasking",
//       paragraphs: [
//         "Many people believe they are good at multitasking.",
//         "In reality, the brain cannot focus on multiple complex tasks at once.",
//         "When you switch tasks, your brain needs time to refocus.",
//         "This constant switching reduces the quality of your work.",
//         "It also makes you feel tired and unfocused.",
//         "Deep work requires doing one thing at a time.",
//       ],
//     },
//     {
//       title: "Focus Is a Skill You Can Train",
//       paragraphs: [
//         "Focus is not something you either have or do not have.",
//         "It is a skill that can be trained, like a muscle.",
//         "When you practice deep focus, your brain becomes stronger.",
//         "When you constantly check your phone, your brain becomes weaker.",
//         "Your daily habits shape your ability to concentrate.",
//         "Small changes can lead to big improvements over time.",
//       ],
//     },
//     {
//       title: "Rituals Create Deep Work",
//       paragraphs: [
//         "Cal Newport explains that rituals help make deep work easier.",
//         "A ritual is a clear plan for when and how you will focus.",
//         "For example, you might work deeply every morning at the same time.",
//         "You might use the same place, the same desk, or the same music.",
//         "These signals tell your brain that it is time to focus.",
//         "With rituals, deep work becomes a habit instead of a struggle.",
//       ],
//     },
//     {
//       title: "Protect Your Attention",
//       paragraphs: [
//         "Your attention is limited and valuable.",
//         "Every notification takes a small piece of it.",
//         "Cal Newport encourages people to be intentional with technology.",
//         "This does not mean deleting everything.",
//         "It means using tools only if they truly support your values.",
//         "If something distracts you without real benefit, it may not be worth keeping.",
//       ],
//     },
//     {
//       title: "Boredom Is Important",
//       paragraphs: [
//         "Many people avoid boredom at all costs.",
//         "The moment they feel bored, they reach for their phone.",
//         "Cal Newport says this is a mistake.",
//         "Boredom trains your brain to focus again.",
//         "When you allow boredom, you strengthen your attention.",
//         "Learning to be bored is part of learning to focus deeply.",
//       ],
//     },
//     {
//       title: "Work Deeply, Rest Fully",
//       paragraphs: [
//         "Deep work is intense and demanding.",
//         "Because of this, rest is very important.",
//         "Cal Newport explains that the brain needs downtime.",
//         "Walking, resting, and spending time offline help your mind recover.",
//         "Working all the time does not lead to better results.",
//         "Focused work and real rest must exist together.",
//       ],
//     },
//     {
//       title: "Final Message: Focus Is Your Advantage",
//       paragraphs: [
//         "Deep Work delivers a clear message.",
//         "The ability to focus deeply is one of the most powerful skills you can develop.",
//         "In a distracted world, focus is an advantage.",
//         "You do not need to do more.",
//         "You need to do less, but with full attention.",
//         "When you protect your focus, you protect your future.",
//       ],
//     },
//   ],
// };

// const exampleBookSummary = {
//   title: "The Subtle Art of Not Giving a F*ck",
//   author: "Mark Manson",
//   introduction:
//     "The Subtle Art of Not Giving a F*ck is a book about choosing what truly matters in life. Mark Manson explains that happiness does not come from always being positive or successful. Instead, it comes from accepting problems, pain, and responsibility. In this book, you learn that you cannot care about everything. When you try to do that, life becomes more stressful and confusing. But when you choose better values and accept discomfort, life becomes more honest, calmer, and more meaningful.",
//   image:
//     "https://m.media-amazon.com/images/I/71t4GuxLCuL._UF894,1000_QL80_.jpg",

//   sections: [
//     {
//       title: "Life Is Full of Problems",
//       paragraphs: [
//         "Mark Manson starts with a simple truth: life is hard.",
//         "Everyone has problems — rich people, poor people, successful people, everyone.",
//         "Because of this, the goal of life is not to have no problems.",
//         "The real goal is to have better problems — problems that are worth solving.",
//         "If you try to avoid all pain, you will suffer even more in the long run.",
//         "But when you face your problems instead of running away, that’s where real happiness comes from.",
//       ],
//     },
//     {
//       title: "You Can’t Care About Everything",
//       paragraphs: [
//         "Modern life tells us that we should care about everything.",
//         "Every day, we see success, money, perfect bodies, and happy lives on social media.",
//         "Slowly, this makes us feel like we are not good enough.",
//         "Mark Manson says this way of thinking is dangerous.",
//         "When you care about too many things, you feel stressed, anxious, and empty inside.",
//         "That’s why you must choose what truly matters to you — and stop caring about the rest.",
//       ],
//     },
//     {
//       title: "The Meaning of Not Giving a F*ck",
//       paragraphs: [
//         "Not giving a f*ck does not mean being rude, cold, or lazy.",
//         "It means being honest about your limits and your priorities.",
//         "It means caring deeply about a few important things in your life.",
//         "At the same time, it means not wasting energy on things you cannot control.",
//         "Mature people choose their values carefully.",
//         "They understand that some things will go wrong — and they accept that reality.",
//       ],
//     },
//     {
//       title: "Pain Is Necessary for Growth",
//       paragraphs: [
//         "Every good thing in life comes with some level of pain.",
//         "Success requires effort. Relationships require conflict. Learning requires struggle.",
//         "So if you avoid pain at all costs, you also avoid growth.",
//         "Mark explains that suffering is not a mistake — it is part of becoming better.",
//         "The real question is not, 'How can I be happy all the time?'",
//         "The real question is, 'What pain am I willing to accept to grow?'",
//       ],
//     },
//     {
//       title: "You Are Always Choosing",
//       paragraphs: [
//         "Even when you feel stuck, you are still making choices.",
//         "You choose how to react, and you choose what to believe.",
//         "You may not control everything that happens to you.",
//         "But you always control how you respond to it.",
//         "Taking responsibility gives you power over your life.",
//         "Blaming others may feel easy, but it keeps you weak.",
//       ],
//     },
//     {
//       title: "The Danger of Always Being Positive",
//       paragraphs: [
//         "Mark criticizes the idea that we must always be positive.",
//         "Trying to feel good all the time can actually make you feel worse.",
//         "When you tell yourself, 'I must be happy,' you feel like a failure when you are not.",
//         "Negative emotions like sadness, fear, and anger are normal and useful.",
//         "These emotions can teach you important lessons about yourself.",
//         "When you accept negative feelings instead of fighting them, you become mentally stronger.",
//       ],
//     },
//     {
//       title: "Values Decide Your Life",
//       paragraphs: [
//         "Your values shape your decisions and, over time, your future.",
//         "When your values are weak, your life feels empty and unstable.",
//         "For example, valuing money, fame, or pleasure too much often leads to misery.",
//         "Stronger values include honesty, responsibility, growth, and effort.",
//         "You cannot always control results, but you can control how much effort you give.",
//         "When you choose better values, your life naturally improves.",
//       ],
//     },
//     {
//       title: "Failure Is Part of Success",
//       paragraphs: [
//         "Failure is not the opposite of success.",
//         "In reality, failure is the path that leads to success.",
//         "Everyone who achieves something meaningful fails many times.",
//         "If you avoid failure, you also avoid learning and improvement.",
//         "Mark encourages readers to fail, learn from it, and try again.",
//         "Real progress comes from action, not from trying to be perfect.",
//       ],
//     },
//     {
//       title: "You Will Die — And That’s Important",
//       paragraphs: [
//         "One of the strongest ideas in the book is accepting death.",
//         "Knowing that life is limited helps you focus on what truly matters.",
//         "You will not be remembered by everyone, and that is okay.",
//         "This idea is not depressing — it is actually freeing.",
//         "It helps you stop chasing approval from others.",
//         "Instead, it pushes you to live more honestly and intentionally.",
//       ],
//     },
//     {
//       title: "Final Message: Choose What Matters",
//       paragraphs: [
//         "The Subtle Art of Not Giving a F*ck teaches a simple but powerful lesson.",
//         "You cannot care about everything in life.",
//         "Pain, failure, and problems will always be part of the journey.",
//         "But you can choose what is worth your time and energy.",
//         "Choose better values. Accept discomfort. Take responsibility.",
//         "When you stop caring about the wrong things, life becomes clearer, calmer, and more meaningful.",
//       ],
//     },
//   ],
// };


// const exampleBookSummary = {
//   title: "Can’t Hurt Me",
//   author: "David Goggins",
//   introduction:
//     "Can’t Hurt Me is a powerful book about mental strength, discipline, and overcoming pain. David Goggins shares his life story—from a difficult childhood to becoming a Navy SEAL and ultra-athlete. The book teaches that you can become stronger by facing your fears, pushing past your limits, and taking control of your mind. It’s not just a story—it’s a message that you are in control of your life.",
//   image:
//     "https://m.media-amazon.com/images/I/81YJFNc54lL._UF894,1000_QL80_.jpg",

//   sections: [
//     {
//       title: "A Very Hard Childhood",
//       paragraphs: [
//         "David Goggins had a difficult life when he was young.",
//         "His father was violent and made him work long hours. He was often scared and tired.",
//         "David also experienced racism and bullying at school.",
//         "He felt small, weak, and different. He didn’t believe in himself.",
//         "But one day, he decided: 'I don’t want to live like this anymore.' That decision changed everything.",
//       ],
//     },
//     {
//       title: "Your Past Does Not Define You",
//       paragraphs: [
//         "David teaches that your past doesn’t control your future.",
//         "Even if life is hard, even if people treat you badly — you can change.",
//         "It’s not easy. You have to fight. But the pain can help you grow.",
//         "David used his pain to become stronger, not weaker.",
//       ],
//     },
//     {
//       title: "Your Mind Is a Muscle",
//       paragraphs: [
//         "David says that your mind is like a muscle — you can train it.",
//         "Most people stop when things get hard. But David says, 'You still have 60% more inside.'",
//         "He calls this the 40% Rule: When you think you’re done, you’ve only used 40% of your true power.",
//         "To grow, you must do hard things, even when you want to quit.",
//       ],
//     },
//     {
//       title: "Callusing the Mind",
//       paragraphs: [
//         "When you lift weights, your hands get stronger. They get calluses.",
//         "David says the same can happen with your mind.",
//         "When you do painful things again and again — like running long distances, training in the cold, or facing your fears — you get mentally tougher.",
//         "This is called 'callusing the mind.' Pain teaches you. Discomfort becomes your teacher, not your enemy.",
//       ],
//     },
//     {
//       title: "The Accountability Mirror",
//       paragraphs: [
//         "One of David’s best tools was something very simple: a mirror.",
//         "Every night, he stood in front of the mirror and told himself the truth.",
//         "If he was lazy, he said it. If he was weak, he said it.",
//         "But he also wrote goals on small notes and stuck them to the mirror.",
//         "He called this the 'Accountability Mirror.' It helped him stay honest — and focused.",
//         "You can do the same: Look in the mirror. Be honest. Set goals. Chase them.",
//       ],
//     },
//     {
//       title: "Taking Souls",
//       paragraphs: [
//         "This is one of the most powerful ideas in the book.",
//         "'Taking souls' means doing something so amazing that others are shocked.",
//         "For example, if someone thinks you will quit — you don’t. You go even harder. You show them how strong you are.",
//         "David used this to earn respect from people who didn’t believe in him.",
//         "He didn’t speak much — he let his actions speak.",
//         "This teaches us: Work in silence. Shock them with results.",
//       ],
//     },
//     {
//       title: "The Cookie Jar",
//       paragraphs: [
//         "When things got tough, David used a trick: He remembered all the times he had been strong before.",
//         "He called this the 'Cookie Jar.'",
//         "Each 'cookie' was a memory of victory — like passing a test, finishing a race, or pushing through pain.",
//         "When he felt like quitting, he 'took a cookie' and remembered: 'I’ve done hard things before. I can do it again.'",
//         "You can make your own cookie jar in your mind. Fill it with victories — big or small. Use them when life is hard.",
//       ],
//     },
//     {
//       title: "Discipline Over Motivation",
//       paragraphs: [
//         "David says: 'Motivation is weak. Discipline is strong.'",
//         "Motivation comes and goes. Some days you feel excited, some days you don’t.",
//         "But discipline is different. It means doing the work, even when you don’t feel like it.",
//         "David didn’t wait to feel ready. He just got up and worked.",
//         "He woke up early. He trained in pain. He did what others refused to do.",
//         "This is how real change happens — through discipline, not motivation.",
//       ],
//     },
//     {
//       title: "Pain Is the Path",
//       paragraphs: [
//         "Most people run away from pain. But David says: Run into it.",
//         "Why? Because pain is the way forward. It teaches you what you’re made of.",
//         "It helps you grow. It makes you strong.",
//         "David became a Navy SEAL, an ultra-runner, and a top athlete — not because he was special — but because he accepted pain as part of the journey.",
//         "You can do hard things too. But first, you must choose the hard path.",
//       ],
//     },
//     {
//       title: "Final Message: You Are in Control",
//       paragraphs: [
//         "“Can’t Hurt Me” is not just about David’s life. It’s a message for you.",
//         "It says: You can choose to grow. You can become stronger. You can change your story.",
//         "Your past doesn’t control you. Fear doesn’t control you. You are in control.",
//         "You don’t need to be perfect. You just need to try — every day.",
//         "With honesty, discipline, and courage, nothing can stop you.",
//         "Not even pain. Not even fear. Because once you become mentally strong... Nothing can hurt you.",
//       ],
//     },
//   ],
// };

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
