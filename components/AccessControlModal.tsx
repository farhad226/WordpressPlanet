import React, { useState } from 'react';
import { X, Plus, Trash2, Shield, Eye, EyeOff, Link as LinkIcon, CheckCircle2, Mail } from 'lucide-react';
import { GuestAccess, UserRole } from '../types';

interface AccessControlModalProps {
  guests: GuestAccess[];
  onUpdate: (guests: GuestAccess[]) => void;
  onClose: () => void;
}

const AccessControlModal: React.FC<AccessControlModalProps> = ({ guests, onUpdate, onClose }) => {
  const [localGuests, setLocalGuests] = useState<GuestAccess[]>(guests || []);
  const [newEmail, setNewEmail] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  const handleAddGuest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || localGuests.some(g => g.email === newEmail.trim())) return;
    
    const newGuest: GuestAccess = {
      email: newEmail.trim(),
      role: 'Viewer',
      canEdit: false,
      canViewFleet: true,
      canViewScheduled: true,
      canViewDelivery: true,
      canViewLedger: true,
      canViewPerformance: false,
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

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleSendInvite = (email: string) => {
    const subject = encodeURIComponent("Access Granted: WP Team Dashboard");
    const body = encodeURIComponent(`Hello,\n\nYou have been granted access to the WP Team Dashboard.\n\nLogin URL: ${window.location.origin}\nUsername: ${email}\nPassword: [Please click 'Join Team' on the login page to create your password]\n\nBest regards,\nAdmin`);
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
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
              <h2 className="text-lg font-black text-white uppercase tracking-widest">Manage Guests</h2>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Manage guest viewer permissions</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleCopyLink}
              className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] font-black uppercase tracking-widest text-gray-300 transition-colors"
            >
              {copiedLink ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <LinkIcon className="w-3.5 h-3.5" />}
              {copiedLink ? 'Copied!' : 'Copy App Link'}
            </button>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
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
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
                    <span className="text-sm font-black text-white truncate max-w-full sm:max-w-[200px]">{guest.email}</span>
                    <div className="flex items-center gap-2 sm:gap-3 self-end sm:self-auto">
                      <select 
                        value={guest.role}
                        onChange={(e) => {
                          const newRole = e.target.value as UserRole;
                          let newPermissions = { ...guest, role: newRole };
                          if (newRole === 'Admin') {
                            newPermissions = { ...newPermissions, canEdit: true, canViewFleet: true, canViewScheduled: true, canViewDelivery: true, canViewLedger: true, canViewPerformance: true, canViewFinancials: true };
                          } else if (newRole === 'Editor') {
                            newPermissions = { ...newPermissions, canEdit: true, canViewFleet: true, canViewScheduled: true, canViewDelivery: true, canViewLedger: true, canViewPerformance: false, canViewFinancials: false };
                          } else {
                            newPermissions = { ...newPermissions, canEdit: false, canViewFleet: true, canViewScheduled: true, canViewDelivery: true, canViewLedger: false, canViewPerformance: false, canViewFinancials: false };
                          }
                          setLocalGuests(localGuests.map(g => g.email === guest.email ? newPermissions : g));
                        }}
                        className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[10px] font-black uppercase tracking-widest text-white focus:outline-none focus:border-purple-500/50"
                      >
                        <option value="Admin" className="bg-gray-900 text-white">Admin</option>
                        <option value="Editor" className="bg-gray-900 text-white">Editor</option>
                        <option value="Viewer" className="bg-gray-900 text-white">Viewer</option>
                      </select>
                      <button 
                        onClick={() => handleSendInvite(guest.email)} 
                        className="flex items-center gap-1.5 px-2 py-1.5 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors text-[9px] font-black uppercase tracking-widest"
                        title="Send Invite Email"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        Email
                      </button>
                      <button 
                        onClick={() => handleRemoveGuest(guest.email)} 
                        className="p-1.5 text-gray-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                        title="Remove Guest"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <PermissionToggle 
                      label="Fleet Ops" 
                      active={guest.canViewFleet} 
                      onClick={() => handleTogglePermission(guest.email, 'canViewFleet')} 
                    />
                    <PermissionToggle 
                      label="Scheduled Ops" 
                      active={guest.canViewScheduled} 
                      onClick={() => handleTogglePermission(guest.email, 'canViewScheduled')} 
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
                      label="Performance" 
                      active={guest.canViewPerformance} 
                      onClick={() => handleTogglePermission(guest.email, 'canViewPerformance')} 
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
