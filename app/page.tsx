import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  BookOpen,
  Plus,
  Shuffle,
  Star,
  LogOut,
  TrendingUp,
  Target,
  Zap,
  Check,
} from "lucide-react";
import Link from "next/link";
import QuizConfigDialog from "@/components/quiz-config-dialog";

async function getUserProgress(userId: string) {
  const supabase = await createClient();

  // Get user progress
  const { data: progress } = await supabase
    .from("user_progress")
    .select("*")
    .eq("user_id", userId)
    .single();

  // Get recent quiz sessions
  const { data: recentSessions } = await supabase
    .from("quiz_sessions")
    .select("*")
    .eq("user_id", userId)
    .order("completed_at", { ascending: false })
    .limit(5);

  // Get starred words count
  const { data: starredWords } = await supabase
    .from("starred_words")
    .select("*")
    .eq("user_id", userId);

  // Get learned words count
  const { data: learnedWords } = await supabase
    .from("learned_words")
    .select("*")
    .eq("user_id", userId);

  return {
    progress: progress || {
      total_quizzes: 0,
      total_correct: 0,
      current_streak: 0,
      longest_streak: 0,
    },
    recentSessions: recentSessions || [],
    starredWordsCount: starredWords?.length || 0,
    learnedWordsCount: learnedWords?.length || 0,
  };
}

async function signOut() {
  "use server";
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/auth/login");
}

export default async function Dashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { progress, recentSessions, starredWordsCount, learnedWordsCount } =
    await getUserProgress(user.id);

  // Calculate average accuracy
  const averageAccuracy =
    progress.total_quizzes > 0
      ? Math.round(
          (progress.total_correct / (progress.total_quizzes * 10)) * 100
        ) // Assuming 10 questions per quiz on average
      : 0;

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Vocabulary Dashboard
            </h1>
            <p className="text-muted-foreground">Welcome back, {user.email}</p>
          </div>
          <form action={signOut}>
            <Button variant="outline">
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </form>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Total Quizzes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {progress.total_quizzes}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Target className="h-4 w-4" />
                Average Accuracy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {averageAccuracy}%
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Current Streak
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {progress.current_streak}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Star className="h-4 w-4" />
                Words to Review
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {starredWordsCount}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Start Learning
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Choose your learning mode and begin practicing vocabulary
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <QuizConfigDialog />

              <Link href="/quiz/custom">
                <Button variant="outline" className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Custom Words
                </Button>
              </Link>

              {starredWordsCount > 0 && (
                <Link href="/quiz?mode=review">
                  <Button variant="outline" className="w-full">
                    <Star className="h-4 w-4 mr-2" />
                    Review Starred Words ({starredWordsCount})
                  </Button>
                </Link>
              )}
              {learnedWordsCount > 0 && (
                <Link href="/quiz?mode=learned">
                  <Button variant="outline" className="w-full">
                    <Check className="h-4 w-4 mr-2" />
                    Practice Learned Words ({learnedWordsCount})
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Recent Activity
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Your latest quiz sessions and progress
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentSessions.length > 0 ? (
                <div className="space-y-3">
                  {recentSessions.map((session, index) => (
                    <div
                      key={session.id}
                      className="flex justify-between items-center p-3 bg-muted rounded-lg"
                    >
                      <div>
                        <div className="font-medium text-foreground">
                          {session.quiz_size} words
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(session.completed_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-lg text-foreground">
                          {session.accuracy}%
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {session.correct_answers}/{session.total_questions}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No quiz sessions yet</p>
                  <p className="text-sm">
                    Start your first quiz to see your progress here
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {progress.total_quizzes > 0 && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Learning Progress</CardTitle>
              <CardDescription className="text-muted-foreground">
                Your vocabulary learning journey over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-foreground">Overall Progress</span>
                    <span className="text-foreground">{averageAccuracy}%</span>
                  </div>
                  <Progress value={averageAccuracy} className="h-2" />
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">
                      Longest Streak:
                    </span>
                    <span className="ml-2 font-medium text-foreground">
                      {progress.longest_streak} days
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">
                      Total Correct:
                    </span>
                    <span className="ml-2 font-medium text-foreground">
                      {progress.total_correct} answers
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
