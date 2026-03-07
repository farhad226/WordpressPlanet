
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Trash2, 
  ExternalLink, 
  TrendingUp, 
  DollarSign, 
  Layers,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  Calendar,
  Link as LinkIcon,
  Briefcase,
  Bell,
  Clock,
  AlertTriangle,
  X,
  Zap,
  ShieldAlert,
  Hourglass,
  Timer,
  Globe,
  Sparkles,
  Edit2,
  Info,
  Rocket,
  Activity,
  History,
  BarChart3,
  Award,
  ListFilter,
  Package,
  LogOut,
  User as UserIcon,
  CloudLightning,
  Copy,
  CheckCircle2,
  Share2,
  TrendingDown,
  BarChart,
  RefreshCw,
  Database,
  Lock,
  Shield
} from 'lucide-react';
import { TeamMember, SortField, HistoricalProject, User, UserStorageData, GuestAccess } from './types';
import GlassCard from './components/GlassCard';
import AddMemberModal from './components/AddMemberModal';
import DeleteConfirmModal from './components/DeleteConfirmModal';
import EditLogoModal from './components/EditLogoModal';
import AuthModal from './components/AuthModal';
import AccessControlModal from './components/AccessControlModal';
import { SyncService } from './services/SyncService';
import { supabase } from './services/supabase';
import { SEED_MEMBERS } from './seedData';

const DEFAULT_LOGO_URL = 'https://i.imgur.com/8Qp6u8f.png'; 

