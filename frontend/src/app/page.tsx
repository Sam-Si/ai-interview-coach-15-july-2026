"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function HomePage() {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!topic.trim() || !difficulty) {
      setError("Please fill in both the interview topic and difficulty level.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/interview/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic.trim(),
          difficulty,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to start interview");
      }

      const data = await response.json();
      const firstMessage = encodeURIComponent(data.first_message);
      const conversationHistory = encodeURIComponent(
        JSON.stringify(data.conversation_history)
      );
      router.push(
        `/interview?topic=${encodeURIComponent(topic.trim())}&difficulty=${encodeURIComponent(difficulty)}&firstMessage=${firstMessage}&conversationHistory=${conversationHistory}`
      );
    } catch {
      setError("Something went wrong. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-10 sm:px-6">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8 space-y-3">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            AI Interview Coach
          </h1>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            Practice technical interviews with an AI-powered interviewer.
            Get real feedback. Improve fast.
          </p>
        </div>

        <Card className="bg-slate-900 border-slate-800 text-slate-100 shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl text-white">Start a session</CardTitle>
            <CardDescription className="text-slate-400">
              Choose a topic and difficulty to begin your mock interview.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="topic" className="text-slate-200">
                  Interview Topic
                </Label>
                <Input
                  id="topic"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Binary Trees, Sorting Algorithms, Dynamic Programming"
                  disabled={isLoading}
                  className="h-10 bg-slate-950 border-slate-700 text-white placeholder:text-slate-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="difficulty" className="text-slate-200">
                  Difficulty Level
                </Label>
                <Select
                  value={difficulty}
                  onValueChange={setDifficulty}
                  disabled={isLoading}
                >
                  <SelectTrigger
                    id="difficulty"
                    className="h-10 w-full bg-slate-950 border-slate-700 text-white"
                  >
                    <SelectValue placeholder="Select difficulty" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700 text-slate-100">
                    <SelectItem value="Easy">Easy</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {error && (
                <p className="text-sm text-red-400" role="alert">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-10 bg-blue-600 hover:bg-blue-500 text-white"
              >
                {isLoading ? "Starting Interview..." : "Start Interview"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-slate-500 mt-6">
          Powered by AI. Built for learners.
        </p>
      </div>
    </main>
  );
}
