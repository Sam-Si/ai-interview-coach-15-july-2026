"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { logToServer } from "@/lib/logger";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Timer,
  AlertCircle,
  Bot,
  User,
  Send,
  Loader2,
} from "lucide-react";

// Strip trailing slashes to prevent double-slash errors (e.g. on Render)
const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
).replace(/\/$/, "");

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function InterviewPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const topic = searchParams.get("topic") || "";
  const difficulty = searchParams.get("difficulty") || "";
  const firstMessageRaw = searchParams.get("firstMessage") || "";
  const conversationHistoryRaw = searchParams.get("conversationHistory") || "";

  const safeDecode = (value: string) => {
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  };

  const firstMessage = firstMessageRaw ? safeDecode(firstMessageRaw) : "";

  let initialHistory: ChatMessage[] = [];
  try {
    initialHistory = conversationHistoryRaw
      ? (JSON.parse(safeDecode(conversationHistoryRaw)) as ChatMessage[])
      : firstMessage
      ? [{ role: "assistant", content: firstMessage }]
      : [];
  } catch {
    initialHistory = firstMessage
      ? [{ role: "assistant", content: firstMessage }]
      : [];
  }

  const [messages, setMessages] = useState<ChatMessage[]>(
    firstMessage ? [{ role: "assistant", content: firstMessage }] : []
  );
  const [conversationHistory, setConversationHistory] =
    useState<ChatMessage[]>(initialHistory);
  const [currentInput, setCurrentInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Timer state
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    void logToServer("info", `InterviewPage loaded for topic: "${topic}"`, "InterviewView");

    const handleError = (event: ErrorEvent) => {
      void logToServer("error", event.message || "Uncaught runtime exception", "InterviewViewWindow", {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error ? String(event.error) : undefined,
        stack: event.error?.stack || undefined
      });
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      void logToServer("error", "Unhandled promise rejection: " + String(event.reason), "InterviewViewRejection", {
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
  }, [topic]);

  useEffect(() => {
    if (!topic || !difficulty || !firstMessage) {
      router.replace("/");
    }
  }, [topic, difficulty, firstMessage, router]);

  const submitAnswer = async () => {
    if (!currentInput.trim() || isLoading) return;

    const userAnswer = currentInput.trim();
    setMessages((prev) => [...prev, { role: "user", content: userAnswer }]);
    setCurrentInput("");
    setIsLoading(true);
    setError(null);
    void logToServer("info", `Candidate submitting answer of length: ${userAnswer.length}`, "InterviewView");



    try {
      const response = await fetch(`${API_URL}/api/interview/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          difficulty,
          user_answer: userAnswer,
          conversation_history: conversationHistory,
        }),
      });

      if (!response.ok) {
        throw new Error("Server communication issue: returned " + response.status);
      }

      const data = await response.json();
      const aiMessage: ChatMessage = {
        role: "assistant",
        content: data.ai_message,
      };

      setMessages((prev) => [...prev, aiMessage]);
      setConversationHistory(data.conversation_history);
      void logToServer("info", `Received follow-up response. Complete status: ${data.is_complete}`, "InterviewView");

      if (data.is_complete) {
        const conversationHistoryParam = encodeURIComponent(
          JSON.stringify(data.conversation_history)
        );
        router.push(
          `/report?topic=${encodeURIComponent(topic)}&difficulty=${encodeURIComponent(difficulty)}&conversationHistory=${conversationHistoryParam}`
        );
        return;
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      void logToServer("error", `Failed to process answer: ${errorMsg}`, "InterviewView", {
        error: String(err),
        stack: err instanceof Error ? err.stack : undefined
      });
      setError(
        err instanceof Error
          ? err.message
          : "Lost connection to the scoring model. Please retry submitting."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndEarly = () => {
    void logToServer("info", "Candidate requested early report compilation. Redirecting to /report", "InterviewView");
    const conversationHistoryParam = encodeURIComponent(
      JSON.stringify(conversationHistory)
    );
    router.push(
      `/report?topic=${encodeURIComponent(topic)}&difficulty=${encodeURIComponent(difficulty)}&conversationHistory=${conversationHistoryParam}`
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void submitAnswer();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void submitAnswer();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="relative min-h-screen flex flex-col bg-[#030014] text-slate-100 overflow-x-hidden">
      {/* Decorative Blur Spheres */}
      <div className="absolute top-[-10%] left-[-10%] w-[45vw] h-[45vw] rounded-full bg-violet-950/15 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[45vw] h-[45vw] rounded-full bg-fuchsia-950/10 blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="border-b border-slate-800 bg-[#030014]/80 backdrop-blur sticky top-0 z-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">Simulator Active</span>
          </div>
          <div className="flex items-center gap-2">
            <Timer className="w-4 h-4 text-violet-400 animate-pulse" />
            <span className="text-sm font-mono font-bold text-slate-200">{formatTime(elapsedTime)}</span>
          </div>
        </div>
      </header>

      {/* Main chat structure */}
      <div className="flex-1 max-w-5xl w-full mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 px-4 sm:px-6 py-8 z-10 items-start">
        
        {/* Left side controller info */}
        <div className="md:col-span-1 flex flex-col gap-4">
          <div className="glass-card glow-purple p-5 rounded-2xl flex flex-col gap-5">
            <div className="border-b border-slate-800/80 pb-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Topic</h3>
              <p className="text-sm font-bold text-white truncate mt-1">{topic || "Testing Stack"}</p>
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

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Sim Guidelines</h4>
              <ul className="text-[11px] text-slate-400 flex flex-col gap-2 list-disc pl-4 leading-relaxed">
                <li>Be detailed and explain your logic.</li>
                <li>You can type code blocks inside your text.</li>
                <li>No outside materials allowed.</li>
                <li>Click &quot;End &amp; Review&quot; to evaluate early.</li>
              </ul>
            </div>

            <div className="pt-2">
              <Button
                onClick={handleEndEarly}
                variant="outline"
                disabled={isLoading || messages.length < 2}
                className="w-full py-4 border-slate-800 bg-slate-900/30 text-xs font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-950/20 hover:border-rose-900/40 transition-all"
              >
                End & Get Report
              </Button>
            </div>
          </div>
        </div>

        {/* Right side chat view */}
        <div className="md:col-span-3 flex flex-col h-[70vh] glass-card glow-purple rounded-2xl overflow-hidden relative">
          
          {/* Scrollable messages container */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.map((message, index) => {
              const isAssistant = message.role === "assistant";
              return (
                <div
                  key={`${message.role}-${index}`}
                  className={`flex items-start gap-4 ${isAssistant ? "justify-start" : "justify-end"}`}
                >
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
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                  {!isAssistant && (
                    <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700/35 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-slate-300" />
                    </div>
                  )}
                </div>
              );
            })}

            {/* AI Typing Indicator */}
            {isLoading && (
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

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-950/20 border border-red-500/20 text-red-200 rounded-lg text-xs" role="alert">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Form input console */}
          <form
            onSubmit={handleSubmit}
            className="p-4 border-t border-slate-800 bg-slate-950/40 flex flex-col gap-3"
          >
            <Textarea
              value={currentInput}
              onChange={(e) => setCurrentInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your response or system code blocks here..."
              disabled={isLoading}
              className="min-h-[70px] max-h-[160px] bg-slate-900/40 border-slate-800 text-slate-200 placeholder-slate-500 focus:border-violet-500 focus:ring-violet-500/20"
            />
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="hidden sm:inline">Press Enter to Submit, Shift+Enter for newline</span>
              <span className="sm:hidden">Press Submit to Send</span>
              <Button
                type="submit"
                disabled={isLoading || !currentInput.trim()}
                className="bg-violet-600 hover:bg-violet-500 text-white font-semibold py-2 px-5 rounded-lg text-xs flex items-center gap-1.5"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <span>Submit Answer</span>
                    <Send className="w-3.5 h-3.5" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function InterviewPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#030014] text-slate-300">
          <div className="flex items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
            <span className="font-semibold text-sm">Configuring simulation session...</span>
          </div>
        </div>
      }
    >
      <InterviewPageContent />
    </Suspense>
  );
}
