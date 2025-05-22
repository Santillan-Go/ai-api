export function get_promt_json_flashcard(word, level) {
  return `Eres un generador experto de flashcards educativas para hispanohablantes que están aprendiendo inglés en nivel ${level}.
Tu tarea es crear una flashcard con la palabra ${word} en formato JSON, con las siguientes propiedades:
{
  "mainWord": "la palabra principal en inglés",
  "deltaFront": [formato Delta que muestre la palabra, pronunciación, un ejemplo simple(basate en el nivel:${level}) en inglés y un emoji relacionado. Cada insert debe terminar con un salto de línea real (usa \n al final de cada string, no como texto plano)],
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
- basate en el nivel del usuario:${level}, para crear el ejemplo 

**deltaBack**:  
- Traducción al español (ej: "Comer"), con  color, centrado, en negrita e itálica y header:3.
- Ejemplo traducido (ej: "Yo como una manzana."), centrado.


`;
}

//GOOD
//FOR AUDIOS STRUCTURE; SCRIPT
export const get_prompt_a1_for_audio = (word) => {
  return `You are a skilled language learning assistant that creates short, spoken-style scripts to help Spanish-speaking users improve their English listening (A1 level).

Your tone is warm, friendly, and clear — like a kind English teacher helping a beginner. Your goal is to make each word feel easy, natural, and useful in everyday life.

Each script must include:

Start with the word and how it sounds (write the word twice, as in: “Today’s word is [word]. listen [word].”).

Use the word in a short, real-life sentence.

Give a very simple and friendly definition — use clear language that an A1 learner will understand.

Give 1–2 more short, everyday examples (avoid strange phrases or rare uses).

Ask the learner a simple question using the word.

End with a short, encouraging message (like: “You are doing great. Keep going!”).

🎯 Important rules:
Speak like a real person — natural, slow, and friendly.
Keep it under 120 words.
Do not use any formatting (no bold, italic, dashes, or symbols).
Do not use IPA or phonetic symbols.
Do not use contractions (say “I am” instead of “I’m”).
Only use natural, common phrases — avoid awkward expressions (like “get happy”).
Keep vocabulary and grammar easy and clear — CEFR A1 level.
Be supportive, gentle, and a little fun.
Now create a short English listening script for the word: ${word}`;
  //   return `You are a skilled language learning assistant that creates short, spoken-style scripts to help Spanish-speaking users improve their English listening (A1 level).

  // Your tone is warm, friendly, and clear — like a patient English teacher speaking to a beginner. Your goal is to make each word feel easy and useful in daily life.

  // Every script must include:

  // 1. Start with the word and its pronunciation (no phonetic symbols, just say how it sounds in plain English, use the word; no wierd stuff like: geht).
  // 2. Use the word in a simple, real-life sentence.
  // 3. Give a very simple, friendly definition — like explaining to a beginner.
  // 4. Use the word in 1–2 more short and natural examples (different contexts if possible).
  // 5. Ask a reflective or interactive question using very simple English.
  // 6. End with a motivational message to keep them learning.

  // 🎯 Rules:
  // - Speak like a person, not a robot. Natural, clear, and slow-paced.
  // - Keep it **under 120 words**.
  // - Do **not** use any Markdown or formatting symbols like **bold**, _italic_ , or ALL CAPS. Just plain text.
  // - Do not use IPA or phonetic symbols — just use the word itself to guide pronunciation.
  // - Do not use contractions (no "I'll", "we're", "they've") to make it easier to follow.
  // - Vary your structure slightly to keep it fresh and engaging.
  // Now generate the podcast script for the word: ${word}`;
};
//GOOD
export const create_test_user = (transcript, level) => {
  return `Act as an experienced English teacher for ${level} students. Based on the transcript I will provide, create a short, fun English comprehension mini test with **exactly 5 varied questions** to reinforce understanding of the video.

Use vocabulary and grammar appropriate for CEFR ${level} (e.g., A2 or B1). Keep all questions clear, simple, and emotionally engaging for beginner to low-intermediate learners.

Make sure each question feels **natural and meaningful** — not robotic or mechanical. Use language that connects emotionally with learners.

Include 1 question of each of the following types:

1. Multiple Choice  
  - "type": "multiple_choice"  
  - Include: "question", "options" (array related with transcript), and correct "answer"  
  - 🔄 The question must be based on **something the speaker/singer literally says**, especially something **meaningful, repeated, or emotional**.  
  - Use a **clear and natural tone**, e.g.:
      - "What does the singer say when he looks into her eyes?"
      - "According to the lyrics, how does the singer describe their love?"
  - The **options must reuse phrases or ideas from the transcript** (not external interpretation).  
  - The correct "answer" must match the wording or meaning found in the transcript.  
  - Distractor options should be **plausible and related**, but clearly not correct.


2. True or False  
  - "type": "true_false"  
  - Include: "content" (a simple, natural-sounding statement **or** question from the video) and correct "answer" (true or false)  
  - ✅ Use **clear facts stated directly in the transcript**, not inferred meanings or assumptions.  
  - 🔄 Use simple, emotional statements in plain English. Avoid robotic or overly complex phrases.  
  - Example: "The singer says he can't live without the other person."

3. Fill in the Blank (with options)  
  - "type": "fill_in_blank"  
  - Include: "question" (with a blank like "___"), "options" (array), and correct "answer"  
  - Use a short quote from the video with a missing word, preferably one that’s emotional or important.

4. Match Vocabulary  
  - "type": "match_pairs"  
  - Include:  
    - "instructions": "Match each English word with its Spanish meaning."  
    - "pairs": { "EnglishWord1": "SpanishWord1", "EnglishWord2": "SpanishWord2" }  
  - Use 4–5 meaningful and useful words from the video, focusing on verbs, feelings, or relationship-related words.

5. Translate Sentence (word order selection)  
  - "type": "translate_sentence"  
  - Include:  
    - "sentence": (a simple English sentence, e.g., "I need you to stay")  
    - "wordBank": (array of Spanish words,  don't make mistake with translation of this words, add all the words that are in correctOrder)  
    - "correctOrder": (array of words in the correct order)

⚠️ Translation rules:

- Use **natural Latin American Spanish**, like something a native speaker would actually say — not robotic or word-for-word literal.
- NEVER use incorrect or conjugated words like "iré" when the correct word is "ir".
- Only use **real, fluent Spanish phrases**, e.g., "Nunca te dejaré ir" instead of awkward phrases like "Nunca te dejaré que te vayas".
- "correctOrder" must reflect a real Spanish sentence — simple, fluent, and grammatically correct.
- "wordBank" must include **all words used in correctOrder**, plus **3–4 extra words** that are reasonable **alternate translations** or **context-related words** from the transcript — **but never misleading or incorrect**.
- Do NOT include unnecessary or unrelated words. The extras must be semantically related to the sentence or its translation.
- Avoid including "que" unless it's **actually required** in the natural translation.
- add Emojis where it needed

Return a JSON array with exactly 5 questions (no explanation, no extra text — just the JSON).
Transcript: ${transcript}
`;

  //   return `Act as an English teacher for ${level} students. Based on the transcript I will provide, create a fun and simple English comprehension mini test to reinforce the learner's understanding.

  // Use vocabulary and grammar appropriate for CEFR ${level} level (example: A2). Keep the questions simple and suitable for beginner to low-intermediate learners.

  // Include exactly 5 varied questions using these formats:

  // 1. Multiple Choice ("type": "multiple_choice")
  // 2. True or False ("type": "true_false", answer must be true or false, "content":stament or question)
  // 3. Fill in the Blank (with options) ("type": "fill_in_blank")
  // 4. Match Pairs of vocabulary (English–Spanish) ("type": "match_pairs")
  // 5. Translate Sentence by selecting the correct word order from a word bank ("type": "translate_sentence")

  // For each question include:

  // - type (as above)
  // - question or statement (depending on type)
  // - options if applicable
  // - answer
  // - For match_pairs: include "pairs": { "word": "translation" } and "instructions": "Match each English word with its Spanish meaning."
  // - For translate_sentence: include "sentence", "wordBank" (array of Spanish words), and "correctOrder" (array of correct word order)

  // ⚠️ Translation rules:
  // - Use **natural, conversational Spanish**.
  // - Do **not** translate word-for-word in unnatural ways.
  // - Use correct grammar for Spanish learners in Latin America.
  // - Translate phrases like **"I need you to stay"** as **"Necesito que te quedes"**, not **"Te necesito para quedarte"**.

  // Be engaging and context-driven. Focus on clarity, correctness, and supporting real understanding—not just testing memory.

  // Just return a JSON array with the 5 questions, nothing else.

  // Transcript: ${transcript}
  // `;
};

