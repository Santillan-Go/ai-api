import { AzureOpenAI } from "openai";
import express from "express";
import cors from "cors";

import dotenv from "dotenv";
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
        content: `Responde como un experto educativo. Si el usuario pide una flashcard, responde con un objeto JSON que contenga:
- response: una breve frase como 'Aquí tienes tu flashcard'
- isACard: true
- deltaFront: string con el contenido en formato Delta (palabra,pronunciación ejemplo).
-deltaBack:una cadena con el contenido en formato Delta que contenga:
  - El significado (como heading nivel 3, en negritas y centrado).
Para todo lo demás, responde como siempre (solo con texto y isACard: false). No des explicaciones del formato, Ejemplo sobre como debe de ir el titulo, significado y  meaning front:[{"insert": "Improv\\n", "attributes": {"bold": true, "align": "center"}},{"insert": "Pronunciation\\n", "attributes": {"bold": true, "italic": true, "align": "center"}},{"insert": "An example sentence.\\n", "attributes": {"bold": true, "align": "center"}}}], back:  [{"insert": "Meaning\\n", "attributes": {"bold": true, "heading": 3, "align": "center"}}]`,
      };
    } else {
      systemMessage = {
        role: "system",
        content:
          "Responde como un experto educativo. Sé claro, útil y directo. Máximo 3 puntos clave por respuesta. Evita explicaciones extensas y ejemplos innecesarios, a menos que el usuario lo pida. Mantén las respuestas breves, sin perder el significado.",
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

    if (!lastMessageUser["isACard"]) {
      res.json({ response: response.choices[0].message.content });
    } else {
      res.json(response.choices[0].message.content);
    }
  } catch (error) {
    console.log({ error });
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log("Server running on port 3000");
});

export default app;

// app.listen(port, () => {
//   console.log(`Server running on port ${port}`);
// });
