"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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

function scoreColorClass(score: number): string {
  if (score >= 70) return "text-emerald-600";
  if (score >= 50) return "text-yellow-600";
  return "text-red-600";
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

  const fetchReport = useCallback(async () => {
    const conversationHistory = parseHistory();

    if (!topic || !difficulty || conversationHistory.length === 0) {
      setError("Missing interview data. Please start a new interview.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

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
        throw new Error("Failed to generate report");
      }

      const data = (await response.json()) as InterviewReport;
      setReport(data);
    } catch {
      setError("Failed to generate your report. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [topic, difficulty, parseHistory]);

  useEffect(() => {
    void fetchReport();
  }, [fetchReport]);

  if (isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 py-10 bg-slate-950">
        <div className="w-full max-w-[800px] space-y-6 animate-fade-in">
          <div className="text-center space-y-3">
            <Skeleton className="h-12 w-12 rounded-full mx-auto bg-slate-700" />
            <Skeleton className="h-8 w-64 mx-auto bg-slate-700" />
            <p className="text-slate-400 text-sm">Generating your report...</p>
          </div>
          <div className="rounded-xl bg-slate-100 p-6 space-y-4">
            <Skeleton className="h-16 w-40 mx-auto bg-slate-300" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Skeleton className="h-28 w-full bg-slate-300" />
              <Skeleton className="h-28 w-full bg-slate-300" />
              <Skeleton className="h-28 w-full bg-slate-300" />
              <Skeleton className="h-28 w-full bg-slate-300" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 py-10 bg-slate-950">
        <div className="w-full max-w-md text-center space-y-4 animate-fade-in">
          <p className="text-red-400">{error}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={() => void fetchReport()}
              className="bg-blue-600 hover:bg-blue-500 text-white"
            >
              Retry
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push("/")}
              className="border-slate-600 text-slate-100"
            >
              Start New Interview
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
    <main className="min-h-screen flex items-start justify-center px-4 py-10 sm:py-14 bg-slate-950">
      <div className="w-full max-w-[800px] animate-fade-in">
        <div className="text-center mb-8 space-y-4">
          <div className="flex justify-center">
            {isPass ? (
              <CheckCircle2 className="h-14 w-14 text-emerald-400" />
            ) : (
              <XCircle className="h-14 w-14 text-red-400" />
            )}
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white">
            Interview Complete
          </h1>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <Badge
              variant="secondary"
              className="bg-slate-800 text-slate-100 border-slate-700 h-auto py-1 px-2.5"
            >
              {topic}
            </Badge>
            <Badge
              variant="outline"
              className="border-slate-600 text-slate-200 h-auto py-1 px-2.5"
            >
              {difficulty}
            </Badge>
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 text-slate-900 shadow-xl p-6 sm:p-8 space-y-8">
          <div className="text-center space-y-4">
            <p
              className={`text-5xl sm:text-6xl font-extrabold tracking-tight ${scoreColorClass(
                Number(report.score)
              )}`}
            >
              {report.score} / 100
            </p>
            <Badge
              className={`h-auto px-4 py-1.5 text-sm font-bold tracking-wide ${
                isPass
                  ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
                  : "bg-red-100 text-red-800 hover:bg-red-100"
              }`}
            >
              {isPass ? "PASS" : "FAIL"}
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="border-0 shadow-sm ring-1 ring-slate-200 border-l-4 border-l-emerald-500 rounded-xl bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-slate-900">
                  Strengths
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {report.strengths}
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm ring-1 ring-slate-200 border-l-4 border-l-yellow-500 rounded-xl bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-slate-900">
                  Areas for Improvement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {report.weaknesses}
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm ring-1 ring-slate-200 border-l-4 border-l-blue-500 rounded-xl bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-slate-900">
                  Topics to Revise
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {report.revision_areas}
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm ring-1 ring-slate-200 border-l-4 border-l-slate-400 rounded-xl bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-slate-900">
                  Interviewer&apos;s Verdict
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {report.verdict}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-center pt-2">
            <Button
              onClick={() => router.push("/")}
              className="h-11 px-6 bg-blue-600 hover:bg-blue-500 text-white"
            >
              Start New Interview
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function ReportPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-300">
          Loading report...
        </div>
      }
    >
      <ReportPageContent />
    </Suspense>
  );
}
