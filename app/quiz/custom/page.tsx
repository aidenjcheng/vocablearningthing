"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Plus, BookOpen, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function CustomWordsPage() {
  const [customInput, setCustomInput] = useState("");
  const [wordList, setWordList] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [fetchStatus, setFetchStatus] = useState<string>("");
  const router = useRouter();
  const supabase = createClient();

  const handleAddCustomWords = async () => {
    if (!customInput.trim()) return;

    const lines = customInput.trim().split("\n");
    const newWords = lines
      .map((line) => {
        const [word, definition] = line.split(";").map((s) => s.trim());
        return word && definition ? { word, definition } : null;
      })
      .filter(Boolean);

    if (newWords.length === 0) {
      alert("Please enter words in the format: word;definition");
      return;
    }

    // Save to Supabase
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        alert("Please log in to save custom words");
        return;
      }

      const { error } = await supabase.from("custom_words").insert(
        newWords.map((word) => ({
          user_id: user.id,
          word: word!.word,
          definition: word!.definition,
        }))
      );

      if (error) {
        console.error("Error saving words:", error);
        alert("Error saving words. Please try again.");
        return;
      }

      alert(`Successfully saved ${newWords.length} words!`);
      router.push("/quiz?mode=custom");
    } catch (error) {
      console.error("Error:", error);
      alert("Error saving words. Please try again.");
    }
  };

  const fetchWordDefinition = async (word: string) => {
    try {
      const response = await fetch(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(
          word.trim()
        )}`
      );

      if (!response.ok) {
        return null;
      }

      const data = await response.json();

      if (data && data.length > 0) {
        // Get the first definition from the first meaning
        const firstMeaning = data[0].meanings?.[0];
        if (
          firstMeaning &&
          firstMeaning.definitions &&
          firstMeaning.definitions.length > 0
        ) {
          return firstMeaning.definitions[0].definition;
        }
      }

      return null;
    } catch (error) {
      console.error(`Error fetching definition for ${word}:`, error);
      return null;
    }
  };

  const handleFetchDefinitions = async () => {
    if (!wordList.trim()) return;

    setIsLoading(true);
    setFetchStatus("Fetching definitions...");

    const words = wordList
      .split(",")
      .map((w) => w.trim())
      .filter((w) => w);
    const wordsWithDefinitions = [];

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      setFetchStatus(
        `Fetching definition for "${word}"... (${i + 1}/${words.length})`
      );

      const definition = await fetchWordDefinition(word);

      if (definition) {
        wordsWithDefinitions.push({ word, definition });
      } else {
        setFetchStatus(`Could not find definition for "${word}". Skipping...`);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    if (wordsWithDefinitions.length === 0) {
      setFetchStatus("No definitions found for any words.");
      setIsLoading(false);
      return;
    }

    // Save to Supabase
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        alert("Please log in to save custom words");
        setIsLoading(false);
        return;
      }

      setFetchStatus("Saving words to database...");

      const { error } = await supabase.from("custom_words").insert(
        wordsWithDefinitions.map((word) => ({
          user_id: user.id,
          word: word.word,
          definition: word.definition,
        }))
      );

      if (error) {
        console.error("Error saving words:", error);
        setFetchStatus("Error saving words. Please try again.");
        setIsLoading(false);
        return;
      }

      setFetchStatus(
        `Successfully saved ${wordsWithDefinitions.length} words!`
      );
      setTimeout(() => {
        router.push("/quiz?mode=custom");
      }, 2000);
    } catch (error) {
      console.error("Error:", error);
      setFetchStatus("Error saving words. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <Link href="/">
            <Button variant="outline" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Add Custom Words
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="manual" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="manual">Manual Entry</TabsTrigger>
                <TabsTrigger value="auto">Auto-Fetch Definitions</TabsTrigger>
              </TabsList>

              <TabsContent value="manual" className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-foreground">
                    Enter words and definitions (one per line, format:
                    word;definition)
                  </label>
                  <Textarea
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    placeholder="abundant;existing in large quantities&#10;meticulous;showing great attention to detail&#10;eloquent;fluent and persuasive in speaking"
                    className="min-h-[200px]"
                  />
                </div>

                <Button
                  onClick={handleAddCustomWords}
                  className="w-full"
                  disabled={!customInput.trim()}
                >
                  Start Quiz with Custom Words
                </Button>
              </TabsContent>

              <TabsContent value="auto" className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-foreground">
                    Enter words separated by commas (definitions will be fetched
                    automatically)
                  </label>
                  <Textarea
                    value={wordList}
                    onChange={(e) => setWordList(e.target.value)}
                    placeholder="hello,world,beautiful,amazing,excellent"
                    className="min-h-[200px]"
                  />
                </div>

                {fetchStatus && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      {fetchStatus}
                    </p>
                  </div>
                )}

                <Button
                  onClick={handleFetchDefinitions}
                  className="w-full"
                  disabled={!wordList.trim() || isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Fetching Definitions...
                    </>
                  ) : (
                    <>
                      <BookOpen className="h-4 w-4 mr-2" />
                      Fetch Definitions & Start Quiz
                    </>
                  )}
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
