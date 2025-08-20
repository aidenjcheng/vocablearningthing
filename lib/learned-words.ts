import { createClient } from "@/lib/supabase/client";

export async function getLearnedWords(): Promise<string[]> {
  const supabase = createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: learnedWords, error } = await supabase
    .from("learned_words")
    .select("word")
    .eq("user_id", user.id);

  if (error) {
    console.error("Error fetching learned words:", error);
    return [];
  }

  return learnedWords?.map(item => item.word) || [];
}

export async function addLearnedWord(word: string): Promise<boolean> {
  const supabase = createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from("learned_words")
    .insert({ user_id: user.id, word });

  if (error) {
    console.error("Error adding learned word:", error);
    return false;
  }

  return true;
}

export async function addLearnedWords(words: string[]): Promise<boolean> {
  const supabase = createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  if (words.length === 0) return true;

  const { error } = await supabase
    .from("learned_words")
    .insert(words.map(word => ({ user_id: user.id, word })));

  if (error) {
    console.error("Error adding learned words:", error);
    return false;
  }

  return true;
}

export async function removeLearnedWord(word: string): Promise<boolean> {
  const supabase = createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from("learned_words")
    .delete()
    .eq("user_id", user.id)
    .eq("word", word);

  if (error) {
    console.error("Error removing learned word:", error);
    return false;
  }

  return true;
}
