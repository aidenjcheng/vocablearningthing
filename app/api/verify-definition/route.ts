import { generateText } from "ai";
import { groq } from "@ai-sdk/groq";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { word, actualDefinition, userDefinition } = await request.json();

    const { text } = await generateText({
      model: groq("llama-3.3-70b-versatile"),
      prompt: `Evaluate if this user's definition description accurately captures the meaning of the word "${word}" with the actual definition "${actualDefinition}". 
      
      User's Definition Description: "${userDefinition}"
      
      Respond with only "CORRECT" if the user's description accurately captures the meaning of the word, or "INCORRECT" if it's missing key elements or is inaccurate.`,
    });

    const isCorrect = text.trim().toUpperCase().includes("CORRECT");

    return NextResponse.json({ isCorrect, feedback: text });
  } catch (error) {
    console.error("Error verifying definition:", error);
    return NextResponse.json({ error: "Failed to verify definition" }, { status: 500 });
  }
}
