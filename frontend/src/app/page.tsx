"use client";

import { useState, useEffect } from "react";
import { logToServer } from "@/lib/logger";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Brain,
  Sparkles,
  Code2,
  FileText,
  Loader2,
  ArrowRight,
} from "lucide-react";

// Strip trailing slashes to prevent double-slash errors (e.g. on Render)
const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
).replace(/\/$/, "");

const PRESET_TOPICS = [
  {
    id: "python_backend",
    title: "Python & Backend Systems",
    queryText: "Python & Backend Systems (FastAPI, Django, concurrency, databases)",
    description: "FastAPI, Django, databases, concurrency, async, and API design.",
    icon: Code2,
    color: "from-blue-600 to-cyan-500",
  },
  {
    id: "react_frontend",
    title: "React & Frontend Engineering",
    queryText: "React & Frontend Engineering (Modern React, Next.js, state, performance)",
    description: "Modern React, Next.js, state management, web performance, and CSS.",
    icon: Brain,
    color: "from-cyan-500 to-teal-400",
  },
  {
    id: "system_design",
    title: "System Design & Architecture",
    queryText: "System Design & Architecture (Scalability, load balancing, caching)",
    description: "Scalability, microservices, load balancers, caching, and SQL/NoSQL.",
    icon: Sparkles,
    color: "from-violet-600 to-indigo-500",
  },
  {
    id: "algorithms",
    title: "Data Structures & Algorithms",
    queryText: "Data Structures & Algorithms (Trees, graphs, dynamic programming, complexity)",
    description: "Trees, graphs, dynamic programming, sorting, and big-O complexity.",
    icon: FileText,
    color: "from-purple-600 to-pink-500",
  },
];

