import { generateText } from "ai";
import { groq } from "@ai-sdk/groq";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { word, definition, sentence } = await request.json();

    const { text } = await generateText({
      model: groq("llama-3.3-70b-versatile"),
      prompt: `Evaluate if this sentence correctly uses the word "${word}" with the definition "${definition}". 
      
      Sentence: "${sentence}"
      
      Respond with only "CORRECT" if the word is used properly according to its definition, or "INCORRECT" if it's not used correctly or doesn't make sense.`,
    });

    const isCorrect = text.trim().toUpperCase().includes("CORRECT");

    return NextResponse.json({ isCorrect, feedback: text });
  } catch (error) {
    console.error("Error verifying sentence:", error);
    return NextResponse.json(
      { error: "Failed to verify sentence" },
      { status: 500 }
    );
  }
}
