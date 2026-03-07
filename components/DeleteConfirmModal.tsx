
import React from 'react';
import { AlertCircle, Trash2, X } from 'lucide-react';
import GlassCard from './GlassCard';

interface DeleteConfirmModalProps {
  memberName: string;
  onClose: () => void;
  onConfirm: () => void;
}

const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({ memberName, onClose, onConfirm }) => {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
      <GlassCard className="w-full max-w-sm overflow-hidden border-rose-500/30 shadow-[0_0_50px_rgba(244,63,94,0.1)]">
        <div className="p-6 text-center">
          <div className="mx-auto w-14 h-14 bg-rose-500/10 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-rose-500 animate-pulse" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Confirm Removal</h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            Are you sure you want to remove <span className="text-rose-400 font-semibold">{memberName}</span> from the team? This action is permanent.
          </p>
          
          <div className="flex gap-3 mt-8">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-white/10 rounded-xl hover:bg-white/5 transition-all font-semibold text-gray-400 text-sm"
            >
              Cancel
            </button>
            <button 
              type="button"
              onClick={onConfirm}
              className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 rounded-xl font-bold transition-all active:scale-95 text-white shadow-lg shadow-rose-900/40 text-sm flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        </div>
        
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-gray-500 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </GlassCard>
    </div>
  );
};

export default DeleteConfirmModal;
