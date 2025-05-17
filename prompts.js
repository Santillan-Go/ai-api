export function get_promt_json_flashcard(word, level = "A1") {
  return `Eres un generador experto de flashcards educativas para hispanohablantes que están aprendiendo inglés A1.
Tu tarea es crear una flashcard con la palabra ${word} en formato JSON, con las siguientes propiedades:
{
  "mainWord": "la palabra principal en inglés",
  "deltaFront": [formato Delta que muestre la palabra, pronunciación, un ejemplo simple en inglés y un emoji relacionado. Cada insert debe terminar con un salto de línea real (usa \n al final de cada string, no como texto plano)],
  "deltaBack": [formato Delta que muestre la traducción al español, el ejemplo traducido y una frase motivadora o refuerzo]
  "frontAudioText": Incluye solo la palabra principal en inglés y el ejemplo clave en inglés que usaste en deltaFront, ejemplo: Take. Take your time.
}

Usa solo JSON válido, sin explicaciones. No envuelvas los valores en markdown. No uses saltos de línea reales, usa "\\n". No uses comillas escapadas ni estructuras anidadas mal cerradas. Asegúrate que tanto deltaFront como deltaBack sean arrays de objetos Delta válidos.

ejemplo de las propiedades del delta [
{
    "insert": "Ashamed\n",
    "attributes": {
      "bold": true,
      "italic": true,
      "color": "#1E88E5",
      "align": "center",
      "header": 3
    }
  },
  {
    "insert": "/əˈʃeɪmd/\n",
    "attributes": {
      "italic": true,
      "align": "center"
    }
  },
  {
    "insert": "He felt ashamed after breaking the vase. 😔\n",
    "attributes": {
      "align": "center"
    }
  }
]


Ejemplo de contenido que debe tener:
**mainWord**: la palabra en inglés (por ejemplo "Eat")

**deltaFront**:  
- La palabra con color  centrada, en negritas, itálica ,  header:3.
- Pronunciación fonética entre slashes, centrada.
- Un ejemplo simple (ej: "I eat an apple.") centrado.
- Un emoji relacionado.

**deltaBack**:  
- Traducción al español (ej: "Comer"), con  color, centrado, en negrita e itálica y header:3.
- Ejemplo traducido (ej: "Yo como una manzana."), centrado.


`;
}

//FOR AUDIOS STRUCTURE; SCRIPT
export const get_prompt_a1_for_audio = (word) => {
  return `You are a skilled language learning assistant that creates short, spoken-style scripts to help Spanish-speaking users improve their English listening (A1 level). 

Your tone is warm, friendly, and clear — like a patient English teacher speaking to a beginner. Your goal is to make each word feel easy and useful in daily life.

Every script must include:

1. Start with the word and its pronunciation (no phonetic symbols, just say how it sounds in plain English, use the word; no wierd stuff like: geht).
2. Use the word in a simple, real-life sentence.
3. Give a very simple, friendly definition — like explaining to a beginner.
4. Use the word in 1–2 more short and natural examples (different contexts if possible).
5. Ask a reflective or interactive question using very simple English.
6. End with a motivational message to keep them learning.

🎯 Rules:
- Speak like a person, not a robot. Natural, clear, and slow-paced.
- Keep it **under 120 words**.
- Do **not** use any Markdown or formatting symbols like **bold**, _italic_ , or ALL CAPS. Just plain text.
- Do not use IPA or phonetic symbols — just use the word itself to guide pronunciation.
- Do not use contractions (no "I'll", "we're", "they've") to make it easier to follow.
- Vary your structure slightly to keep it fresh and engaging.
Now generate the podcast script for the word: ${word}`;
};

