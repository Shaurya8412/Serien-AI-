import { GoogleGenAI, Type, Modality, GenerateContentResponse } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

export const getAI = () => {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set in the environment.");
  }
  return new GoogleGenAI({ apiKey });
};

export async function chatWithAI(message: string, history: { role: "user" | "model"; parts: { text: string }[] }[] = []) {
  const ai = getAI();
  const chat = ai.chats.create({
    model: "gemini-3-flash-preview",
    config: {
      systemInstruction: "You are Serien, a personal listener and empathetic companion. You have a permanent memory of your conversations with the user. Use past information they've shared to be more personal, supportive, and understanding. Whether they are happy or sad, you are with them. Share their joy and moments of life. Your tone should be warm, friendly, and deeply personal. If they mention something from the past, acknowledge it to show you remember.",
    },
    history: history,
  });

  const response = await chat.sendMessage({ message });
  return response.text;
}

export async function analyzeImage(prompt: string, base64Image: string, mimeType: string) {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [
        { text: prompt },
        {
          inlineData: {
            data: base64Image,
            mimeType: mimeType,
          },
        },
      ],
    },
  });
  return response.text;
}

export async function generateImage(prompt: string) {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: {
      parts: [{ text: prompt }],
    },
    config: {
      imageConfig: {
        aspectRatio: "1:1",
      },
    },
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("No image was generated.");
}
