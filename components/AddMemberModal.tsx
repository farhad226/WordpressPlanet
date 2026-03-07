
import React, { useState } from 'react';
import { X, User, Calendar, DollarSign, Layers, Link, BarChart, Palette, Briefcase, Clock, Check } from 'lucide-react';
import { TeamMember } from '../types';
import GlassCard from './GlassCard';

interface AddMemberModalProps {
  onClose: () => void;
  onSubmit: (member: Omit<TeamMember, 'id'>) => void;
}

const THEME_COLORS = [
  { name: 'Purple', value: 'purple', class: 'bg-purple-500' },
  { name: 'Blue', value: 'blue', class: 'bg-blue-500' },
  { name: 'Emerald', value: 'emerald', class: 'bg-emerald-500' },
  { name: 'Rose', value: 'rose', class: 'bg-rose-500' },
  { name: 'Amber', value: 'amber', class: 'bg-amber-500' },
];

const AddMemberModal: React.FC<AddMemberModalProps> = ({ onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: '',
    projectName: '',
    assignedDate: new Date().toISOString().split('T')[0],
    deliveryDate: '',
    projectValue: '',
    pageCount: '',
    projectUrl: '',
    progress: '10',
    themeColor: 'purple'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name: formData.name,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <GlassCard className="w-full max-w-lg max-h-[90vh] overflow-y-auto custom-scrollbar shadow-[0_0_80px_rgba(168,85,247,0.1)] border-white/20">
        <div className="p-4 md:p-6 border-b border-white/10 flex justify-between items-center bg-white/5 sticky top-0 z-10 backdrop-blur-xl">
          <div>
            <h2 className="text-lg md:text-xl font-bold text-white tracking-tight uppercase">Project Initialization</h2>
            <p className="text-[8px] md:text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Assign member, project, and set timelines.</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

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
