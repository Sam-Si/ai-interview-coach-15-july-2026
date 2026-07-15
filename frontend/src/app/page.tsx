"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Brain,
  Timer,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
  RotateCcw,
  Sparkles,
  Code2,
  FileText,
  Loader2,
  User,
  Bot,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

const BACKEND_URL = "http://localhost:8000";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface InterviewReport {
  score: number;
  strengths: string;
  weaknesses: string;
  revision_areas: string;
  verdict: string;
  recommendation: "Pass" | "Fail";
}

const PRESET_TOPICS = [
  {
    id: "python_backend",
    title: "Python & Backend Systems",
    description: "FastAPI, Django, databases, concurrency, async, and API design.",
    icon: Code2,
    color: "from-blue-600 to-cyan-500",
  },
  {
    id: "react_frontend",
    title: "React & Frontend Engineering",
    description: "Modern React, Next.js, state management, web performance, and CSS.",
    icon: Brain,
    color: "from-cyan-500 to-teal-400",
  },
  {
    id: "system_design",
    title: "System Design & Architecture",
    description: "Scalability, microservices, load balancers, caching, and SQL/NoSQL.",
    icon: Sparkles,
    color: "from-violet-600 to-indigo-500",
  },
  {
    id: "algorithms",
    title: "Data Structures & Algorithms",
    description: "Trees, graphs, dynamic programming, sorting, and big-O complexity.",
    icon: FileText,
    color: "from-purple-600 to-pink-500",
  },
];

