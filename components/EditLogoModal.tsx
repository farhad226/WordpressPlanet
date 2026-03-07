
import React, { useState, useRef } from 'react';
import { X, Globe, Link, Sparkles, RefreshCw, Upload, Image as ImageIcon } from 'lucide-react';
import GlassCard from './GlassCard';

interface EditLogoModalProps {
  initialUrl: string;
  onClose: () => void;
  onUpdate: (url: string) => void;
}

const EditLogoModal: React.FC<EditLogoModalProps> = ({ initialUrl, onClose, onUpdate }) => {
  const [url, setUrl] = useState(initialUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onUpdate(url.trim());
    }
  };

  const handleReset = () => {
    setUrl('https://i.imgur.com/8Qp6u8f.png');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("File size too large. Please select an image under 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setUrl(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-in fade-in duration-300">
      <GlassCard className="w-full max-w-md max-h-[90vh] overflow-y-auto custom-scrollbar border-white/20 shadow-[0_0_100px_rgba(168,85,247,0.15)]">
        <div className="p-4 md:p-6 border-b border-white/10 flex justify-between items-center bg-white/5 sticky top-0 z-10 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-black text-white tracking-tight uppercase">Update Brand Node</h2>
              <p className="text-[8px] md:text-[10px] text-gray-500 font-bold uppercase tracking-widest">Asset Synchronization</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-white hover:bg-white/10 rounded-full transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
          <div className="flex flex-col items-center gap-6">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-3xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
              <div className="relative p-2 bg-black border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                <div 
                  className="w-24 h-24 md:w-32 md:h-32 rounded-2xl bg-white/[0.03] flex items-center justify-center overflow-hidden"
                >
                  {url ? (
                    <img src={url} alt="Logo Preview" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-10 h-10 md:w-12 md:h-12 text-gray-700" />
                  )}
                </div>
              </div>
              <div className="mt-4 text-center">
                <span className="text-[8px] md:text-[9px] font-black text-gray-600 uppercase tracking-[0.3em]">Live Preview</span>
              </div>
            </div>

            <div className="w-full space-y-4">
              <div className="space-y-2">
                <label className="block text-[9px] md:text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                  <Upload className="w-3 h-3 text-purple-400" /> Upload Image Node
                </label>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/png, image/jpeg, image/jpg, image/webp"
                  className="hidden"
                />
                <button 
                  type="button"
                  onClick={triggerFileUpload}
                  className="w-full flex items-center justify-center gap-3 bg-white/[0.05] border border-dashed border-white/20 hover:border-purple-500/50 hover:bg-white/[0.08] transition-all py-3 md:py-4 rounded-2xl text-[10px] md:text-xs font-bold text-gray-400 group/upload"
                >
                  <Upload className="w-4 h-4 group-hover/upload:text-purple-400 transition-colors" />
                  Select Local Asset (JPG/PNG)
                </button>
              </div>

              <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-white/10"></div>
                <span className="flex-shrink mx-4 text-[8px] md:text-[9px] font-black text-gray-700 uppercase">OR</span>
                <div className="flex-grow border-t border-white/10"></div>
              </div>

              <div className="space-y-2">
                <label className="block text-[9px] md:text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                  <Link className="w-3 h-3 text-purple-400" /> External Resource URL
                </label>
                <div className="relative group">
                  <input 
                    type="url"
                    placeholder="https://assets.example.com/logo.png"
                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-4 md:px-5 py-3 md:py-4 focus:outline-none focus:border-purple-500/50 focus:bg-white/[0.05] transition-all text-xs md:text-sm font-medium text-white placeholder:text-gray-700"
                    value={url.startsWith('data:') ? '' : url}
                    onChange={(e) => setUrl(e.target.value)}
                  />
                  <button 
                    type="button"
                    onClick={handleReset}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-600 hover:text-purple-400 transition-colors"
                    title="Reset to default"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 md:gap-4 pt-4">
            <button 
              type="button" 
              onClick={onClose} 
              className="flex-1 px-6 py-3 md:py-4 border border-white/10 rounded-2xl hover:bg-white/5 text-gray-500 font-black text-[9px] md:text-[10px] uppercase tracking-widest transition-all"
            >
              Abort
            </button>
            <button 
              type="submit" 
              className="flex-1 px-6 py-3 md:py-4 bg-gradient-to-r from-purple-600 to-indigo-700 hover:from-purple-500 hover:to-indigo-600 rounded-2xl font-black text-[9px] md:text-[10px] uppercase tracking-widest text-white shadow-xl shadow-purple-900/30 transition-all active:scale-95"
            >
              Sync Node
            </button>
          </div>
        </form>
      </GlassCard>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { height: 4px; width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.01); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(168, 85, 247, 0.2); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(168, 85, 247, 0.4); }
      `}</style>
    </div>
  );
};

export default EditLogoModal;
