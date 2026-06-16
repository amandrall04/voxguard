
import React from 'react';
import { Shield, Activity } from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  backendStatus: string;
}

const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab, backendStatus }) => {
  return (
    <header className="border-b border-gray-800 bg-gray-950/50 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold">VOXGUARD <span className="text-blue-500 font-black">AI</span></h1>
            <p className="text-[10px] text-gray-500 uppercase font-mono tracking-widest">Forensic Hub</p>
          </div>
        </div>
        <nav className="hidden md:flex items-center bg-gray-900/50 border border-gray-800 rounded-full px-2 py-1 gap-1">
          {['scan', 'lab', 'history'].map((tab) => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase transition-all ${activeTab === tab ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-gray-200'}`}
            >
              {tab}
            </button>
          ))}
        </nav>
        <div className={`text-xs font-mono flex items-center gap-1.5 ${backendStatus === 'ONLINE' ? 'text-emerald-400' : 'text-amber-400'}`}>
          <Activity className="w-3 h-3" /> HYBRID_ENGINE
        </div>
      </div>
    </header>
  );
};

export default Header;
