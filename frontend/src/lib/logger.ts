const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
).replace(/\/$/, "");

export const logToServer = async (
  level: "info" | "warn" | "error" | "debug",
  message: string,
  context?: string,
  extraDetails?: Record<string, unknown>
) => {
  const logMsg = `[${level.toUpperCase()}] ${message}${context ? ` | Context: ${context}` : ""}`;
  if (level === "error") {
    console.error(logMsg, extraDetails || "");
  } else if (level === "warn") {
    console.warn(logMsg, extraDetails || "");
  } else {
    console.log(logMsg, extraDetails || "");
  }

  try {
    await fetch(`${API_URL}/api/log`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        level: level.toUpperCase(),
        message,
        context,
        extra_details: extraDetails,
      }),
    });
  } catch (err) {
    console.error("Failed to propagate client log to server:", err);
  }
};
