import React, { useState } from 'react';
import { X, Plus, Trash2, Shield, Eye, EyeOff } from 'lucide-react';
import { GuestAccess } from '../types';

interface AccessControlModalProps {
  guests: GuestAccess[];
  onUpdate: (guests: GuestAccess[]) => void;
  onClose: () => void;
}

const AccessControlModal: React.FC<AccessControlModalProps> = ({ guests, onUpdate, onClose }) => {
  const [localGuests, setLocalGuests] = useState<GuestAccess[]>(guests || []);
  const [newEmail, setNewEmail] = useState('');

  const handleAddGuest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || localGuests.some(g => g.email === newEmail.trim())) return;
    
    const newGuest: GuestAccess = {
      email: newEmail.trim(),
      canViewFleet: true,
      canViewDelivery: true,
      canViewLedger: true,
      canViewFinancials: false
    };
    
    setLocalGuests([...localGuests, newGuest]);
    setNewEmail('');
  };

  const handleRemoveGuest = (email: string) => {
    setLocalGuests(localGuests.filter(g => g.email !== email));
  };

  const handleTogglePermission = (email: string, field: keyof GuestAccess) => {
    setLocalGuests(localGuests.map(g => {
      if (g.email === email) {
        return { ...g, [field]: !g[field] };
      }
      return g;
    }));
  };

  const handleSave = () => {
    onUpdate(localGuests);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Shield className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white uppercase tracking-widest">Access Control</h2>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Manage guest viewer permissions</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <form onSubmit={handleAddGuest} className="flex gap-3">
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="Enter guest email address..."
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500/50 transition-colors"
              required
            />
            <button
              type="submit"
              className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Guest
            </button>
          </form>

          <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
            {localGuests.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm font-bold">
                No guests added yet. Add an email above to grant access.
              </div>
            ) : (
              localGuests.map(guest => (
                <div key={guest.email} className="bg-white/[0.02] border border-white/5 rounded-xl p-4 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black text-white">{guest.email}</span>
                    <button onClick={() => handleRemoveGuest(guest.email)} className="p-1.5 text-gray-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <PermissionToggle 
                      label="Fleet Ops" 
                      active={guest.canViewFleet} 
                      onClick={() => handleTogglePermission(guest.email, 'canViewFleet')} 
                    />
                    <PermissionToggle 
                      label="Delivery" 
                      active={guest.canViewDelivery} 
                      onClick={() => handleTogglePermission(guest.email, 'canViewDelivery')} 
                    />
                    <PermissionToggle 
                      label="Ledger" 
                      active={guest.canViewLedger} 
                      onClick={() => handleTogglePermission(guest.email, 'canViewLedger')} 
                    />
                    <PermissionToggle 
                      label="Financials" 
                      active={guest.canViewFinancials} 
                      onClick={() => handleTogglePermission(guest.email, 'canViewFinancials')} 
                      isSensitive
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="p-6 border-t border-white/10 bg-white/[0.02] flex justify-end gap-3">
          <button onClick={onClose} className="px-6 py-2.5 text-[10px] font-black text-gray-400 hover:text-white uppercase tracking-widest transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors shadow-[0_0_20px_rgba(16,185,129,0.2)]">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

const PermissionToggle = ({ label, active, onClick, isSensitive = false }: { label: string, active: boolean, onClick: () => void, isSensitive?: boolean }) => (
  <button
    onClick={onClick}
    className={`flex items-center justify-between p-2 rounded-lg border transition-all ${
      active 
        ? (isSensitive ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-purple-500/10 border-purple-500/30 text-purple-400')
        : 'bg-white/5 border-white/5 text-gray-500 hover:bg-white/10'
    }`}
  >
    <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
    {active ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
  </button>
);

export default AccessControlModal;
