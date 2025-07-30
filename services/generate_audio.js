export async function generateAudios(text) {
  const apiKey = process.env.ELEVENLAB_KEY;
  try {
    const response = await fetch(
      "https://api.elevenlabs.io/v1/text-to-speech/TX3LPaxmHKxFdv7VOQHJ",
      {
        method: "POST",
        body: JSON.stringify({
          text,
          model_id: "eleven_turbo_v2_5",
          voice_id: "TX3LPaxmHKxFdv7VOQHJ",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 1.0,
          },
        }),
        headers: {
          accept: "audio/mpeg",
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const audioBuffer = await response.arrayBuffer();
    return audioBuffer;
  } catch (error) {
    console.error("Error generating audio:", error);
    throw error;
  }
}
