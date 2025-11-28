import { GoogleGenAI } from "@google/genai";
import { AI_CONFIG } from "../constants";

let aiInstance: GoogleGenAI | null = null;

const getAI = (): GoogleGenAI => {
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
  return aiInstance;
};

export const queryCyberAI = async (prompt: string): Promise<string> => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: AI_CONFIG.systemInstruction,
        temperature: 0.7,
        maxOutputTokens: 200,
      }
    });
    
    return response.text || "ERR: EMPTY_RESPONSE_PACKET";
  } catch (error) {
    console.error("Neural Link Error:", error);
    return `ERR: NEURAL_LINK_FAILED [${error instanceof Error ? error.message : 'Unknown'}]`;
  }
};