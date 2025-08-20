"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";

import {
  ArrowLeft,
  X,
  CheckCircle,
  XCircle,
  Star,
  Volume2,
  VolumeX,
  Check,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { vocab } from "@/data/vocab";
import type { VocabularyItem } from "@/types/vocabulary";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getStarredWords, toggleStarredWord } from "@/lib/starred-words";
import { addLearnedWords, getLearnedWords } from "@/lib/learned-words";

export default function QuizPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode");
  const count = searchParams.get("count");

  // Declare state variables
  const [currentScreen, setCurrentScreen] = useState("quiz");
  const [showingAnswer, setShowingAnswer] = useState(false);
  const [currentChoices, setCurrentChoices] = useState<string[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentWords, setCurrentWords] = useState<VocabularyItem[]>(vocab);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [sentence, setSentence] = useState("");
  const [sentenceVerification, setSentenceVerification] = useState<{
    isCorrect: boolean;
    feedback: string;
  } | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [userDefinition, setUserDefinition] = useState("");
  const [definitionVerification, setDefinitionVerification] = useState<{
    isCorrect: boolean;
    feedback: string;
  } | null>(null);
  const [isVerifyingDefinition, setIsVerifyingDefinition] = useState(false);
  const [starredWords, setStarredWords] = useState<Set<string>>(new Set());
  const [correctAnswersInRow, setCorrectAnswersInRow] = useState(0);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(
    null
  );
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [knownWords, setKnownWords] = useState<Set<string>>(new Set());
  const [showAlreadyKnowDialog, setShowAlreadyKnowDialog] = useState(false);
  const [learnedWordsInSession, setLearnedWordsInSession] = useState<
    Set<string>
  >(new Set());
  const supabase = createClient();

  const handleExit = () => {
    router.push("/");
  };

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (currentScreen === "quiz" && !showingAnswer) {
        const key = e.key;
        if (["1", "2", "3", "4"].includes(key)) {
          const index = Number.parseInt(key) - 1;
          if (index < currentChoices.length) {
            handleAnswer(currentChoices[index]);
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [currentScreen, showingAnswer, currentChoices]);

  const playSound = (soundPath: string) => {
    if (!soundEnabled) return;

    // Stop any currently playing audio
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    }

    // Create and play new audio
    const audio = new Audio(soundPath);
    audio.play();
    setCurrentAudio(audio);
  };

  const handleAnswer = async (choice: string) => {
    // Prevent answering if already showing answer
    if (showingAnswer) return;

    setSelectedAnswer(choice);
    const isCorrect = choice === currentWords[currentQuestionIndex]?.definition;

    if (isCorrect) {
      // Calculate the new streak first
      const newStreak = correctAnswersInRow + 1;

      // Play appropriate sound based on streak
      if (newStreak === 10) {
        // Play 10 correct sound
        playSound("/sound-effects/duolingo-10-correct-answers.mp3");
      } else if (newStreak === 5) {
        // Play 5 correct sound
        playSound("/sound-effects/dolingo-five-correct-answers.mp3");
      } else {
        // Play regular correct sound (but not if it's 5 or 10)
        playSound("/sound-effects/duolingo correct sound.mp3");
      }

      // Update the streak state
      setCorrectAnswersInRow(newStreak);

      setShowingAnswer(true);
      // Move to next question after a delay
      setTimeout(() => {
        moveToNextQuestion();
      }, 2000);
    } else {
      // Wrong answer - reset streak and play wrong sound
      setCorrectAnswersInRow(0);
      playSound("/sound-effects/duolingo-wrong.mp3");

      // Add to starred words in Supabase
      const currentWord = currentWords[currentQuestionIndex].word;
      await toggleStarredWord(currentWord);
      setStarredWords((prev) => new Set([...prev, currentWord]));
      setCurrentScreen("sentence");
    }
  };

  const handleIDontKnow = async () => {
    // Reset streak and play wrong sound
    setCorrectAnswersInRow(0);
    playSound("/sound-effects/duolingo-wrong.mp3");

    // Add to starred words in Supabase
    const currentWord = currentWords[currentQuestionIndex].word;
    await toggleStarredWord(currentWord);
    setStarredWords((prev) => new Set([...prev, currentWord]));
    setCurrentScreen("sentence");
  };

  const verifySentence = async () => {
    if (!sentence.trim()) return;

    setIsVerifying(true);
    try {
      const response = await fetch("/api/verify-sentence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          word: currentWords[currentQuestionIndex].word,
          definition: currentWords[currentQuestionIndex].definition,
          sentence: sentence.trim(),
        }),
      });

      const result = await response.json();
      setSentenceVerification(result);

      // Play success sound if sentence is correct
      if (result.isCorrect) {
        playSound("/sound-effects/duolingo correct sound.mp3");
        // Track as learned word in review mode if definition was also correct
        if (mode === "review" && definitionVerification?.isCorrect) {
          const currentWord = currentWords[currentQuestionIndex]?.word;
          if (currentWord) {
            setLearnedWordsInSession((prev) => new Set([...prev, currentWord]));
          }
        }
      }
    } catch (error) {
      console.error("Error verifying sentence:", error);
      setSentenceVerification({
        isCorrect: false,
        feedback: "Error verifying sentence. Please try again.",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const verifyDefinition = async () => {
    if (!userDefinition.trim()) return;

    setIsVerifyingDefinition(true);
    try {
      const response = await fetch("/api/verify-definition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          word: currentWords[currentQuestionIndex].word,
          actualDefinition: currentWords[currentQuestionIndex].definition,
          userDefinition: userDefinition.trim(),
        }),
      });

      const result = await response.json();
      setDefinitionVerification(result);

      // Play success sound if definition is correct
      if (result.isCorrect) {
        playSound("/sound-effects/duolingo correct sound.mp3");
        // Track as learned word in review mode
        if (mode === "review") {
          const currentWord = currentWords[currentQuestionIndex]?.word;
          if (currentWord) {
            setLearnedWordsInSession((prev) => new Set([...prev, currentWord]));
          }
        }
      }
    } catch (error) {
      console.error("Error verifying definition:", error);
      setDefinitionVerification({
        isCorrect: false,
        feedback: "Error verifying definition. Please try again.",
      });
    } finally {
      setIsVerifyingDefinition(false);
    }
  };

  const moveToNextQuestion = () => {
    if (currentQuestionIndex < currentWords.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setCurrentScreen("quiz");
      setShowingAnswer(false);
      setSelectedAnswer(null);
      setSentence("");
      setSentenceVerification(null);
      setUserDefinition("");
      setDefinitionVerification(null);
      // Generate new choices for next question
      generateChoices();
    } else {
      // Quiz completed - play completion sound
      playSound("/sound-effects/duolingo-completed-lesson.mp3");
      setCurrentScreen("results");
    }
  };

  const moveToNextReviewQuestion = () => {
    if (currentQuestionIndex < currentWords.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setCurrentScreen("review");
      setUserDefinition("");
      setDefinitionVerification(null);
      setSentence("");
      setSentenceVerification(null);
    } else {
      // Review completed - save learned words to Supabase
      if (learnedWordsInSession.size > 0) {
        addLearnedWords(Array.from(learnedWordsInSession)).catch(console.error);
      }

      // Play completion sound
      playSound("/sound-effects/duolingo-completed-lesson.mp3");
      setCurrentScreen("review-results");
    }
  };

  const generateChoices = () => {
    const currentWord = currentWords[currentQuestionIndex];
    if (!currentWord) return;

    const correctDefinition = currentWord.definition;
    const otherDefinitions = currentWords
      .filter((w) => w.word !== currentWord.word)
      .map((w) => w.definition)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);

    const allChoices = [correctDefinition, ...otherDefinitions].sort(
      () => Math.random() - 0.5
    );

    setCurrentChoices(allChoices);
  };

  useEffect(() => {
    if (currentScreen === "quiz" && currentWords.length > 0) {
      generateChoices();
    }
  }, [currentQuestionIndex, currentScreen, currentWords.length]);

  const loadCustomWords = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        alert("Please log in to access custom words");
        router.push("/");
        return;
      }

      const { data: customWords, error } = await supabase
        .from("custom_words")
        .select("word, definition")
        .eq("user_id", user.id);

      if (error) {
        console.error("Error fetching custom words:", error);
        alert("Error loading custom words. Please try again.");
        router.push("/");
        return;
      }

      if (!customWords || customWords.length === 0) {
        alert("No custom words found. Please add some custom words first.");
        router.push("/quiz/custom");
        return;
      }

      // Convert to VocabularyItem format and randomize
      const customWordsList = customWords.map((cw: any) => ({
        word: cw.word,
        definition: cw.definition,
      }));

      const randomizedCustomWords = [...customWordsList].sort(
        () => Math.random() - 0.5
      );
      setCurrentWords(randomizedCustomWords);
      setCurrentQuestionIndex(0);
      setCurrentScreen("quiz");
      setCorrectAnswersInRow(0);
      setStarredWords(new Set());
    } catch (error) {
      console.error("Error:", error);
      alert("Error loading custom words. Please try again.");
      router.push("/");
    }
  };

  // Handle mode parameter for direct navigation
  useEffect(() => {
    const initializeQuiz = async () => {
      // Load known words from localStorage
      const savedKnownWords = JSON.parse(
        localStorage.getItem("knownWords") || "[]"
      );
      setKnownWords(new Set(savedKnownWords));

      // Load starred words from Supabase
      const starredWordsList = await getStarredWords();
      setStarredWords(new Set(starredWordsList));

      // Load learned words from Supabase
      const learnedWordsList = await getLearnedWords();
      const allExcludedWords = new Set([
        ...savedKnownWords,
        ...learnedWordsList,
      ]);

      if (mode === "starred") {
        const starredWordsFromVocab = vocab.filter(
          (word) =>
            starredWordsList.includes(word.word) &&
            !allExcludedWords.has(word.word)
        );

        if (starredWordsFromVocab.length > 0) {
          // Randomize starred words
          const randomizedStarredWords = [...starredWordsFromVocab].sort(
            () => Math.random() - 0.5
          );
          setCurrentWords(randomizedStarredWords);
          setCurrentQuestionIndex(0);
          setCurrentScreen("quiz");
          setCorrectAnswersInRow(0);
        } else {
          alert("No starred words found. Please star some words first.");
          router.push("/");
        }
      } else if (mode === "custom") {
        if (count) {
          // Custom number of random words from vocab (excluding known and learned words)
          const wordCount = parseInt(count);
          const availableWords = vocab.filter(
            (word) => !allExcludedWords.has(word.word)
          );

          if (wordCount > 0 && wordCount <= availableWords.length) {
            const selectedWords = [...availableWords]
              .sort(() => Math.random() - 0.5)
              .slice(0, wordCount);
            setCurrentWords(selectedWords);
            setCurrentQuestionIndex(0);
            setCurrentScreen("quiz");
            setCorrectAnswersInRow(0);
          } else {
            alert(
              `Invalid word count. Only ${availableWords.length} words available (excluding known and learned words).`
            );
            router.push("/");
          }
        } else {
          // Custom words from Supabase
          loadCustomWords();
        }
      } else if (mode === "learned") {
        // Quiz with learned words only
        const learnedWordsFromVocab = vocab.filter((word) =>
          learnedWordsList.includes(word.word)
        );

        if (learnedWordsFromVocab.length > 0) {
          const randomizedLearnedWords = [...learnedWordsFromVocab].sort(
            () => Math.random() - 0.5
          );
          setCurrentWords(randomizedLearnedWords);
          setCurrentQuestionIndex(0);
          setCurrentScreen("quiz");
          setCorrectAnswersInRow(0);
        } else {
          alert("No learned words found. Complete some review sessions first!");
          router.push("/");
        }
      } else if (mode === "all") {
        // Randomize all words (excluding known and learned words)
        const availableWords = vocab.filter(
          (word) => !allExcludedWords.has(word.word)
        );
        const randomizedVocab = [...availableWords].sort(
          () => Math.random() - 0.5
        );
        setCurrentWords(randomizedVocab);
        setCurrentQuestionIndex(0);
        setCurrentScreen("quiz");
        setCorrectAnswersInRow(0);
      } else {
        // Default: start with all words if no mode specified (excluding known and learned words)
        const availableWords = vocab.filter(
          (word) => !allExcludedWords.has(word.word)
        );
        const randomizedVocab = [...availableWords].sort(
          () => Math.random() - 0.5
        );
        setCurrentWords(randomizedVocab);
        setCurrentQuestionIndex(0);
        setCurrentScreen("quiz");
      }
    };

    initializeQuiz();
  }, [mode, count]);

  const toggleStar = async (word: string) => {
    const success = await toggleStarredWord(word);
    if (success) {
      setStarredWords((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(word)) {
          newSet.delete(word);
        } else {
          newSet.add(word);
        }
        return newSet;
      });
    }
  };

  const handleAlreadyKnow = () => {
    setShowAlreadyKnowDialog(true);
  };

  const confirmAlreadyKnow = () => {
    const currentWord = currentWords[currentQuestionIndex]?.word;
    if (!currentWord) return;

    // Add to known words set
    setKnownWords((prev) => {
      const newSet = new Set(prev);
      newSet.add(currentWord);

      // Save to localStorage
      const knownArray = Array.from(newSet);
      localStorage.setItem("knownWords", JSON.stringify(knownArray));

      return newSet;
    });

    // Remove from current words list
    setCurrentWords((prev) => {
      const filtered = prev.filter((word) => word.word !== currentWord);
      return filtered;
    });

    // If this was the last word, end the quiz
    if (currentWords.length <= 1) {
      playSound("/sound-effects/duolingo-completed-lesson.mp3");
      setCurrentScreen("results");
    } else {
      // Move to next question (don't increment index since we removed a word)
      moveToNextQuestion();
    }

    setShowAlreadyKnowDialog(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="flex justify-between items-center p-4">
        <Link href="/">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>

        {currentScreen === "quiz" && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="flex items-center gap-2"
            >
              {soundEnabled ? (
                <Volume2 className="h-4 w-4" />
              ) : (
                <VolumeX className="h-4 w-4" />
              )}
              {soundEnabled ? "Mute" : "Unmute"}
            </Button>
            <Button variant="destructive" onClick={handleExit}>
              <X className="h-4 w-4 mr-2" />
              Exit Quiz
            </Button>
          </div>
        )}
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* ... existing quiz content with full-screen layout ... */}
        {currentScreen === "quiz" && (
          <div className="max-w-6xl mx-auto">
            <div className="mb-8">
              <Progress
                value={(currentQuestionIndex / currentWords.length) * 100}
                className="h-3"
              />
              <p className="text-center mt-2">
                Question {currentQuestionIndex + 1} of {currentWords.length}
              </p>
            </div>

            <div className="text-center mb-12">
              <div className="flex items-center justify-center gap-4 mb-4">
                <h1 className="text-6xl font-bold">
                  {currentWords[currentQuestionIndex]?.word}
                </h1>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    toggleStar(currentWords[currentQuestionIndex]?.word).catch(
                      console.error
                    )
                  }
                  className={`p-2 ${
                    starredWords.has(currentWords[currentQuestionIndex]?.word)
                      ? "text-yellow-500"
                      : "text-muted-foreground"
                  }`}
                >
                  <Star
                    className={`h-6 w-6 ${
                      starredWords.has(currentWords[currentQuestionIndex]?.word)
                        ? "fill-current"
                        : ""
                    }`}
                  />
                </Button>
              </div>
              <p className="text-xl text-muted-foreground">
                Choose the correct definition:
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl mx-auto mb-8">
              {currentChoices.map((choice, index) => (
                <Card
                  key={index}
                  className={`cursor-pointer transition-all duration-200 p-6 ${
                    showingAnswer
                      ? choice ===
                        currentWords[currentQuestionIndex]?.definition
                        ? "bg-green-100 border-green-500 dark:bg-green-900"
                        : selectedAnswer === choice
                        ? "bg-red-100 border-red-500 dark:bg-red-900"
                        : ""
                      : "hover:bg-muted/50"
                  }`}
                  onClick={() =>
                    !showingAnswer && handleAnswer(choice).catch(console.error)
                  }
                >
                  <CardContent className="p-0">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-8 h-8 bg-muted rounded-full flex items-center justify-center font-bold">
                        {index + 1}
                      </div>
                      <p className="text-lg leading-relaxed">{choice}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="text-center space-y-4">
              <div className="flex gap-4 justify-center">
                <Button
                  onClick={() => handleIDontKnow().catch(console.error)}
                  variant="outline"
                  disabled={showingAnswer}
                >
                  I Don't Know
                </Button>
                <Button
                  onClick={handleAlreadyKnow}
                  variant="outline"
                  disabled={showingAnswer}
                  className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800 dark:hover:bg-green-900/30"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Already Know
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Press 1-4 to select answers quickly
              </p>
            </div>
          </div>
        )}

        {currentScreen === "sentence" && (
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold mb-4">
                {currentWords[currentQuestionIndex]?.word}
              </h1>
              <div className="bg-muted p-4 rounded-lg mb-6">
                <p className="text-lg">
                  <strong>Definition:</strong>{" "}
                  {currentWords[currentQuestionIndex]?.definition}
                </p>
                {mode === "review" && userDefinition && (
                  <div className="mt-4 p-3 bg-background rounded border">
                    <p className="text-sm text-muted-foreground mb-1">
                      <strong>Your description:</strong>
                    </p>
                    <p className="text-base">{userDefinition}</p>
                  </div>
                )}
              </div>
              <p className="text-xl text-muted-foreground">
                Write a sentence using this word:
              </p>
            </div>

            <div className="space-y-4">
              <Textarea
                value={sentence}
                onChange={(e) => setSentence(e.target.value)}
                placeholder="Write your sentence here..."
                className="min-h-[120px] text-lg"
                disabled={isVerifying || sentenceVerification !== null}
              />

              {sentenceVerification && (
                <div
                  className={`p-4 rounded-lg flex items-start gap-3 ${
                    sentenceVerification.isCorrect
                      ? "bg-green-500/20 text-green-800 dark:bg-green-500/20 dark:text-green-200"
                      : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                  }`}
                >
                  {sentenceVerification.isCorrect ? (
                    <CheckCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                  ) : (
                    <XCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                  )}
                  <p>{sentenceVerification.feedback}</p>
                </div>
              )}

              <div className="flex gap-4 justify-center">
                {!sentenceVerification ? (
                  <Button
                    onClick={verifySentence}
                    disabled={!sentence.trim() || isVerifying}
                    className="px-8"
                  >
                    {isVerifying ? "Checking..." : "Check Sentence"}
                  </Button>
                ) : sentenceVerification.isCorrect ? (
                  <Button onClick={moveToNextQuestion} className="px-8">
                    Continue to Next Question
                  </Button>
                ) : (
                  <Button
                    onClick={() => {
                      setSentenceVerification(null);
                      setSentence("");
                    }}
                    className="px-8"
                  >
                    Try Again
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {currentScreen === "results" && (
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl font-bold text-foreground mb-8">
              Quiz Complete!
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              You've completed the vocabulary quiz.
            </p>
            <div className="space-y-4">
              <Link href="/">
                <Button className="mr-4">Back to Dashboard</Button>
              </Link>
              <Button
                variant="outline"
                onClick={() => {
                  setCurrentScreen("quiz");
                  setCurrentQuestionIndex(0);
                  setShowingAnswer(false);
                  setSelectedAnswer(null);
                }}
              >
                Take Quiz Again
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setCurrentScreen("review");
                  setCurrentQuestionIndex(0);
                  setUserDefinition("");
                  setDefinitionVerification(null);
                  setSentence("");
                  setSentenceVerification(null);
                }}
                className="w-full"
              >
                Review Mode - Describe & Write Sentences
              </Button>
            </div>
          </div>
        )}

        {currentScreen === "review" && (
          <div className="max-w-6xl mx-auto">
            <div className="mb-8">
              <Progress
                value={(currentQuestionIndex / currentWords.length) * 100}
                className="h-3"
              />
              <p className="text-center mt-2">
                Review {currentQuestionIndex + 1} of {currentWords.length}
              </p>
            </div>

            <div className="text-center mb-12">
              <div className="flex items-center justify-center gap-4 mb-4">
                <h1 className="text-6xl font-bold">
                  {currentWords[currentQuestionIndex]?.word}
                </h1>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    toggleStar(currentWords[currentQuestionIndex]?.word).catch(
                      console.error
                    )
                  }
                  className={`p-2 ${
                    starredWords.has(currentWords[currentQuestionIndex]?.word)
                      ? "text-yellow-500"
                      : "text-muted-foreground"
                  }`}
                >
                  <Star
                    className={`h-6 w-6 ${
                      starredWords.has(currentWords[currentQuestionIndex]?.word)
                        ? "fill-current"
                        : ""
                    }`}
                  />
                </Button>
              </div>
              <p className="text-xl text-muted-foreground">
                Describe the definition of this word:
              </p>
            </div>

            <div className="max-w-2xl mx-auto">
              <div className="space-y-6">
                <Textarea
                  value={userDefinition}
                  onChange={(e) => setUserDefinition(e.target.value)}
                  placeholder="Describe what this word means in your own words..."
                  className="min-h-[120px] text-lg"
                  disabled={
                    isVerifyingDefinition || definitionVerification !== null
                  }
                />

                {definitionVerification && (
                  <div
                    className={`p-4 rounded-lg flex items-start gap-3 ${
                      definitionVerification.isCorrect
                        ? "bg-green-500/20 text-green-800 dark:bg-green-500/20 dark:text-green-200"
                        : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                    }`}
                  >
                    {definitionVerification.isCorrect ? (
                      <CheckCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    ) : (
                      <XCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    )}
                    <p>{definitionVerification.feedback}</p>
                  </div>
                )}

                <div className="flex gap-4 justify-center">
                  {!definitionVerification ? (
                    <Button
                      onClick={verifyDefinition}
                      disabled={!userDefinition.trim() || isVerifyingDefinition}
                      className="px-8"
                    >
                      {isVerifyingDefinition
                        ? "Checking..."
                        : "Check Definition"}
                    </Button>
                  ) : definitionVerification.isCorrect ? (
                    <Button
                      onClick={() => setCurrentScreen("review-sentence")}
                      className="px-8"
                    >
                      Continue to Sentence
                    </Button>
                  ) : (
                    <Button
                      onClick={() => {
                        setDefinitionVerification(null);
                        setUserDefinition("");
                      }}
                      className="px-8"
                    >
                      Try Again
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {currentScreen === "review-sentence" && (
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold mb-4">
                {currentWords[currentQuestionIndex]?.word}
              </h1>
              <div className="bg-muted p-4 rounded-lg mb-6">
                <p className="text-lg">
                  <strong>Definition:</strong>{" "}
                  {currentWords[currentQuestionIndex]?.definition}
                </p>
                {userDefinition && (
                  <div className="mt-4 p-3 bg-background rounded border">
                    <p className="text-sm text-muted-foreground mb-1">
                      <strong>Your description:</strong>
                    </p>
                    <p className="text-base">{userDefinition}</p>
                  </div>
                )}
              </div>
              <p className="text-xl text-muted-foreground">
                Write a sentence using this word:
              </p>
            </div>

            <div className="space-y-4">
              <Textarea
                value={sentence}
                onChange={(e) => setSentence(e.target.value)}
                placeholder="Write your sentence here..."
                className="min-h-[120px] text-lg"
                disabled={isVerifying || sentenceVerification !== null}
              />

              {sentenceVerification && (
                <div
                  className={`p-4 rounded-lg flex items-start gap-3 ${
                    sentenceVerification.isCorrect
                      ? "bg-green-500/20 text-green-800 dark:bg-green-500/20 dark:text-green-200"
                      : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                  }`}
                >
                  {sentenceVerification.isCorrect ? (
                    <CheckCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                  ) : (
                    <XCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                  )}
                  <p>{sentenceVerification.feedback}</p>
                </div>
              )}

              <div className="flex gap-4 justify-center">
                {!sentenceVerification ? (
                  <Button
                    onClick={verifySentence}
                    disabled={!sentence.trim() || isVerifying}
                    className="px-8"
                  >
                    {isVerifying ? "Checking..." : "Check Sentence"}
                  </Button>
                ) : sentenceVerification.isCorrect ? (
                  <Button onClick={moveToNextReviewQuestion} className="px-8">
                    Continue to Next Word
                  </Button>
                ) : (
                  <Button
                    onClick={() => {
                      setSentenceVerification(null);
                      setSentence("");
                    }}
                    className="px-8"
                  >
                    Try Again
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {currentScreen === "review-results" && (
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl font-bold text-foreground mb-8">
              Review Complete!
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              You've completed the review session for all {currentWords.length}{" "}
              words.
            </p>
            {learnedWordsInSession.size > 0 && (
              <div className="mb-8 p-6 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <h3 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-2">
                  🎉 Congratulations!
                </h3>
                <p className="text-green-700 dark:text-green-300">
                  You've successfully learned {learnedWordsInSession.size} new
                  word{learnedWordsInSession.size === 1 ? "" : "s"}! These words
                  will no longer appear in your regular quizzes.
                </p>
                <div className="mt-4 flex flex-wrap gap-2 justify-center">
                  {Array.from(learnedWordsInSession).map((word, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 rounded-full text-sm font-medium"
                    >
                      {word}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-4">
              <Link href="/">
                <Button className="mr-4">Back to Dashboard</Button>
              </Link>
              <Button
                variant="outline"
                onClick={() => {
                  setCurrentScreen("quiz");
                  setCurrentQuestionIndex(0);
                  setShowingAnswer(false);
                  setSelectedAnswer(null);
                  setUserDefinition("");
                  setDefinitionVerification(null);
                  setSentence("");
                  setSentenceVerification(null);
                }}
              >
                Take Quiz Again
              </Button>
            </div>
          </div>
        )}

        {/* Already Know Confirmation Dialog */}
        <AlertDialog
          open={showAlreadyKnowDialog}
          onOpenChange={setShowAlreadyKnowDialog}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Mark as Already Known?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to mark "
                {currentWords[currentQuestionIndex]?.word}" as already known?
                This word will be removed from all future quizzes and you won't
                see it again.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmAlreadyKnow}>
                Yes, I Know This Word
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
