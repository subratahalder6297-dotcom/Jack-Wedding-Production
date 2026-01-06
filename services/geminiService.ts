
import { GoogleGenAI } from "@google/genai";

export const generateFolderDescription = async (folderName: string): Promise<string> => {
  try {
    // Create instance inside the function to ensure up-to-date API key usage as per guidelines
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Create a professional and elegant 1-sentence welcome description for a wedding production folder named "${folderName}". Focus on memory preservation and cinematic quality.`,
      config: {
        maxOutputTokens: 100,
        temperature: 0.7,
      },
    });
    // Access response.text property directly
    return response.text?.trim() || "Your cinematic wedding memories, preserved forever.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Your curated wedding production assets.";
  }
};