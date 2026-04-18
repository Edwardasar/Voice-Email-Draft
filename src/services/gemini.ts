import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const SYSTEM_INSTRUCTION = `You are an expert corporate communications specialist and executive assistant. 
Your task is to take a rough, possibly informal or emotional transcript of a message and transform it into a polished, professional email.

Strict Rules:
1. Identify the core message and intent.
2. Elevate the tone to be polite, clear, and professionally appropriate (Corporate/Business context).
3. Remove filler words (um, uh, like, you know), slang, and overly casual phrasing.
4. Neutralize any frustration, hurry, or extreme emotion to sound calm and collected.
5. Strict output format:
   Subject: [Clear, concise subject line]
   
   Hi [Name/Team],
   
   [Professional email body]
   
   Best regards,
   
   [My Name]

6. Do not invent new information. 
7. Use placeholders like [Name], [Time], [Date], or [Project] if specific details are missing in the input.
8. If the input is empty or nonsensical, ask for clarification politely.`;

export async function transformVoiceNote(transcript: string) {
  if (!transcript.trim()) {
    return "Please provide content to transform.";
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: transcript,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      },
    });

    return response.text || "Failed to generate a transformation.";
  } catch (error) {
    console.error("Gemini transformation error:", error);
    return "Error transforming message. Please try again.";
  }
}
