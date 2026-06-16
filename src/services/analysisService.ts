
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
    const errorData = await response.json();
    throw new Error(errorData.error || "Analysis failed on server");
  }

  return response.json();
};
