"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Shuffle } from "lucide-react";
import { vocab } from "@/data/vocab";

export default function QuizConfigDialog() {
  const [quizMode, setQuizMode] = useState<"all" | "starred" | "custom">("all");
  const [customWordCount, setCustomWordCount] = useState(10);

  const startQuiz = () => {
    // Build URL with quiz configuration
    let quizUrl = "/quiz";
    const params = new URLSearchParams();

    if (quizMode === "all") {
      params.set("mode", "all");
    } else if (quizMode === "starred") {
      params.set("mode", "starred");
    } else if (quizMode === "custom") {
      params.set("mode", "custom");
      params.set("count", customWordCount.toString());
    }

    if (params.toString()) {
      quizUrl += "?" + params.toString();
    }

    // Navigate to quiz page with configuration
    window.location.href = quizUrl;
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="w-full">
          <Shuffle className="h-4 w-4 mr-2" />
          Start New Quiz
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Start New Quiz</DialogTitle>
          <DialogDescription>
            Choose your quiz mode and settings
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          <div className="space-y-4">
            <Label className="text-base font-medium">Quiz Mode</Label>
            <RadioGroup
              value={quizMode}
              onValueChange={(value: "all" | "starred" | "custom") =>
                setQuizMode(value)
              }
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="all" />
                <Label htmlFor="all">All Words ({vocab.length} words)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="starred" id="starred" />
                <Label htmlFor="starred">
                  Starred Words (
                  {
                    JSON.parse(localStorage.getItem("starredWords") || "[]")
                      .length
                  }{" "}
                  words)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="custom" id="custom" />
                <Label htmlFor="custom">Custom Number</Label>
              </div>
            </RadioGroup>
          </div>

          {quizMode === "custom" && (
            <div className="space-y-2">
              <Label htmlFor="wordCount">Number of Words</Label>
              <input
                id="wordCount"
                type="number"
                min="1"
                max={vocab.length}
                value={customWordCount}
                onChange={(e) => setCustomWordCount(Number(e.target.value))}
                className="w-full px-3 py-2 border border-input rounded-md bg-background"
              />
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button onClick={startQuiz} className="flex-1">
              Start Quiz
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
