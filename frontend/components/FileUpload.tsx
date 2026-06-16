import React, { useRef, useState } from 'react';
import { Upload, FileAudio, AlertCircle, Loader2 } from 'lucide-react';

interface Props {
  onUpload: (file: File) => void;
  isAnalyzing: boolean;
}

const FileUpload: React.FC<Props> = ({ onUpload, isAnalyzing }) => {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onUpload(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUpload(e.target.files[0]);
    }
  };

  return (
    <div 
      className={`relative border-2 border-dashed rounded-2xl p-12 transition-all duration-300 flex flex-col items-center justify-center text-center
        ${dragActive ? 'border-blue-500 bg-blue-500/10' : 'border-gray-800 bg-gray-900/40'}
        ${isAnalyzing ? 'opacity-50 pointer-events-none' : 'hover:border-gray-600 hover:bg-gray-800/40 cursor-pointer'}
      `}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input 
        ref={inputRef}
        type="file" 
        className="hidden" 
        accept=".wav,.mp3,.m4a"
        onChange={handleChange}
      />
      
      {isAnalyzing ? (
        <div className="flex flex-col items-center animate-pulse">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
          <p className="text-lg font-medium">DSP Analysis Running...</p>
          <p className="text-sm text-gray-400 mt-2">Feature extraction + forensic scoring</p>
        </div>
      ) : (
        <>
          <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-4">
            <Upload className="w-8 h-8 text-gray-400" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Ingest Audio Sample</h2>
          <p className="text-gray-400 max-w-xs mb-6">
            Drag and drop your WAV, MP3, or M4A file for deepfake analysis.
          </p>
          <div className="flex gap-4">
             <span className="flex items-center gap-1.5 px-3 py-1 bg-gray-800 rounded-full text-xs font-medium text-gray-300 border border-gray-700">
               <FileAudio className="w-3 h-3" /> WAV
             </span>
             <span className="flex items-center gap-1.5 px-3 py-1 bg-gray-800 rounded-full text-xs font-medium text-gray-300 border border-gray-700">
               <FileAudio className="w-3 h-3" /> MP3
             </span>
             <span className="flex items-center gap-1.5 px-3 py-1 bg-gray-800 rounded-full text-xs font-medium text-gray-300 border border-gray-700">
               <FileAudio className="w-3 h-3" /> M4A
             </span>
          </div>
        </>
      )}
      
      <div className="absolute bottom-4 left-4 flex items-center gap-2 text-[10px] text-gray-500 uppercase tracking-widest font-bold">
        <AlertCircle className="w-3 h-3" />
        Zero-Trust Policy: All data encrypted in transit
      </div>
    </div>
  );
};

export default FileUpload;
