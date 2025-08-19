"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  BarChart3,
  TrendingUp,
  Star,
  BookOpen,
  ArrowLeft,
  Target,
  Calendar,
} from "lucide-react";
import Link from "next/link";

interface QuizSession {
  date: string;
  totalWords: number;
  correctAnswers: number;
  starredWords: string[];
  accuracy: number;
}

interface ProgressStats {
  totalQuizzesTaken: number;
  totalWordsStudied: number;
  averageAccuracy: number;
  totalStarredWords: number;
  currentStreak: number;
  bestAccuracy: number;
  recentSessions: QuizSession[];
}

export default function Dashboard() {
  const [stats, setStats] = useState<ProgressStats>({
    totalQuizzesTaken: 0,
    totalWordsStudied: 0,
    averageAccuracy: 0,
    totalStarredWords: 0,
    currentStreak: 0,
    bestAccuracy: 0,
    recentSessions: [],
  });

  useEffect(() => {
    // Load progress data from localStorage
    const savedSessions = localStorage.getItem("vocabulary-quiz-sessions");
    const sessions: QuizSession[] = savedSessions
      ? JSON.parse(savedSessions)
      : [];

    if (sessions.length > 0) {
      const totalQuizzes = sessions.length;
      const totalWords = sessions.reduce(
        (sum, session) => sum + session.totalWords,
        0
      );
      const totalCorrect = sessions.reduce(
        (sum, session) => sum + session.correctAnswers,
        0
      );
      const averageAccuracy = Math.round((totalCorrect / totalWords) * 100);
      const bestAccuracy = Math.max(...sessions.map((s) => s.accuracy));

      // Get unique starred words
      const allStarredWords = new Set<string>();
      sessions.forEach((session) => {
        session.starredWords.forEach((word) => allStarredWords.add(word));
      });

      // Calculate current streak (consecutive days with quizzes)
      const sortedSessions = [...sessions].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      let streak = 0;
      const today = new Date();

      for (let i = 0; i < sortedSessions.length; i++) {
        const sessionDate = new Date(sortedSessions[i].date);
        const daysDiff = Math.floor(
          (today.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysDiff === i) {
          streak++;
        } else {
          break;
        }
      }

      setStats({
        totalQuizzesTaken: totalQuizzes,
        totalWordsStudied: totalWords,
        averageAccuracy,
        totalStarredWords: allStarredWords.size,
        currentStreak: streak,
        bestAccuracy,
        recentSessions: sessions.slice(-5).reverse(), // Last 5 sessions
      });
    }
  }, []);

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 90) return "text-green-600";
    if (accuracy >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  const getAccuracyBadgeVariant = (accuracy: number) => {
    if (accuracy >= 90) return "default";
    if (accuracy >= 70) return "secondary";
    return "destructive";
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Quiz
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <BarChart3 className="h-8 w-8" />
              Learning Dashboard
            </h1>
            <p className="text-muted-foreground">
              Track your vocabulary learning progress
            </p>
          </div>
        </div>

        {stats.totalQuizzesTaken === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Quiz Data Yet</h3>
              <p className="text-muted-foreground text-center mb-4">
                Take your first quiz to start tracking your progress!
              </p>
              <Link href="/">
                <Button>Start Learning</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Quizzes
                  </CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stats.totalQuizzesTaken}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {stats.totalWordsStudied} words studied
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Average Accuracy
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div
                    className={`text-2xl font-bold ${getAccuracyColor(
                      stats.averageAccuracy
                    )}`}
                  >
                    {stats.averageAccuracy}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Best: {stats.bestAccuracy}%
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Words to Review
                  </CardTitle>
                  <Star className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">
                    {stats.totalStarredWords}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Starred for review
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Current Streak
                  </CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {stats.currentStreak}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {stats.currentStreak === 1 ? "day" : "days"} in a row
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Sessions */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Quiz Sessions</CardTitle>
                <CardDescription>Your last 5 quiz attempts</CardDescription>
              </CardHeader>
              <CardContent>
                {stats.recentSessions.length > 0 ? (
                  <div className="space-y-4">
                    {stats.recentSessions.map((session, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          <div>
                            <p className="font-medium">
                              {new Date(session.date).toLocaleDateString()}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {session.totalWords} words •{" "}
                              {session.correctAnswers} correct
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {session.starredWords.length > 0 && (
                            <Badge
                              variant="outline"
                              className="flex items-center gap-1"
                            >
                              <Star className="h-3 w-3" />
                              {session.starredWords.length}
                            </Badge>
                          )}
                          <Badge
                            variant={getAccuracyBadgeVariant(session.accuracy)}
                          >
                            {session.accuracy}%
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">
                    No recent sessions
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Progress Visualization */}
            <Card>
              <CardHeader>
                <CardTitle>Learning Progress</CardTitle>
                <CardDescription>Overall performance metrics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Average Accuracy</span>
                    <span className={getAccuracyColor(stats.averageAccuracy)}>
                      {stats.averageAccuracy}%
                    </span>
                  </div>
                  <Progress value={stats.averageAccuracy} className="h-2" />
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Words Mastered</span>
                    <span>
                      {stats.totalWordsStudied - stats.totalStarredWords} /{" "}
                      {stats.totalWordsStudied}
                    </span>
                  </div>
                  <Progress
                    value={
                      stats.totalWordsStudied > 0
                        ? ((stats.totalWordsStudied - stats.totalStarredWords) /
                            stats.totalWordsStudied) *
                          100
                        : 0
                    }
                    className="h-2"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