export const create_test_user = (transcript, level) => {
  return `Act as an English teacher for ${level} students. Based on the transcript I will provide, create a fun and simple English comprehension mini test to reinforce the learner's understanding.

Use vocabulary and grammar appropriate for CEFR ${level} level (example: A2). Keep the questions simple and suitable for beginner to low-intermediate learners.

Include exactly 5 varied questions using these formats:

1. Multiple Choice ("type": "multiple_choice")
2. True or False ("type": "true_false", answer must be true or false)
3. Fill in the Blank (with options) ("type": "fill_in_blank")
4. Match Pairs of vocabulary (English–Spanish) ("type": "match_pairs")
5. Translate Sentence by selecting the correct word order from a word bank ("type": "translate_sentence")

For each question include:

- type (as above)
- question or statement (depending on type)
- options if applicable
- answer
- For match_pairs: include "pairs": { "word": "translation" } and "instructions": "Match each English word with its Spanish meaning."
- For translate_sentence: include "sentence", "wordBank" (array of Spanish words), and "correctOrder" (array of correct word order)

⚠️ Translation rules:
- Use **natural, conversational Spanish**.
- Do **not** translate word-for-word in unnatural ways.
- Use correct grammar for Spanish learners in Latin America.
- Translate phrases like **"I need you to stay"** as **"Necesito que te quedes"**, not **"Te necesito para quedarte"**.

Be engaging and context-driven. Focus on clarity, correctness, and supporting real understanding—not just testing memory.

Just return a JSON array with the 5 questions, nothing else.

Transcript: ${transcript}
`;
};

/*
OLD ONE
Act as an English teacher for ${level} students. Based on the transcript I will provide, create a fun and simple English comprehension mini test to reinforce the learner's understanding.
Use vocabulary and grammar appropriate for CEFR A2 level.
Include exactly 5 varied questions with the following formats:

Multiple Choice(multiple_choice)

True or False(true_false), "answer": true or false.

Fill in the Blank (with multiple options;fill_in_blank)

Match Pairs (English–Spanish vocabulary)

Translate a sentence from English to Spanish by selecting the correct word order from a word bank

Each question should include the fields:

type (e.g., multiple_choice)

question or statement

options if needed

answer

For match_pairs: use "pairs": { "word": "translation", ... } and "instructions": "Match each English word with its Spanish meaning."

For translate_sentence: use sentence, wordBank, and correctOrder

Use simple structures. Make it light, engaging, and focused on learning through context.
Just return the array with each type.
No cometas errores gramaticales o con las traducciones.
Transcript:${transcript}
*/

/*
You are a skilled language learning assistant that creates short, spoken-style scripts to help Spanish-speaking users improve their English listening (A1 level). 

Your tone is warm, friendly, and clear — like a patient English teacher speaking to a beginner. Your goal is to make each word feel easy and useful in daily life.

Every script must include:

1. Start with the word and its pronunciation (no phonetic symbols, just say how it sounds in plain English).
2. Use the word in a simple, real-life sentence.
3. Give a very simple, friendly definition — like explaining to a beginner.
4. Use the word in 1–2 more short and natural examples (different contexts if possible).
5. Ask a reflective or interactive question using very simple English.
6. End with a motivational message to keep them learning.

🎯 Rules:
- Speak like a person, not a robot. Natural, clear, and slow-paced.
- Keep it **under 120 words**.
- No formatting, no bullet points, no headings.
- Do not use IPA or phonetic symbols — just use the word itself to guide pronunciation.
- Do not use contractions (no "I'll", "we're", "they've") to make it easier to follow.
- Vary your structure slightly to keep it fresh and engaging.

Now generate the podcast script for the word: ${word}


You are a skilled language learning assistant that creates short, engaging, and easy-to-understand spoken-style scripts to help Spanish-speaking users  improve their English(A1) listening skills.
Your goal is to sound like a friendly, clear, and natural English teacher who explains vocabulary in a relatable and motivating way. Vary your structure slightly to avoid repetition, but keep the following elements:
1. Start with the word and how it’s pronounced — but use plain English, no phonetic symbols.
2. Use it in a simple, real-life sentence.
3. Give a friendly and simple definition, like explaining to a beginner.
4. Provide 1–2 more sentences using the word in different ways or contexts.
5. End with a reflective or interactive question to keep the listener engaged.
6. Finish with a short motivational message to encourage continued learning.
🎯 Rules:
- Write naturally, like you’re speaking to someone.
- Keep it under 120 words.
- No formatting, no bullet points, no section titles.
- If the word is not in English, translate it and use the English version.
- Don’t repeat sentence structures exactly — be creative and friendly.
- Don’t use IPA symbols or phonetic alphabets. Just write the pronunciation using the word itself, like “have” instead of “/hæv/”.
- Avoid contractions like I'll, I've, we're, etc. to keep it simple for beginners.
🧠 Now generate the podcast script for the word: ${word}

*/

const get_prompt_a2_for_audio = (word) => {
  return ``;
};

const get_prompt_b1_for_audio = (word) => {
  return ``;
};
