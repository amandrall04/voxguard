
export interface ForensicMarker {
  id: string;
  name: string;
  value: number;
  threshold: number;
  description: string;
  status: 'SAFE' | 'WARNING' | 'CRITICAL';
}

export interface AnalysisResult {
  id: string;
  timestamp: number;
  fileName: string;
  label: 'REAL' | 'FAKE';
  confidence: number;
  forensicMarkers: ForensicMarker[];
  spectralData: { name: string; value: number }[];
  detailedReport: string;
  localReasoning: string;
  geminiReasoning: string;
}

export interface AppState {
  history: AnalysisResult[];
  isAnalyzing: boolean;
  currentResult: AnalysisResult | null;
  datasetInfo?: {
    real: { count: number; samples: string[] };
    ai: { count: number; samples: string[] };
  };
}
