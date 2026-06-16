
import { AnalysisResult } from "../types";

export const performHybridAnalysis = async (
  file: File
): Promise<AnalysisResult> => {
  const formData = new FormData();
  formData.append("audio", file);

  const response = await fetch("/api/analyze", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    let message = "Analysis failed on server";
    try {
      const errorData = await response.json();
      message = errorData.error || message;
    } catch {
      if (response.status === 429) {
        message = "Rate limit exceeded. Please wait and try again.";
      }
    }
    throw new Error(message);
  }

  return response.json();
};
