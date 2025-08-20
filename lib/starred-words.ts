import { createClient } from "@/lib/supabase/client";

export async function getStarredWords(): Promise<string[]> {
  const supabase = createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: starredWords, error } = await supabase
    .from("starred_words")
    .select("word")
    .eq("user_id", user.id);

  if (error) {
    console.error("Error fetching starred words:", error);
    return [];
  }

  return starredWords?.map(item => item.word) || [];
}

export async function addStarredWord(word: string): Promise<boolean> {
  const supabase = createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from("starred_words")
    .insert({ user_id: user.id, word });

  if (error) {
    console.error("Error adding starred word:", error);
    return false;
  }

  return true;
}

export async function removeStarredWord(word: string): Promise<boolean> {
  const supabase = createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from("starred_words")
    .delete()
    .eq("user_id", user.id)
    .eq("word", word);

  if (error) {
    console.error("Error removing starred word:", error);
    return false;
  }

  return true;
}

export async function toggleStarredWord(word: string): Promise<boolean> {
  const supabase = createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  // Check if word is already starred
  const { data: existing } = await supabase
    .from("starred_words")
    .select("id")
    .eq("user_id", user.id)
    .eq("word", word)
    .single();

  if (existing) {
    // Remove if already starred
    return await removeStarredWord(word);
  } else {
    // Add if not starred
    return await addStarredWord(word);
  }
}
