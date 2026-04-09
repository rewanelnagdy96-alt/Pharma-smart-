import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function suggestAlternatives(medicineName: string): Promise<string[]> {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are a pharmacist assistant. Suggest exactly 3 alternative medications for "${medicineName}". 
      Return ONLY a JSON array of strings with the names. No markdown formatting, no explanation.
      Example: ["AltMed 1", "AltMed 2", "AltMed 3"]`,
    });
    
    const text = response.text;
    if (!text) return [];
    
    // Clean up potential markdown formatting from the response
    const cleanedText = text.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(cleanedText);
  } catch (error) {
    console.error("Error fetching alternatives:", error);
    return [];
  }
}
