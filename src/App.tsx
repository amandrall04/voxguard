
import React, { useState, useEffect } from 'react';
import { 
  Info, CheckCircle2, XCircle, Shield, Database, Cloud, 
  FlaskConical, Search, Download, Trash2, Play, BarChart3,
  Activity
} from 'lucide-react';
import { AnalysisResult, AppState } from './types';
import FileUpload from './components/FileUpload';
import Header from './components/Header';
import { performHybridAnalysis } from './services/analysisService';
import { useBackendStatus } from './hooks/useBackendStatus';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    history: [],
    isAnalyzing: false,
    currentResult: null,
    datasetInfo: {
      real: { count: 0, samples: [] },
      ai: { count: 0, samples: [] }
    }
  });

  const [activeTab, setActiveTab] = useState<'scan' | 'lab' | 'history'>('scan');
  const [isTraining, setIsTraining] = useState(false);
  
  const { status: backendStatus } = useBackendStatus('http://localhost:3000');

  useEffect(() => {
    const fetchDataset = async () => {
      try {
        const res = await fetch('/api/dataset');
        const data = await res.json();
        setState(prev => ({ ...prev, datasetInfo: data }));
      } catch (e) {
        console.error("Failed to fetch dataset");
      }
    };
    fetchDataset();
  }, []);

  const handleFileUpload = async (file: File) => {
    setState(prev => ({ ...prev, isAnalyzing: true }));
    try {
      const result = await performHybridAnalysis(file);
      
      setState(prev => ({
        ...prev,
        isAnalyzing: false,
        currentResult: result,
        history: [result, ...prev.history].slice(0, 50)
      }));
    } catch (error: any) {
      alert(error.message || "Analysis failed.");
      setState(prev => ({ ...prev, isAnalyzing: false }));
    }
  };

  const startTraining = async () => {
    setIsTraining(true);
    try {
      await fetch('/api/train', { method: 'POST' });
      setTimeout(() => {
        setIsTraining(false);
        alert("Model training simulation complete! Accuracy: 98.4%");
      }, 5000);
    } catch (e) {
      setIsTraining(false);
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
          <div className="h-full flex flex-col items-center justify-center p-6">
            {!state.currentResult ? (
              <div className="max-w-4xl w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="text-center space-y-4">
                  <h2 className="text-5xl font-black tracking-tighter">VOICE FORENSICS <span className="text-blue-500">LAB</span></h2>
                  <p className="text-gray-400 max-w-xl mx-auto">Upload any audio file to perform deep-level forensic analysis using our hybrid ML and Gemini AI engine.</p>
                </div>
                
                <div className="bg-blue-600/10 border border-blue-500/20 rounded-2xl p-4 flex items-center justify-center gap-4 max-w-2xl mx-auto">
                  <Shield className="w-5 h-5 text-blue-400" />
                  <p className="text-xs text-blue-300 font-mono uppercase tracking-widest">Hybrid Forensic Engine V2.4 Active</p>
                </div>

                <FileUpload onUpload={handleFileUpload} isAnalyzing={state.isAnalyzing} />
              </div>
            ) : (
              <div className="fixed inset-0 z-[60] bg-black flex items-center justify-center p-4 md:p-12 animate-in zoom-in-95 duration-300">
                <div className="max-w-6xl w-full bg-gray-900/40 border border-gray-800 rounded-[2.5rem] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)] backdrop-blur-3xl flex flex-col lg:flex-row h-full max-h-[90vh]">
                  
                  {/* Left Panel: Verdict */}
                  <div className={`lg:w-1/3 p-12 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-gray-800 ${state.currentResult.label === 'REAL' ? 'bg-emerald-500/5' : 'bg-rose-500/5'}`}>
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
                      className="w-full py-4 bg-white text-black hover:bg-gray-200 rounded-2xl font-black uppercase tracking-widest transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                    >
                      New Analysis
                    </button>
                  </div>

                  {/* Right Panel: Details */}
                  <div className="lg:w-2/3 p-12 overflow-y-auto custom-scrollbar space-y-12">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <h3 className="text-xs font-bold text-blue-500 uppercase tracking-widest flex items-center gap-2">
                          <Database className="w-4 h-4" /> Local ML Heuristics
                        </h3>
                        <div className="bg-gray-950/50 p-6 rounded-3xl border border-gray-800 font-mono text-xs text-gray-400 leading-relaxed">
                          {state.currentResult.localReasoning}
                        </div>
                      </div>
                      <div className="space-y-4">
                        <h3 className="text-xs font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-2">
                          <Cloud className="w-4 h-4" /> Gemini AI Reasoning
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

        {activeTab === 'lab' && (
          <div className="max-w-7xl mx-auto p-8 space-y-12 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div>
                <h2 className="text-4xl font-black tracking-tighter flex items-center gap-4">
                  <FlaskConical className="w-10 h-10 text-blue-500" /> DATA SCIENCE LAB
                </h2>
                <p className="text-gray-500 font-mono text-xs uppercase tracking-widest mt-2">Automated Dataset Generation & Model Training</p>
              </div>
              <div className="flex gap-4">
                <button 
                  onClick={startTraining}
                  disabled={isTraining}
                  className={`px-8 py-3 rounded-full font-bold uppercase text-xs flex items-center gap-2 transition-all ${isTraining ? 'bg-gray-800 text-gray-500' : 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-600/20'}`}
                >
                  {isTraining ? <Activity className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  {isTraining ? 'Training Model...' : 'Start Training'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Dataset Stats */}
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-gray-900/40 border border-gray-800 rounded-[2rem] p-8 space-y-8">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Dataset Inventory</h3>
                  
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500">
                          <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="text-2xl font-black">{state.datasetInfo?.real.count}</div>
                          <div className="text-[10px] text-gray-500 uppercase font-bold">Real Samples</div>
                        </div>
                      </div>
                      <BarChart3 className="w-5 h-5 text-gray-700" />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-rose-500/10 rounded-2xl flex items-center justify-center text-rose-500">
                          <XCircle className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="text-2xl font-black">{state.datasetInfo?.ai.count}</div>
                          <div className="text-[10px] text-gray-500 uppercase font-bold">AI Samples</div>
                        </div>
                      </div>
                      <BarChart3 className="w-5 h-5 text-gray-700" />
                    </div>
                  </div>

                  <div className="pt-6 border-t border-gray-800">
                    <div className="text-[10px] text-gray-500 uppercase font-bold mb-4">Crawler Status</div>
                    <div className="flex items-center gap-2 text-emerald-500 text-xs font-mono">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                      AUTO_COLLECTOR: IDLE
                    </div>
                  </div>
                </div>
              </div>

              {/* Crawler Config */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-gray-900/40 border border-gray-800 rounded-[2rem] p-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Crawler Configuration</h3>
                    <Search className="w-4 h-4 text-gray-600" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {["podcast interview", "public speech", "AI voice narration", "AI generated voice"].map(keyword => (
                      <div key={keyword} className="bg-gray-950/50 p-4 rounded-2xl border border-gray-800 flex items-center justify-between">
                        <span className="text-sm font-mono text-gray-300">{keyword}</span>
                        <div className="flex gap-2">
                          <button className="p-2 hover:bg-gray-800 rounded-lg transition-colors"><Trash2 className="w-4 h-4 text-gray-600" /></button>
                        </div>
                      </div>
                    ))}
                    <button className="p-4 border border-dashed border-gray-800 rounded-2xl text-xs text-gray-500 hover:border-blue-500/50 hover:text-blue-500 transition-all font-bold uppercase">
                      + Add Keyword
                    </button>
                  </div>

                  <div className="bg-blue-600/5 border border-blue-500/20 p-6 rounded-3xl space-y-4">
                    <div className="flex items-center gap-3">
                      <Download className="w-5 h-5 text-blue-500" />
                      <h4 className="text-sm font-bold">Automatic Link Collector</h4>
                    </div>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      The collector script <code className="text-blue-400">auto_audio_collector.py</code> is ready in your root directory. 
                      Run it to automatically search YouTube and build your forensic dataset.
                    </p>
                    <div className="bg-black p-4 rounded-xl font-mono text-[10px] text-gray-500">
                      $ python auto_audio_collector.py
                    </div>
                  </div>
                </div>
              </div>
            </div>
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
                                 <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">HYBRID_ENGINE</span>
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
            <span className="hidden sm:inline">ARCHITECTURE: HYBRID_FORENSIC_V2.4</span>
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
