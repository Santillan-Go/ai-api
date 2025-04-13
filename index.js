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
  const { prompt } = req.body;

  try {
    // const response = await client.completions.create({
    //   model: "gpt-4o", // Specify your model
    //   prompt: prompt,
    //   max_tokens: 100,
    // });

    const response = await client.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      max_tokens: 4096,
      temperature: 1,
      top_p: 1,
      model: "gpt-4o",
    });

    if (response?.error !== undefined && response.status !== "200") {
      throw response.error;
    }
    console.log(response.choices[0].message.content);

    res.json({ response: response.choices[0].message.content });
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