export default function Home() {
  // Page states
  const [appState, setAppState] = useState<"setup" | "interviewing" | "report">("setup");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Setup inputs
  const [selectedTopic, setSelectedTopic] = useState<string>("python_backend");
  const [customTopic, setCustomTopic] = useState<string>("");
  const [difficulty, setDifficulty] = useState<"Easy" | "Medium" | "Hard">("Medium");

  // Interview state
  const [conversationHistory, setConversationHistory] = useState<Message[]>([]);
  const [userAnswer, setUserAnswer] = useState<string>("");

  // Timer state
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Report state
  const [report, setReport] = useState<InterviewReport | null>(null);
  const [showTranscript, setShowTranscript] = useState(false);

  // Auto-scroll chat to bottom
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [conversationHistory, loading]);

  // Timer handler
  useEffect(() => {
    if (appState === "interviewing") {
      timerRef.current = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [appState]);

  // Get display topic name
  const getTopicDisplayName = () => {
    if (selectedTopic === "custom") {
      return customTopic || "Custom Topic";
    }
    const preset = PRESET_TOPICS.find((t) => t.id === selectedTopic);
    return preset ? preset.title : "Technical Topic";
  };

  // Start interview
  const handleStartInterview = async () => {
    const topicText = selectedTopic === "custom" ? customTopic.trim() : PRESET_TOPICS.find((t) => t.id === selectedTopic)?.title;
    if (!topicText) {
      setError("Please specify an interview topic.");
      return;
    }

    setLoading(true);
    setError(null);
    setElapsedTime(0);
    setConversationHistory([]);
    setUserAnswer("");

    try {
      const response = await fetch(`${BACKEND_URL}/api/interview/next`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topicText,
          difficulty: difficulty,
          conversation_history: [],
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to initialize interview session.");
      }

      const data = await response.json();
      setConversationHistory([{ role: "assistant", content: data.response }]);
      setAppState("interviewing");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred starting the interview.");
    } finally {
      setLoading(false);
    }
  };

  // Submit response
  const handleSubmitAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userAnswer.trim() || loading) return;

    const currentAnswer = userAnswer.trim();
    setUserAnswer("");
    setLoading(true);
    setError(null);

    // 1. Add user answer to history locally
    const updatedHistory: Message[] = [
      ...conversationHistory,
      { role: "user", content: currentAnswer },
    ];
    setConversationHistory(updatedHistory);

    try {
      const topicText = selectedTopic === "custom" ? customTopic.trim() : PRESET_TOPICS.find((t) => t.id === selectedTopic)?.title;
      const response = await fetch(`${BACKEND_URL}/api/interview/next`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topicText,
          difficulty: difficulty,
          conversation_history: updatedHistory,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to process answer.");
      }

      const data = await response.json();

      if (data.is_complete) {
        // Automatically fetch report if final message is reached
        await handleGenerateReport([...updatedHistory, { role: "assistant", content: data.response }]);
      } else {
        setConversationHistory([
          ...updatedHistory,
          { role: "assistant", content: data.response },
        ]);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred while submitting your answer.");
    } finally {
      setLoading(false);
    }
  };

  // Generate Report
  const handleGenerateReport = async (finalHistory = conversationHistory) => {
    setLoading(true);
    setError(null);
    const topicText = selectedTopic === "custom" ? customTopic.trim() : PRESET_TOPICS.find((t) => t.id === selectedTopic)?.title;

    try {
      const response = await fetch(`${BACKEND_URL}/api/report/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topicText,
          difficulty: difficulty,
          conversation_history: finalHistory,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate interview report.");
      }

      const reportData = await response.json();
      setReport(reportData);
      setAppState("report");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred while generating the evaluation report.");
    } finally {
      setLoading(false);
    }
  };

  // Reset/Restart
  const handleRestart = () => {
    setAppState("setup");
    setReport(null);
    setConversationHistory([]);
    setElapsedTime(0);
    setError(null);
  };

  // Helper formatting for timer
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-start overflow-x-hidden py-12 px-4 md:px-8">
      {/* Decorative Blur Spheres */}
      <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-violet-950/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[45vw] h-[45vw] rounded-full bg-fuchsia-950/15 blur-[120px] pointer-events-none" />

      {/* Main Header */}
      <header className="mb-12 text-center z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-violet-500/20 bg-violet-950/30 text-violet-300 text-xs font-medium mb-4 animate-pulse-slow">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Advanced AI Interview Simulator</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400 mb-3 text-glow">
          AI Interview Coach
        </h1>
        <p className="text-slate-400 max-w-xl mx-auto text-sm md:text-base leading-relaxed">
          Simulate a real-time technical interview, receive direct code coaching, and get a structured diagnostic performance report.
        </p>
      </header>

      {/* Error alert banner */}
      {error && (
        <div className="w-full max-w-4xl mb-6 z-10 flex items-start gap-3 p-4 rounded-xl border border-red-500/20 bg-red-950/20 text-red-200 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
          <div className="flex-1">
            <span className="font-semibold">Execution Error:</span> {error}
          </div>
          <button onClick={() => setError(null)} className="hover:text-red-100 text-red-400 font-medium">
            Dismiss
          </button>
        </div>
      )}

      {/* VIEW 1: SETUP SCREEN */}
      {appState === "setup" && (
        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-8 z-10">
          {/* Main selection card */}
          <div className="md:col-span-2 flex flex-col gap-6">
            <div className="glass-card glow-purple p-6 rounded-2xl flex flex-col gap-6">
              <div>
                <h2 className="text-xl font-bold text-white mb-1">Select Interview Topic</h2>
                <p className="text-xs text-slate-400">Choose one of our focused domains or design a custom conversation track.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {PRESET_TOPICS.map((topic) => {
                  const IconComponent = topic.icon;
                  return (
                    <button
                      key={topic.id}
                      onClick={() => setSelectedTopic(topic.id)}
                      className={`text-left p-4 rounded-xl border transition-all duration-300 flex flex-col gap-2 relative overflow-hidden group ${
                        selectedTopic === topic.id
                          ? "border-violet-500 bg-violet-950/20 shadow-[0_0_20px_-3px_rgba(139,92,246,0.3)]"
                          : "border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/60"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg bg-gradient-to-br ${topic.color} text-white`}>
                          <IconComponent className="w-4 h-4" />
                        </div>
                        <span className="font-semibold text-sm text-slate-200 group-hover:text-white transition-colors">
                          {topic.title}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 leading-normal mt-1">{topic.description}</p>
                    </button>
                  );
                })}
              </div>

              {/* Custom Topic option */}
              <div
                className={`p-4 rounded-xl border transition-all duration-300 flex flex-col gap-3 ${
                  selectedTopic === "custom"
                    ? "border-violet-500 bg-violet-950/20 shadow-[0_0_20px_-3px_rgba(139,92,246,0.3)]"
                    : "border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/60"
                }`}
              >
                <button
                  onClick={() => setSelectedTopic("custom")}
                  className="flex items-center gap-3 text-left w-full"
                >
                  <div className="p-2 rounded-lg bg-gradient-to-br from-slate-700 to-slate-600 text-white">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <span className="font-semibold text-sm text-slate-200">Custom Interview Topic</span>
                    <p className="text-xs text-slate-400">Define your own topic, stack, or custom system architectural theme.</p>
                  </div>
                </button>
                {selectedTopic === "custom" && (
                  <div className="pt-2 animate-fade-in">
                    <Input
                      type="text"
                      placeholder="e.g. Next.js App Router & Tailwind CSS, Kubernetes Deployments..."
                      value={customTopic}
                      onChange={(e) => setCustomTopic(e.target.value)}
                      className="bg-slate-950/60 border-slate-800 text-slate-200 placeholder-slate-500 focus:border-violet-500 focus:ring-violet-500/20"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Difficulty and Start card */}
          <div className="flex flex-col gap-6">
            <div className="glass-card glow-purple p-6 rounded-2xl flex flex-col gap-6 h-full justify-between">
              <div className="flex flex-col gap-6">
                <div>
                  <h2 className="text-xl font-bold text-white mb-1">Select Difficulty</h2>
                  <p className="text-xs text-slate-400 font-normal">Controls complexity and interviewer strictness.</p>
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

              <div className="pt-6">
                <Button
                  onClick={handleStartInterview}
                  disabled={loading}
                  className="w-full py-6 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold transition-all duration-300 shadow-[0_4px_20px_rgba(139,92,246,0.3)] hover:shadow-[0_4px_25px_rgba(139,92,246,0.45)] hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Configuring Simulator...</span>
                    </>
                  ) : (
                    <>
                      <span>Start Interview</span>
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: ACTIVE INTERVIEW */}
      {appState === "interviewing" && (
        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-4 gap-8 z-10">
          {/* Sidebar Status Info */}
          <div className="md:col-span-1 flex flex-col gap-4">
            <div className="glass-card glow-purple p-5 rounded-2xl flex flex-col gap-5">
              <div className="border-b border-slate-800/80 pb-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Topic</h3>
                <p className="text-sm font-bold text-white truncate mt-1">{getTopicDisplayName()}</p>
                <div className="mt-2">
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      difficulty === "Easy"
                        ? "border-emerald-500/20 text-emerald-400 bg-emerald-950/10"
                        : difficulty === "Medium"
                        ? "border-amber-500/20 text-amber-400 bg-amber-950/10"
                        : "border-rose-500/20 text-rose-400 bg-rose-950/10"
                    }`}
                  >
                    {difficulty}
                  </Badge>
                </div>
              </div>

              <div className="border-b border-slate-800/80 pb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Timer className="w-4 h-4 text-violet-400 animate-pulse" />
                  <span className="text-xs text-slate-400">Duration</span>
                </div>
                <span className="text-sm font-mono font-bold text-slate-200">{formatTime(elapsedTime)}</span>
              </div>

              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Sim Guidelines</h4>
                <ul className="text-xs text-slate-400 flex flex-col gap-2 list-disc pl-4">
                  <li>Be detailed and explain your logic.</li>
                  <li>You can type code snippets inside your answer.</li>
                  <li>No external documentation allowed.</li>
                  <li>Click &quot;End &amp; Review&quot; to compile your report early.</li>
                </ul>
              </div>

              <div className="pt-2">
                <Button
                  onClick={() => handleGenerateReport()}
                  variant="outline"
                  disabled={loading || conversationHistory.length < 2}
                  className="w-full py-4 border-slate-800 bg-slate-900/30 text-xs font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-950/20 hover:border-rose-900/40 transition-all"
                >
                  End & Get Report
                </Button>
              </div>
            </div>
          </div>

          {/* Active Chat Pane */}
          <div className="md:col-span-3 flex flex-col h-[70vh] glass-card glow-purple rounded-2xl overflow-hidden relative">
            {/* Header */}
            <div className="p-4 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-semibold text-slate-300">Simulator Active</span>
              </div>
              <span className="text-xs text-slate-500 font-medium">
                {Math.ceil(conversationHistory.length / 2)} questions asked
              </span>
            </div>

            {/* Message Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {conversationHistory.map((msg, index) => {
                const isAssistant = msg.role === "assistant";
                return (
                  <div key={index} className={`flex items-start gap-4 ${isAssistant ? "justify-start" : "justify-end"}`}>
                    {isAssistant && (
                      <div className="w-8 h-8 rounded-full bg-violet-950 border border-violet-500/20 flex items-center justify-center shrink-0">
                        <Bot className="w-4 h-4 text-violet-400" />
                      </div>
                    )}
                    <div
                      className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed ${
                        isAssistant
                          ? "bg-violet-950/10 border border-violet-500/10 text-slate-100 rounded-tl-none"
                          : "bg-slate-800/40 border border-slate-700/20 text-slate-200 rounded-tr-none"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                    {!isAssistant && (
                      <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700/30 flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-slate-300" />
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Typing indicator */}
              {loading && (
                <div className="flex items-start gap-4 justify-start">
                  <div className="w-8 h-8 rounded-full bg-violet-950 border border-violet-500/20 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-violet-400" />
                  </div>
                  <div className="bg-violet-950/10 border border-violet-500/10 rounded-2xl rounded-tl-none p-4 flex items-center justify-start gap-1.5 w-16">
                    <div className="w-1.5 h-1.5 rounded-full bg-violet-400 typing-dot" />
                    <div className="w-1.5 h-1.5 rounded-full bg-violet-400 typing-dot" />
                    <div className="w-1.5 h-1.5 rounded-full bg-violet-400 typing-dot" />
                  </div>
                </div>
              )}

              <div ref={chatBottomRef} />
            </div>

            {/* Input Form */}
            <form onSubmit={handleSubmitAnswer} className="p-4 border-t border-slate-800 bg-slate-950/40 flex flex-col gap-3">
              <Textarea
                placeholder="Type your explanation or response code here..."
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmitAnswer(e);
                  }
                }}
                disabled={loading}
                className="min-h-[70px] max-h-[160px] bg-slate-900/40 border-slate-800 text-slate-200 placeholder-slate-500 focus:border-violet-500 focus:ring-violet-500/20"
              />
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Press Enter to Submit, Shift+Enter for newline</span>
                <Button
                  type="submit"
                  disabled={loading || !userAnswer.trim()}
                  className="bg-violet-600 hover:bg-violet-500 text-white font-semibold py-2 px-5 rounded-lg text-xs"
                >
                  Submit Answer
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW 3: REPORT SCREEN */}
      {appState === "report" && report && (
        <div className="w-full max-w-4xl flex flex-col gap-8 z-10 animate-fade-in">
          {/* Main overview banner */}
          <div className="glass-card glow-purple p-8 rounded-2xl grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
            {/* Score Radial Visual */}
            <div className="flex flex-col items-center justify-center">
              <div className="relative w-40 h-40">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    className="stroke-slate-800"
                    strokeWidth="8"
                    fill="transparent"
                  />
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    className={`animate-draw-radial ${
                      report.score >= 85
                        ? "stroke-emerald-500"
                        : report.score >= 70
                        ? "stroke-teal-500"
                        : report.score >= 55
                        ? "stroke-amber-500"
                        : "stroke-rose-500"
                    }`}
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray="440"
                    strokeDashoffset={440 - (440 * report.score) / 100}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-4xl font-extrabold text-white">{report.score}</span>
                  <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Score</span>
                </div>
              </div>
            </div>

            {/* Verdict and recommendation */}
            <div className="md:col-span-2 flex flex-col gap-4 text-center md:text-left">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                <h2 className="text-2xl font-extrabold text-white">Evaluation Verdict</h2>
                <Badge
                  className={`text-sm py-1 px-4 font-bold ${
                    report.recommendation === "Pass"
                      ? "bg-emerald-950/40 text-emerald-400 border border-emerald-500/20 glow-emerald"
                      : "bg-rose-950/40 text-rose-400 border border-rose-500/20 glow-rose"
                  }`}
                >
                  {report.recommendation.toUpperCase()}
                </Badge>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed italic">
                &ldquo;{report.verdict}&rdquo;
              </p>
              <div className="flex flex-wrap gap-2 justify-center md:justify-start mt-1">
                <div className="inline-flex items-center gap-1.5 text-xs text-slate-400 bg-slate-900/60 py-1 px-3 rounded-lg border border-slate-800/80">
                  <span className="font-semibold">Topic:</span> {getTopicDisplayName()}
                </div>
                <div className="inline-flex items-center gap-1.5 text-xs text-slate-400 bg-slate-900/60 py-1 px-3 rounded-lg border border-slate-800/80">
                  <span className="font-semibold">Level:</span> {difficulty}
                </div>
                <div className="inline-flex items-center gap-1.5 text-xs text-slate-400 bg-slate-900/60 py-1 px-3 rounded-lg border border-slate-800/80">
                  <span className="font-semibold">Duration:</span> {formatTime(elapsedTime)}
                </div>
              </div>
            </div>
          </div>

          {/* Details split panels */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Strengths */}
            <div className="glass-card glow-purple p-6 rounded-2xl flex flex-col gap-4">
              <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-slate-200">Key Strengths</h3>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                {report.strengths}
              </p>
            </div>

            {/* Weaknesses */}
            <div className="glass-card glow-purple p-6 rounded-2xl flex flex-col gap-4">
              <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3">
                <XCircle className="w-5 h-5 text-rose-400" />
                <h3 className="font-bold text-slate-200">Identified Gaps</h3>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                {report.weaknesses}
              </p>
            </div>
          </div>

          {/* Revision Areas */}
          <div className="glass-card glow-purple p-6 rounded-2xl flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3">
              <AlertCircle className="w-5 h-5 text-amber-400" />
              <h3 className="font-bold text-slate-200">Recommended Topics to Study</h3>
            </div>
            <div className="flex flex-wrap gap-2.5">
              {report.revision_areas.split(",").map((area, idx) => (
                <div
                  key={idx}
                  className="py-2 px-4 rounded-xl border border-amber-500/10 bg-amber-950/10 text-amber-400 text-sm font-semibold tracking-wide"
                >
                  {area.trim()}
                </div>
              ))}
            </div>
          </div>

          {/* Transcripts toggle section */}
          <div className="glass-card glow-purple rounded-2xl overflow-hidden">
            <button
              onClick={() => setShowTranscript(!showTranscript)}
              className="w-full p-6 flex justify-between items-center text-left hover:bg-slate-900/10 transition-colors"
            >
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-violet-400" />
                <h3 className="font-bold text-slate-200">View Full Session Transcript</h3>
              </div>
              {showTranscript ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
            </button>

            {showTranscript && (
              <div className="px-6 pb-6 pt-2 border-t border-slate-800/80 space-y-6 max-h-[400px] overflow-y-auto bg-slate-950/20">
                {conversationHistory.map((msg, index) => {
                  const isAssistant = msg.role === "assistant";
                  return (
                    <div key={index} className="flex flex-col gap-1.5">
                      <span className={`text-xs font-bold uppercase tracking-wider ${isAssistant ? "text-violet-400" : "text-slate-400"}`}>
                        {isAssistant ? "Interviewer (AI)" : "Candidate (You)"}
                      </span>
                      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/60 text-sm text-slate-300 whitespace-pre-wrap">
                        {msg.content}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Action Row */}
          <div className="flex justify-center pt-4">
            <Button
              onClick={handleRestart}
              className="py-6 px-10 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold transition-all duration-300 shadow-[0_4px_20px_rgba(139,92,246,0.3)] hover:shadow-[0_4px_25px_rgba(139,92,246,0.45)] flex items-center gap-2"
            >
              <RotateCcw className="w-5 h-5" />
              <span>Simulate Another Session</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