const App: React.FC = () => {
  // Authentication state
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // 0. AUTH SESSION TRACKING: Listen for Supabase Auth state changes
  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setCurrentUser({ email: session.user.email! });
      }
    });

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setCurrentUser({ email: session.user.email! });
      } else {
        setCurrentUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // User-specific data states
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [history, setHistory] = useState<HistoricalProject[]>([]);
  const [logoUrl, setLogoUrl] = useState(DEFAULT_LOGO_URL);

  // UI & Sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCloudSaving, setIsCloudSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'fleet' | 'delivery' | 'ledger' | 'performance'>('fleet');
  const [searchQuery, setSearchQuery] = useState('');
  const [ledgerSearchQuery, setLedgerSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditLogoModalOpen, setIsEditLogoModalOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    name: '',
    projectName: '',
    profileName: ''
  });
  const [memberToDelete, setMemberToDelete] = useState<TeamMember | null>(null);
  const [historyMemberToDelete, setHistoryMemberToDelete] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [copyStatus, setCopyStatus] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const isAdmin = useMemo(() => currentUser?.email === 'farhadhossain6920@gmail.com', [currentUser]);

  const [guests, setGuests] = useState<GuestAccess[]>([]);
  const [guestPermissions, setGuestPermissions] = useState<GuestAccess | null>(null);
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
  const [expandedMember, setExpandedMember] = useState<string | null>(null);

  useEffect(() => {
    if (guestPermissions) {
      if (activeTab === 'fleet' && !guestPermissions.canViewFleet) {
        setActiveTab(guestPermissions.canViewDelivery ? 'delivery' : (guestPermissions.canViewLedger ? 'ledger' : 'fleet'));
      } else if (activeTab === 'delivery' && !guestPermissions.canViewDelivery) {
        setActiveTab(guestPermissions.canViewFleet ? 'fleet' : (guestPermissions.canViewLedger ? 'ledger' : 'fleet'));
      } else if (activeTab === 'ledger' && !guestPermissions.canViewLedger) {
        setActiveTab(guestPermissions.canViewFleet ? 'fleet' : (guestPermissions.canViewDelivery ? 'delivery' : 'fleet'));
      }
    }
  }, [guestPermissions, activeTab]);

  // 1. DATA INITIALIZATION: Connect Auth ID to Central Data Node
  useEffect(() => {
    const initializeUserNode = async () => {
      if (currentUser) {
        setIsSyncing(true);
        try {
          if (isAdmin) {
            const cloudData = await SyncService.fetchUserData(currentUser.email);
            setMembers(cloudData.members);
            setHistory(cloudData.history);
            setLogoUrl(cloudData.logoUrl || DEFAULT_LOGO_URL);
            setGuests((cloudData.guests || []).map(g => ({ ...g, role: g.role || 'Viewer', canEdit: g.canEdit ?? false })));
            setGuestPermissions(null);
          } else {
            const adminData = await SyncService.fetchUserData('farhadhossain6920@gmail.com');
            const guestAccess = adminData.guests?.find(g => g.email === currentUser.email);
            
            if (guestAccess) {
              setMembers(adminData.members);
              setHistory(adminData.history);
              setLogoUrl(adminData.logoUrl || DEFAULT_LOGO_URL);
              setGuestPermissions(guestAccess);
            } else {
              const cloudData = await SyncService.fetchUserData(currentUser.email);
              setMembers(cloudData.members);
              setHistory(cloudData.history);
              setLogoUrl(cloudData.logoUrl || DEFAULT_LOGO_URL);
              setGuestPermissions(null);
            }
          }
        } catch (error) {
          console.error("Failed to sync with cloud node:", error);
        } finally {
          setIsSyncing(false);
        }
      }
    };

    initializeUserNode();
  }, [currentUser]);

  // 2. CENTRAL PERSISTENCE: Push updates to Cloud Store on change
  const saveToCloud = useCallback(async () => {
    if (currentUser && !isSyncing && !guestPermissions) {
      setIsCloudSaving(true);
      const data: UserStorageData = { members, history, logoUrl, guests };
      await SyncService.saveUserData(currentUser.email, data);
      setIsCloudSaving(false);
    }
  }, [members, history, logoUrl, guests, currentUser, isSyncing, guestPermissions]);

  useEffect(() => {
    const timeout = setTimeout(saveToCloud, 1000); // Debounce saves
    return () => clearTimeout(timeout);
  }, [saveToCloud]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setActiveTab('fleet');
  };

  const getExportString = () => {
    const data: UserStorageData = { members, history, logoUrl };
    return btoa(JSON.stringify(data));
  };

  const handleCopySync = () => {
    const str = getExportString();
    navigator.clipboard.writeText(str);
    setCopyStatus(true);
    setTimeout(() => setCopyStatus(false), 2000);
  };

  const getUpdateRule = (pages: number) => {
    if (pages === 1) return { hours: 24, label: '24H TARGET' };
    if (pages >= 2 && pages <= 5) return { hours: 48, label: '48H TARGET' };
    if (pages >= 6 && pages <= 10) return { hours: 96, label: '96H TARGET' };
    if (pages >= 11 && pages <= 15) return { hours: 48, label: '48H FAST UPDATE' };
    return { hours: 72, label: 'STANDARD TARGET' };
  };

  const getTimeRemaining = (deliveryDate: string) => {
    if (!deliveryDate) return { days: 0, hours: 0, totalHours: 0, isOverdue: false };
    const delivery = new Date(deliveryDate);
    const diff = delivery.getTime() - currentTime.getTime();
    if (isNaN(diff)) return { days: 0, hours: 0, totalHours: 0, isOverdue: false };
    if (diff <= 0) return { days: 0, hours: 0, totalHours: 0, isOverdue: true };
    const totalHours = diff / (1000 * 60 * 60);
    const days = Math.floor(totalHours / 24);
    const hours = Math.floor(totalHours % 24);
    return { days, hours, totalHours, isOverdue: false };
  };

  const isUpdateOverdue = (member: TeamMember) => {
    if (member.progress >= 100) return false;
    
    // Manual control takes precedence
    if (member.nextUpdateDate) {
      const nextUpdate = new Date(member.nextUpdateDate);
      if (!isNaN(nextUpdate.getTime())) {
        return currentTime.getTime() > nextUpdate.getTime();
      }
    }

    const targetHours = member.syncTargetHours || getUpdateRule(member.pageCount).hours;
    const assigned = new Date(member.assignedDate);
    if (isNaN(assigned.getTime())) return false;
    const diffInHours = (currentTime.getTime() - assigned.getTime()) / (1000 * 60 * 60);
    return diffInHours > targetHours;
  };

  const urgentNotifications = useMemo(() => {
    return members.filter(member => {
      if (member.isDelivered) return false;
      const remaining = getTimeRemaining(member.deliveryDate);
      const isUrgent = remaining.totalHours > 0 && remaining.totalHours <= 51;
      const isOverdue = remaining.isOverdue;
      return (isUrgent || isOverdue) && member.progress < 100;
    }).map(member => ({
      id: member.id,
      memberName: member.name,
      projectName: member.projectName,
      hoursLeft: getTimeRemaining(member.deliveryDate).totalHours,
      isOverdue: getTimeRemaining(member.deliveryDate).isOverdue
    }));
  }, [members, currentTime]);

  const deliveryStreamCount = useMemo(() => {
    return members.filter(m => m.isDelivered).length;
  }, [members]);

  const criticalProjects = useMemo(() => {
    return members.filter(member => {
      if (member.isDelivered) return false;
      const remaining = getTimeRemaining(member.deliveryDate);
      const overdue = isUpdateOverdue(member);
      const nearDeadline = remaining.totalHours > 0 && remaining.totalHours <= 51;
      const isActuallyOverdue = remaining.isOverdue;
      return ((nearDeadline || isActuallyOverdue || overdue) && member.progress < 100);
    });
  }, [members, currentTime]);

  const [ledgerMonthFilter, setLedgerMonthFilter] = useState<string>('All');

  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    history.forEach(item => {
      if (item.isDelivered && item.deliveryDate) {
        const date = new Date(item.deliveryDate);
        if (!isNaN(date.getTime())) {
          months.add(date.toLocaleString('default', { month: 'short', year: 'numeric' }));
        }
      }
    });
    return Array.from(months).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  }, [history]);

  const ledgerStats = useMemo(() => {
    const groups: Record<string, { 
      name: string, 
      color: string, 
      totalValue: number, 
      projectsCount: number, 
      avgProgress: number,
      monthlyBreakdown: Record<string, { projects: number, revenue: number }>,
      projectDetails: Array<{ id: string, name: string, value: number, progress: number, date: string }>
    }> = {};
    
    history.forEach(item => {
      let itemMonthYear = '';
      if (item.isDelivered && item.deliveryDate) {
        const dDate = new Date(item.deliveryDate);
        if (!isNaN(dDate.getTime())) {
          itemMonthYear = dDate.toLocaleString('default', { month: 'short', year: 'numeric' });
        }
      } else {
        const aDate = new Date(item.assignedDate);
        if (!isNaN(aDate.getTime())) {
          itemMonthYear = aDate.toLocaleString('default', { month: 'short', year: 'numeric' });
        }
      }

      if (ledgerMonthFilter !== 'All' && (!item.isDelivered || itemMonthYear !== ledgerMonthFilter)) {
        return; // If filtering by month, ONLY show delivered projects for that specific month
      }

      if (!groups[item.name]) {
        groups[item.name] = { 
          name: item.name, 
          color: item.themeColor, 
          totalValue: 0, 
          projectsCount: 0, 
          avgProgress: 0,
          monthlyBreakdown: {},
          projectDetails: []
        };
      }
      
      const monthYear = itemMonthYear || 'Unknown';
      
      if (!groups[item.name].monthlyBreakdown[monthYear]) {
        groups[item.name].monthlyBreakdown[monthYear] = { projects: 0, revenue: 0 };
      }
      
      groups[item.name].monthlyBreakdown[monthYear].projects += 1;
      groups[item.name].monthlyBreakdown[monthYear].revenue += item.projectValue;
      
      groups[item.name].totalValue += item.projectValue;
      groups[item.name].projectsCount += 1;
      groups[item.name].avgProgress += item.progress;
      groups[item.name].projectDetails.push({
        id: item.id,
        name: item.projectName,
        value: item.projectValue,
        progress: item.progress,
        date: item.isDelivered ? item.deliveryDate : item.assignedDate
      });
    });

    const result = Object.values(groups).map(g => ({
      ...g,
      avgProgress: Math.round(g.avgProgress / (g.projectsCount || 1)),
      sortedMonths: Object.entries(g.monthlyBreakdown).sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime()),
      projectDetails: g.projectDetails.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    })).sort((a, b) => b.totalValue - a.totalValue);

    if (ledgerSearchQuery.trim()) {
      const query = ledgerSearchQuery.toLowerCase();
      return result.filter(member => 
        member.name.toLowerCase().includes(query) || 
        member.projectDetails.some(p => p.name.toLowerCase().includes(query))
      );
    }

    return result;
  }, [history, ledgerSearchQuery]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleUpdateField = (id: string, field: keyof TeamMember, value: any) => {
    setMembers(prev => prev.map(m => {
      if (m.id === id) {
        const updatedMember = { ...m, [field]: value };
        if (field === 'deliveryDate') {
          updatedMember.assignedDate = new Date().toISOString().split('T')[0];
        }
        return updatedMember;
      }
      return m;
    }));
    setHistory(prev => prev.map(h => h.id === id ? { ...h, [field]: value } : h));
  };

  const filteredAndSortedMembers = useMemo(() => {
    let base = members;
    if (activeTab === 'fleet') {
      base = members.filter(m => !m.isDelivered);
    } else if (activeTab === 'delivery') {
      base = members.filter(m => m.isDelivered);
    }

    const filtered = base.filter(member => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery || 
        member.name.toLowerCase().includes(searchLower) ||
        member.projectName.toLowerCase().includes(searchLower) ||
        (member.profileName && member.profileName.toLowerCase().includes(searchLower));
      
      const matchesName = !filters.name || member.name.toLowerCase().includes(filters.name.toLowerCase());
      const matchesProject = !filters.projectName || member.projectName.toLowerCase().includes(filters.projectName.toLowerCase());
      const matchesProfile = !filters.profileName || (member.profileName && member.profileName.toLowerCase().includes(filters.profileName.toLowerCase()));

      return matchesSearch && matchesName && matchesProject && matchesProfile;
    });

    return [...filtered].sort((a, b) => {
      let comparison = 0;
      if (sortField === 'name') comparison = (a.name || '').localeCompare(b.name || '');
      else if (sortField === 'projectName') comparison = (a.projectName || '').localeCompare(b.projectName || '');
      else if (sortField === 'projectValue') comparison = a.projectValue - b.projectValue;
      else if (sortField === 'progress') comparison = a.progress - b.progress;
      else if (sortField === 'deliveryDate') comparison = new Date(a.deliveryDate).getTime() - new Date(b.deliveryDate).getTime();
      else if (sortField === 'assignedDate') comparison = new Date(a.assignedDate).getTime() - new Date(b.assignedDate).getTime();
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [members, searchQuery, sortField, sortOrder, activeTab]);

  const totalValue = members.reduce((sum, m) => sum + (Number(m.projectValue) || 0), 0);
  const deliveredTotalValue = members.filter(m => m.isDelivered).reduce((sum, m) => sum + (Number(m.projectValue) || 0), 0);
  
  const deliveredThisMonthValue = useMemo(() => {
    const currentMonth = currentTime.getMonth();
    const currentYear = currentTime.getFullYear();
    return members.filter(m => {
      if (!m.isDelivered) return false;
      const deliveryDate = new Date(m.deliveryDate);
      return deliveryDate.getMonth() === currentMonth && deliveryDate.getFullYear() === currentYear;
    }).reduce((sum, m) => sum + (Number(m.projectValue) || 0), 0);
  }, [members, currentTime]);

  const avgProgress = members.length > 0 
    ? Math.round(members.reduce((sum, m) => sum + (Number(m.progress) || 0), 0) / members.length)
    : 0;

  const handleAddMember = (newMember: Omit<TeamMember, 'id'>) => {
    const uniqueId = `mem_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const memberWithId = { ...newMember, id: uniqueId };
    setMembers(prev => [memberWithId, ...prev]);
    setHistory(prev => [{ ...memberWithId, archivedAt: new Date().toISOString() }, ...prev]);
    setIsAddModalOpen(false);
  };

  const handleBulkAddMembers = (newMembers: Omit<TeamMember, 'id'>[]) => {
    const membersWithIds = newMembers.map((m, idx) => ({
      ...m,
      id: `mem_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 5)}`
    }));
    setMembers(prev => [...membersWithIds, ...prev]);
    setHistory(prev => [
      ...membersWithIds.map(m => ({ ...m, archivedAt: new Date().toISOString() })),
      ...prev
    ]);
    setIsAddModalOpen(false);
  };

  const initiateDelete = (member: TeamMember) => setMemberToDelete(member);
  const confirmDelete = () => {
    if (memberToDelete) {
      setMembers(prev => prev.filter(m => m.id !== memberToDelete.id));
      setMemberToDelete(null);
    }
  };

  const seedDatabase = async () => {
    if (window.confirm('This will replace all current projects with the seed data. Continue?')) {
      setMembers(SEED_MEMBERS);
      // Force immediate cloud save for seed data
      if (currentUser) {
        setIsCloudSaving(true);
        const data: UserStorageData = { members: SEED_MEMBERS, history, logoUrl };
        await SyncService.saveUserData(currentUser.email, data);
        setIsCloudSaving(false);
      }
    }
  };

  const clearAllProjects = async () => {
    if (window.confirm('Are you sure you want to clear ALL active projects? This cannot be undone.')) {
      setMembers([]);
      if (currentUser) {
        setIsCloudSaving(true);
        const data: UserStorageData = { members: [], history, logoUrl };
        await SyncService.saveUserData(currentUser.email, data);
        setIsCloudSaving(false);
      }
    }
  };

  const initiateDeleteHistory = (memberName: string) => setHistoryMemberToDelete(memberName);
  const confirmDeleteHistory = () => {
    if (historyMemberToDelete) {
      setHistory(prev => prev.filter(h => h.name !== historyMemberToDelete));
      setHistoryMemberToDelete(null);
    }
  };

  // AUTO-FIX FOR 2001 BREACHED DATES
  useEffect(() => {
    const hasBreachedDates = members.some(m => m.deliveryDate.includes('2001') || m.assignedDate.includes('2001')) ||
                             history.some(h => h.deliveryDate.includes('2001') || h.assignedDate.includes('2001'));
    if (hasBreachedDates) {
      const fixedMembers = members.map(m => ({
        ...m,
        deliveryDate: m.deliveryDate.replace('2001', '2026'),
        assignedDate: m.assignedDate.replace('2001', '2026')
      }));
      const fixedHistory = history.map(h => ({
        ...h,
        deliveryDate: h.deliveryDate.replace('2001', '2026'),
        assignedDate: h.assignedDate.replace('2001', '2026')
      }));
      setMembers(fixedMembers);
      setHistory(fixedHistory);
      // Also update cloud if admin
      if (isAdmin && currentUser) {
        SyncService.saveUserData(currentUser.email, { members: fixedMembers, history: fixedHistory, logoUrl });
      }
    }
  }, [members, history, isAdmin, currentUser, logoUrl]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 ml-1 text-gray-600 transition-transform group-hover:scale-125" />;
    return sortOrder === 'asc' ? <ChevronUp className="w-3 h-3 ml-1 text-purple-400 animate-bounce-short" /> : <ChevronDown className="w-3 h-3 ml-1 text-purple-400 animate-bounce-short" />;
  };

  const getColorClass = (color: string) => {
    const map: Record<string, string> = {
      purple: 'from-purple-600 to-indigo-600',
      blue: 'from-blue-600 to-cyan-600',
      emerald: 'from-emerald-600 to-teal-600',
      rose: 'from-rose-600 to-pink-600',
      amber: 'from-amber-600 to-orange-600'
    };
    return map[color] || map.purple;
  };

  const getBgColorClass = (color: string) => {
    const map: Record<string, string> = {
      purple: 'bg-purple-500',
      blue: 'bg-blue-500',
      emerald: 'bg-emerald-500',
      rose: 'bg-rose-500',
      amber: 'bg-amber-500'
    };
    return map[color] || map.purple;
  };

  if (!currentUser) {
    return <AuthModal onAuthSuccess={setCurrentUser} />;
  }

  // GLOBAL SYNC OVERLAY
  if (isSyncing) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-10" style={{ backgroundImage: 'radial-gradient(circle, #ffffff11 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
        </div>
        <GlassCard className="w-full max-w-md p-10 flex flex-col items-center text-center animate-in zoom-in-95 duration-500 border-white/10">
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-purple-500/20 blur-3xl rounded-full animate-pulse"></div>
            <div className="relative w-24 h-24 bg-gradient-to-tr from-purple-600 to-indigo-600 rounded-[2rem] flex items-center justify-center shadow-2xl ring-1 ring-white/30 animate-spin-slow">
              <Database className="w-10 h-10 text-white" />
            </div>
          </div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-2">Synchronizing Node</h2>
          <div className="flex items-center gap-2 mb-6">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></div>
            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em]">Connecting to Cloud Core</p>
          </div>
          <div className="w-full bg-white/[0.03] rounded-2xl p-4 font-mono text-[9px] text-gray-500 text-left space-y-1 border border-white/5 shadow-inner">
            <p className="flex items-center gap-2"><span className="text-purple-500">{'>'}</span> Handshaking Terminal ID...</p>
            <p className="flex items-center gap-2"><span className="text-purple-500">{'>'}</span> Encrypting Session Key...</p>
            <p className="flex items-center gap-2"><span className="text-purple-500">{'>'}</span> Retrieving Member Ledger...</p>
            <p className="flex items-center gap-2 animate-pulse"><span className="text-purple-500">{'>'}</span> Calibrating Fleet Status...</p>
          </div>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white relative overflow-hidden selection:bg-purple-500/30">
      <div className="absolute inset-0 pointer-events-none z-0 flex items-center justify-center opacity-[0.04]">
        <div 
           className="w-[1000px] h-[1000px] rounded-full animate-pulse-slow transition-transform duration-[5000ms]"
           style={{
             backgroundImage: `url('${logoUrl}')`,
             backgroundSize: 'contain',
             backgroundPosition: 'center',
             backgroundRepeat: 'no-repeat',
             filter: 'blur(3px)'
           }}
        />
      </div>

      <div className="max-w-[1850px] mx-auto px-6 py-6 relative z-10">
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10 animate-in slide-in-from-top-6 duration-700 ease-out">
          <div className="flex items-center gap-4 md:gap-5 group">
            <div 
              onClick={() => isAdmin && setIsEditLogoModalOpen(true)}
              className={`p-1 bg-white/5 border border-white/10 rounded-2xl shadow-2xl transition-all duration-500 relative overflow-hidden backdrop-blur-md shrink-0 ${isAdmin ? 'hover:scale-110 cursor-pointer group/logo' : ''}`}
            >
              <div 
                className={`w-12 h-12 md:w-14 md:h-14 rounded-xl animate-float transition-all ${isAdmin ? 'group-hover/logo:brightness-50' : ''}`}
                style={{ backgroundImage: `url('${logoUrl}')`, backgroundSize: 'cover', backgroundPosition: 'center' }}
              />
              {isAdmin && (
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/logo:opacity-100 transition-opacity">
                  <Edit2 className="w-5 h-5 text-white drop-shadow-lg" />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <h1 className="text-xl md:text-3xl lg:text-4xl font-black bg-gradient-to-r from-white via-white/90 to-purple-400 bg-clip-text text-transparent tracking-tight truncate">
                Wordpress Planet <span className="text-purple-500">(WP)</span> Team
              </h1>
              <div className="flex flex-wrap items-center gap-2 md:gap-4 mt-1">
                <p className="text-gray-500 text-[9px] md:text-[11px] font-bold opacity-80 flex items-center gap-1.5 uppercase tracking-widest">
                  <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-ping-slow"></span>
                  Operations Command
                </p>
                <div className="hidden md:block h-3 w-px bg-white/10"></div>
                <div className="flex items-center gap-2 group/profile cursor-default">
                  <UserIcon className="w-3 h-3 text-purple-400" />
                  <span className="text-[9px] md:text-[10px] font-black text-gray-400 group-hover:text-purple-300 transition-colors truncate max-w-[100px] md:max-w-[150px]">{currentUser.email}</span>
                </div>
                <div className="hidden md:block h-3 w-px bg-white/10"></div>
                <button 
                  onClick={() => setIsSyncModalOpen(true)}
                  className={`flex items-center gap-2 px-2 md:px-3 py-1 border rounded-full transition-all group/sync ${isCloudSaving ? 'bg-purple-500/20 border-purple-500/40' : 'bg-emerald-500/10 border-emerald-500/20'}`}
                >
                  <CloudLightning className={`w-2.5 h-2.5 md:w-3 md:h-3 ${isCloudSaving ? 'text-purple-400 animate-spin' : 'text-emerald-400 animate-pulse'}`} />
                  <span className={`text-[8px] md:text-[9px] font-black uppercase tracking-widest ${isCloudSaving ? 'text-purple-400' : 'text-emerald-400'}`}>
                    {isCloudSaving ? 'Syncing...' : 'Linked'}
                  </span>
                </button>
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 md:gap-4">
            <div className="flex items-center gap-3">
              <div className="relative" ref={notifRef}>
                <button 
                  onClick={() => setIsNotifOpen(!isNotifOpen)}
                  className={`p-2.5 md:p-3 rounded-xl border border-white/10 transition-all relative group/notif ${isNotifOpen ? 'bg-purple-500/10 border-purple-500/40' : 'bg-white/5 hover:bg-white/10'}`}
                >
                  <Bell className={`w-4 h-4 md:w-5 md:h-5 transition-transform ${isNotifOpen ? 'text-purple-400 scale-110' : 'text-gray-500 group-hover/notif:text-white'}`} />
                  {urgentNotifications.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 md:w-5 md:h-5 bg-rose-500 text-white text-[9px] md:text-[10px] font-black flex items-center justify-center rounded-lg shadow-[0_0_15px_rgba(244,63,94,0.6)] animate-pulse">
                      {urgentNotifications.length}
                    </span>
                  )}
                </button>

                {isNotifOpen && (
                  <div className="absolute right-0 mt-3 w-72 md:w-80 bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] backdrop-blur-3xl overflow-hidden z-[100] animate-in zoom-in-95 duration-200 origin-top-right">
                    <div className="p-4 border-b border-white/10 bg-white/[0.02] flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Alert Center</span>
                      <span className="text-[9px] font-bold text-purple-500 bg-purple-500/10 px-2 py-0.5 rounded-full">Real-time Scan</span>
                    </div>
                    <div className="max-h-[300px] md:max-h-[400px] overflow-y-auto custom-scrollbar">
                      {urgentNotifications.length > 0 ? (
                        urgentNotifications.map(notif => (
                          <div key={notif.id} className="p-4 border-b border-white/5 hover:bg-white/[0.03] transition-colors group/item">
                            <div className="flex items-start gap-3">
                              <div className={`mt-1 p-1.5 rounded-lg ${notif.isOverdue ? 'bg-rose-500/20' : 'bg-amber-500/20'}`}>
                                <AlertTriangle className={`w-3.5 h-3.5 ${notif.isOverdue ? 'text-rose-500' : 'text-amber-500'}`} />
                              </div>
                              <div className="flex-1">
                                <p className="text-xs font-black text-white leading-tight group-hover/item:text-purple-400 transition-colors">
                                  {notif.projectName}
                                </p>
                                <p className="text-[10px] text-gray-500 font-bold mt-1 uppercase tracking-tight">
                                  Assigned: <span className="text-gray-300">{notif.memberName}</span>
                                </p>
                                <div className="mt-2 flex items-center justify-between">
                                  <span className={`text-[9px] font-black uppercase tracking-widest ${notif.isOverdue ? 'text-rose-500' : 'text-amber-500'}`}>
                                    {notif.isOverdue ? 'CRITICAL BREACH' : `${Math.ceil(notif.hoursLeft)}H REMAINING`}
                                  </span>
                                  <Clock className="w-3 h-3 text-gray-700" />
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-10 text-center flex flex-col items-center gap-3">
                          <ShieldAlert className="w-10 h-10 text-gray-800" />
                          <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">No Critical Alerts</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <div className="relative group/search">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 w-3 h-3" />
                  <input 
                    type="text" 
                    placeholder="Scan..."
                    className="pl-8 pr-3 py-2 bg-white/[0.02] border border-white/10 rounded-xl focus:outline-none focus:border-purple-500/40 backdrop-blur-3xl w-28 md:w-48 transition-all text-[10px] md:text-xs font-semibold"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <button 
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                  className={`p-2 rounded-xl border transition-all ${isFilterOpen ? 'bg-purple-500/20 border-purple-500/40 text-purple-400' : 'bg-white/[0.02] border-white/10 text-gray-600 hover:text-gray-400'}`}
                  title="Advanced Filters"
                >
                  <ListFilter className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {isAdmin && (
                <div className="flex items-center gap-2">
                  <button 
                    onClick={seedDatabase}
                    className="flex items-center gap-2 bg-white/5 border border-white/10 hover:bg-white/10 text-gray-400 px-3 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all group/seed"
                    title="Seed Database from CSV"
                  >
                    <Database className="w-3 h-3 group-hover/seed:rotate-12 transition-transform" />
                    Seed Data
                  </button>
                  <button 
                    onClick={clearAllProjects}
                    className="flex items-center gap-2 bg-rose-500/5 border border-rose-500/10 hover:bg-rose-500/10 text-rose-500/70 px-3 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all group/clear"
                    title="Clear All Projects"
                  >
                    <Trash2 className="w-3 h-3 group-hover/clear:scale-110 transition-transform" />
                    Clear All
                  </button>
                </div>
              )}
              {isAdmin && (
                <button 
                  onClick={() => setIsAccessModalOpen(true)}
                  className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 text-emerald-400 px-3 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all group/access"
                  title="Manage Guest Access"
                >
                  <Shield className="w-3 h-3 group-hover/access:scale-110 transition-transform" />
                  Manage Guests
                </button>
              )}
              {isAdmin && (
                <button 
                  onClick={() => setIsAddModalOpen(true)}
                  className="flex items-center gap-2 bg-gradient-to-br from-purple-700 to-indigo-900 hover:from-purple-600 hover:to-indigo-800 text-white px-4 md:px-5 py-2 md:py-2.5 rounded-xl font-black text-[9px] md:text-[10px] uppercase tracking-widest transition-all shadow-lg active:scale-95 group/add"
                >
                  <Plus className="w-3 h-3 md:w-3.5 md:h-3.5 group-hover/add:rotate-90 transition-transform" />
                  <span className="hidden sm:inline">Initialize</span>
                  <span className="sm:hidden">Add</span>
                </button>
              )}

              <button 
                onClick={handleLogout}
                className="p-2 md:p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all group/logout"
                title="Terminate Session"
              >
                <LogOut className="w-4 h-4 md:w-5 md:h-5 transition-transform group-hover/logout:-translate-x-1" />
              </button>
            </div>
          </div>
        </header>

        {/* ADVANCED FILTERS */}
        {isFilterOpen && (
          <div className="mb-8 p-6 bg-white/[0.02] border border-white/10 rounded-2xl backdrop-blur-3xl animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex items-center gap-2 mb-4">
              <ListFilter className="w-4 h-4 text-purple-500" />
              <h3 className="text-[10px] font-black text-white uppercase tracking-widest">Advanced Filtering Node</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Member Identity</label>
                <input 
                  type="text" 
                  placeholder="Filter by name..."
                  className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-xs text-white placeholder:text-gray-700 focus:outline-none focus:border-purple-500/30 transition-all font-medium"
                  value={filters.name}
                  onChange={(e) => setFilters({...filters, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Project Designation</label>
                <input 
                  type="text" 
                  placeholder="Filter by project..."
                  className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-xs text-white placeholder:text-gray-700 focus:outline-none focus:border-purple-500/30 transition-all font-medium"
                  value={filters.projectName}
                  onChange={(e) => setFilters({...filters, projectName: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Profile Signature</label>
                <input 
                  type="text" 
                  placeholder="Filter by profile..."
                  className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-xs text-white placeholder:text-gray-700 focus:outline-none focus:border-purple-500/30 transition-all font-medium"
                  value={filters.profileName}
                  onChange={(e) => setFilters({...filters, profileName: e.target.value})}
                />
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-white/5 flex justify-between items-center">
              <p className="text-[9px] font-bold text-gray-600 uppercase tracking-tight">
                Showing <span className="text-purple-500">{filteredAndSortedMembers.length}</span> of <span className="text-gray-400">{members.length}</span> active nodes
              </p>
              <button 
                onClick={() => setFilters({ name: '', projectName: '', profileName: '' })}
                className="flex items-center gap-2 px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-lg text-[9px] font-black text-rose-500 uppercase tracking-widest transition-all"
              >
                <RefreshCw className="w-3 h-3" />
                Reset Filters
              </button>
            </div>
          </div>
        )}

        {/* TAB NAVIGATION */}
        <div className="flex items-center gap-1 mb-8 p-1 bg-white/[0.02] border border-white/10 rounded-2xl w-full sm:w-fit backdrop-blur-xl animate-in slide-in-from-left-4 duration-500 overflow-x-auto no-scrollbar">
          {(!guestPermissions || guestPermissions.canViewFleet) && (
            <button 
              onClick={() => setActiveTab('fleet')}
              className={`flex items-center gap-2 px-4 md:px-6 py-2 md:py-2.5 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] transition-all whitespace-nowrap ${activeTab === 'fleet' ? 'bg-white/10 text-white shadow-xl' : 'text-gray-600 hover:text-gray-400'}`}
            >
              <Activity className="w-3 h-3 md:w-3.5 md:h-3.5" />
              Fleet Operations
            </button>
          )}
          {(!guestPermissions || guestPermissions.canViewDelivery) && (
            <button 
              onClick={() => setActiveTab('delivery')}
              className={`flex items-center gap-2 px-4 md:px-6 py-2 md:py-2.5 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] transition-all relative whitespace-nowrap ${activeTab === 'delivery' ? 'bg-purple-600 text-white shadow-[0_0_20px_rgba(147,51,234,0.3)]' : 'text-gray-600 hover:text-gray-400'}`}
            >
              <Rocket className="w-3 h-3 md:w-3.5 md:h-3.5" />
              Delivery Stream
              {deliveryStreamCount > 0 && (
                <span className={`absolute -top-1 -right-1 w-4 h-4 md:w-5 md:h-5 rounded-lg flex items-center justify-center text-[8px] md:text-[9px] font-black border-2 border-[#050505] transition-colors ${activeTab === 'delivery' ? 'bg-white text-purple-600' : 'bg-gray-800 text-gray-500'}`}>
                  {deliveryStreamCount}
                </span>
              )}
            </button>
          )}
          {(!guestPermissions || guestPermissions.canViewLedger) && (
            <button 
              onClick={() => setActiveTab('ledger')}
              className={`flex items-center gap-2 px-4 md:px-6 py-2 md:py-2.5 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] transition-all whitespace-nowrap ${activeTab === 'ledger' ? 'bg-emerald-600 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)]' : 'text-gray-600 hover:text-gray-400'}`}
            >
              <History className="w-3 h-3 md:w-3.5 md:h-3.5" />
              Member Ledger
            </button>
          )}
          {isAdmin && (
            <button 
              onClick={() => setActiveTab('performance')}
              className={`flex items-center gap-2 px-4 md:px-6 py-2 md:py-2.5 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] transition-all whitespace-nowrap ${activeTab === 'performance' ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)]' : 'text-gray-600 hover:text-gray-400'}`}
            >
              <TrendingUp className="w-3 h-3 md:w-3.5 md:h-3.5" />
              Performance
            </button>
          )}
        </div>

        <div className="animate-in fade-in duration-300">
        {activeTab === 'performance' ? (
          <PerformanceView members={members} />
        ) : activeTab !== 'ledger' ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5 mb-8">
              {(activeTab === 'fleet' ? 
                [
                  { label: 'FLEET', value: members.filter(m => !m.isDelivered).length, icon: Users, color: 'purple' },
                  { label: 'LIQUIDITY', value: (!guestPermissions || guestPermissions.canViewFinancials) ? `$${(totalValue - deliveredTotalValue).toLocaleString()}` : 'HIDDEN', icon: DollarSign, color: 'emerald' },
                  { label: 'PROGRESS', value: `${avgProgress}%`, icon: TrendingUp, color: 'blue' }
                ]
               : 
                [
                  { label: 'DELIVERED PROJECTS', value: deliveryStreamCount, icon: Rocket, color: 'purple' },
                  { label: 'TOTAL DELIVERED VALUE', value: (!guestPermissions || guestPermissions.canViewFinancials) ? `$${deliveredTotalValue.toLocaleString()}` : 'HIDDEN', icon: DollarSign, color: 'emerald' },
                  { label: 'DELIVERED THIS MONTH', value: (!guestPermissions || guestPermissions.canViewFinancials) ? `$${deliveredThisMonthValue.toLocaleString()}` : 'HIDDEN', icon: TrendingUp, color: 'blue' }
                ]
              ).map((stat, i) => (
                <GlassCard key={i} className={`p-4 md:p-5 border-l-4 border-l-${stat.color}-500 hover:translate-y-[-4px] transition-all group/card`}>
                  <div className="flex items-center gap-4">
                    <div className={`p-2 md:p-2.5 bg-${stat.color}-500/10 rounded-lg group-hover/card:scale-110 transition-all`}>
                      <stat.icon className={`text-${stat.color}-400 w-4 h-4 md:w-5 md:h-5`} />
                    </div>
                    <div>
                      <p className="text-gray-600 text-[7px] md:text-[8px] font-black uppercase tracking-widest mb-0.5">{stat.label}</p>
                      <p className="text-xl md:text-2xl font-black text-white">{stat.value}</p>
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>

            <div className="lg:hidden space-y-4 mb-8">
              {filteredAndSortedMembers.map((member) => {
                const isCritical = criticalProjects.some(p => p.id === member.id);
                const overdue = isUpdateOverdue(member);
                const remaining = getTimeRemaining(member.deliveryDate);
                const isUrgent = remaining.totalHours <= 51 && !remaining.isOverdue;

                return (
                  <GlassCard key={member.id} className={`p-5 border-l-4 ${isCritical ? 'border-l-rose-500 bg-rose-500/5' : 'border-l-purple-500'}`}>
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getColorClass(member.themeColor)} flex items-center justify-center font-black text-[10px] shadow-lg`}>
                          {(member.name || '?').split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-black text-white">{member.name}</h3>
                            <span className="text-[10px] text-purple-400 font-bold">@{member.profileName}</span>
                          </div>
                          <div className="flex flex-col gap-0.5 mt-0.5">
                            <input 
                              type="text" 
                              value={member.projectName} 
                              onChange={(e) => handleUpdateField(member.id, 'projectName', e.target.value)} 
                              className="bg-transparent border-none p-0 text-[10px] text-gray-400 font-bold uppercase tracking-tight focus:ring-0 w-full hover:bg-white/10 rounded transition-all"
                            />
                            {isAdmin && (
                              <input 
                                type="text" 
                                value={member.projectUrl} 
                                onChange={(e) => handleUpdateField(member.id, 'projectUrl', e.target.value)} 
                                className="bg-transparent border-none p-0 text-[9px] text-purple-500/70 font-bold uppercase tracking-tight focus:ring-0 w-full hover:bg-white/10 rounded transition-all"
                              />
                            )}
                          </div>
                        </div>
                      </div>
                      {(!guestPermissions || guestPermissions.canEdit) && (
                        <button onClick={() => initiateDelete(member)} className="p-2 text-gray-600 hover:text-rose-500 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="space-y-1">
                        <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Remaining</p>
                        <div className={`flex items-center gap-2 px-2 py-1 rounded-lg border ${remaining.isOverdue ? 'bg-rose-500/10 border-rose-500/30 text-rose-500' : (isUrgent ? 'bg-amber-500/10 border-amber-500/30 text-amber-500' : 'bg-white/5 border-white/10 text-white')}`}>
                          <Clock className="w-3 h-3" />
                          <span className="text-xs font-black font-mono">{remaining.isOverdue ? 'OVERDUE' : `${remaining.days}d ${remaining.hours}h`}</span>
                        </div>
                      </div>
                      <div className="space-y-1 text-right">
                        <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Value</p>
                        {(!guestPermissions || guestPermissions.canViewFinancials) ? (
                          <p className="text-sm font-black text-purple-400">${member.projectValue.toLocaleString()}</p>
                        ) : (
                          <Lock className="w-3 h-3 text-gray-600 ml-auto" />
                        )}
                      </div>
                    </div>

                    {isAdmin && (
                      <div className="mb-4 p-2 bg-white/[0.03] border border-white/10 rounded-xl flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Sync Protocol</span>
                          <div className="flex items-center gap-1">
                            <input 
                              type="number" 
                              value={member.syncTargetHours || getUpdateRule(member.pageCount).hours} 
                              onChange={(e) => handleUpdateField(member.id, 'syncTargetHours', parseInt(e.target.value) || 0)} 
                              className="bg-transparent border-none p-0 text-[10px] font-black text-purple-400 focus:ring-0 w-8"
                            />
                            <span className="text-[9px] font-black uppercase text-purple-400">H Target</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <input 
                            type="number" 
                            value={member.pageCount} 
                            onChange={(e) => handleUpdateField(member.id, 'pageCount', parseInt(e.target.value) || 0)} 
                            className="bg-white/5 border-none p-1 text-[10px] font-black text-white focus:ring-0 w-10 text-center rounded"
                          />
                          <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Units</span>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Progress</span>
                        <span className="text-[10px] font-black text-white">{member.progress}%</span>
                      </div>
                      <div className="w-full bg-white/[0.08] rounded-full h-1.5 overflow-hidden">
                        <div className={`h-full bg-gradient-to-r ${getColorClass(member.themeColor)}`} style={{ width: `${member.progress}%` }} />
                      </div>
                    </div>
                  </GlassCard>
                );
              })}
              {filteredAndSortedMembers.length === 0 && (
                <div className="py-10 text-center">
                  <p className="text-gray-600 text-xs font-bold uppercase tracking-widest">No nodes found</p>
                </div>
              )}
            </div>

            <GlassCard className="hidden lg:block overflow-hidden shadow-2xl ring-1 ring-white/10 bg-white/[0.01]">
              <div className="overflow-x-auto custom-scrollbar">
                {filteredAndSortedMembers.length > 0 ? (
                  <table className="w-full text-left border-collapse min-w-[1300px]">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/[0.02]">
                        <th className="px-5 py-6 text-[11px] font-black text-gray-500 uppercase tracking-widest cursor-pointer" onClick={() => handleSort('name')}>
                          <div className="flex items-center group/th">MEMBER PROFILE <SortIcon field="name" /></div>
                        </th>
                        <th className="px-5 py-6 text-[11px] font-black text-gray-500 uppercase tracking-widest cursor-pointer" onClick={() => handleSort('projectName')}>
                          <div className="flex items-center group/th">AXIS HUB <SortIcon field="projectName" /></div>
                        </th>
                        <th className="px-5 py-6 text-[11px] font-black text-gray-500 uppercase tracking-widest text-center">SYNC PROTOCOL</th>
                        <th className="px-5 py-6 text-[11px] font-black text-gray-500 uppercase tracking-widest cursor-pointer" onClick={() => handleSort('assignedDate')}>
                          <div className="flex items-center group/th">IGNITION <SortIcon field="assignedDate" /></div>
                        </th>
                        <th className="px-5 py-6 text-[11px] font-black text-gray-500 uppercase tracking-widest cursor-pointer" onClick={() => handleSort('deliveryDate')}>
                          <div className="flex items-center group/th">DEPLOYMENT <SortIcon field="deliveryDate" /></div>
                        </th>
                        <th className="px-5 py-6 text-[11px] font-black text-gray-500 uppercase tracking-widest text-center">REMAINING</th>
                        <th className="px-5 py-6 text-[11px] font-black text-gray-500 uppercase tracking-widest">LIQUIDITY / SCOPE</th>
                        <th className="px-5 py-6 text-[11px] font-black text-gray-500 uppercase tracking-widest">LIFECYCLE</th>
                        <th className="px-5 py-6 text-[11px] font-black text-gray-500 uppercase tracking-widest text-center">X</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {filteredAndSortedMembers.map((member) => {
                        const isCritical = criticalProjects.some(p => p.id === member.id);
                        const isDeliveryMove = member.progress >= 85 && !member.isDelivered;
                        const overdue = isUpdateOverdue(member);
                        const rule = getUpdateRule(member.pageCount);
                        const remaining = getTimeRemaining(member.deliveryDate);
                        const isUrgent = remaining.totalHours <= 51 && !remaining.isOverdue;
                        
                        return (
                          <tr key={member.id} className={`hover:bg-purple-900/[0.04] transition-all group/tr ${isCritical ? 'bg-rose-500/[0.04] border-l-4 border-l-rose-500' : 'border-l-4 border-l-transparent'}`}>
                            <td className="px-5 py-6">
                              <div className="flex items-center gap-4">
                                <div className={`shrink-0 w-11 h-11 rounded-2xl bg-gradient-to-br ${getColorClass(member.themeColor)} flex items-center justify-center font-black text-xs shadow-xl ring-1 ring-white/10 group-hover/tr:scale-110 transition-transform duration-500`}>
                                  {(member.name || '?').split(' ').map(n => n[0]).join('')}
                                </div>
                                <div className="flex flex-col">
                                  <div className="flex items-center gap-2">
                                    <input type="text" value={member.name} onChange={(e) => handleUpdateField(member.id, 'name', e.target.value)} className="bg-transparent border-none p-0 font-black text-white text-sm focus:ring-0 w-32 hover:bg-white/10 rounded px-2 -ml-2 transition-all" />
                                    <div className="flex items-center text-purple-400 font-bold text-[10px]">
                                      <span>@</span>
                                      <input type="text" value={member.profileName} onChange={(e) => handleUpdateField(member.id, 'profileName', e.target.value)} className="bg-transparent border-none p-0 focus:ring-0 w-24 hover:bg-white/10 rounded px-1 transition-all" />
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1.5 mt-0.5 group/url">
                                    {isAdmin ? (
                                      <input 
                                        type="text" 
                                        value={member.projectUrl} 
                                        onChange={(e) => handleUpdateField(member.id, 'projectUrl', e.target.value)} 
                                        className="bg-transparent border-none p-0 text-[10px] text-gray-500 font-bold focus:ring-0 w-full hover:bg-white/10 rounded px-1 -ml-1 transition-all"
                                      />
                                    ) : (
                                      <span className="text-[10px] text-gray-500 font-bold truncate max-w-[150px]">{member.projectUrl}</span>
                                    )}
                                    <a href={member.projectUrl} target="_blank" rel="noopener noreferrer" className="shrink-0">
                                      <ExternalLink className="w-3 h-3 text-gray-600 hover:text-purple-400 transition-colors" />
                                    </a>
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="px-5 py-6">
                              <div className="flex items-center gap-2.5">
                                <Briefcase className="w-4 h-4 text-gray-600 group-hover/tr:text-purple-400 transition-colors" />
                                <div className="flex flex-col">
                                  <input type="text" value={member.projectName} onChange={(e) => handleUpdateField(member.id, 'projectName', e.target.value)} className="bg-transparent border-none p-0 text-sm font-bold text-gray-200 focus:ring-0 w-full transition-colors group-hover/tr:text-white" />
                                  {isDeliveryMove && (
                                    <div className="flex items-center gap-1 mt-1">
                                      <Rocket className="w-2.5 h-2.5 text-purple-500 animate-bounce" />
                                      <span className="text-[8px] font-black text-purple-500 uppercase tracking-tighter">Delivery Priority</span>
                                    </div>
                                  )}
                                  {member.isDelivered && (
                                    <div className="flex items-center gap-1 mt-1">
                                      <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" />
                                      <span className="text-[8px] font-black text-emerald-500 uppercase tracking-tighter">Delivered</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>

                            <td className="px-5 py-6 text-center">
                              <div className="flex flex-col items-center gap-1.5">
                                <div className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${overdue ? 'bg-amber-500/20 border-amber-500/50 text-amber-500 animate-pulse' : 'bg-white/5 text-gray-500 border-white/10 group-hover/tr:text-purple-400 group-hover/tr:border-purple-500/20'}`}>
                                  {isAdmin ? (
                                    <div className="flex flex-col items-center gap-1">
                                      <div className="flex items-center gap-1">
                                        <input 
                                          type="number" 
                                          value={member.syncTargetHours || rule.hours} 
                                          onChange={(e) => handleUpdateField(member.id, 'syncTargetHours', parseInt(e.target.value) || 0)} 
                                          className="bg-transparent border-none p-0 text-[10px] font-black text-center focus:ring-0 w-8"
                                        />
                                        <span>H TARGET</span>
                                      </div>
                                      <div className="h-px w-full bg-white/10 my-1"></div>
                                      <div className="flex flex-col items-center">
                                        <span className="text-[7px] text-gray-600 mb-0.5">MANUAL SYNC</span>
                                        <input 
                                          type="date" 
                                          value={member.nextUpdateDate || ''} 
                                          onChange={(e) => handleUpdateField(member.id, 'nextUpdateDate', e.target.value)} 
                                          className="bg-transparent border-none p-0 text-[9px] font-bold text-purple-400 focus:ring-0 [color-scheme:dark] cursor-pointer"
                                        />
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex flex-col items-center">
                                      <span>{member.syncTargetHours ? `${member.syncTargetHours}H TARGET` : rule.label}</span>
                                      {member.nextUpdateDate && (
                                        <span className="text-[8px] text-purple-400 mt-1">NEXT: {new Date(member.nextUpdateDate).toLocaleDateString()}</span>
                                      )}
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-1">
                                  {isAdmin ? (
                                    <input 
                                      type="number" 
                                      value={member.pageCount} 
                                      onChange={(e) => handleUpdateField(member.id, 'pageCount', parseInt(e.target.value) || 0)} 
                                      className="bg-transparent border-none p-0 text-[10px] font-black text-gray-500 uppercase tracking-tighter focus:ring-0 w-8 text-center hover:bg-white/10 rounded transition-all"
                                    />
                                  ) : (
                                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-tighter">{member.pageCount || 0}</span>
                                  )}
                                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-tighter">UNITS</span>
                                </div>
                              </div>
                            </td>

                            <td className="px-5 py-6">
                              <div className="flex flex-col">
                                <span className="text-[10px] font-black text-gray-700 uppercase mb-1 tracking-wider">Genesis</span>
                                <input type="date" value={member.assignedDate} onChange={(e) => handleUpdateField(member.id, 'assignedDate', e.target.value)} className="bg-transparent border-none p-0 text-gray-500 font-mono text-[11px] focus:ring-0 [color-scheme:dark] transition-colors group-hover/tr:text-gray-300" />
                              </div>
                            </td>

                            <td className="px-5 py-6">
                              <div className="flex flex-col">
                                <span className="text-[10px] font-black text-gray-700 uppercase mb-1 tracking-wider">Target</span>
                                <input type="date" value={member.deliveryDate} onChange={(e) => handleUpdateField(member.id, 'deliveryDate', e.target.value)} className={`bg-transparent border-none p-0 ${isCritical ? 'text-rose-400' : 'text-white'} font-mono text-[11px] focus:ring-0 [color-scheme:dark] transition-colors`} />
                              </div>
                            </td>

                            <td className="px-5 py-6">
                              <div className="flex justify-center">
                                <div className={`w-[120px] py-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all ${remaining.isOverdue ? 'bg-rose-500/15 border-rose-500/40' : (isUrgent ? 'bg-amber-500/15 border-amber-500/40' : 'bg-white/5 border-white/15 group-hover/tr:border-purple-500/30')}`}>
                                  <div className="flex items-center gap-2">
                                    <span className={`text-lg font-black font-mono leading-none ${remaining.isOverdue ? 'text-rose-500' : 'text-white'}`}>{remaining.isOverdue ? '!!' : remaining.days}</span>
                                    <span className="text-gray-700 font-black animate-pulse">:</span>
                                    <span className={`text-lg font-black font-mono leading-none ${remaining.isOverdue ? 'text-rose-500' : 'text-white'}`}>{remaining.isOverdue ? '!!' : remaining.hours}</span>
                                  </div>
                                  <span className={`text-[8px] font-black uppercase tracking-[0.2em] ${remaining.isOverdue ? 'text-rose-400' : 'text-gray-500'}`}>{remaining.isOverdue ? 'BREACHED' : 'CLOCKED'}</span>
                                </div>
                              </div>
                            </td>

                            <td className="px-5 py-6">
                              <div className="flex flex-col gap-3">
                                {(!guestPermissions || guestPermissions.canViewFinancials) ? (
                                  <div className="flex items-center text-white font-black text-2xl tracking-tighter group/val">
                                    <span className="text-purple-500 mr-1 text-sm font-bold">$</span>
                                    <input type="number" value={member.projectValue} onChange={(e) => handleUpdateField(member.id, 'projectValue', parseFloat(e.target.value) || 0)} className="bg-transparent border-none p-0 focus:ring-0 w-24 text-base transition-colors group-hover/tr:text-purple-400" />
                                  </div>
                                ) : (
                                  <div className="flex items-center text-gray-600 font-black text-2xl tracking-tighter">
                                    <Lock className="w-5 h-5" />
                                  </div>
                                )}
                                <div className="flex items-center text-[9px] text-purple-400 font-black uppercase tracking-widest bg-white/[0.04] border border-white/10 px-2.5 py-1 rounded-xl w-fit group/units hover:bg-white/[0.08] transition-all">
                                  <Layers className="w-3 h-3 mr-1.5" />
                                  <input type="number" value={member.pageCount} onChange={(e) => handleUpdateField(member.id, 'pageCount', parseInt(e.target.value) || 0)} className="bg-transparent border-none p-0 focus:ring-0 w-8 text-center" />
                                  <span>UNITS</span>
                                </div>
                              </div>
                            </td>

                            <td className="px-5 py-6 min-w-[160px]">
                              <div className="flex flex-col gap-3 group/progress-bar">
                                <div className="flex justify-between items-center">
                                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 transition-colors group-hover/progress-bar:text-purple-400">
                                    {member.isDelivered ? 'DELIVERED' : (member.progress >= 100 ? 'DEPLOYED' : (member.progress >= 85 ? 'FINAL POLISH' : 'BUILDING'))}
                                  </span>
                                  <div className={`px-3 py-2 rounded-xl ${getBgColorClass(member.themeColor)} text-white font-black font-mono text-xs flex items-center justify-center gap-1 shadow-2xl border border-white/30 transition-all hover:scale-110 min-w-[65px]`}>
                                    <input 
                                      type="number"
                                      min="0" max="100"
                                      value={member.progress}
                                      onChange={(e) => handleUpdateField(member.id, 'progress', Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                                      className="bg-transparent border-none p-0 focus:outline-none focus:ring-0 w-8 text-center appearance-none cursor-pointer text-sm"
                                    />
                                    <span className="opacity-80 text-xs select-none">%</span>
                                  </div>
                                </div>
                                <div className="w-full bg-white/[0.08] rounded-full h-2 overflow-hidden ring-1 ring-white/10 shadow-inner">
                                  <div className={`h-full bg-gradient-to-r ${getColorClass(member.themeColor)} transition-all duration-1000 shadow-[0_0_15px_rgba(168,85,247,0.4)]`} style={{ width: `${member.progress}%` }} />
                                </div>
                                {isAdmin && member.progress >= 100 && !member.isDelivered && (
                                  <button
                                    onClick={() => handleUpdateField(member.id, 'isDelivered', true)}
                                    className="mt-1 w-full py-1.5 bg-purple-500/20 hover:bg-purple-500/40 border border-purple-500/30 rounded-lg text-[9px] font-black text-purple-400 uppercase tracking-widest transition-all"
                                  >
                                    Mark Delivered
                                  </button>
                                )}
                                {isAdmin && member.isDelivered && (
                                  <button
                                    onClick={() => handleUpdateField(member.id, 'isDelivered', false)}
                                    className="mt-1 w-full py-1.5 bg-gray-500/10 hover:bg-gray-500/20 border border-gray-500/20 rounded-lg text-[9px] font-black text-gray-400 uppercase tracking-widest transition-all"
                                  >
                                    Revert to WIP
                                  </button>
                                )}
                              </div>
                            </td>

                            <td className="px-5 py-6 text-center">
                              {(!guestPermissions || guestPermissions.canEdit) && (
                                <button onClick={() => initiateDelete(member)} className="p-3 text-gray-600 hover:text-rose-500 hover:bg-rose-500/15 rounded-2xl transition-all active:scale-90 group/del">
                                  <Trash2 className="w-5 h-5 transition-transform group-hover/del:scale-110" />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div className="py-20 text-center flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-500">
                    <div className="p-6 bg-white/[0.02] rounded-full border border-white/10 mb-2">
                      <Rocket className="w-12 h-12 text-gray-800" />
                    </div>
                    <h3 className="text-xl font-black text-gray-600 uppercase tracking-widest">No Projects in Stream</h3>
                    <p className="text-[10px] text-gray-700 font-bold uppercase tracking-[0.3em]">All nodes are currently below threshold.</p>
                  </div>
                )}
              </div>
            </GlassCard>
          </>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-4 px-2">
              <div className="flex items-center gap-3">
                <BarChart3 className="w-6 h-6 text-emerald-500" />
                <h2 className="text-xl font-black uppercase tracking-widest text-white">Historical Node Ledger</h2>
              </div>
              
              <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="relative">
                  <select
                    value={ledgerMonthFilter}
                    onChange={(e) => setLedgerMonthFilter(e.target.value)}
                    className="appearance-none pl-4 pr-10 py-2.5 bg-emerald-500/[0.02] border border-emerald-500/10 rounded-xl focus:outline-none focus:border-emerald-500/40 backdrop-blur-3xl transition-all text-xs font-black text-emerald-400 uppercase tracking-widest cursor-pointer"
                  >
                    <option value="All" className="bg-gray-900">All Time</option>
                    {availableMonths.map(month => (
                      <option key={month} value={month} className="bg-gray-900">{month}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500/50 pointer-events-none" />
                </div>
                <div className="relative group/ledger-search w-full md:w-64">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-500/50 w-3.5 h-3.5 transition-colors group-focus-within/ledger-search:text-emerald-500" />
                  <input 
                    type="text" 
                    placeholder="Search Ledger Data..."
                    className="w-full pl-10 pr-4 py-2.5 bg-emerald-500/[0.02] border border-emerald-500/10 rounded-xl focus:outline-none focus:border-emerald-500/40 backdrop-blur-3xl transition-all text-xs font-semibold text-emerald-100 placeholder:text-emerald-900"
                    value={ledgerSearchQuery}
                    onChange={(e) => setLedgerSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {ledgerStats.length > 0 ? (
                ledgerStats.map((stat, i) => (
                  <GlassCard key={i} className="group relative overflow-hidden border-white/10 hover:border-emerald-500/30 transition-all duration-500 hover:shadow-[0_0_50px_rgba(16,185,129,0.1)] flex flex-col h-full">
                      <div className="p-4 md:p-6 flex-1 cursor-pointer" onClick={() => setExpandedMember(expandedMember === stat.name ? null : stat.name)}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-8">
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-br ${getColorClass(stat.color)} flex items-center justify-center font-black text-base md:text-lg shadow-2xl group-hover:scale-110 transition-transform duration-500 border border-white/20 shrink-0`}>
                              {stat.name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div className="min-w-0">
                              <h3 className="text-lg md:text-xl font-black text-white tracking-tight truncate">{stat.name}</h3>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[8px] md:text-[9px] text-emerald-500 font-black uppercase tracking-[0.2em] bg-emerald-500/10 px-2 py-0.5 rounded-lg whitespace-nowrap">Verified Node</span>
                                <span className="hidden xs:inline text-[8px] md:text-[9px] text-gray-500 font-bold uppercase tracking-widest truncate">• Total Workload</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between sm:justify-end gap-3">
                            {(!guestPermissions || guestPermissions.canEdit) && (
                              <button 
                                onClick={(e) => { e.stopPropagation(); initiateDeleteHistory(stat.name); }}
                                className="p-2 text-gray-600 hover:text-rose-500 hover:bg-rose-500/15 rounded-xl transition-all active:scale-90 group/del-hist"
                                title="Delete Member History"
                              >
                                <Trash2 className="w-4 h-4 transition-transform group-hover/del-hist:scale-110" />
                              </button>
                            )}
                            <div className="flex sm:flex-col items-center sm:items-end gap-2 sm:gap-0">
                               <Award className="w-5 h-5 md:w-6 md:h-6 text-emerald-500 sm:mb-1" />
                               <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Performance Tier 1</span>
                            </div>
                          </div>
                        </div>

                        {/* Expanded Details Section */}
                        {expandedMember === stat.name && (
                          <div className="mt-4 pt-4 border-t border-white/10 animate-in slide-in-from-top-2 duration-300">
                             <div className="flex items-center justify-between mb-3">
                               <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Project Breakdown</h4>
                               <div className="flex gap-2">
                                 <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest bg-amber-500/10 px-2 py-1 rounded-lg">
                                   WIP: {members.filter(m => m.name === stat.name && !m.isDelivered).length}
                                 </span>
                                 <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-2 py-1 rounded-lg">
                                   Delivered: {members.filter(m => m.name === stat.name && m.isDelivered).length}
                                 </span>
                               </div>
                             </div>
                             <div className="space-y-2">
                               {members
                                 .filter(m => m.name === stat.name)
                                 .map(m => (
                                 <div key={m.id} className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                                    <div className="flex flex-col">
                                      <span className="text-xs text-white font-medium">{m.projectName}</span>
                                      {m.isDelivered && (
                                        <span className="text-[9px] text-gray-500 font-bold uppercase">
                                          Delivered: {new Date(m.deliveryDate).toLocaleString('default', { month: 'long', year: 'numeric' })}
                                        </span>
                                      )}
                                    </div>
                                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${m.isDelivered ? 'bg-emerald-500/20 text-emerald-500' : 'bg-amber-500/20 text-amber-500'}`}>
                                      {m.isDelivered ? 'Delivered' : 'WIP'}
                                    </span>
                                 </div>
                               ))}
                             </div>
                          </div>
                        )}

                      <div className="grid grid-cols-3 gap-2 md:gap-4 mb-6 md:mb-8">
                        {(!guestPermissions || guestPermissions.canViewFinancials) ? (
                          <div className="bg-white/[0.02] p-3 md:p-4 rounded-2xl border border-white/5 group-hover:bg-white/[0.04] transition-colors">
                            <p className="text-[7px] md:text-[8px] font-black text-gray-600 uppercase tracking-[0.2em] mb-1 md:mb-1.5 flex items-center gap-1 md:gap-1.5">
                              <DollarSign className="w-2 h-2 text-emerald-500" /> <span className="hidden xs:inline">Liquidated</span><span className="xs:hidden">Val</span>
                            </p>
                            <p className="text-sm md:text-xl font-black text-white font-mono tracking-tighter truncate">${stat.totalValue.toLocaleString()}</p>
                          </div>
                        ) : (
                          <div className="bg-white/[0.02] p-3 md:p-4 rounded-2xl border border-white/5 group-hover:bg-white/[0.04] transition-colors flex items-center justify-center">
                            <Lock className="w-4 h-4 text-gray-600" />
                          </div>
                        )}
                        <div className="bg-white/[0.02] p-3 md:p-4 rounded-2xl border border-white/5 group-hover:bg-white/[0.04] transition-colors">
                          <p className="text-[7px] md:text-[8px] font-black text-gray-600 uppercase tracking-[0.2em] mb-1 md:mb-1.5 flex items-center gap-1 md:gap-1.5">
                            <Package className="w-2 h-2 text-blue-500" /> <span className="hidden xs:inline">Projects</span><span className="xs:hidden">Proj</span>
                          </p>
                          <div className="flex items-baseline gap-2">
                            <p className="text-sm md:text-xl font-black text-white font-mono tracking-tighter">{stat.projectsCount}</p>
                            <div className="flex gap-1">
                              <span className="text-[8px] font-black text-amber-500 bg-amber-500/10 px-1 py-0.5 rounded">
                                {members.filter(m => m.name === stat.name && !m.isDelivered).length} WIP
                              </span>
                              <span className="text-[8px] font-black text-emerald-500 bg-emerald-500/10 px-1 py-0.5 rounded">
                                {members.filter(m => m.name === stat.name && m.isDelivered).length} DLV
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="bg-white/[0.02] p-3 md:p-4 rounded-2xl border border-white/5 group-hover:bg-white/[0.04] transition-colors">
                          <p className="text-[7px] md:text-[8px] font-black text-gray-600 uppercase tracking-[0.2em] mb-1 md:mb-1.5 flex items-center gap-1 md:gap-1.5">
                            <Zap className="w-2 h-2 text-purple-500" /> <span className="hidden xs:inline">Avg. Sync</span><span className="xs:hidden">Sync</span>
                          </p>
                          <p className="text-sm md:text-xl font-black text-white font-mono tracking-tighter">{stat.avgProgress}%</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Monthly Breakdown Section */}
                        <div className="space-y-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[9px] md:text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                               <BarChart className="w-3 h-3 text-purple-500" /> Velocity Audit (Monthly)
                            </span>
                          </div>
                          <div className="space-y-2 max-h-[180px] overflow-y-auto custom-scrollbar pr-2">
                            {stat.sortedMonths.map(([month, data], idx) => (
                              <div key={idx} className="flex items-center justify-between p-2 md:p-3 rounded-xl bg-purple-500/[0.02] border border-purple-500/10 hover:bg-purple-500/[0.05] transition-all group/month">
                                <div className="flex flex-col">
                                  <span className="text-[9px] md:text-[10px] font-black text-white uppercase tracking-tight">{month}</span>
                                  <span className="text-[7px] md:text-[8px] font-bold text-gray-600 uppercase tracking-widest">{data.projects} Project{data.projects !== 1 ? 's' : ''}</span>
                                </div>
                                <div className="text-right">
                                  {(!guestPermissions || guestPermissions.canViewFinancials) ? (
                                    <>
                                      <span className="text-[10px] md:text-[11px] font-black text-purple-400 font-mono tracking-tighter">${data.revenue.toLocaleString()}</span>
                                      <div className="flex items-center gap-1 mt-0.5 justify-end">
                                        <div className="h-0.5 w-6 md:w-8 bg-purple-500/20 rounded-full overflow-hidden">
                                          <div className="h-full bg-purple-500" style={{ width: `${Math.min(100, (data.revenue / (stat.totalValue || 1)) * 100 * 2)}%` }}></div>
                                        </div>
                                      </div>
                                    </>
                                  ) : (
                                    <Lock className="w-3 h-3 text-gray-600 inline-block" />
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Recent History Section */}
                        <div className="space-y-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[9px] md:text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                               <ListFilter className="w-3 h-3 text-emerald-500" /> Executive Chronology
                            </span>
                          </div>
                          <div className="space-y-2.5 max-h-[180px] overflow-y-auto custom-scrollbar pr-2">
                            {stat.projectDetails.map((proj, idx) => (
                              <div key={idx} className="flex items-center justify-between p-2 md:p-3 rounded-xl bg-white/[0.01] border border-white/[0.03] hover:bg-white/[0.03] hover:border-white/10 transition-all group/proj">
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/40 group-hover/proj:bg-emerald-500 transition-colors shrink-0"></div>
                                  <div className="min-w-0">
                                    <p className="text-[10px] md:text-[11px] font-black text-gray-300 group-hover/proj:text-white transition-colors truncate">{proj.name}</p>
                                    <p className="text-[7px] md:text-[8px] text-gray-600 font-bold uppercase tracking-tight mt-0.5">{proj.date}</p>
                                  </div>
                                </div>
                                 <div className="text-right flex items-center gap-2 md:gap-3 shrink-0">
                                   {(!guestPermissions || guestPermissions.canViewFinancials) ? (
                                     <p className="text-[10px] md:text-[11px] font-black text-emerald-400/80 font-mono group-hover/proj:text-emerald-400 transition-colors">${proj.value.toLocaleString()}</p>
                                   ) : (
                                     <Lock className="w-3 h-3 text-gray-600" />
                                   )}
                                   {isAdmin && (
                                     <button 
                                       onClick={() => setHistory(prev => prev.filter(h => h.id !== proj.id))}
                                       className="p-1 text-gray-700 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all opacity-0 group-hover/proj:opacity-100"
                                       title="Delete Project Entry"
                                     >
                                       <Trash2 className="w-3 h-3" />
                                     </button>
                                   )}
                                 </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </GlassCard>
                ))
              ) : (
                <div className="col-span-full py-24 text-center flex flex-col items-center gap-5 bg-white/[0.01] rounded-3xl border border-dashed border-white/5 animate-in fade-in zoom-in duration-500">
                  <div className="p-8 bg-emerald-500/5 rounded-full border border-emerald-500/10 mb-2">
                    <ShieldAlert className="w-14 h-14 text-emerald-900" />
                  </div>
                  <h3 className="text-xl font-black text-gray-600 uppercase tracking-widest">Data Stream Empty</h3>
                </div>
              )}
            </div>
          </div>
        )}

        {isSyncModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
            <GlassCard className="w-full max-w-lg border-white/20 shadow-[0_0_100px_rgba(16,185,129,0.15)] overflow-hidden">
               <div className="p-4 md:p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                 <div className="flex items-center gap-3">
                   <div className="p-2 bg-emerald-500/20 rounded-lg">
                     <CloudLightning className="w-4 h-4 md:w-5 md:h-5 text-emerald-400" />
                   </div>
                   <div>
                     <h2 className="text-lg md:text-xl font-black text-white uppercase tracking-tight">Sync Hub</h2>
                     <p className="text-[8px] md:text-[9px] text-gray-500 font-bold uppercase tracking-widest">Portability Protocol</p>
                   </div>
                 </div>
                 <button onClick={() => setIsSyncModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-all">
                    <X className="w-5 h-5 text-gray-400" />
                 </button>
               </div>
               
               <div className="p-6 md:p-8 space-y-6">
                 <div className="p-4 md:p-6 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl text-center">
                    <p className="text-[10px] md:text-[11px] text-emerald-400 font-bold uppercase tracking-widest leading-relaxed">
                      Copy your Node Sync String to restore your data on any browser or device during registration.
                    </p>
                 </div>

                 <div className="space-y-2">
                    <label className="text-[9px] md:text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Your Unique Sync Code</label>
                    <div className="relative group">
                       <textarea 
                         readOnly
                         className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-4 pr-12 focus:outline-none focus:border-emerald-500/40 text-[9px] md:text-[10px] font-mono text-gray-400 h-24 custom-scrollbar select-all resize-none"
                         value={getExportString()}
                       />
                       <button 
                         onClick={handleCopySync}
                         className="absolute top-4 right-4 p-2 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-xl transition-all border border-emerald-500/20"
                       >
                         {copyStatus ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-emerald-400" />}
                       </button>
                    </div>
                 </div>

                 <div className="flex gap-4">
                    <button 
                      onClick={() => setIsSyncModalOpen(false)}
                      className="flex-1 py-4 bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-400 transition-all"
                    >
                      Close Portal
                    </button>
                    <button 
                      onClick={handleCopySync}
                      className="flex-1 py-4 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 rounded-2xl text-white font-black text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-900/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                    >
                      {copyStatus ? "Success!" : "Copy Sync Link"}
                      <Share2 className="w-4 h-4" />
                    </button>
                 </div>
               </div>
            </GlassCard>
          </div>
        )}
        </div>

        <footer className="mt-12 text-center text-gray-600 text-[10px] font-black flex flex-col items-center gap-3 uppercase tracking-widest pb-8">
          <div className="flex flex-wrap justify-center items-center gap-8">
            <span className="font-bold">&copy; {new Date().getFullYear()} Wordpress Planet (WP) Team</span>
            <div className="flex items-center gap-1.5 group/status">
               <span className="w-1.5 h-1.5 bg-purple-500 rounded-full shadow-[0_0_10px_rgba(168,85,247,1)] group-hover:animate-ping"></span>
               <span className="text-purple-600 font-black tracking-widest">Encrypted Node Active</span>
            </div>
          </div>
        </footer>
      </div>

      {isAddModalOpen && (
        <AddMemberModal 
          onClose={() => setIsAddModalOpen(false)} 
          onSubmit={handleAddMember} 
          onBulkSubmit={handleBulkAddMembers}
        />
      )}
      {isAccessModalOpen && (
        <AccessControlModal
          guests={guests}
          onUpdate={(newGuests) => {
            setGuests(newGuests);
            setIsAccessModalOpen(false);
          }}
          onClose={() => setIsAccessModalOpen(false)}
        />
      )}
      {isEditLogoModalOpen && <EditLogoModal initialUrl={logoUrl} onClose={() => setIsEditLogoModalOpen(false)} onUpdate={(newUrl) => { setLogoUrl(newUrl); setIsEditLogoModalOpen(false); }} />}
      {memberToDelete && <DeleteConfirmModal memberName={memberToDelete.name} onClose={() => setMemberToDelete(null)} onConfirm={confirmDelete} />}
      {historyMemberToDelete && <DeleteConfirmModal memberName={historyMemberToDelete} onClose={() => setHistoryMemberToDelete(null)} onConfirm={confirmDeleteHistory} />}

      <style>{`
        @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        @keyframes pulse-slow { 0%, 100% { opacity: 0.2; transform: scale(1); } 50% { opacity: 0.3; transform: scale(1.02); } }
        @keyframes ping-slow { 0% { transform: scale(1); opacity: 1; } 70%, 100% { transform: scale(1.4); opacity: 0; } }
        
        .animate-spin-slow { animation: spin-slow 12s linear infinite; }
        .animate-float { animation: float 4s ease-in-out infinite; }
        .animate-pulse-slow { animation: pulse-slow 8s ease-in-out infinite; }
        .animate-ping-slow { animation: ping-slow 3s cubic-bezier(0, 0, 0.2, 1) infinite; }
        .custom-scrollbar::-webkit-scrollbar { height: 6px; width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.01); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(147, 51, 234, 0.2); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(147, 51, 234, 0.4); }
        
        input::-webkit-outer-spin-button, input::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type=number] {
          -moz-appearance: textfield;
        }
      `}</style>
    </div>
  );
};

export default App;

const PerformanceView = ({ members }: { members: any[] }) => {
  const [selectedMonth, setSelectedMonth] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const { performanceData, allMonths, totalValue } = useMemo(() => {
    const data: Record<string, Record<string, number>> = {};
    const monthsSet = new Set<string>();
    let total = 0;
    
    members.forEach(m => {
      if (m.isDelivered) {
        const monthYear = new Date(m.deliveryDate).toLocaleString('default', { month: 'long', year: 'numeric' });
        monthsSet.add(monthYear);
        if (!data[m.name]) data[m.name] = {};
        if (!data[m.name][monthYear]) data[m.name][monthYear] = 0;
        data[m.name][monthYear] += m.projectValue;

        if (selectedMonth === 'All' || selectedMonth === monthYear) {
          total += m.projectValue;
        }
      }
    });
    return { 
      performanceData: data, 
      allMonths: Array.from(monthsSet).sort((a, b) => new Date(b).getTime() - new Date(a).getTime()),
      totalValue: total
    };
  }, [members, selectedMonth]);

  const filteredData = useMemo(() => {
    let filtered = { ...performanceData };
    
    if (selectedMonth !== 'All') {
      const monthFiltered: Record<string, Record<string, number>> = {};
      Object.entries(filtered).forEach(([name, months]) => {
        if (months[selectedMonth]) {
          monthFiltered[name] = { [selectedMonth]: months[selectedMonth] };
        }
      });
      filtered = monthFiltered;
    }

    if (searchQuery) {
      const searchFiltered: Record<string, Record<string, number>> = {};
      Object.entries(filtered).forEach(([name, months]: [string, Record<string, number>]) => {
        if (name.toLowerCase().includes(searchQuery.toLowerCase())) {
          searchFiltered[name] = months;
        }
      });
      filtered = searchFiltered;
    }

    return filtered;
  }, [performanceData, selectedMonth, searchQuery]);

  return (
    <div className="space-y-6 animate-in fade-in zoom-in duration-700">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <h2 className="text-xl font-black uppercase tracking-widest text-white">Performance Analytics</h2>
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <input 
            type="text" 
            placeholder="Search member..."
            className="bg-[#050505] border border-white/20 text-white text-sm rounded-xl px-4 py-2 focus:outline-none focus:border-purple-500/50 w-full sm:w-48 transition-all duration-300"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <select 
            className="bg-[#050505] border border-white/20 text-white text-sm rounded-xl px-4 py-2 focus:outline-none focus:border-purple-500/50 transition-all duration-300"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          >
            <option value="All" className="bg-[#050505] text-white">All Months</option>
            {allMonths.map(month => <option key={month} value={month} className="bg-[#050505] text-white">{month}</option>)}
          </select>
        </div>
      </div>

      <GlassCard className="p-6 border-white/10 bg-gradient-to-br from-emerald-900/20 to-teal-900/20">
        <div className="flex flex-col items-center justify-center text-center space-y-2">
          <h3 className="text-sm font-black text-emerald-400 uppercase tracking-widest">Total Delivered Value ({selectedMonth === 'All' ? 'All Time' : selectedMonth})</h3>
          <div className="text-4xl sm:text-5xl font-black text-white tracking-tighter drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]">
            ${totalValue.toLocaleString()}
          </div>
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.entries(filteredData).map(([name, months]) => (
          <GlassCard key={name} className="p-6 border-white/10 hover:border-purple-500/30 transition-colors duration-500">
            <h3 className="text-lg font-black text-white mb-4">{name}</h3>
            <div className="space-y-2">
              {Object.entries(months).map(([month, value]) => (
                <div key={month} className="flex justify-between items-center text-sm group">
                  <span className="text-gray-400 group-hover:text-white transition-colors duration-300">{month}</span>
                  <span className="text-emerald-400 font-mono font-bold">${value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
};
