"use client";

import { Button } from "@/components/ui/button";
import { Shuffle } from "lucide-react";

export default function QuizStartButton() {
  const handleStartQuiz = () => {
    // Open dialog by navigating to quiz page with dialog parameter
    window.location.href = "/quiz?dialog=true";
  };

  return (
    <Button className="w-full" onClick={handleStartQuiz}>
      <Shuffle className="h-4 w-4 mr-2" />
      Start New Quiz
    </Button>
  );
}
