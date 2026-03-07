
import React, { useState } from 'react';
import { X, User, Calendar, DollarSign, Layers, Link, BarChart, Palette, Briefcase, Clock, Check, Upload, FileText, AlertCircle } from 'lucide-react';
import { TeamMember } from '../types';
import GlassCard from './GlassCard';

interface AddMemberModalProps {
  onClose: () => void;
  onSubmit: (member: Omit<TeamMember, 'id'>) => void;
  onBulkSubmit?: (members: Omit<TeamMember, 'id'>[]) => void;
}

const THEME_COLORS = [
  { name: 'Purple', value: 'purple', class: 'bg-purple-500' },
  { name: 'Blue', value: 'blue', class: 'bg-blue-500' },
  { name: 'Emerald', value: 'emerald', class: 'bg-emerald-500' },
  { name: 'Rose', value: 'rose', class: 'bg-rose-500' },
  { name: 'Amber', value: 'amber', class: 'bg-amber-500' },
];

const AddMemberModal: React.FC<AddMemberModalProps> = ({ onClose, onSubmit, onBulkSubmit }) => {
  const [activeMode, setActiveMode] = useState<'single' | 'bulk'>('single');
  const [csvData, setCsvData] = useState<string>('');
  const [csvError, setCsvError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    profileName: '',
    projectName: '',
    assignedDate: new Date().toISOString().split('T')[0],
    deliveryDate: '',
    projectValue: '',
    pageCount: '',
    projectUrl: '',
    progress: '10',
    themeColor: 'purple'
  });

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvData(text);
      setCsvError(null);
    };
    reader.readAsText(file);
  };

  const parseCsv = (text: string): Omit<TeamMember, 'id'>[] => {
    const lines = text.split('\n').filter(line => line.trim() !== '');
    if (lines.length < 2) throw new Error('CSV must have a header and at least one data row.');

    // Simple CSV parser that handles quoted values
    const parseLine = (line: string) => {
      const result = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headers = parseLine(lines[0]).map(h => h.toLowerCase().replace(/[\s()]/g, ''));
    const dataRows = lines.slice(1);

    return dataRows.map((row, index) => {
      const values = parseLine(row);
      const entry: any = {};
      
      // Map based on common headers
      headers.forEach((header, i) => {
        const val = values[i];
        if (header.includes('membername')) entry.name = val;
        else if (header.includes('projectname')) entry.projectName = val;
        else if (header.includes('assigneddate')) entry.assignedDate = formatDate(val);
        else if (header.includes('deliverydate')) entry.deliveryDate = formatDate(val);
        else if (header.includes('value')) entry.projectValue = parseFloat(val.replace(/[$,]/g, '')) || 0;
        else if (header.includes('scope') || header.includes('units')) entry.pageCount = parseInt(val) || 0;
        else if (header.includes('profilename')) entry.profileName = val;
        else if (header.includes('workspace') || header.includes('url')) entry.projectUrl = val;
      });

      // Validation
      if (!entry.name || !entry.projectName) {
        throw new Error(`Row ${index + 2}: Member Name and Project Name are required.`);
      }

      return {
        name: entry.name || 'Unknown',
        profileName: entry.profileName || 'N/A',
        projectName: entry.projectName || 'Untitled Project',
        assignedDate: entry.assignedDate || new Date().toISOString().split('T')[0],
        deliveryDate: entry.deliveryDate || new Date().toISOString().split('T')[0],
        projectValue: entry.projectValue || 0,
        pageCount: entry.pageCount || 0,
        projectUrl: entry.projectUrl || '',
        progress: 10,
        themeColor: THEME_COLORS[index % THEME_COLORS.length].value
      };
    });
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      // Handle "Feb 28, 2026" or "13/03/2026" or "Feb 28_2026, AT 12:00:00 am"
      let cleanDate = dateStr.replace(/_/, ' ').split(', AT')[0].trim();
      
      // Try parsing DD/MM/YYYY or MM/DD/YYYY
      const slashMatch = cleanDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
      if (slashMatch) {
        let d = parseInt(slashMatch[1]);
        let m = parseInt(slashMatch[2]);
        let y = parseInt(slashMatch[3]);
        
        if (y < 100) y += 2000;
        
        // Guess format: if d > 12, it's DD/MM/YYYY. If m > 12, it's MM/DD/YYYY.
        // If both <= 12, assume DD/MM/YYYY based on user's "13/03/2026"
        if (d > 12) {
          // DD/MM/YYYY - already correct
        } else if (m > 12) {
          // MM/DD/YYYY -> swap
          [d, m] = [m, d];
        } else {
          // Both <= 12, assume DD/MM/YYYY
        }
        
        return `${y}-${m.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
      }

      // If year is missing (e.g., "Thu, Mar 12"), append current year
      if (!cleanDate.match(/\d{4}/) && !cleanDate.match(/\d{2}$/)) {
        cleanDate += `, ${new Date().getFullYear()}`;
      }

      const d = new Date(cleanDate);
      if (isNaN(d.getTime())) return '';
      
      // Ensure we don't get 2001 or other weird years if the input was meant for 2026
      let year = d.getFullYear();
      if (year < 2020) year = new Date().getFullYear();
      
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const day = d.getDate().toString().padStart(2, '0');
      
      return `${year}-${month}-${day}`;
    } catch {
      return '';
    }
  };

  const handleBulkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const members = parseCsv(csvData);
      if (onBulkSubmit) {
        onBulkSubmit(members);
      } else {
        // Fallback if onBulkSubmit not provided
        members.forEach(m => onSubmit(m));
      }
    } catch (err: any) {
      setCsvError(err.message);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name: formData.name,
      profileName: formData.profileName,
      projectName: formData.projectName,
      assignedDate: formData.assignedDate,
      deliveryDate: formData.deliveryDate,
      projectValue: parseFloat(formData.projectValue) || 0,
      pageCount: parseInt(formData.pageCount) || 0,
      projectUrl: formData.projectUrl,
      progress: parseInt(formData.progress) || 0,
      themeColor: formData.themeColor
    });
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-300"
    >
      <GlassCard className="w-full max-w-lg max-h-[90vh] overflow-y-auto custom-scrollbar shadow-[0_0_80px_rgba(168,85,247,0.1)] border-white/20">
        <div className="p-4 md:p-6 border-b border-white/10 flex justify-between items-center bg-white/5 sticky top-0 z-10 backdrop-blur-xl">
          <div>
            <h2 className="text-lg md:text-xl font-bold text-white tracking-tight uppercase">Project Initialization</h2>
            <div className="flex gap-4 mt-2">
              <button 
                type="button"
                onClick={() => setActiveMode('single')}
                className={`text-[9px] font-black uppercase tracking-widest pb-1 border-b-2 transition-all ${activeMode === 'single' ? 'text-purple-500 border-purple-500' : 'text-gray-600 border-transparent hover:text-gray-400'}`}
              >
                Single Node
              </button>
              <button 
                type="button"
                onClick={() => setActiveMode('bulk')}
                className={`text-[9px] font-black uppercase tracking-widest pb-1 border-b-2 transition-all ${activeMode === 'bulk' ? 'text-purple-500 border-purple-500' : 'text-gray-600 border-transparent hover:text-gray-400'}`}
              >
                Bulk Upload (CSV)
              </button>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {activeMode === 'single' ? (
          <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-6">
            <div className="space-y-4">
              {/* Member & Project */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] md:text-[10px] font-black text-gray-500 mb-2 uppercase tracking-widest flex items-center gap-2">
                    <User className="w-3 h-3 text-purple-400" /> Member Name
                  </label>
                  <input 
                    required
                    type="text"
                    placeholder="Elena Gilbert"
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500/50 transition-all text-sm text-white placeholder:text-gray-700 font-medium"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-[9px] md:text-[10px] font-black text-gray-500 mb-2 uppercase tracking-widest flex items-center gap-2">
                    <User className="w-3 h-3 text-purple-400" /> Profile Name
                  </label>
                  <input 
                    required
                    type="text"
                    placeholder="elena_g"
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500/50 transition-all text-sm text-white placeholder:text-gray-700 font-medium"
                    value={formData.profileName}
                    onChange={(e) => setFormData({...formData, profileName: e.target.value})}
                  />
                </div>
              </div>

              {/* Project Name */}
              <div>
                <label className="block text-[9px] md:text-[10px] font-black text-gray-500 mb-2 uppercase tracking-widest flex items-center gap-2">
                  <Briefcase className="w-3 h-3 text-purple-400" /> Project Name
                </label>
                <input 
                  required
                  type="text"
                  placeholder="App Dashboard"
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500/50 transition-all text-sm text-white placeholder:text-gray-700 font-medium"
                  value={formData.projectName}
                  onChange={(e) => setFormData({...formData, projectName: e.target.value})}
                />
              </div>

              {/* Timelines */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] md:text-[10px] font-black text-gray-500 mb-2 uppercase tracking-widest flex items-center gap-2">
                    <Calendar className="w-3 h-3 text-purple-400" /> Assigned Date
                  </label>
                  <input 
                    required
                    type="date"
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500/50 transition-all text-sm text-white [color-scheme:dark] font-mono"
                    value={formData.assignedDate}
                    onChange={(e) => setFormData({...formData, assignedDate: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-[9px] md:text-[10px] font-black text-gray-500 mb-2 uppercase tracking-widest flex items-center gap-2">
                    <Clock className="w-3 h-3 text-rose-400" /> Delivery Date
                  </label>
                  <input 
                    required
                    type="date"
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-rose-500/50 transition-all text-sm text-white [color-scheme:dark] font-mono"
                    value={formData.deliveryDate}
                    onChange={(e) => setFormData({...formData, deliveryDate: e.target.value})}
                  />
                </div>
              </div>

              {/* Finance & Scale */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] md:text-[10px] font-black text-gray-500 mb-2 uppercase tracking-widest">Value (USD)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-500 text-xs font-black">$</span>
                    <input 
                      required
                      type="number"
                      placeholder="2500"
                      className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-8 pr-4 py-3 focus:outline-none focus:border-purple-500/50 transition-all text-sm text-white font-mono"
                      value={formData.projectValue}
                      onChange={(e) => setFormData({...formData, projectValue: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[9px] md:text-[10px] font-black text-gray-500 mb-2 uppercase tracking-widest">Scope (Units)</label>
                  <input 
                    required
                    type="number"
                    placeholder="12"
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500/50 transition-all text-sm text-white font-mono"
                    value={formData.pageCount}
                    onChange={(e) => setFormData({...formData, pageCount: e.target.value})}
                  />
                </div>
              </div>

              {/* IDENTITY THEME SELECTION IMPROVED */}
              <div>
                <label className="block text-[9px] md:text-[10px] font-black text-gray-500 mb-3 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Palette className="w-3 h-3 text-purple-400" /> Identity Theme Protocol
                </label>
                <div className="flex flex-wrap gap-3 md:gap-4 p-3 md:p-4 bg-white/[0.02] border border-white/10 rounded-2xl justify-center items-center">
                  {THEME_COLORS.map(color => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setFormData({...formData, themeColor: color.value})}
                      className={`
                        group relative w-10 h-10 md:w-12 md:h-12 rounded-2xl border border-white/10 transition-all duration-300 flex items-center justify-center
                        ${color.class} 
                        ${formData.themeColor === color.value 
                          ? 'ring-2 ring-purple-500 ring-offset-4 ring-offset-black scale-110 shadow-[0_0_20px_rgba(168,85,247,0.4)]' 
                          : 'opacity-30 grayscale-[50%] hover:opacity-80 hover:scale-105 hover:grayscale-0'}
                      `}
                      title={color.name}
                    >
                      {formData.themeColor === color.value && (
                        <Check className="w-5 h-5 md:w-6 md:h-6 text-white drop-shadow-md animate-in zoom-in duration-200" />
                      )}
                      <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-[8px] font-black text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none uppercase tracking-widest">
                        {color.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[9px] md:text-[10px] font-black text-gray-500 mb-2 uppercase tracking-widest flex items-center gap-2">
                  <Link className="w-3 h-3 text-purple-400" /> Workspace Node URL
                </label>
                <input 
                  required
                  type="url"
                  placeholder="https://github.com/project"
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500/50 transition-all text-sm text-white placeholder:text-gray-700"
                  value={formData.projectUrl}
                  onChange={(e) => setFormData({...formData, projectUrl: e.target.value})}
                />
              </div>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row gap-3 md:gap-4">
              <button 
                type="button" 
                onClick={onClose} 
                className="flex-1 px-6 py-3 md:py-4 border border-white/10 rounded-xl hover:bg-white/5 text-gray-500 font-black text-[9px] md:text-[10px] uppercase tracking-widest transition-all"
              >
                Abort
              </button>
              <button 
                type="submit" 
                className="flex-1 px-6 py-3 md:py-4 bg-gradient-to-r from-purple-600 to-indigo-700 hover:from-purple-500 hover:to-indigo-600 rounded-xl font-black text-[9px] md:text-[10px] uppercase tracking-widest text-white shadow-xl shadow-purple-900/40 transition-all active:scale-95"
              >
                Initialize Sync
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleBulkSubmit} className="p-4 md:p-6 space-y-6">
            <div className="space-y-6">
              <div className="p-8 border-2 border-dashed border-white/10 rounded-3xl bg-white/[0.01] flex flex-col items-center justify-center gap-4 text-center group hover:border-purple-500/30 transition-all cursor-pointer relative">
                <input 
                  type="file" 
                  accept=".csv" 
                  onChange={handleCsvUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <div className="w-16 h-16 bg-purple-500/10 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Upload className="w-8 h-8 text-purple-500" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-widest">Select CSV Node</h3>
                  <p className="text-[10px] text-gray-500 font-bold mt-1 uppercase tracking-tight">Drop your project ledger here or click to browse</p>
                </div>
              </div>

              {csvData && (
                <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                      <FileText className="w-3 h-3 text-purple-400" /> Data Preview
                    </label>
                    <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">Ready for ingestion</span>
                  </div>
                  <textarea 
                    readOnly
                    className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-[10px] font-mono text-gray-400 h-32 resize-none focus:outline-none"
                    value={csvData}
                  />
                </div>
              )}

              {csvError && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-start gap-3 animate-in shake duration-300">
                  <AlertCircle className="w-4 h-4 text-rose-500 mt-0.5" />
                  <div>
                    <h4 className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Ingestion Error</h4>
                    <p className="text-[10px] text-rose-500/70 font-bold mt-0.5">{csvError}</p>
                  </div>
                </div>
              )}

              <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl space-y-3">
                <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-widest">CSV Structure Requirements</h4>
                <div className="grid grid-cols-2 gap-2">
                  {['Member Name', 'Project Name', 'Assigned Date', 'Delivery Date', 'Value (USD)', 'Scope (Units)', 'Profile Name', 'Workspace Node URL'].map(col => (
                    <div key={col} className="flex items-center gap-2">
                      <div className="w-1 h-1 bg-purple-500 rounded-full"></div>
                      <span className="text-[9px] font-bold text-gray-600">{col}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row gap-3 md:gap-4">
              <button 
                type="button" 
                onClick={onClose} 
                className="flex-1 px-6 py-3 md:py-4 border border-white/10 rounded-xl hover:bg-white/5 text-gray-500 font-black text-[9px] md:text-[10px] uppercase tracking-widest transition-all"
              >
                Abort
              </button>
              <button 
                type="submit" 
                disabled={!csvData}
                className={`flex-1 px-6 py-3 md:py-4 rounded-xl font-black text-[9px] md:text-[10px] uppercase tracking-widest text-white shadow-xl transition-all active:scale-95 ${!csvData ? 'bg-gray-800 text-gray-600 cursor-not-allowed' : 'bg-gradient-to-r from-purple-600 to-indigo-700 hover:from-purple-500 hover:to-indigo-600 shadow-purple-900/40'}`}
              >
                Execute Bulk Sync
              </button>
            </div>
          </form>
        )}
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

export default AddMemberModal;