/*
new
`Responde como un experto educativo. responde con un objeto JSON válido, sin envolverlo en markdown, sin usar comillas escapadas innecesarias ni \\n que no correspondan. Asegúrate que deltaBack y deltaFront usen solo el formato JSON Delta. Crea el contenido basado en esta palabra: "${word}", y nivel: "${level}". El objeto debe tener la siguiente estructura:

old:

Responde como un experto educativo. responde con un objeto JSON válido, sin envolverlo en markdown, sin usar comillas escapadas innecesarias ni \n que no correspondan. Ensure that deltaBack and deltaFront uses only Delta JSON formatting. Crea el contenido basado en esta palabra ${word}, y  ${level} El objeto debe tener:
*/

export const create_flashcard_word = (word, level, caracteritics) => {
  //PARAMETERS: word, level, caracteritics
  return `Responde como un experto educativo. responde con un objeto JSON válido, sin envolverlo en markdown, sin usar comillas escapadas innecesarias ni \\n que no correspondan. Asegúrate que deltaBack y deltaFront usen solo el formato JSON Delta. Crea el contenido basado en esta palabra: "${word}", y nivel: "${level}". El objeto debe tener la siguiente estructura:
{
  "deltaFront": [{"insert":"Thrive","attributes":{"bold":true,"align":"center","italic":true,"color":"#FF1E88E5"}},{"insert":"\n","attributes":{"bold":true,"align":"center","header":3}},{"insert":/θraɪv/\n","attributes":{"bold":true,"italic":true,"align":"center"}},{"insert":"The sunflowers thrived in the sunny garden. 🌻☀️\n","attributes":{"bold":true,"align":"center"}}, {"insert": "\n"}],
  "deltaBack": [{"insert":"Meaning","attributes":{"bold":true,"align":"center","italic":true,"color":"#FF1E88E5"}},{"insert":"\n","attributes":{"bold":true,"align":"center","header":3}},{"insert":"To grow or develop successfully.  To flourish.  To prosper. ✨\n","attributes":{"align":"center"}}, {"insert": "\n"}]
  "mainWord":"Thrive" => la palabra que quiere el usuario puede ser una palabra o frase; ponla aquí
"frontAudioText": Incluye el contenido(palabra principal en inglés y el ejemplo clave en inglés) que usaste en deltaFront, ejemplo: Take. Take your time.
}

No uses saltos de línea reales, usa "\\n", Todos los valores de "insert" deben usar "\\n" en lugar de saltos de línea reales. No uses comillas escapadas ni estructuras anidadas mal cerradas. Asegúrate que tanto deltaFront como deltaBack sean arrays de objetos Delta válidos(formato Delta).
✅ Asegúrate de que tanto deltaFront como deltaBack terminen siempre con un bloque {"insert":"\n"} al final.

Reglas:

1. mainWord(${word})  
   - Si la palabra o frase no está en inglés, tradúcela al inglés antes de crear la flashcard.
2. deltaFront  
   - Incluye:
     a) La palabra o frase en inglés (centrada, en negrita, cursiva y con color)
     b) Su pronunciación (ej. /θraɪv/)
     c) Un ejemplo en inglés con emojis (🌻☀️), si es necesario(el ejemplo relacionado con ${word}).
   - Todo el contenido debe estar centrado.
   - No incluyas la definición aquí.
3. deltaBack  
- Si la palabra o frase es corta (hasta 3 palabras), incluye:
   - Muestra el significado de la palabra.
   - Usa el nivel adecuado según ${level}.
  y ajustarse a las características: ${caracteritics}(cumple con estos). Usa texto centrado y emojis solo si ayudan a la comprensión.
- Si es una frase larga (más de 3 palabras), Solo incluye el ejemplo traducido en español
4. frontAudioText  
   - Si la palabra o frase es corta (hasta 3 palabras), incluye:  
     a) La palabra o frase principal  
     b) El ejemplo en inglés  
   - Si es una frase larga (más de 3 palabras), **no repitas la frase**. Solo incluye el ejemplo en inglés.
   
   📌 Si la entrada es una frase larga (más de 3 palabras), **omite la pronunciación**, ya que no es útil ni natural en esos casos. solo incluye el ejemplo usado en deltaFront traducido en español  en deltaBack.  
🔊 Para el campo frontAudioText, **no repitas la frase**. En este caso, solo incluye el ejemplo usado en deltaFront.  
📌 Si la frase es corta (3 palabras o menos) y tiene sentido fonético (como "I can fly"), puedes incluir la pronunciación en deltaFront.  
🔊 En ese caso, frontAudioText debe incluir la palabra/frase principal y el ejemplo.`;
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
