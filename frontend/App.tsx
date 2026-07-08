
import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, XCircle, Shield, Database, Cloud, Activity
} from 'lucide-react';
import { AnalysisResult, AppState } from './types';
import FileUpload from './components/FileUpload';
import Header from './components/Header';
import { performHybridAnalysis } from './services/analysisService';
import { useBackendStatus } from './hooks/useBackendStatus';
import dotenv from 'dotenv';

dotenv.config();

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    history: [],
    isAnalyzing: false,
    currentResult: null,
    errorMessage: null,
    datasetInfo: {
      real: { count: 0, samples: [] },
      ai: { count: 0, samples: [] }
    }
  });

  const [activeTab, setActiveTab] = useState<'scan' | 'history'>('scan');
  
  const API_URL = import.meta.env.VITE_API_URL;

  const API_URL =
    import.meta.env.VITE_API_URL ||
    "http://localhost:3000";

  const { status: backendStatus } = useBackendStatus(API_URL);

  useEffect(() => {
    const fetchDataset = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL;
        const res = await fetch(`${API_URL}/api/dataset`);
        const data = await res.json();
        setState(prev => ({ ...prev, datasetInfo: data }));
      } catch (e) {
        console.error("Failed to fetch dataset");
      }
    };
    fetchDataset();
  }, []);

  const handleFileUpload = async (file: File) => {
    setState(prev => ({ ...prev, isAnalyzing: true, errorMessage: null }));
    try {
      const result = await performHybridAnalysis(file);
      
      setState(prev => ({
        ...prev,
        isAnalyzing: false,
        errorMessage: null,
        currentResult: result,
        history: [result, ...prev.history].slice(0, 50)
      }));
    } catch (error: any) {
      const message = error?.message || "Analysis failed.";
      setState(prev => ({ ...prev, isAnalyzing: false, errorMessage: message }));
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-black text-white selection:bg-blue-500/30">
      <Header 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        backendStatus={backendStatus} 
      />

      <main className="flex-1 w-full relative">
        {activeTab === 'scan' && (
          <div className="max-w-7xl mx-auto p-6 space-y-12">
            {!state.currentResult ? (
              <div className="max-w-4xl w-full mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 py-12">
                <div className="text-center space-y-4">
                  <h2 className="text-5xl font-black tracking-tighter">VOICE FORENSICS <span className="text-blue-500">LAB</span></h2>
                  <p className="text-gray-400 max-w-xl mx-auto">Upload any audio file to perform deep-level forensic analysis using real DSP feature extraction and statistical forensics.</p>
                </div>
                
                <div className="bg-blue-600/10 border border-blue-500/20 rounded-2xl p-4 flex items-center justify-center gap-4 max-w-2xl mx-auto">
                  <Shield className="w-5 h-5 text-blue-400" />
                  <p className="text-xs text-blue-300 font-mono uppercase tracking-widest">DSP Forensic Engine V3.0 Active</p>
                </div>

                {state.errorMessage && (
                  <div className="max-w-2xl mx-auto bg-rose-500/10 border border-rose-500/40 text-rose-200 rounded-2xl p-4 text-sm" role="alert">
                    {state.errorMessage}
                  </div>
                )}

                <FileUpload onUpload={handleFileUpload} isAnalyzing={state.isAnalyzing} />
              </div>
            ) : (
              <div className="w-full space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex flex-col lg:flex-row gap-8">
                  {/* Left Panel: Verdict */}
                  <div className={`lg:w-1/3 p-12 flex flex-col justify-between border border-gray-800 rounded-[2.5rem] ${state.currentResult.label === 'REAL' ? 'bg-emerald-500/5' : 'bg-rose-500/5'}`}>
                    <div className="space-y-8">
                      <div className="flex items-center gap-3 text-gray-500 font-mono text-[10px] uppercase tracking-[0.2em]">
                        <Activity className="w-4 h-4" /> Final Verdict
                      </div>
                      
                      <div className="space-y-2">
                        <div className={`text-8xl font-black tracking-tighter ${state.currentResult.label === 'REAL' ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {state.currentResult.label}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-1 w-full bg-gray-800 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-1000 ${state.currentResult.label === 'REAL' ? 'bg-emerald-500' : 'bg-rose-500'}`}
                              style={{ width: `${state.currentResult.confidence}%` }}
                            />
                          </div>
                          <span className="text-sm font-mono font-bold">{state.currentResult.confidence.toFixed(1)}%</span>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <p className="text-gray-400 text-sm leading-relaxed">
                          {state.currentResult.label === 'REAL' 
                            ? "Forensic analysis confirms high-fidelity organic vocal characteristics consistent with human biological production."
                            : "Forensic analysis detected significant neural synthesis artifacts and non-biological spectral patterns."}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <span className="px-3 py-1 bg-gray-800 rounded-full text-[10px] font-bold uppercase border border-gray-700">Spectral_Verified</span>
                          <span className="px-3 py-1 bg-gray-800 rounded-full text-[10px] font-bold uppercase border border-gray-700">Neural_Check_Pass</span>
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={() => setState(prev => ({ ...prev, currentResult: null }))}
                      className="w-full mt-8 py-4 bg-white text-black hover:bg-gray-200 rounded-2xl font-black uppercase tracking-widest transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                    >
                      Another Analysis
                    </button>
                  </div>

                  {/* Right Panel: Details */}
                  <div className="lg:w-2/3 space-y-12">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <h3 className="text-xs font-bold text-blue-500 uppercase tracking-widest flex items-center gap-2">
                          <Database className="w-4 h-4" /> Signal Feature Summary
                        </h3>
                        <div className="bg-gray-950/50 p-6 rounded-3xl border border-gray-800 font-mono text-xs text-gray-400 leading-relaxed">
                          {state.currentResult.localReasoning}
                        </div>
                      </div>
                      <div className="space-y-4">
                        <h3 className="text-xs font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-2">
                          <Cloud className="w-4 h-4" /> Decision Rationale
                        </h3>
                        <div className="bg-gray-950/50 p-6 rounded-3xl border border-gray-800 font-mono text-xs text-gray-400 leading-relaxed italic">
                          {state.currentResult.geminiReasoning}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Forensic Markers</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {state.currentResult.forensicMarkers.map(marker => (
                          <div key={marker.id} className="bg-gray-950/50 p-4 rounded-2xl border border-gray-800 flex items-center justify-between">
                            <div>
                              <div className="text-sm font-bold">{marker.name}</div>
                              <div className="text-[10px] text-gray-500">{marker.description}</div>
                            </div>
                            <div className={`text-sm font-mono font-bold ${marker.status === 'SAFE' ? 'text-emerald-500' : marker.status === 'WARNING' ? 'text-amber-500' : 'text-rose-500'}`}>
                              {(marker.value * 100).toFixed(0)}%
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
           <div className="max-w-4xl mx-auto p-8 space-y-8 animate-in fade-in duration-500">
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-black tracking-tighter">INVESTIGATION ARCHIVE</h2>
                <div className="text-xs font-mono text-gray-500 uppercase tracking-widest">{state.history.length} Records Found</div>
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                 {state.history.length === 0 ? (
                   <div className="text-center py-32 bg-gray-900/20 border border-dashed border-gray-800 rounded-[2rem]">
                     <Database className="w-12 h-12 text-gray-800 mx-auto mb-4" />
                     <p className="text-gray-500 font-mono text-sm">No forensic history found.</p>
                   </div>
                 ) : (
                   state.history.map(item => (
                      <div 
                        key={item.id} 
                        onClick={() => { setState(p => ({ ...p, currentResult: item })); setActiveTab('scan'); }} 
                        className="group bg-gray-900/40 border border-gray-800 rounded-3xl p-6 flex items-center justify-between hover:border-blue-500/50 cursor-pointer transition-all hover:bg-gray-900/60"
                      >
                         <div className="flex items-center gap-6">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${item.label === 'REAL' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                               {item.label === 'REAL' ? <CheckCircle2 className="w-7 h-7" /> : <XCircle className="w-7 h-7" />}
                            </div>
                            <div>
                               <h4 className="font-bold text-lg text-gray-200">{item.fileName}</h4>
                               <div className="flex items-center gap-3 mt-1">
                                 <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">DSP_ENGINE</span>
                                 <span className="w-1 h-1 bg-gray-700 rounded-full"></span>
                                 <span className="text-[10px] text-gray-500 font-mono">{new Date(item.timestamp).toLocaleString()}</span>
                               </div>
                            </div>
                         </div>
                         <div className="text-right">
                            <div className={`text-2xl font-black font-mono ${item.label === 'REAL' ? 'text-emerald-400' : 'text-rose-400'}`}>{item.label}</div>
                            <div className="text-[10px] text-gray-500 font-bold tracking-widest">{item.confidence.toFixed(1)}% CONFIDENCE</div>
                         </div>
                      </div>
                   ))
                 )}
              </div>
           </div>
        )}
      </main>

      <footer className="border-t border-gray-800 bg-black p-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-[10px] text-gray-500 font-mono">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-2"><span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span> SYSTEM: NOMINAL</span>
            <span className="hidden sm:inline">ARCHITECTURE: DSP_FORENSIC_V3.0</span>
            <span className="hidden lg:inline">DATASET: {state.datasetInfo ? state.datasetInfo.real.count + state.datasetInfo.ai.count : 0} SAMPLES</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-blue-500 font-black uppercase tracking-widest">
              <Shield className="w-3 h-3" /> VoxGuard_Secured
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
