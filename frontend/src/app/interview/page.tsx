"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

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
        throw new Error("Failed to submit answer");
      }

      const data = await response.json();
      const aiMessage: ChatMessage = {
        role: "assistant",
        content: data.ai_message,
      };

      setMessages((prev) => [...prev, aiMessage]);
      setConversationHistory(data.conversation_history);

      if (data.is_complete) {
        const conversationHistoryParam = encodeURIComponent(
          JSON.stringify(data.conversation_history)
        );
        router.push(
          `/report?topic=${encodeURIComponent(topic)}&difficulty=${encodeURIComponent(difficulty)}&conversationHistory=${conversationHistoryParam}`
        );
        return;
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
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

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur sticky top-0 z-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant="secondary"
              className="bg-slate-800 text-slate-100 border-slate-700 h-auto py-1 px-2.5"
            >
              {topic || "Topic"}
            </Badge>
            <Badge
              variant="outline"
              className="border-slate-600 text-slate-200 h-auto py-1 px-2.5"
            >
              {difficulty || "Difficulty"}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            Interview in progress
          </p>
        </div>
      </header>

      {/* Chat area */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 py-6 space-y-4 animate-fade-in min-h-[50vh]">
          {messages.map((message, index) => {
            const isAssistant = message.role === "assistant";
            return (
              <div
                key={`${message.role}-${index}`}
                className={`flex flex-col ${
                  isAssistant ? "items-start" : "items-end"
                }`}
              >
                <span className="text-xs text-slate-400 mb-1 px-1">
                  {isAssistant ? "Interviewer" : "You"}
                </span>
                <div
                  className={`max-w-[90%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                    isAssistant
                      ? "bg-slate-800 text-white rounded-tl-sm"
                      : "bg-blue-600 text-white rounded-tr-sm"
                  }`}
                >
                  {message.content}
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex flex-col items-start">
              <span className="text-xs text-slate-400 mb-1 px-1">
                Interviewer
              </span>
              <div className="bg-slate-800 text-slate-300 rounded-2xl rounded-tl-sm px-4 py-3 text-sm">
                Thinking...
              </div>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-400 text-center" role="alert">
              {error}
            </p>
          )}

          <div ref={chatEndRef} />
        </div>
      </main>

      {/* Input area */}
      <footer className="border-t border-slate-800 bg-slate-950 sticky bottom-0">
        <form
          onSubmit={handleSubmit}
          className="mx-auto max-w-4xl px-4 sm:px-6 py-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-end"
        >
          <Textarea
            value={currentInput}
            onChange={(e) => setCurrentInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your answer here..."
            disabled={isLoading}
            className="min-h-[80px] sm:min-h-[96px] flex-1 bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 resize-y"
          />
          <Button
            type="submit"
            disabled={isLoading || !currentInput.trim()}
            className="sm:w-40 h-11 bg-blue-600 hover:bg-blue-500 text-white shrink-0"
          >
            {isLoading ? "AI is thinking..." : "Submit Answer"}
          </Button>
        </form>
        <p className="text-center text-[11px] text-slate-500 pb-3">
          Enter to send · Shift+Enter for a new line
        </p>
      </footer>
    </div>
  );
}

export default function InterviewPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-300">
          Loading interview...
        </div>
      }
    >
      <InterviewPageContent />
    </Suspense>
  );
}
