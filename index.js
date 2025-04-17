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
    console.log(
      `[{"insert":"Improve","attributes":{"bold":true,"italic":true,"color":"#FF43A047"}},{"insert":"\n","attributes":{"header":3,"align":"center"}},{"insert":"\n","attributes":{"align":"center"}},{"insert":"I have to improve english skill"},{"insert":"\n","attributes":{"align":"center"}}]`
    );
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

app.listen(port, () => {
  console.log("Server running on port 3000");
});

export default app;

// app.listen(port, () => {
//   console.log(`Server running on port ${port}`);
// });
