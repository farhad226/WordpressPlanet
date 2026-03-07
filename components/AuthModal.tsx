
import React, { useState } from 'react';
import { Mail, Lock, User as UserIcon, LogIn, ArrowRight, ShieldCheck, Sparkles, AlertTriangle, Fingerprint, CloudLightning, RefreshCw } from 'lucide-react';
import { supabase } from '../services/supabase';
import { User, UserStorageData } from '../types';
import GlassCard from './GlassCard';

interface AuthModalProps {
  onAuthSuccess: (user: User) => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [syncCode, setSyncCode] = useState('');
  const [showSync, setShowSync] = useState(false);
  const [error, setError] = useState('');
  const [isFocused, setIsFocused] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resetCooldown, setResetCooldown] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!email || !password) {
      setError('Missing credentials. Please check all fields.');
      setIsLoading(false);
      return;
    }

    try {
      if (isLogin) {
        // Check if using placeholder credentials
        if (supabase.auth.getSession === undefined || (supabase as any).supabaseUrl?.includes('placeholder')) {
          setError('System configuration error: Supabase credentials are missing. Please check your environment variables.');
          setIsLoading(false);
          return;
        }

        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (authError) throw authError;

        if (data.user) {
          onAuthSuccess({ email: data.user.email! });
        }
      } else {
        // Check if using placeholder credentials
        if (supabase.auth.signUp === undefined || (supabase as any).supabaseUrl?.includes('placeholder')) {
          setError('System configuration error: Supabase credentials are missing. Please check your environment variables.');
          setIsLoading(false);
          return;
        }

        // Register logic with Supabase
        const { data, error: authError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (authError) throw authError;

        if (data.user) {
          // If session is null, it means email confirmation is required
          if (!data.session) {
            setError('Please check your inbox to confirm your email before logging in.');
            setIsLoading(false);
            return;
          }
          
          // Portability: If they provided a sync code, save it to their data key
          if (syncCode.trim()) {
            try {
              const decoded = atob(syncCode);
              const storageData: UserStorageData = JSON.parse(decoded);
              // We save this to Supabase immediately for the new user
              const { error: saveError } = await supabase
                .from('user_data')
                .upsert({ 
                  email: data.user.email, 
                  data: storageData, 
                  updated_at: new Date().toISOString() 
                }, { onConflict: 'email' });
              
              if (saveError) console.error("Initial sync failed:", saveError);
            } catch (e) {
              console.error("Sync code corruption detected.");
            }
          }
          
          onAuthSuccess({ email: data.user.email! });
        }
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      let message = err.message || 'Authentication failed. Please try again.';
      
      if (message.includes('Invalid login credentials')) {
        message = "Invalid credentials. If you haven't joined yet, please switch to 'Join Team' below. If you have, check your password.";
      } else if (message.includes('Email not confirmed')) {
        message = 'Please check your inbox to confirm your email before logging in.';
      } else if (message.includes('User already registered')) {
        message = 'This Terminal ID is already registered. Please login instead.';
      } else if (message.toLowerCase().includes('rate limit')) {
        message = 'Security Protocol: Email rate limit reached. Please wait 5-10 minutes before trying to resend or reset again.';
        // Set a temporary cooldown on the main button too
        setResendCooldown(60);
      }
      
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!email) {
      setError('Please enter your Terminal ID to resend confirmation.');
      return;
    }
    if (resendCooldown > 0) return;

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      });
      if (error) throw error;
      setError('Confirmation link resent. Please check your inbox.');
      setResendCooldown(60);
      const timer = setInterval(() => {
        setResendCooldown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err: any) {
      let message = err.message || 'Failed to resend confirmation.';
      if (message.includes('Email rate limit exceeded')) {
        message = 'Email limit reached. Please wait a few minutes before trying again.';
      }
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      setError('Please enter your email to reset password.');
      return;
    }
    if (resetCooldown > 0) return;

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      setError('Password reset link sent to your email.');
      setResetCooldown(60);
      const timer = setInterval(() => {
        setResetCooldown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err: any) {
      let message = err.message || 'Failed to send reset link.';
      if (message.includes('Email rate limit exceeded')) {
        message = 'Email limit reached. Please wait a few minutes before trying again.';
      }
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#050505] p-4 sm:p-6">
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] animate-pulse-slow"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-20" style={{ backgroundImage: 'radial-gradient(circle, #ffffff11 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
      </div>

      <GlassCard className="w-full max-w-[440px] max-h-[90vh] overflow-y-auto custom-scrollbar border-white/10 shadow-[0_30px_100px_rgba(0,0,0,0.9)] relative z-10 animate-in zoom-in-95 fade-in duration-500 ring-1 ring-white/5">
        <div className="p-6 sm:p-10">
          <div className="flex flex-col items-center mb-8 sm:mb-10 text-center">
            <div className="relative mb-4 sm:mb-6">
              <div className="absolute inset-0 bg-purple-500 blur-2xl opacity-20 animate-pulse"></div>
              <div className="relative w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-tr from-purple-600 to-indigo-600 rounded-[2rem] sm:rounded-[2.5rem] flex items-center justify-center shadow-2xl ring-1 ring-white/30 animate-float transform hover:rotate-12 transition-transform duration-500">
                <Fingerprint className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
              </div>
            </div>
            
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight uppercase leading-none">
              WP <span className="bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">TEAM</span>
            </h2>
            <p className="text-[8px] sm:text-[10px] text-gray-500 font-bold uppercase tracking-[0.4em] mt-2 sm:mt-3 opacity-60">
              {isLogin ? 'Authorization Required' : 'Create Access Profile'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
            <div className="space-y-2 group">
              <label className={`text-[9px] sm:text-[10px] font-black uppercase tracking-widest flex items-center gap-2 px-1 transition-colors duration-300 ${isFocused === 'email' ? 'text-purple-400' : 'text-gray-500'}`}>
                <Mail className={`w-3 h-3 transition-transform ${isFocused === 'email' ? 'scale-110' : ''}`} /> Terminal ID
              </label>
              <div className="relative">
                <input 
                  type="email"
                  placeholder="name@planet.wp"
                  onFocus={() => setIsFocused('email')}
                  onBlur={() => setIsFocused(null)}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-4 sm:px-5 py-3 sm:py-4 focus:outline-none focus:border-purple-500/50 focus:bg-white/[0.06] focus:ring-4 focus:ring-purple-500/5 transition-all text-xs sm:text-sm font-medium text-white placeholder:text-gray-700 shadow-inner"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2 group">
              <div className="flex items-center justify-between px-1">
                <label className={`text-[9px] sm:text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-colors duration-300 ${isFocused === 'password' ? 'text-purple-400' : 'text-gray-500'}`}>
                  <Lock className={`w-3 h-3 transition-transform ${isFocused === 'password' ? 'scale-110' : ''}`} /> Security Key
                </label>
                {isLogin && (
                  <button 
                    type="button"
                    disabled={isLoading || resetCooldown > 0}
                    onClick={handleResetPassword}
                    className="text-[8px] sm:text-[9px] font-black text-purple-500 uppercase tracking-widest hover:text-purple-400 transition-colors disabled:opacity-50"
                  >
                    {resetCooldown > 0 ? `Wait ${resetCooldown}s` : 'Forgot?'}
                  </button>
                )}
              </div>
              <div className="relative">
                <input 
                  type="password"
                  placeholder="••••••••"
                  onFocus={() => setIsFocused('password')}
                  onBlur={() => setIsFocused(null)}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-4 sm:px-5 py-3 sm:py-4 focus:outline-none focus:border-purple-500/50 focus:bg-white/[0.06] focus:ring-4 focus:ring-purple-500/5 transition-all text-xs sm:text-sm font-medium text-white placeholder:text-gray-700 shadow-inner"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {!isLogin && (
              <div className="space-y-2">
                <button 
                  type="button" 
                  onClick={() => setShowSync(!showSync)}
                  className="text-[8px] sm:text-[9px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2 hover:text-emerald-400 transition-colors"
                >
                  <CloudLightning className="w-3 h-3" />
                  {showSync ? "Hide Portability Options" : "Advanced: Sync Existing Node?"}
                </button>
                {showSync && (
                  <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                    <textarea 
                      placeholder="Paste your Node Sync String here to restore your data from another browser..."
                      className="w-full bg-emerald-500/[0.03] border border-emerald-500/10 rounded-2xl p-4 focus:outline-none focus:border-emerald-500/40 transition-all text-[9px] sm:text-[10px] font-mono text-emerald-100 placeholder:text-emerald-900 h-24 custom-scrollbar resize-none"
                      value={syncCode}
                      onChange={(e) => setSyncCode(e.target.value)}
                    />
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="p-3 sm:p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex flex-col gap-3 animate-in slide-in-from-top-2 duration-300">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-rose-500/20 rounded-lg">
                    <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                  </div>
                  <p className="text-[9px] sm:text-[10px] font-black text-rose-500 uppercase tracking-widest leading-tight">{error}</p>
                </div>
                {error.includes('confirm your email') && (
                  <button 
                    type="button"
                    disabled={isLoading || resendCooldown > 0}
                    onClick={handleResendConfirmation}
                    className="text-[8px] sm:text-[9px] font-black text-white bg-rose-500/20 hover:bg-rose-500/40 py-2 rounded-xl transition-colors uppercase tracking-widest disabled:opacity-50"
                  >
                    {resendCooldown > 0 ? `Wait ${resendCooldown}s to Resend` : 'Resend Confirmation Link'}
                  </button>
                )}
              </div>
            )}

            <button 
              type="submit"
              disabled={isLoading || resendCooldown > 0}
              className="w-full group relative py-3.5 sm:py-4 bg-white text-black font-black text-[10px] sm:text-[11px] uppercase tracking-[0.3em] rounded-2xl shadow-xl shadow-purple-900/10 transition-all hover:bg-purple-500 hover:text-white active:scale-[0.97] flex items-center justify-center gap-3 mt-4 overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <span className="relative z-10 flex items-center gap-2">
                {isLoading ? (
                  <>
                    Processing <RefreshCw className="w-4 h-4 animate-spin" />
                  </>
                ) : resendCooldown > 0 ? (
                  <>
                    Cooldown Active ({resendCooldown}s) <CloudLightning className="w-4 h-4 animate-pulse" />
                  </>
                ) : isLogin ? (
                  <>
                    Access System <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                ) : (
                  <>
                    Deploy Identity <Sparkles className="w-4 h-4 animate-spin-slow" />
                  </>
                )}
              </span>
            </button>
          </form>

          <div className="mt-8 sm:mt-10 pt-6 sm:pt-8 border-t border-white/10 text-center">
            <button 
              onClick={() => { setIsLogin(!isLogin); setError(''); setShowSync(false); setSyncCode(''); }}
              className="group text-[9px] sm:text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center justify-center gap-2 mx-auto"
            >
              <span className="opacity-50 group-hover:opacity-80 transition-opacity">
                {isLogin ? "Require new node access?" : "Already possess an active link?"}
              </span>
              <span className="text-white hover:text-purple-400 transition-colors font-black underline decoration-purple-500/30 decoration-2 underline-offset-4">
                {isLogin ? "Join Team" : "Login Now"}
              </span>
            </button>
          </div>
        </div>
        
        <div className="py-3 sm:py-4 bg-white/[0.02] border-t border-white/5 text-center">
           <p className="text-[7px] sm:text-[8px] font-black text-gray-700 uppercase tracking-[0.4em] opacity-40">Biometric Verification Enabled • WP.T V5.2</p>
        </div>
      </GlassCard>

      <style>{`
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.1; }
          50% { opacity: 0.15; }
        }
        .animate-pulse-slow { animation: pulse-slow 8s ease-in-out infinite; }
        .animate-spin-slow { animation: rotate 3s linear infinite; }
        @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .custom-scrollbar::-webkit-scrollbar { height: 6px; width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.01); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(16, 185, 129, 0.2); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(16, 185, 129, 0.4); }
      `}</style>
    </div>
  );
};

export default AuthModal;