export default function HomePage() {
  const router = useRouter();
  useEffect(() => {
    void logToServer("info", "HomePage loaded", "SetupView");

    const handleError = (event: ErrorEvent) => {
      void logToServer("error", event.message || "Uncaught runtime exception", "SetupViewWindow", {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error ? String(event.error) : undefined,
        stack: event.error?.stack || undefined
      });
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      void logToServer("error", "Unhandled promise rejection: " + String(event.reason), "SetupViewRejection", {
        reason: String(event.reason),
        stack: event.reason?.stack || undefined
      });
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState<"Easy" | "Medium" | "Hard">("Medium");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const selectPreset = (presetId: string, queryText: string) => {
    setActivePreset(presetId);
    setTopic(queryText);
  };

  const handleCustomTopicChange = (val: string) => {
    setActivePreset(null);
    setTopic(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    void logToServer("info", `Initiating interview. Topic: "${topic.trim()}", Difficulty: "${difficulty}"`, "SetupView");

    if (!topic.trim()) {
      setError("Please fill in or select an interview topic.");
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
        throw new Error("Failed to start interview. Server returned " + response.status);
      }

      const data = await response.json();
      const firstMessage = encodeURIComponent(data.first_message);
      const conversationHistory = encodeURIComponent(
        JSON.stringify(data.conversation_history)
      );
      void logToServer("info", `Interview initiated successfully. Redirecting to /interview`, "SetupView");
      router.push(
        `/interview?topic=${encodeURIComponent(topic.trim())}&difficulty=${encodeURIComponent(difficulty)}&firstMessage=${firstMessage}&conversationHistory=${conversationHistory}`
      );
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      void logToServer("error", `Failed to start interview: ${errorMsg}`, "SetupView", {
        error: String(err),
        stack: err instanceof Error ? err.stack : undefined
      });
      setError(
        err instanceof Error
          ? err.message
          : "Could not connect to the interview server. Please verify your connection."
      );
      setIsLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center py-16 px-4 md:px-8 overflow-hidden bg-[#030014] text-slate-100">
      {/* Decorative Blur Spheres */}
      <div className="absolute top-[-20%] left-[-10%] w-[55vw] h-[55vw] rounded-full bg-violet-950/20 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-fuchsia-950/15 blur-[130px] pointer-events-none" />

      <div className="w-full max-w-4xl z-10 space-y-12">
        {/* Main Header */}
        <header className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-violet-500/20 bg-violet-950/30 text-violet-300 text-xs font-semibold animate-pulse-slow">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Advanced AI Interview Coach</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400 text-glow">
            AI Technical Interview Coach
          </h1>
          <p className="text-slate-400 max-w-xl mx-auto text-sm sm:text-base leading-relaxed">
            Practice real-time technical interviews under pressure. Choose a preset focus domain or specify a custom stack to begin.
          </p>
        </header>

        {/* Input Block Panels */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Preset Topics Block */}
          <div className="md:col-span-2 flex flex-col gap-6">
            <div className="glass-card glow-purple p-6 rounded-2xl flex flex-col gap-5">
              <div>
                <h2 className="text-lg font-bold text-white mb-1">Choose Domain Focus</h2>
                <p className="text-xs text-slate-400">Select one of our tailored tracks or input a custom query below.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {PRESET_TOPICS.map((preset) => {
                  const IconComponent = preset.icon;
                  const isSelected = activePreset === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => selectPreset(preset.id, preset.queryText)}
                      className={`text-left p-4 rounded-xl border transition-all duration-300 flex flex-col gap-2 relative overflow-hidden group ${
                        isSelected
                          ? "border-violet-500 bg-violet-950/20 shadow-[0_0_20px_-3px_rgba(139,92,246,0.3)]"
                          : "border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/60"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg bg-gradient-to-br ${preset.color} text-white`}>
                          <IconComponent className="w-4 h-4" />
                        </div>
                        <span className="font-semibold text-sm text-slate-200 group-hover:text-white transition-colors">
                          {preset.title}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">{preset.description}</p>
                    </button>
                  );
                })}
              </div>

              {/* Custom Topic Input */}
              <div className="space-y-2 pt-2 border-t border-slate-800/80">
                <Label htmlFor="topic" className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Custom stack / topic
                </Label>
                <Input
                  id="topic"
                  value={topic}
                  onChange={(e) => handleCustomTopicChange(e.target.value)}
                  placeholder="e.g. Kubernetes, React Native state patterns, System Scaling..."
                  disabled={isLoading}
                  className="h-11 bg-slate-950/60 border-slate-800 text-slate-200 placeholder-slate-500 focus:border-violet-500 focus:ring-violet-500/20"
                />
              </div>
            </div>
          </div>

          {/* Difficulty and Start Button Panel */}
          <div className="flex flex-col gap-6">
            <div className="glass-card glow-purple p-6 rounded-2xl flex flex-col gap-6 h-full justify-between">
              <div className="flex flex-col gap-5">
                <div>
                  <h2 className="text-lg font-bold text-white mb-1">Sim Settings</h2>
                  <p className="text-xs text-slate-400">Set difficulty parameters for the AI interviewer.</p>
                </div>

                <div className="flex flex-col gap-3">
                  {(["Easy", "Medium", "Hard"] as const).map((level) => {
                    const levelColors = {
                      Easy: {
                        active: "border-emerald-500/50 bg-emerald-950/20 text-emerald-300",
                        inactive: "hover:border-emerald-900/40 hover:bg-emerald-950/5 text-slate-400 hover:text-emerald-300/80",
                      },
                      Medium: {
                        active: "border-amber-500/50 bg-amber-950/20 text-amber-300",
                        inactive: "hover:border-amber-900/40 hover:bg-amber-950/5 text-slate-400 hover:text-amber-300/80",
                      },
                      Hard: {
                        active: "border-rose-500/50 bg-rose-950/20 text-rose-300",
                        inactive: "hover:border-rose-900/40 hover:bg-rose-950/5 text-slate-400 hover:text-rose-300/80",
                      },
                    };

                    const isSelected = difficulty === level;

                    return (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setDifficulty(level)}
                        className={`py-3 px-4 rounded-xl border text-sm font-semibold text-left transition-all duration-300 ${
                          isSelected ? levelColors[level].active : "border-slate-800 bg-slate-900/40 " + levelColors[level].inactive
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span>{level} Level</span>
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-current shadow-[0_0_8px_currentColor]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-800/80">
                {error && (
                  <p className="text-xs text-red-400 leading-normal" role="alert">
                    {error}
                  </p>
                )}

                <Button
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="w-full py-6 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold transition-all duration-300 shadow-[0_4px_20px_rgba(139,92,246,0.3)] hover:shadow-[0_4px_25px_rgba(139,92,246,0.45)] hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Configuring Coach...</span>
                    </>
                  ) : (
                    <>
                      <span>Begin Interview</span>
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-slate-500">
          Powered by AI. Built for frontend and backend diagnostics.
        </p>
      </div>
    </main>
  );
}
