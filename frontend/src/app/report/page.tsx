"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { logToServer } from "@/lib/logger";
import { CheckCircle2, XCircle, AlertCircle, FileText, ChevronDown, ChevronUp, RotateCcw, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

// Strip trailing slashes to prevent double-slash errors (e.g. on Render)
const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
).replace(/\/$/, "");

interface InterviewReport {
  score: number;
  strengths: string;
  weaknesses: string;
  revision_areas: string;
  verdict: string;
  recommendation: string;
}

interface ChatMessage {
  role: string;
  content: string;
}

function ReportPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const topic = searchParams.get("topic") || "";
  const difficulty = searchParams.get("difficulty") || "";
  const conversationHistoryRaw = searchParams.get("conversationHistory") || "";

  const parseHistory = useCallback((): ChatMessage[] => {
    if (!conversationHistoryRaw) return [];
    try {
      return JSON.parse(
        decodeURIComponent(conversationHistoryRaw)
      ) as ChatMessage[];
    } catch {
      try {
        return JSON.parse(conversationHistoryRaw) as ChatMessage[];
      } catch {
        return [];
      }
    }
  }, [conversationHistoryRaw]);

  const [report, setReport] = useState<InterviewReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTranscript, setShowTranscript] = useState(false);

  const fetchReport = useCallback(async () => {
    const conversationHistory = parseHistory();

    if (!topic || !difficulty || conversationHistory.length === 0) {
      setError("Missing interview data. Please start a new interview.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    void logToServer("info", "Requesting report compilation from backend", "ReportView");

    try {
      const response = await fetch(`${API_URL}/api/report/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          difficulty,
          conversation_history: conversationHistory,
        }),
      });

      if (!response.ok) {
        throw new Error("Report compilation failed: returned status " + response.status);
      }

      const data = (await response.json()) as InterviewReport;
      setReport(data);
      void logToServer("info", `Evaluation report generated successfully. Score: ${data.score} | Recommendation: ${data.recommendation}`, "ReportView");
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      void logToServer("error", `Failed to generate report: ${errorMsg}`, "ReportView", {
        error: String(err),
        stack: err instanceof Error ? err.stack : undefined
      });
      setError(
        err instanceof Error
          ? err.message
          : "An error occurred while compiling your diagnostic feedback."
      );
    } finally {
      setIsLoading(false);
    }
  }, [topic, difficulty, parseHistory]);

  useEffect(() => {
    void logToServer("info", `ReportPage loaded for topic: "${topic}"`, "ReportView");

    const handleError = (event: ErrorEvent) => {
      void logToServer("error", event.message || "Uncaught runtime exception", "ReportViewWindow", {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error ? String(event.error) : undefined,
        stack: event.error?.stack || undefined
      });
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      void logToServer("error", "Unhandled promise rejection: " + String(event.reason), "ReportViewRejection", {
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
    void fetchReport();
  }, [fetchReport]);

  if (isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 py-10 bg-[#030014] text-slate-300">
        <div className="w-full max-w-2xl space-y-6 animate-fade-in text-center">
          <div className="space-y-4">
            <Loader2 className="w-10 h-10 animate-spin text-violet-500 mx-auto" />
            <h2 className="text-xl font-bold text-white">Analyzing Session Transcripts</h2>
            <p className="text-slate-400 text-xs max-w-sm mx-auto leading-relaxed">
              Our evaluation models are scanning responses, grading logic, and formulating study guidelines...
            </p>
          </div>
          <div className="glass-card glow-purple p-8 rounded-2xl space-y-4 max-w-md mx-auto">
            <Skeleton className="h-20 w-20 rounded-full mx-auto bg-slate-800/80" />
            <Skeleton className="h-5 w-40 mx-auto bg-slate-800/80" />
            <Skeleton className="h-4 w-full bg-slate-800/50" />
            <Skeleton className="h-4 w-5/6 mx-auto bg-slate-800/50" />
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 py-10 bg-[#030014] text-slate-300">
        <div className="w-full max-w-md text-center space-y-5 animate-fade-in glass-card glow-purple p-6 rounded-2xl">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
          <h2 className="text-lg font-bold text-white">Evaluation Interrupted</h2>
          <p className="text-xs text-slate-400 leading-relaxed">{error}</p>
          <div className="flex flex-col gap-3 justify-center pt-2">
            <Button
              onClick={() => void fetchReport()}
              className="bg-violet-600 hover:bg-violet-500 text-white font-semibold py-2.5 rounded-lg"
            >
              Retry Generation
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push("/")}
              className="border-slate-800 bg-slate-900/30 text-xs font-semibold text-slate-300 hover:bg-slate-950"
            >
              Back to Home
            </Button>
          </div>
        </div>
      </main>
    );
  }

  if (!report) {
    return null;
  }

  const isPass = report.recommendation?.toLowerCase() === "pass";

  return (
    <main className="relative min-h-screen flex items-start justify-center px-4 py-12 sm:py-16 bg-[#030014] text-slate-100 overflow-x-hidden">
      {/* Decorative Blur Spheres */}
      <div className="absolute top-[-10%] left-[-10%] w-[45vw] h-[45vw] rounded-full bg-violet-950/15 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[45vw] h-[45vw] rounded-full bg-fuchsia-950/10 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-4xl z-10 space-y-8 animate-fade-in">
        {/* Header outcome display banner */}
        <div className="glass-card glow-purple p-8 rounded-2xl grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
          {/* Score wheel */}
          <div className="flex flex-col items-center justify-center">
            <div className="relative w-40 h-40">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  className="stroke-slate-800/80"
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
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Overall Score</span>
              </div>
            </div>
          </div>

          {/* Verdict summary */}
          <div className="md:col-span-2 flex flex-col gap-4 text-center md:text-left">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
              <h2 className="text-2xl font-extrabold text-white">Evaluation Verdict</h2>
              <Badge
                className={`text-xs py-1 px-4 font-bold ${
                  isPass
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
                <span className="font-semibold">Topic:</span> {topic}
              </div>
              <div className="inline-flex items-center gap-1.5 text-xs text-slate-400 bg-slate-900/60 py-1 px-3 rounded-lg border border-slate-800/80">
                <span className="font-semibold">Level:</span> {difficulty}
              </div>
            </div>
          </div>
        </div>

        {/* Detailed grids (Strengths & Weaknesses) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Strengths */}
          <div className="glass-card glow-purple p-6 rounded-2xl flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b border-slate-800/85 pb-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <h3 className="font-bold text-slate-200">Key Strengths</h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-line">
              {report.strengths}
            </p>
          </div>

          {/* Weaknesses */}
          <div className="glass-card glow-purple p-6 rounded-2xl flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b border-slate-800/85 pb-3">
              <XCircle className="w-5 h-5 text-rose-400" />
              <h3 className="font-bold text-slate-200">Identified Gaps</h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-line">
              {report.weaknesses}
            </p>
          </div>
        </div>

        {/* Study recommendations */}
        <div className="glass-card glow-purple p-6 rounded-2xl flex flex-col gap-4">
          <div className="flex items-center gap-2 border-b border-slate-800/85 pb-3">
            <AlertCircle className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-slate-200">Recommended Topics to Study</h3>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {report.revision_areas.split(",").map((area, idx) => (
              <div
                key={idx}
                className="py-2.5 px-4 rounded-xl border border-amber-500/10 bg-amber-950/10 text-amber-400 text-xs font-semibold tracking-wide"
              >
                {area.trim()}
              </div>
            ))}
          </div>
        </div>

        {/* Collapsible Transcript Area */}
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
              {parseHistory().map((msg, index) => {
                const isAssistant = msg.role === "assistant";
                return (
                  <div key={index} className="flex flex-col gap-1.5">
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${isAssistant ? "text-violet-400" : "text-slate-400"}`}>
                      {isAssistant ? "Interviewer (AI)" : "Candidate (You)"}
                    </span>
                    <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/60 text-xs sm:text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
                      {msg.content}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Action button */}
        <div className="flex justify-center pt-4">
          <Button
            onClick={() => router.push("/")}
            className="py-6 px-10 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold transition-all duration-300 shadow-[0_4px_20px_rgba(139,92,246,0.3)] hover:shadow-[0_4px_25px_rgba(139,92,246,0.45)] flex items-center gap-2"
          >
            <RotateCcw className="w-5 h-5" />
            <span>Simulate Another Session</span>
          </Button>
        </div>
      </div>
    </main>
  );
}

export default function ReportPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#030014] text-slate-300">
          <div className="flex items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
            <span className="font-semibold text-sm">Compiling diagnostic feedback...</span>
          </div>
        </div>
      }
    >
      <ReportPageContent />
    </Suspense>
  );
}
