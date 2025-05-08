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
