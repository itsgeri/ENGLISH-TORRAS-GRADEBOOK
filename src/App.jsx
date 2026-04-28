import React, { useState, useEffect, useMemo, useRef } from 'react';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { 
  User, LogOut, Plus, Edit2, Trash2, Save, X, BarChart2, 
  MessageSquare, FileText, Settings, Activity, ArrowLeft, ArrowRight,
  ChevronDown, ChevronRight, AlertCircle, Wand2, Undo2, ArrowUpRight, ArrowDownRight,
  CalendarDays, Calendar, Clock, Home, ImagePlus, Eye, EyeOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot, collection, query, deleteDoc, updateDoc } from 'firebase/firestore';

// --- CONFIGURACIÓN DE FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyD_G5MyBC8wl5UiLWlpLkh9mQ7G0fca-Eo",
  authDomain: "gradebook-torras.firebaseapp.com",
  projectId: "gradebook-torras",
  storageBucket: "gradebook-torras.firebasestorage.app",
  messagingSenderId: "678858161985",
  appId: "1:678858161985:web:b78bb6c1baa1e3e0b32bc0"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- CONSTANTES ---
const FIELDS = ['Grammar', 'Listening', 'Reading', 'Writing', 'Speaking'];
const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#14B8A6'];
const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const PRINT_STYLES = {
  'Grammar': { short: 'GRAM.', head: '#e06666', cell: '#f4cccc' },
  'Listening': { short: 'LISTE.', head: '#f6b26b', cell: '#fce5cd' },
  'Reading': { short: 'READ.', head: '#ffd966', cell: '#fff2cc' },
  'Writing': { short: 'WRIT.', head: '#93c47d', cell: '#d9ead3' },
  'Speaking': { short: 'SPEAK', head: '#3c78d8', cell: '#c9daf8' }
};

const THEMES = {
  aurora: {
    bg: 'from-violet-100 via-fuchsia-50 to-cyan-100',
    blob1: 'bg-purple-300', blob2: 'bg-cyan-300', blob3: 'bg-pink-300',
    accentGradient: 'from-violet-500 to-fuchsia-500',
    accentText: 'text-violet-600',
    accentRing: 'focus:ring-violet-500/30',
    accentHover: 'hover:shadow-violet-500/25',
    iconBg: 'bg-violet-100',
    iconText: 'text-violet-600'
  },
  peach: {
    bg: 'from-orange-100 via-rose-50 to-amber-100',
    blob1: 'bg-rose-300', blob2: 'bg-orange-300', blob3: 'bg-amber-300',
    accentGradient: 'from-rose-500 to-orange-500',
    accentText: 'text-rose-600',
    accentRing: 'focus:ring-rose-500/30',
    accentHover: 'hover:shadow-rose-500/25',
    iconBg: 'bg-rose-100',
    iconText: 'text-rose-600'
  },
  ocean: {
    bg: 'from-blue-100 via-indigo-50 to-cyan-100',
    blob1: 'bg-blue-300', blob2: 'bg-cyan-300', blob3: 'bg-indigo-300',
    accentGradient: 'from-blue-500 to-cyan-500',
    accentText: 'text-blue-600',
    accentRing: 'focus:ring-blue-500/30',
    accentHover: 'hover:shadow-blue-500/25',
    iconBg: 'bg-blue-100',
    iconText: 'text-blue-600'
  },
  mint: {
    bg: 'from-emerald-100 via-teal-50 to-green-100',
    blob1: 'bg-emerald-300', blob2: 'bg-teal-300', blob3: 'bg-green-300',
    accentGradient: 'from-emerald-500 to-teal-500',
    accentText: 'text-emerald-600',
    accentRing: 'focus:ring-emerald-500/30',
    accentHover: 'hover:shadow-emerald-500/25',
    iconBg: 'bg-emerald-100',
    iconText: 'text-emerald-600'
  }
};

const generateId = () => Math.random().toString(36).substr(2, 9);
const formatDate = (isoString) => new Date(isoString).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

// --- UTILIDAD DE BLINDAJE (SAFE ARRAY) PARA EVITAR CRASHES ---
const safeArray = (arr) => {
  if (Array.isArray(arr)) return arr.filter(Boolean);
  if (arr && typeof arr === 'object') return Object.values(arr).filter(Boolean);
  return [];
};

// --- ANIMATED NUMBER COMPONENT (Nativo para mayor fluidez) ---
function AnimatedNumber({ value, decimals = 1, className }) {
  const safeValue = isNaN(value) ? 0 : Number(value);
  const [displayValue, setDisplayValue] = useState(safeValue);
  
  useEffect(() => {
    let start = displayValue;
    const end = safeValue;
    if (start === end) return;
    
    let startTime = null;
    const duration = 500; // ms

    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      // easeOutQuart
      const easeProgress = 1 - Math.pow(1 - progress, 4);
      setDisplayValue(start + (end - start) * easeProgress);
      
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    window.requestAnimationFrame(step);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeValue]);

  return <span className={className}>{Number(displayValue).toFixed(decimals)}</span>;
}

// Fallbacks de seguridad en cálculos
const calculateFieldScore = (studentId, field, activities = [], grades = {}, attitudeLogs = {}, overrides = {}) => {
  if (overrides?.[studentId]?.[field] !== undefined) return Number(overrides[studentId][field]);
  const safeActs = safeArray(activities);
  const fieldActivities = safeActs.filter(a => a.field === field);
  if (fieldActivities.length === 0) return 0;

  let totalWeight = 0, weightedSum = 0;
  fieldActivities.forEach(act => {
    const w = Number(act.weight) || 0;
    const grade = Number(grades[`${studentId}_${act.id}`]);
    if (!isNaN(grade)) { totalWeight += w; weightedSum += (grade * w); }
  });

  let average = totalWeight > 0 ? (weightedSum / totalWeight) : 0;
  const logs = safeArray(attitudeLogs?.[studentId]);
  const fieldAttitude = logs.reduce((acc, log) => (log.field === field && log.fieldDelta) ? acc + log.fieldDelta : acc, 0);
  return Math.max(0, average + fieldAttitude);
};

const calculateFinalMark = (studentId, activities = [], grades = {}, attitudeLogs = {}, overrides = {}) => {
  if (overrides?.[studentId]?.final !== undefined) return Number(overrides[studentId].final);
  let totalScore = 0, activeFields = 0;
  FIELDS.forEach(field => {
    const fieldActivities = safeArray(activities).filter(a => a.field === field);
    if (fieldActivities.length > 0) {
      totalScore += calculateFieldScore(studentId, field, activities, grades, attitudeLogs, overrides);
      activeFields++;
    }
  });
  return activeFields > 0 ? (totalScore / activeFields) : 0;
};

const getAttitudeData = (studentId, activeClass) => {
  const logs = safeArray(activeClass?.attitudeLogs?.[studentId]);
  let bank = 0;
  logs.forEach(log => { if (log.bankDelta !== null) bank += log.bankDelta; });
  return { bank, logs };
};

function AuthScreen({ onDebugLogin }) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [keys, setKeys] = useState([]);
  const [portalAnim, setPortalAnim] = useState(false);
  const KONAMI_CODE = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];

  useEffect(() => {
    const handleKeyDown = (e) => {
      const newKeys = [...keys, e.key].slice(-10);
      setKeys(newKeys);
      if (newKeys.join(',') === KONAMI_CODE.join(',')) {
        setPortalAnim(true);
        setTimeout(() => onDebugLogin(), 2500);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [keys, onDebugLogin]);

  const handleGoogleLogin = async () => {
    setError(''); setLoading(true);
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (err) {
      setError(err.message.replace('Firebase: ', ''));
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center h-full w-full p-4 relative z-50">
      {!portalAnim ? (
        <div className="bg-white/60 backdrop-blur-3xl p-10 rounded-[3rem] shadow-2xl border border-white w-full max-w-md">
          <div className="flex justify-center mb-6">
            <div className="bg-violet-100 p-4 rounded-3xl shadow-inner border border-white">
              <FileText size={40} className="text-violet-600" />
            </div>
          </div>
          <h2 className="text-3xl font-black text-center mb-1 text-slate-800 tracking-tight">NeoGradebook</h2>
          <div className="flex justify-center mb-6"><span className="text-[10px] font-black bg-violet-100 text-violet-600 px-3 py-1 rounded-full uppercase tracking-widest border border-violet-200/50">PRO BETA</span></div>
          <p className="text-sm text-slate-500 font-medium text-center mb-8">Sign in securely to access your classes.</p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-700 text-sm rounded-2xl border border-red-100 flex items-start gap-2">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          <button onClick={handleGoogleLogin} disabled={loading} className="w-full bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-black rounded-2xl p-4 transition-all duration-300 shadow-sm disabled:opacity-70 flex justify-center items-center gap-3 tracking-wide">
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {loading ? 'Connecting...' : 'Sign in with Google'}
          </button>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900 overflow-hidden">
          <motion.div animate={{ rotate: 360, scale: [1, 2, 3, 50] }} transition={{ duration: 2.5, ease: "circIn" }} className="w-64 h-64 rounded-full border-[10px] border-t-cyan-400 border-r-fuchsia-500 border-b-violet-500 border-l-pink-400 shadow-[0_0_100px_rgba(139,92,246,0.8)] flex items-center justify-center relative">
             <div className="absolute inset-0 rounded-full border-[5px] border-white/50 animate-ping"></div>
             <span className="text-white font-black text-2xl tracking-widest uppercase mix-blend-overlay">Sandbox Loading...</span>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isDebug, setIsDebug] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!isDebug) setUser(currentUser);
      setTimeout(() => setAuthLoading(false), 300);
    });
    return () => unsubscribe();
  }, [isDebug]);

  const handleDebugLogin = () => {
    setIsDebug(true);
    setUser({ uid: 'sandbox_user', email: 'sandbox@local.test' });
    setAuthLoading(false);
  };

  return (
    <div className="relative h-screen w-screen bg-slate-50 overflow-hidden">
      <AnimatePresence mode="wait">
        {authLoading ? (
           <motion.div key="loading" exit={{opacity: 0}} className="absolute inset-0 flex items-center justify-center z-50">
             <div className="w-10 h-10 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin"></div>
           </motion.div>
        ) : !user ? (
          <motion.div 
            key="auth" 
            exit={{ scale: 2, opacity: 0, filter: 'blur(20px)' }} 
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }} 
            className="absolute inset-0 z-40 bg-gradient-to-br from-violet-100 via-fuchsia-50 to-cyan-100 flex items-center justify-center"
          >
            <AuthScreen onDebugLogin={handleDebugLogin} />
          </motion.div>
        ) : (
          <motion.div 
            key="app" 
            initial={{ scale: 1.15, opacity: 0, filter: 'blur(25px)' }} 
            animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }} 
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }} 
            className="absolute inset-0 z-30"
          >
            <MainDashboard user={user} isDebug={isDebug} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MainDashboard({ user, isDebug }) {
  const [classes, setClasses] = useState([]);
  const [activeClassId, setActiveClassId] = useState('dashboard');
  const [dataLoading, setDataLoading] = useState(true);
  const [globalSettings, setGlobalSettings] = useState({ theme: 'aurora', aiContext: '', schoolName: '', compactMode: false, highlightFailing: true, geminiApiKey: '', profilePicUrl: '' });
  
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const theme = THEMES[globalSettings.theme] || THEMES.aurora;

  useEffect(() => {
    const savedSettings = localStorage.getItem(`neoGradebookSettings_${user.uid}`);
    if (savedSettings) setGlobalSettings(JSON.parse(savedSettings));
  }, [user.uid]);

  const handleSaveSettings = (newSettings) => {
    setGlobalSettings(newSettings);
    localStorage.setItem(`neoGradebookSettings_${user.uid}`, JSON.stringify(newSettings));
    setIsSettingsOpen(false);
  };

  useEffect(() => {
    if (isDebug) {
      setClasses(prev => prev.length === 0 ? [{ id: 'sandbox_1', name: 'Sandbox Class 101', students: [], activities: [], grades: {}, attitudeLogs: {}, overrides: {}, schedule: [], events: [] }] : prev);
      setDataLoading(false);
      return;
    }
    const q = query(collection(db, 'users', user.uid, 'classes'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setClasses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setDataLoading(false);
    }, (error) => console.error("Firestore Error:", error));
    return () => unsubscribe();
  }, [user.uid, isDebug]);

  useEffect(() => {
    if (classes.length > 0 && (!activeClassId || !classes.find(c => c.id === activeClassId)) && activeClassId !== 'dashboard') {
      setActiveClassId(classes[0].id);
    } else if (classes.length === 0 && !dataLoading) {
      setActiveClassId(null);
    }
  }, [classes, activeClassId, dataLoading]);

  const handleCreateClass = async () => {
    if (!newClassName.trim()) return;
    const newId = `class_${Date.now()}`;
    const newClass = { name: newClassName, students: [], activities: [], grades: {}, attitudeLogs: {}, overrides: {}, schedule: [], events: [] };
    
    if (isDebug) setClasses(prev => [...prev, { id: newId, ...newClass }]);
    else await setDoc(doc(db, 'users', user.uid, 'classes', newId), newClass);
    
    setActiveClassId(newId);
    setNewClassName('');
    setIsClassModalOpen(false);
  };

  const handleDeleteClass = async (classId) => {
    if (window.confirm("Are you sure you want to permanently delete this class? This action cannot be undone.")) {
      if (isDebug) {
        setClasses(prev => prev.filter(c => c.id !== classId));
        setActiveClassId('dashboard');
      } else {
        await deleteDoc(doc(db, 'users', user.uid, 'classes', classId));
        setActiveClassId('dashboard');
      }
    }
  };

  const activeClass = classes.find(c => c.id === activeClassId);

  return (
    <div className={`relative flex h-screen bg-gradient-to-br ${theme.bg} font-sans text-slate-800 overflow-hidden`}>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #print-section, #print-section * { visibility: visible; }
          #print-section { position: absolute; left: 0; top: 0; width: 100%; padding: 20px; background: white; z-index: 9999; }
          .no-print { display: none !important; }
        }
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob { animation: blob 7s infinite; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }
        
        /* Ocultar flechas del input number */
        input[type=number]::-webkit-inner-spin-button, 
        input[type=number]::-webkit-outer-spin-button { 
          -webkit-appearance: none; margin: 0; 
        }
      `}</style>

      {/* Background Blobs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none opacity-50">
        <div className={`absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full ${theme.blob1} mix-blend-multiply filter blur-[100px] opacity-70 animate-blob`}></div>
        <div className={`absolute top-[20%] right-[-10%] w-[40%] h-[40%] rounded-full ${theme.blob2} mix-blend-multiply filter blur-[100px] opacity-70 animate-blob animation-delay-2000`}></div>
        <div className={`absolute bottom-[-20%] left-[20%] w-[50%] h-[50%] rounded-full ${theme.blob3} mix-blend-multiply filter blur-[100px] opacity-70 animate-blob animation-delay-4000`}></div>
      </div>

      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-72' : 'w-24'} transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] bg-white/40 backdrop-blur-3xl m-4 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 flex flex-col relative z-20 shrink-0`}>
        <div className="p-6 flex items-center justify-between border-b border-white/40">
          <div className={`flex items-center gap-3 overflow-hidden whitespace-nowrap transition-all duration-500 ${sidebarOpen ? 'w-full opacity-100' : 'w-0 opacity-0 hidden'}`}>
            <div className={`bg-gradient-to-br ${theme.accentGradient} p-2 rounded-2xl shadow-sm`}><FileText size={20} className="text-white"/></div>
            <div>
              <h1 className="font-black text-lg text-slate-800 tracking-tight leading-none">NeoGradebook</h1>
              <span className={`text-[9px] font-black ${theme.accentText} uppercase tracking-widest`}>PRO BETA</span>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className={`p-2 hover:bg-white/80 rounded-xl transition-colors ${!sidebarOpen && 'mx-auto'}`}>
            {sidebarOpen ? <ChevronDown size={20} className="text-slate-400"/> : <ChevronRight size={20} className="text-slate-600"/>}
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto py-4 px-4 scrollbar-hide space-y-2">
          <button onClick={() => setActiveClassId('dashboard')} className={`w-full text-left py-3 rounded-2xl flex items-center transition-all duration-300 group mb-6 ${sidebarOpen ? 'px-4 gap-4' : 'justify-center px-0'} ${activeClassId === 'dashboard' ? `bg-white/80 shadow-sm border border-white` : 'hover:bg-white/50 text-slate-600 border border-transparent'}`}>
             <div className={`p-1.5 rounded-xl transition-colors shrink-0 ${activeClassId === 'dashboard' ? `${theme.iconBg} ${theme.iconText}` : `bg-white/60 group-hover:bg-white`}`}><Home size={18} /></div>
             {sidebarOpen && <span className="font-bold tracking-wide">Overview</span>}
          </button>

          {sidebarOpen && <div className="px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 mt-2">My Classes</div>}
          {classes.map(c => (
            <button key={c.id} onClick={() => setActiveClassId(c.id)} className={`w-full text-left py-3 rounded-2xl flex items-center transition-all duration-300 group ${sidebarOpen ? 'px-4 gap-4' : 'justify-center px-0'} ${activeClassId === c.id ? `bg-gradient-to-r ${theme.accentGradient} text-white shadow-lg ${theme.accentHover}` : 'hover:bg-white/80 text-slate-600'}`}>
              <div className={`p-1.5 rounded-xl transition-colors shrink-0 ${activeClassId === c.id ? 'bg-white/20' : `${theme.iconBg} group-hover:bg-white`}`}><User size={18} className={activeClassId === c.id ? 'text-white' : theme.accentText}/></div>
              {sidebarOpen && <span className="truncate font-bold tracking-wide">{c.name}</span>}
            </button>
          ))}
          <button onClick={() => setIsClassModalOpen(true)} className={`mx-auto flex items-center justify-center gap-2 bg-white/50 hover:bg-white text-slate-600 py-3 rounded-2xl border border-white/60 transition-all shadow-sm ${sidebarOpen ? 'w-[calc(100%-2rem)] mt-6' : 'w-12 h-12 p-0 mt-4'}`}>
            <Plus size={20} className={!sidebarOpen ? 'mx-auto' : ''} />
            {sidebarOpen && <span className="font-bold">New Class</span>}
          </button>
        </div>
        
        <div className="p-4 border-t border-white/50 bg-white/30 rounded-b-[2.5rem]">
          <button onClick={() => setIsSettingsOpen(true)} className={`w-full flex items-center py-3 rounded-2xl hover:bg-white/80 transition-colors text-slate-600 group mb-2 ${sidebarOpen ? 'px-4 gap-3' : 'justify-center px-0'}`}>
             <Settings size={20} className={`shrink-0 group-hover:rotate-90 transition-transform ${theme.accentText}`} />
             {sidebarOpen && <span className="font-bold">Global Settings</span>}
          </button>
          <div className={`flex flex-col gap-4 bg-white/50 p-4 rounded-3xl border border-white/80 ${!sidebarOpen ? 'items-center' : ''}`}>
            <div className={`flex items-center gap-3 overflow-hidden whitespace-nowrap transition-all duration-300 ${sidebarOpen ? 'w-full opacity-100' : 'w-0 opacity-0 hidden'}`}>
               <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center shrink-0 border-2 border-white shadow-sm overflow-hidden">
                 {globalSettings.profilePicUrl || user?.photoURL ? <img src={globalSettings.profilePicUrl || user?.photoURL} alt="Profile" className="w-full h-full object-cover"/> : <User size={16} className="text-slate-400" />}
               </div>
               <span className="truncate text-xs font-bold text-slate-600">{user.email}</span>
            </div>
            <button onClick={() => { if(isDebug) window.location.reload(); else signOut(auth); }} className={`flex items-center gap-3 text-red-500 hover:text-red-600 transition-colors group ${!sidebarOpen ? 'justify-center' : ''}`}>
               <LogOut size={18} className="shrink-0 group-hover:-translate-x-1 transition-transform" />
               {sidebarOpen && <span className="text-sm font-black tracking-wide">Log Out</span>}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 z-10 py-4 pr-4 pl-0 relative">
        {dataLoading ? (
           <div className="flex-1 flex flex-col items-center justify-center text-slate-500 space-y-4">
             <div className="w-8 h-8 border-4 border-white border-t-violet-500 rounded-full animate-spin"></div>
             <p className="font-bold tracking-widest uppercase text-xs">Loading data...</p>
           </div>
        ) : activeClassId === 'dashboard' || (!activeClass && classes.length > 0) ? (
           <GlobalDashboard classes={classes} theme={theme} />
        ) : activeClass ? (
           <ClassView key={activeClass.id} activeClass={activeClass} userId={user.uid} isDebug={isDebug} globalSettings={globalSettings} theme={theme} setClasses={setClasses} classes={classes} onDeleteClass={() => handleDeleteClass(activeClass.id)} />
        ) : (
           <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white/40 backdrop-blur-3xl rounded-[3rem] border border-white shadow-sm">
             <div className={`p-6 rounded-[2.5rem] mb-6 bg-white shadow-sm border border-slate-100 ${theme.accentText}`}><FileText size={64} /></div>
             <h2 className="text-3xl font-black text-slate-800 mb-3 tracking-tight">Welcome to NeoGradebook</h2>
             <p className="text-slate-500 mb-8 max-w-sm font-medium">Create your first class to start tracking grades, schedules, and AI-generated reports.</p>
             <button onClick={() => setIsClassModalOpen(true)} className={`flex items-center gap-2 bg-gradient-to-r ${theme.accentGradient} text-white px-8 py-4 rounded-2xl transition-all duration-300 shadow-xl ${theme.accentHover} hover:-translate-y-0.5 font-black tracking-wide`}>
               <Plus size={20} /> Create First Class
             </button>
           </div>
        )}
      </div>

      {/* Global Settings Modal */}
      <AnimatePresence>
      {isSettingsOpen && (
        <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <motion.div initial={{scale:0.95, y:10}} animate={{scale:1, y:0}} exit={{scale:0.95, y:10}} className="bg-white/90 backdrop-blur-3xl rounded-[3rem] shadow-2xl border border-white p-8 w-full max-w-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3"><Settings className={theme.accentText}/> Global Settings</h3>
              <button onClick={() => setIsSettingsOpen(false)} className="text-slate-400 hover:bg-slate-100 p-2 rounded-full transition-colors"><X size={20}/></button>
            </div>
            
            <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2 scrollbar-hide">
              <div className="bg-white/50 p-5 rounded-[2rem] border border-white/60 shadow-sm">
                <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${theme.blob1}`}></div> UI Appearance</h4>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {[
                    {id:'aurora', name:'Aurora', colors:'from-violet-400 to-fuchsia-400'},
                    {id:'peach', name:'Peach', colors:'from-rose-400 to-orange-400'},
                    {id:'ocean', name:'Ocean', colors:'from-blue-400 to-cyan-400'},
                    {id:'mint', name:'Mint', colors:'from-emerald-400 to-teal-400'},
                  ].map(t => (
                    <button key={t.id} onClick={() => setGlobalSettings({...globalSettings, theme: t.id})} className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all ${globalSettings.theme === t.id ? `border-slate-800 bg-white shadow-sm` : 'border-transparent hover:bg-white/50'}`}>
                       <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${t.colors} shadow-sm`}></div>
                       <span className="text-xs font-bold text-slate-600">{t.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white/50 p-5 rounded-[2rem] border border-white/60 shadow-sm">
                <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${theme.blob2}`}></div> General Preferences</h4>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-500 mb-1 ml-1">School Name (For PDFs)</label>
                      <input type="text" value={globalSettings.schoolName} onChange={e => setGlobalSettings({...globalSettings, schoolName: e.target.value})} className={`w-full border border-white/80 rounded-2xl p-3 focus:bg-white bg-white/50 outline-none transition-all shadow-inner font-medium ${theme.accentRing} focus:ring-4`} placeholder="e.g. Springfield High"/>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-500 mb-1 ml-1 flex items-center gap-1"><ImagePlus size={14}/> Profile Picture URL</label>
                      <input type="text" value={globalSettings.profilePicUrl || ''} onChange={e => setGlobalSettings({...globalSettings, profilePicUrl: e.target.value})} className={`w-full border border-white/80 rounded-2xl p-3 focus:bg-white bg-white/50 outline-none transition-all shadow-inner font-medium ${theme.accentRing} focus:ring-4`} placeholder="https://... (Optional)"/>
                    </div>
                  </div>
                  <label className="flex items-center gap-3 p-3 bg-white/50 rounded-2xl border border-white/60 cursor-pointer hover:bg-white transition-colors">
                    <input type="checkbox" checked={globalSettings.compactMode} onChange={e => setGlobalSettings({...globalSettings, compactMode: e.target.checked})} className="w-5 h-5 rounded text-violet-600 focus:ring-violet-500 border-gray-300"/>
                    <span className="font-bold text-slate-700">Compact Grid Mode</span>
                  </label>
                </div>
              </div>

              <div className="bg-white/50 p-5 rounded-[2rem] border border-white/60 shadow-sm">
                <h4 className="font-bold text-slate-700 mb-2 flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${theme.blob3}`}></div> AI Assistant Settings</h4>
                <p className="text-xs text-slate-500 mb-3 font-medium leading-relaxed">Paste 2 or 3 of your best previous report comments here. The Gemini AI will mimic your tone when generating new drafts.</p>
                <textarea value={globalSettings.aiContext} onChange={e => setGlobalSettings({...globalSettings, aiContext: e.target.value})} className={`w-full h-24 mb-4 border border-white/80 rounded-2xl p-4 focus:bg-white bg-white/50 outline-none transition-all shadow-inner font-medium resize-none ${theme.accentRing} focus:ring-4 placeholder:text-slate-400 leading-relaxed`} placeholder="Example: Joan has shown exceptional dedication this term..."/>
                
                <h4 className="font-bold text-slate-700 mb-2 flex items-center gap-2 text-sm mt-2">Gemini API Key</h4>
                <div className="text-xs text-slate-500 mb-3 font-medium bg-slate-100/50 p-3 rounded-xl border border-slate-200">
                  <b>How to get your free key:</b>
                  <ol className="list-decimal pl-4 mt-1 space-y-1">
                    <li>Go to <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">Google AI Studio</a>.</li>
                    <li>Sign in with your Google account.</li>
                    <li>Click the blue <b>"Create API Key"</b> button.</li>
                    <li>Copy the long string of text and paste it below.</li>
                  </ol>
                </div>
                <input type="password" value={globalSettings.geminiApiKey || ''} onChange={e => setGlobalSettings({...globalSettings, geminiApiKey: e.target.value})} className={`w-full border border-white/80 rounded-2xl p-3 focus:bg-white bg-white/50 outline-none transition-all shadow-inner font-medium placeholder:text-slate-400 ${theme.accentRing} focus:ring-4`} placeholder="AIzaSy..."/>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button onClick={() => handleSaveSettings(globalSettings)} className={`px-8 py-4 bg-gradient-to-r ${theme.accentGradient} text-white font-black tracking-wide rounded-2xl shadow-xl transition-all ${theme.accentHover}`}>Save Settings</button>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Create Class Modal */}
      <AnimatePresence>
      {isClassModalOpen && (
        <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <motion.div initial={{scale:0.95, y:10}} animate={{scale:1, y:0}} exit={{scale:0.95, y:10}} className="bg-white/90 backdrop-blur-3xl rounded-[3rem] shadow-2xl border border-white p-8 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black text-slate-800">New Class</h3>
              <button onClick={() => setIsClassModalOpen(false)} className="text-slate-400 hover:bg-slate-100 p-2 rounded-full transition-colors"><X size={20}/></button>
            </div>
            <div className="mb-8">
              <label className="block text-sm font-bold text-slate-500 mb-2 ml-1">Class Name</label>
              <input type="text" autoFocus placeholder="e.g. English 101 - Morning" className={`w-full border border-white/60 rounded-2xl p-4 focus:bg-white bg-white/50 outline-none transition-all shadow-inner font-medium placeholder:text-slate-400 ${theme.accentRing} focus:ring-4`} value={newClassName} onChange={e => setNewClassName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreateClass()}/>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setIsClassModalOpen(false)} className="px-6 py-3.5 text-slate-600 font-bold hover:bg-white/60 rounded-2xl transition-colors">Cancel</button>
              <button onClick={handleCreateClass} className={`px-6 py-3.5 bg-gradient-to-r ${theme.accentGradient} text-white font-black tracking-wide rounded-2xl transition-all shadow-xl ${theme.accentHover}`}>Create</button>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}

// --- GLOBAL DASHBOARD COMPONENT ---
function GlobalDashboard({ classes, theme }) {
  const allEvents = useMemo(() => {
    const today = new Date();
    today.setHours(0,0,0,0);
    return safeArray(classes).flatMap(c => 
      safeArray(c.events).map(e => ({...e, className: c.name}))
    )
    .filter(e => e && e.date && new Date(e.date) >= today)
    .sort((a,b) => new Date(a.date) - new Date(b.date));
  }, [classes]);

  return (
    <div className="flex-1 bg-white/40 backdrop-blur-3xl rounded-[3rem] border border-white/60 shadow-sm p-8 flex flex-col h-full overflow-hidden">
      <div className="mb-8 flex items-center gap-4 border-b border-white pb-6">
         <div className={`p-4 rounded-[2rem] bg-gradient-to-br ${theme.accentGradient} text-white shadow-lg`}><Home size={32} /></div>
         <div>
           <h2 className="text-4xl font-black text-slate-800 tracking-tight">Overview Dashboard</h2>
           <p className="text-slate-500 font-medium">Welcome back! Here's what's happening across your {safeArray(classes).length} classes.</p>
         </div>
      </div>
      
      <div className="flex-1 overflow-y-auto pr-4 space-y-8 scrollbar-hide">
        <div>
          <h3 className="text-xl font-black text-slate-800 mb-4 flex items-center gap-2"><Calendar size={20} className={theme.accentText}/> Upcoming Events</h3>
          {allEvents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {allEvents.map((ev, i) => (
                <div key={i} className="bg-white/70 p-5 rounded-3xl shadow-sm border border-white hover:shadow-md transition-shadow group flex items-start gap-4">
                  <div className="bg-slate-100 text-slate-500 font-black p-3 rounded-2xl text-center min-w-[60px] shadow-inner shrink-0 group-hover:bg-slate-200 transition-colors">
                    <div className="text-xs uppercase tracking-widest">{new Date(ev.date).toLocaleDateString('en-GB', {month:'short'})}</div>
                    <div className="text-2xl leading-none mt-1 text-slate-800">{new Date(ev.date).getDate()}</div>
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-lg truncate" title={ev.title}>{ev.title}</h4>
                    <p className="text-sm font-medium text-slate-500 flex items-center gap-1 mt-1"><User size={14}/> {ev.className}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white/50 p-8 rounded-3xl border border-white/80 text-center shadow-inner">
               <CalendarDays size={48} className="mx-auto mb-3 text-slate-300"/>
               <p className="text-slate-500 font-bold">No upcoming events scheduled.</p>
               <p className="text-sm text-slate-400">Open a class and click "Calendar" to add tests, due dates, or reminders.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ClassView({ activeClass, userId, isDebug, globalSettings, theme, setClasses, classes, onDeleteClass }) {
  const [studentName, setStudentName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [saveStatus, setSaveStatus] = useState('saved');
  const [editingStudentId, setEditingStudentId] = useState(null);
  const [editStudentName, setEditStudentName] = useState('');
  
  // EXTRAER DATOS CON FALLBACKS SEGUROS (SAFE ARRAY) PARA EVITAR CRASHES:
  const students = safeArray(activeClass?.students);
  const activities = safeArray(activeClass?.activities);
  const grades = activeClass?.grades || {};
  const attitudeLogs = activeClass?.attitudeLogs || {};
  const overrides = activeClass?.overrides || {};
  const events = safeArray(activeClass?.events);
  const schedule = safeArray(activeClass?.schedule);

  const [isEditingClassName, setIsEditingClassName] = useState(false);
  const [editClassName, setEditClassName] = useState(activeClass?.name || '');

  // Modals
  const [fieldManager, setFieldManager] = useState({ isOpen: false, field: null, localActs: [] });
  const [attitudeModal, setAttitudeModal] = useState({ isOpen: false, studentId: null, reason: '', val: 0.1, transferVal: 0.1, transferField: 'Grammar' });
  const [commentModal, setCommentModal] = useState({ isOpen: false, studentId: null, text: '', aiPrompt: '', aiLanguage: 'English', includeMarks: true });
  const [overrideModal, setOverrideModal] = useState({ isOpen: false, studentId: null, field: null, val: '' });
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Private Mode & Cell Tracking
  const [privateMode, setPrivateMode] = useState(false);
  const [focusedStudent, setFocusedStudent] = useState(null);
  const [lastUpdatedCell, setLastUpdatedCell] = useState(null);

  const fileInputRef = useRef(null);
  const [uploadStudentId, setUploadStudentId] = useState(null);

  const cellPad = globalSettings.compactMode ? 'p-1' : 'p-2';

  const updateClassData = async (updates) => {
    setSaveStatus('saving');
    if (isDebug) {
      const updatedClass = { ...activeClass, ...updates };
      setClasses(classes.map(c => c.id === updatedClass.id ? updatedClass : c));
      setTimeout(() => setSaveStatus('saved'), 400);
      return;
    }
    const classRef = doc(db, 'users', userId, 'classes', activeClass.id);
    await updateDoc(classRef, updates);
    setTimeout(() => setSaveStatus('saved'), 400);
  };

  const handleSaveClassName = async () => {
    if (editClassName.trim() && editClassName !== activeClass.name) {
      await updateClassData({ name: editClassName.trim() });
    }
    setIsEditingClassName(false);
  };

  const handleAddStudent = async (e) => {
    if (e.key === 'Enter' && studentName.trim()) {
      const newStudent = { id: generateId(), name: studentName.trim(), comments: '', avatar: '' };
      await updateClassData({ students: [...students, newStudent] });
      setStudentName('');
    }
  };

  const handleDeleteStudent = async (studentId) => {
    if(window.confirm("Remove this student completely?")) {
      await updateClassData({ students: students.filter(s => s.id !== studentId) });
    }
  };

  const handleRenameStudent = async (studentId) => {
    if (editStudentName.trim() && editStudentName !== students.find(s => s.id === studentId)?.name) {
      const updated = students.map(s => s.id === studentId ? { ...s, name: editStudentName.trim() } : s);
      await updateClassData({ students: updated });
    }
    setEditingStudentId(null);
  };

  const triggerAvatarUpload = (studentId) => {
    setUploadStudentId(studentId);
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file || !uploadStudentId) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const MAX_SIZE = 150;
        let { width, height } = img;
        if (width > height) { if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; } } 
        else { if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; } }
        canvas.width = width; canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        const updatedStudents = students.map(s => s.id === uploadStudentId ? { ...s, avatar: dataUrl } : s);
        await updateClassData({ students: updatedStudents });
        setUploadStudentId(null);
        e.target.value = '';
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const openFieldManager = (field, createNew = false) => {
    let currentActs = activities.filter(a => a.field === field);
    if (createNew) {
      currentActs = [...currentActs, { id: generateId(), field, name: 'New Activity', weight: 10 }];
    }
    setFieldManager({ isOpen: true, field, localActs: currentActs });
  };

  const equalizeLocalWeights = () => {
    if (fieldManager.localActs.length === 0) return;
    const eq = Number((100 / fieldManager.localActs.length).toFixed(2));
    setFieldManager(prev => ({ ...prev, localActs: prev.localActs.map(a => ({ ...a, weight: eq })) }));
  };

  const handleSaveFieldManager = async () => {
    const otherActs = activities.filter(a => a.field !== fieldManager.field);
    const updatedActivities = [...otherActs, ...fieldManager.localActs.filter(a => a.name.trim())];
    await updateClassData({ activities: updatedActivities });
    setFieldManager({ isOpen: false, field: null, localActs: [] });
  };

  const handleDeleteActivity = async (activityId) => {
    if(window.confirm("Delete activity and all its grades?")) {
      await updateClassData({ activities: activities.filter(a => a.id !== activityId) });
    }
  };

  const handleEqualizeWeights = async (field) => {
    const fieldActivities = activities.filter(a => a.field === field);
    if (fieldActivities.length === 0) return;
    const equalWeight = Number((100 / fieldActivities.length).toFixed(2));
    const updatedActivities = activities.map(a => a.field === field ? { ...a, weight: equalWeight } : a);
    await updateClassData({ activities: updatedActivities });
  };

  const handleBulkFill = async (activityId) => {
    const val = window.prompt("Enter a grade to fill all empty cells for this activity:");
    if (val === null || val.trim() === '') return;
    const numVal = Number(val);
    if (isNaN(numVal)) return;
    const newGrades = { ...grades };
    students.forEach(s => {
      const key = `${s.id}_${activityId}`;
      if (newGrades[key] === undefined || newGrades[key] === '') newGrades[key] = numVal;
    });
    await updateClassData({ grades: newGrades });
  };

  const handleGradeChange = (studentId, activityId, value) => {
    const numVal = value === '' ? '' : Number(value);
    updateClassData({ grades: { ...grades, [`${studentId}_${activityId}`]: numVal } });
  };

  const handleGradeKeyDown = (e, studentId, activityId, rowIndex) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setLastUpdatedCell(`${studentId}_${activityId}`);
      setTimeout(() => setLastUpdatedCell(null), 400);
      const nextInput = document.querySelector(`input[data-row="${rowIndex + 1}"][data-col="${activityId}"]`);
      if (nextInput) { nextInput.focus(); nextInput.select(); }
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const nextRow = e.key === 'ArrowDown' ? rowIndex + 1 : rowIndex - 1;
      const nextInput = document.querySelector(`input[data-row="${nextRow}"][data-col="${activityId}"]`);
      if (nextInput) { nextInput.focus(); nextInput.select(); }
    }
  };

  const handleAddToBank = async () => {
    if (!attitudeModal.reason.trim()) return;
    const log = { id: generateId(), date: new Date().toISOString(), reason: attitudeModal.reason, bankDelta: attitudeModal.val, fieldDelta: null, field: null };
    const currentLogs = safeArray(attitudeLogs?.[attitudeModal.studentId]);
    await updateClassData({ attitudeLogs: { ...attitudeLogs, [attitudeModal.studentId]: [log, ...currentLogs] } });
    setAttitudeModal({...attitudeModal, reason: '', val: 0.1});
  };

  const handleTransferFromBank = async () => {
    if (!attitudeModal.transferField) return;
    const log = { id: generateId(), date: new Date().toISOString(), reason: `Applied to ${attitudeModal.transferField}`, bankDelta: -attitudeModal.transferVal, fieldDelta: attitudeModal.transferVal, field: attitudeModal.transferField };
    const currentLogs = safeArray(attitudeLogs?.[attitudeModal.studentId]);
    await updateClassData({ attitudeLogs: { ...attitudeLogs, [attitudeModal.studentId]: [log, ...currentLogs] } });
    setAttitudeModal({...attitudeModal, transferVal: 0.1});
  };

  const handleDeleteLog = async (studentId, logId) => {
     const currentLogs = safeArray(attitudeLogs?.[studentId]);
     const filteredLogs = currentLogs.filter(l => l.id !== logId);
     await updateClassData({ attitudeLogs: { ...attitudeLogs, [studentId]: filteredLogs } });
  };

  const handleSaveOverride = async () => {
    const val = overrideModal.val === '' ? undefined : Number(overrideModal.val);
    const newOverrides = { ...overrides };
    if (!newOverrides[overrideModal.studentId]) newOverrides[overrideModal.studentId] = {};
    if (val === undefined) {
      delete newOverrides[overrideModal.studentId][overrideModal.field];
      if (Object.keys(newOverrides[overrideModal.studentId]).length === 0) delete newOverrides[overrideModal.studentId];
    } else {
      newOverrides[overrideModal.studentId][overrideModal.field] = val;
    }
    await updateClassData({ overrides: newOverrides });
    setOverrideModal({ isOpen: false, studentId: null, field: null, val: '' });
  };

  const handleSaveComment = async () => {
    const updatedStudents = students.map(s => s.id === commentModal.studentId ? { ...s, comments: commentModal.text } : s);
    await updateClassData({ students: updatedStudents });
    setCommentModal({ ...commentModal, isOpen: false });
  };

  const handleGenerateDraft = async () => {
    const apiKey = globalSettings.geminiApiKey || "";
    if (!apiKey) return window.alert("Please enter your Gemini API Key in the Global Settings to use the AI Assistant.");
    
    setIsGenerating(true);
    try {
      const student = students.find(s => s.id === commentModal.studentId);
      let scoresStr = "";
      if (commentModal.includeMarks) {
         const scores = FIELDS.map(f => `${f}: ${calculateFieldScore(student.id, f, activities, grades, attitudeLogs, overrides).toFixed(1)}`).join(', ');
         const final = calculateFinalMark(student.id, activities, grades, attitudeLogs, overrides).toFixed(1);
         scoresStr = `Grades: ${scores}. Final: ${final}. `;
      }

      const systemInstruction = `You are an expert teacher writing a report card comment. Language: ${commentModal.aiLanguage}. Tone/Style based on: "${globalSettings.aiContext || 'Professional, encouraging'}". Write a single, polished paragraph without placeholders.`;
      const userQuery = `Student: ${student.name}. ${scoresStr}Teacher Notes: ${commentModal.aiPrompt || 'Has done well.'}`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: userQuery }] }], systemInstruction: { parts: [{ text: systemInstruction }] } })
      });
      const result = await response.json();
      const candidate = result.candidates?.[0];
      if (candidate && candidate.content?.parts?.[0]?.text) {
         setCommentModal(prev => ({ ...prev, text: candidate.content.parts[0].text }));
      } else throw new Error("Failed to generate text.");
    } catch (error) {
      console.error(error);
      window.alert("An error occurred generating the comment. Check API key.");
    } finally {
      setIsGenerating(false);
    }
  };

  const exportCSV = () => {
    let csv = `Student Name,${FIELDS.map(f => {
      const acts = activities.filter(a => a.field === f);
      return acts.map(a => `${f} - ${a.name}`).join(',') + (acts.length > 0 ? `,${f} AVG` : `${f} AVG`);
    }).join(',')},FINAL MARK\n`;

    students.forEach(student => {
      csv += `"${student.name}",`;
      FIELDS.forEach(field => {
        const acts = activities.filter(a => a.field === field);
        acts.forEach(act => csv += `${grades[`${student.id}_${act.id}`] ?? ''},`);
        csv += `${calculateFieldScore(student.id, field, activities, grades, attitudeLogs, overrides).toFixed(2)},`;
      });
      csv += `${calculateFinalMark(student.id, activities, grades, attitudeLogs, overrides).toFixed(2)}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeClass?.name || 'Class'}_Grades.csv`;
    a.click();
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const processedStudents = useMemo(() => {
    let sortable = [...students];
    if (searchTerm) sortable = sortable.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));
    if (sortConfig.key) {
      sortable.sort((a, b) => {
        if (sortConfig.key === 'name') return sortConfig.direction === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
        else if (sortConfig.key === 'final') {
          const aF = calculateFinalMark(a.id, activities, grades, attitudeLogs, overrides);
          const bF = calculateFinalMark(b.id, activities, grades, attitudeLogs, overrides);
          return sortConfig.direction === 'asc' ? aF - bF : bF - aF;
        }
        return 0;
      });
    }
    return sortable;
  }, [activeClass, searchTerm, sortConfig]);

  const classAverages = useMemo(() => {
    const avgs = { activities: {}, fields: {}, final: 0 };
    if (students.length === 0) return avgs;
    activities.forEach(act => {
      let sum = 0, count = 0;
      students.forEach(s => {
        const g = grades[`${s.id}_${act.id}`];
        if (g !== undefined && g !== '') { sum += g; count++; }
      });
      avgs.activities[act.id] = count > 0 ? (sum / count) : 0;
    });
    let finalSum = 0;
    FIELDS.forEach(field => {
      let fieldSum = 0;
      students.forEach(s => fieldSum += calculateFieldScore(s.id, field, activities, grades, attitudeLogs, overrides));
      avgs.fields[field] = fieldSum / students.length;
    });
    students.forEach(s => finalSum += calculateFinalMark(s.id, activities, grades, attitudeLogs, overrides));
    avgs.final = finalSum / students.length;
    return avgs;
  }, [activeClass, activeClass?.grades, activeClass?.overrides]); // Safe deps

  const upcomingEvents = useMemo(() => {
    const today = new Date();
    today.setHours(0,0,0,0);
    return events.filter(e => new Date(e.date) >= today).sort((a,b) => new Date(a.date) - new Date(b.date)).slice(0, 3);
  }, [activeClass?.events]);

  return (
    <div className="flex flex-col h-full relative z-10">
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
      
      {/* Header */}
      <div className="bg-white/40 backdrop-blur-3xl border border-white/60 rounded-[2.5rem] px-8 py-5 flex flex-col md:flex-row items-center justify-between shadow-sm mb-4 no-print shrink-0">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
              {isEditingClassName ? (
                <input autoFocus value={editClassName} onChange={e=>setEditClassName(e.target.value)} onBlur={handleSaveClassName} onKeyDown={e=>e.key==='Enter'&&handleSaveClassName()} className="bg-white/80 border border-slate-300 rounded-xl px-3 py-1 outline-none focus:ring-2 focus:ring-slate-400 text-3xl font-black"/>
              ) : (
                <span className="cursor-text" onDoubleClick={() => setIsEditingClassName(true)}>{activeClass?.name}</span>
              )}
              {!isEditingClassName && <button onClick={() => setIsEditingClassName(true)} className="text-slate-300 hover:text-slate-600 transition-opacity"><Edit2 size={18}/></button>}
              <button onClick={onDeleteClass} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all" title="Delete Class"><Trash2 size={22}/></button>
              {isDebug && <span className="text-xs font-bold bg-amber-100 text-amber-700 px-3 py-1 rounded-full shadow-sm border border-amber-200">Local Sandbox</span>}
            </h2>
            <div className="flex items-center gap-4 mt-2">
              <p className="text-sm font-bold text-slate-500 flex items-center gap-2 bg-white/60 px-3 py-1 rounded-full shadow-inner"><User size={14}/> {students.length} Students</p>
              <div className="relative">
                <input type="text" placeholder="Find student..." className="text-sm bg-white/60 border border-white rounded-full px-4 py-1.5 pl-8 focus:bg-white outline-none focus:ring-2 focus:ring-slate-200 transition-all shadow-inner placeholder:text-slate-400 font-medium w-48" value={searchTerm} onChange={(e)=>setSearchTerm(e.target.value)} />
                <span className="absolute left-2.5 top-2 text-slate-400"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg></span>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 bg-white/40 px-3 py-1 rounded-full">
                {saveStatus === 'saving' ? <><div className="w-3 h-3 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin"/> Saving...</> : <><div className="w-2 h-2 rounded-full bg-emerald-400"/> Saved</>}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 mt-4 md:mt-0">
          {upcomingEvents.length > 0 && (
             <div className="flex gap-2 mr-4 border-r border-white/50 pr-4 overflow-x-auto scrollbar-hide max-w-[300px]">
               {upcomingEvents.map(ev => (
                 <div key={ev.id} className="bg-white/60 px-3 py-1.5 rounded-xl border border-white shadow-sm flex flex-col justify-center min-w-[120px]">
                   <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{new Date(ev.date).toLocaleDateString('en-GB', {day:'2-digit', month:'short'})}</span>
                   <span className="text-sm font-bold text-slate-800 truncate">{ev.title}</span>
                 </div>
               ))}
             </div>
          )}
          <button onClick={() => setPrivateMode(!privateMode)} className={`flex items-center gap-2 px-4 py-3 rounded-2xl transition-all font-bold shadow-sm border border-white ${privateMode ? `bg-slate-800 text-white` : 'bg-white/80 hover:bg-white text-slate-700'}`}>
            {privateMode ? <EyeOff size={18} /> : <Eye size={18} className={theme.accentText} />} Private
          </button>
          <button onClick={() => setCalendarOpen(true)} className="flex items-center gap-2 bg-white/80 hover:bg-white text-slate-700 px-4 py-3 rounded-2xl transition-colors font-bold shadow-sm border border-white">
            <Calendar size={18} className={theme.accentText} />
          </button>
          <button onClick={() => window.print()} className={`flex items-center gap-2 bg-gradient-to-r ${theme.accentGradient} text-white px-5 py-3 rounded-2xl transition-all shadow-lg ${theme.accentHover} font-black tracking-wide`}><FileText size={18} /> Print PDF</button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="flex-1 overflow-auto bg-white/40 backdrop-blur-3xl rounded-[3rem] border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] no-print relative">
        <table className="w-full border-collapse table-auto min-w-max">
          <thead className="bg-white/80 backdrop-blur-md sticky top-0 z-30 shadow-sm border-b border-white">
            <tr>
              <th className="w-64 p-0 sticky left-0 z-40 bg-white/90 backdrop-blur-md border-b-2 border-r border-slate-200 shadow-[4px_0_10px_-5px_rgba(0,0,0,0.05)] cursor-pointer hover:bg-white" onClick={() => handleSort('name')}>
                <div className="px-6 py-4 flex items-center justify-between h-full">
                  <span className="font-black text-slate-800 text-sm uppercase tracking-widest flex items-center gap-2">STUDENTS {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</span>
                </div>
              </th>
              {FIELDS.map(field => {
                const acts = activities.filter(a => a.field === field);
                const fieldStyle = PRINT_STYLES[field];
                return (
                  <th key={field} colSpan={Math.max(1, acts.length) + 1} className="border-b-2 border-r border-slate-200 p-3 text-center group transition-colors hover:bg-white relative" style={{backgroundColor: `${fieldStyle.cell}30`}}>
                    <div className="flex items-center justify-center gap-3">
                      <span className="font-black text-lg tracking-wide" style={{color: fieldStyle.head}}>{field}</span>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute right-2 top-2 z-10">
                      {acts.length > 0 && <button onClick={() => handleEqualizeWeights(field)} className="text-[9px] font-black uppercase bg-slate-800 text-white px-2 py-1 rounded shadow-sm hover:bg-black transition-colors">Equalize</button>}
                      {acts.length > 0 && <button onClick={() => openFieldManager(field, false)} className="text-[9px] font-black uppercase bg-white text-slate-600 px-2 py-1 rounded shadow-sm hover:bg-slate-50 transition-colors border border-slate-200">Edit</button>}
                      <button onClick={() => openFieldManager(field, true)} className="text-[9px] font-black uppercase bg-blue-100 text-blue-600 px-2 py-1 rounded shadow-sm hover:bg-blue-200 transition-colors">+ Add</button>
                    </div>
                  </th>
                );
              })}
              <th className="w-32 border-b-2 border-r border-slate-200 p-3 bg-white text-center font-black text-slate-800 tracking-widest cursor-pointer hover:bg-slate-50" onClick={() => handleSort('final')}>
                FINAL {sortConfig.key === 'final' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th className="w-32 border-b-2 border-slate-200 p-3 bg-white/50 text-center font-bold text-slate-500 uppercase tracking-widest text-xs">EXTRAS</th>
            </tr>
            <tr className="text-sm">
              <th className="sticky left-0 z-40 bg-white/90 backdrop-blur-md border-b border-r border-slate-200 p-3 text-left align-bottom shadow-[4px_0_10px_-5px_rgba(0,0,0,0.05)]">
                 <input type="text" placeholder="+ Add student (Enter)" className="w-full text-sm bg-slate-100 border-none rounded-xl px-4 py-2 focus:bg-white focus:ring-2 focus:ring-slate-300 outline-none font-bold transition-all placeholder:text-slate-400 shadow-inner" value={studentName} onChange={(e) => setStudentName(e.target.value)} onKeyDown={handleAddStudent}/>
              </th>
              {FIELDS.map(field => {
                const acts = activities.filter(a => a.field === field);
                const fieldStyle = PRINT_STYLES[field];
                return (
                  <React.Fragment key={`group-${field}`}>
                    {acts.length === 0 ? (
                      <th className="border-b border-r border-slate-100 p-3 text-slate-400 italic text-center font-medium bg-white/30 text-xs">No acts</th>
                    ) : (
                      acts.map(act => (
                        <th key={act.id} className="border-b border-r border-slate-200 p-3 text-center font-normal min-w-[110px] relative group bg-white/50 hover:bg-white transition-colors">
                          <div className="font-bold text-slate-700 truncate px-2">{act.name}</div>
                          <div className="text-[10px] font-black mt-1 bg-white inline-block px-2 py-0.5 rounded-full shadow-sm text-slate-500">{act.weight}%</div>
                          <div className="absolute top-2 right-1 opacity-0 group-hover:opacity-100 flex flex-col gap-1 z-10">
                            <button onClick={() => openFieldManager(act.field, false)} className="text-slate-400 hover:text-blue-500 hover:bg-blue-50 p-1 rounded-lg transition-all" title="Edit Activity"><Edit2 size={12}/></button>
                            <button onClick={() => handleDeleteActivity(act.id)} className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1 rounded-lg transition-all" title="Delete"><Trash2 size={12}/></button>
                            <button onClick={() => handleBulkFill(act.id)} className="text-slate-400 hover:text-violet-500 hover:bg-violet-50 p-1 rounded-lg transition-all" title="Fill Empty"><Wand2 size={12}/></button>
                          </div>
                        </th>
                      ))
                    )}
                    <th className="border-b border-r border-slate-200 p-3 text-center font-black text-sm tracking-widest shadow-inner w-24" style={{backgroundColor: `${fieldStyle.cell}60`, color: fieldStyle.head}}>AVG</th>
                  </React.Fragment>
                );
              })}
              <th className="border-b border-r border-slate-200 bg-white/80"></th>
              <th className="border-b border-slate-200 bg-white/30"></th>
            </tr>
          </thead>
          <tbody>
            {processedStudents.map((student, idx) => {
              const finalMark = calculateFinalMark(student.id, activities, grades, attitudeLogs, overrides);
              const isFinalOverridden = overrides?.[student.id]?.final !== undefined;
              const { bank: attitudeBank } = getAttitudeData(student.id, activeClass);
              let missingCount = 0;
              activities.forEach(a => { if (grades[`${student.id}_${a.id}`] === undefined || grades[`${student.id}_${a.id}`] === '') missingCount++; });

              const isBlurred = privateMode && focusedStudent !== student.id;
              const isFocused = privateMode && focusedStudent === student.id;

              return (
                <tr 
                   key={student.id} 
                   onClick={() => privateMode && setFocusedStudent(student.id)}
                   className={`group transition-all duration-300 relative 
                     ${isBlurred ? 'opacity-20 blur-[4px] hover:blur-sm cursor-pointer' : ''} 
                     ${isFocused ? 'bg-white shadow-2xl z-20 scale-[1.01] ring-2 ring-slate-800' : 'hover:bg-white/30'}
                   `}
                >
                  <td className="sticky left-0 z-10 bg-white/80 group-hover:bg-white border-b border-r border-white/60 p-0 shadow-[4px_0_10px_-5px_rgba(0,0,0,0.02)] transition-colors backdrop-blur-md">
                    <div className={`flex items-center justify-between px-4 ${cellPad}`}>
                      <div className="flex-1 pr-2 flex items-center gap-3">
                        <button onClick={(e) => { e.stopPropagation(); triggerAvatarUpload(student.id); }} className="w-8 h-8 rounded-full bg-slate-100 border border-white shadow-inner overflow-hidden shrink-0 group-avatar relative transition-transform hover:scale-105" title="Add profile picture">
                          {student.avatar ? <img src={student.avatar} className="w-full h-full object-cover" alt={student.name} /> : <User size={14} className="text-slate-400 mx-auto mt-2" />}
                          <div className="absolute inset-0 bg-black/40 hidden group-hover:flex items-center justify-center"><ImagePlus size={12} className="text-white"/></div>
                        </button>
                        <div>
                          {editingStudentId === student.id ? (
                            <input
                              autoFocus
                              className="w-full font-black text-slate-800 bg-white/80 border border-slate-300 rounded px-2 py-1 outline-none focus:ring-2 focus:ring-slate-400"
                              value={editStudentName}
                              onChange={e => setEditStudentName(e.target.value)}
                              onBlur={() => handleRenameStudent(student.id)}
                              onKeyDown={e => e.key === 'Enter' && handleRenameStudent(student.id)}
                            />
                          ) : (
                            <span className="font-black text-slate-800 block cursor-text flex items-center gap-2" onDoubleClick={(e) => { e.stopPropagation(); setEditingStudentId(student.id); setEditStudentName(student.name);}}>
                              {student.name}
                              <button onClick={(e) => { e.stopPropagation(); setEditingStudentId(student.id); setEditStudentName(student.name);}} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-slate-600 transition-opacity"><Edit2 size={12}/></button>
                            </span>
                          )}
                          {missingCount > 0 && <span className="text-[9px] font-black bg-red-100 text-red-600 px-1.5 py-0.5 rounded-md uppercase mt-0.5 inline-block">{missingCount} missing</span>}
                        </div>
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 shrink-0">
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteStudent(student.id); }} className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-xl transition-all"><Trash2 size={16} /></button>
                      </div>
                    </div>
                  </td>
                  {FIELDS.map(field => {
                    const acts = activities.filter(a => a.field === field);
                    const fieldScore = calculateFieldScore(student.id, field, activities, grades, attitudeLogs, overrides);
                    const isFieldOverridden = overrides?.[student.id]?.[field] !== undefined;
                    const studentLogs = safeArray(attitudeLogs?.[student.id]);
                    const fieldAttitude = studentLogs.reduce((acc, log) => (log.field === field && log.fieldDelta) ? acc + log.fieldDelta : acc, 0);

                    return (
                      <React.Fragment key={`grades-${student.id}-${field}`}>
                        {acts.length === 0 ? (
                          <td className={`border-b border-r border-white/60 bg-white/20 ${cellPad}`}></td>
                        ) : (
                          acts.map((act) => {
                            const val = grades[`${student.id}_${act.id}`];
                            const isFailing = globalSettings.highlightFailing && val !== undefined && val !== '' && val < 5;
                            const isRecentlyUpdated = lastUpdatedCell === `${student.id}_${act.id}`;
                            
                            return (
                              <td key={act.id} className={`border-b border-r border-white/60 bg-white/40 group-hover:bg-white/60 transition-colors relative ${cellPad} ${isBlurred ? 'pointer-events-none' : ''}`}>
                                <input 
                                  type="number" min="0" max="100" 
                                  data-row={idx} data-col={act.id}
                                  className={`w-full text-center p-2 rounded-[1rem] border border-white/60 focus:bg-white focus:ring-2 focus:ring-violet-300 outline-none transition-all font-black text-slate-700 shadow-inner backdrop-blur-sm placeholder:text-slate-300 ${isFailing ? 'bg-red-50 text-red-700' : 'bg-white/40 hover:bg-white'} ${isRecentlyUpdated ? 'scale-[1.15] bg-emerald-100 ring-2 ring-emerald-400 z-10 relative' : ''}`} 
                                  placeholder="-" value={val ?? ''} 
                                  onChange={(e) => handleGradeChange(student.id, act.id, e.target.value)} 
                                  onKeyDown={(e) => handleGradeKeyDown(e, student.id, act.id, idx)}
                                />
                              </td>
                            )
                          })
                        )}
                        <td 
                          className={`border-b border-r border-white/60 text-center font-black cursor-pointer transition-all relative ${cellPad} ${isFieldOverridden ? 'bg-amber-100/50 hover:bg-amber-100 text-amber-800 shadow-inner' : 'bg-white/70 hover:bg-white text-slate-800'} ${isBlurred ? 'pointer-events-none' : ''}`}
                          onClick={(e) => { e.stopPropagation(); setOverrideModal({ isOpen: true, studentId: student.id, field: field, val: isFieldOverridden ? overrides[student.id][field] : fieldScore.toFixed(2) }) }}
                        >
                          <div className="flex items-center justify-center gap-1 relative">
                            <AnimatedNumber value={fieldScore} decimals={1} />
                            {isFieldOverridden && <AlertCircle size={10} className="text-amber-500 absolute -top-1 -right-1" />}
                            {fieldAttitude !== 0 && !isFieldOverridden && (
                              <div className={`absolute -bottom-1 -right-1 flex items-center ${fieldAttitude > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                {fieldAttitude > 0 ? <ArrowUpRight size={12}/> : <ArrowDownRight size={12}/>}
                              </div>
                            )}
                          </div>
                        </td>
                      </React.Fragment>
                    )
                  })}
                  <td 
                    className={`border-b border-r border-white/60 text-center cursor-pointer transition-all duration-300 relative ${cellPad} ${isFinalOverridden ? 'bg-amber-200/60 hover:bg-amber-300 text-amber-900 shadow-inner' : 'bg-slate-100/80 hover:bg-slate-200 text-slate-900'} ${isBlurred ? 'pointer-events-none' : ''}`}
                    onClick={(e) => { e.stopPropagation(); setOverrideModal({ isOpen: true, studentId: student.id, field: 'final', val: isFinalOverridden ? overrides[student.id].final : finalMark.toFixed(2) }) }}
                  >
                    <div className="flex items-center justify-center gap-1.5 font-black text-xl">
                      <AnimatedNumber value={finalMark} decimals={1} />
                      {isFinalOverridden && <AlertCircle size={14} className="text-amber-600 absolute top-2 right-2" />}
                    </div>
                  </td>
                  <td className={`border-b border-white/60 bg-white/20 group-hover:bg-transparent transition-colors ${cellPad} ${isBlurred ? 'pointer-events-none' : ''}`}>
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={(e) => { e.stopPropagation(); setAttitudeModal({ isOpen: true, studentId: student.id, reason: '', val: 0.1, transferVal: 0.1, transferField: 'Grammar' }); }} className={`p-2 rounded-2xl transition-all duration-300 relative ${attitudeBank !== 0 ? 'bg-emerald-100/80 text-emerald-700 hover:bg-emerald-200 shadow-sm' : 'text-slate-500 hover:bg-white/80 hover:text-slate-800'}`}>
                        <Activity size={18} />
                        {attitudeBank !== 0 && <span className={`absolute -top-1.5 -right-1.5 text-[10px] font-black px-1.5 rounded-full border-2 border-white shadow-sm ${attitudeBank > 0 ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>{attitudeBank > 0 ? '+' : ''}{attitudeBank.toFixed(1)}</span>}
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setCommentModal({ isOpen: true, studentId: student.id, text: student.comments || '', aiPrompt: '', aiLanguage: 'English', includeMarks: true }); }} className={`p-2 rounded-2xl transition-all duration-300 relative ${student.comments ? `${theme.iconBg} ${theme.iconText} hover:bg-white shadow-sm` : 'text-slate-500 hover:bg-white/80 hover:text-slate-800'}`}>
                        <MessageSquare size={18} />
                        {student.comments && <span className={`absolute -top-1 -right-1 w-3 h-3 ${theme.blob1} rounded-full border-2 border-white`}></span>}
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {/* Fila de Promedios */}
            {processedStudents.length > 0 && (
              <tr className="sticky bottom-0 z-20">
                <td className="sticky left-0 bg-white/80 backdrop-blur-md border-t-4 border-white p-4 font-black text-right text-slate-500 uppercase tracking-widest text-xs shadow-[4px_0_10px_-5px_rgba(0,0,0,0.05)]">
                  CLASS AVERAGE
                </td>
                {FIELDS.map(field => {
                  const acts = activities.filter(a => a.field === field);
                  const fieldStyle = PRINT_STYLES[field];
                  return (
                    <React.Fragment key={`avg-${field}`}>
                      {acts.length === 0 ? <td className="bg-white/60 backdrop-blur-md border-t-4 border-white border-r"></td> : acts.map(act => (
                        <td key={`avg-${act.id}`} className="bg-white/60 backdrop-blur-md border-t-4 border-white border-r p-2 text-center font-bold text-slate-500 text-sm">
                          {classAverages.activities[act.id] > 0 ? <AnimatedNumber value={classAverages.activities[act.id]} decimals={1} /> : '-'}
                        </td>
                      ))}
                      <td className="bg-white/80 backdrop-blur-md border-t-4 border-white border-r p-2 text-center font-black shadow-inner" style={{color: fieldStyle.head}}>
                        {classAverages.fields[field] > 0 ? <AnimatedNumber value={classAverages.fields[field]} decimals={1} /> : '-'}
                      </td>
                    </React.Fragment>
                  )
                })}
                <td className="bg-white/90 backdrop-blur-md border-t-4 border-white border-r p-2 text-center font-black text-lg text-slate-800 shadow-inner">
                  {classAverages.final > 0 ? <AnimatedNumber value={classAverages.final} decimals={1} /> : '-'}
                </td>
                <td className="bg-white/60 backdrop-blur-md border-t-4 border-white"></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Hidden Print section */}
      <div id="print-section" className="hidden no-print bg-white text-black">
        <div className="mb-4 text-center">
           {globalSettings.schoolName && <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-1">{globalSettings.schoolName}</p>}
           <h1 className="text-2xl font-black uppercase">{activeClass?.name}</h1>
        </div>
        <table className="w-full border-collapse mb-6 text-[12px] border border-black">
          <thead>
            <tr>
              <th className="border border-black p-2 text-left font-normal uppercase">NAME</th>
              {FIELDS.map(f => {
                const style = PRINT_STYLES[f];
                return <th key={f} className="border border-black p-2 text-center font-normal uppercase" style={{ backgroundColor: style.head, color: 'white' }}>{style.short}</th>
              })}
              <th className="border border-black p-2 text-center bg-gray-300 font-bold uppercase">FINAL</th>
            </tr>
          </thead>
          <tbody>
            {students.map(student => {
              const final = calculateFinalMark(student.id, activities, grades, attitudeLogs, overrides);
              const isOverridden = overrides?.[student.id]?.final !== undefined;
              return (
                <tr key={student.id}>
                  <td className="border border-black p-2 font-medium">{student.name}</td>
                  {FIELDS.map(field => {
                    const score = calculateFieldScore(student.id, field, activities, grades, attitudeLogs, overrides);
                    const style = PRINT_STYLES[field];
                    let displayScore = '-';
                    if (score > 0) displayScore = score % 1 === 0 ? score.toString() : score.toFixed(1).replace('.', ',');
                    return <td key={field} className="border border-black p-2 text-center font-bold" style={{ backgroundColor: style.cell }}>{displayScore}</td>
                  })}
                  <td className="border border-black p-2 text-center font-black bg-gray-100 text-[14px]">
                    {final % 1 === 0 ? final.toString() : final.toFixed(1).replace('.', ',')} {isOverridden ? '*' : ''}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <div className="space-y-3 mt-8 break-before-page">
          <h2 className="text-xl font-bold border-b border-black pb-2 mb-4">Official Comments</h2>
          {students.map(student => {
            if (!student.comments) return null;
            return <p key={student.id} className="text-[12px] text-justify leading-relaxed"><strong>{student.name}:</strong> {student.comments}</p>
          })}
        </div>
      </div>

      {/* Field Manager (Activities & Weights Pie Chart) */}
      <AnimatePresence>
        {fieldManager.isOpen && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
            <motion.div initial={{scale:0.95, y:20}} animate={{scale:1, y:0}} exit={{scale:0.95, y:20}} className="bg-white/90 backdrop-blur-3xl rounded-[3rem] shadow-2xl border border-white p-8 w-full max-w-4xl flex flex-col md:flex-row gap-8 max-h-[90vh]">
              <div className="flex-[1.5] flex flex-col">
                 <h3 className="text-2xl font-black text-slate-800 mb-2 flex items-center gap-3"><div className={`p-2 rounded-xl ${theme.iconBg} ${theme.iconText}`}><BarChart2 size={24}/></div> {fieldManager.field} Activities</h3>
                 <p className="text-sm font-bold text-slate-500 mb-6">Manage activities and distribute weights visually.</p>
                 
                 <div className="flex-1 overflow-y-auto pr-2 space-y-3 scrollbar-hide min-h-[250px]">
                   {fieldManager.localActs.map((act, index) => (
                     <div key={act.id} className="bg-white/50 p-4 rounded-[1.5rem] border border-white/60 shadow-sm flex flex-col gap-3">
                       <div className="flex items-center justify-between gap-3">
                         <input type="text" value={act.name} onChange={e => {
                           const newActs = [...fieldManager.localActs];
                           newActs[index].name = e.target.value;
                           setFieldManager({...fieldManager, localActs: newActs});
                         }} className={`flex-1 border border-white/80 rounded-xl px-3 py-2 focus:bg-white bg-white/50 outline-none transition-all shadow-inner font-bold text-sm ${theme.accentRing} focus:ring-4`} placeholder="Activity Name"/>
                         <button onClick={() => {
                           setFieldManager({...fieldManager, localActs: fieldManager.localActs.filter(a => a.id !== act.id)});
                         }} className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-all"><Trash2 size={16}/></button>
                       </div>
                       <div className="flex items-center gap-3">
                         <input type="range" min="1" max="100" value={act.weight} onChange={e => {
                           const newActs = [...fieldManager.localActs];
                           newActs[index].weight = Number(e.target.value);
                           setFieldManager({...fieldManager, localActs: newActs});
                         }} className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-800" />
                         <span className="font-black text-slate-700 w-12 text-right">{act.weight}%</span>
                       </div>
                     </div>
                   ))}
                   {fieldManager.localActs.length === 0 && <p className="text-sm text-slate-400 italic text-center py-8">No activities. Add one below!</p>}
                 </div>

                 <div className="mt-4 flex gap-3 shrink-0">
                   <button onClick={() => {
                     setFieldManager({
                       ...fieldManager, 
                       localActs: [...fieldManager.localActs, { id: generateId(), field: fieldManager.field, name: 'New Activity', weight: 10 }]
                     });
                   }} className="flex-1 py-3 bg-white hover:bg-slate-50 text-slate-700 font-bold border border-slate-200 rounded-2xl transition-all shadow-sm text-sm flex items-center justify-center gap-2"><Plus size={16}/> Add Activity</button>
                   <button onClick={equalizeLocalWeights} className="flex-1 py-3 bg-slate-800 hover:bg-black text-white font-bold rounded-2xl transition-all shadow-sm text-sm">Equalize Weights</button>
                 </div>
              </div>
              
              <div className="w-full md:w-80 bg-white/40 rounded-[2.5rem] border border-white/60 p-6 shadow-inner flex flex-col shrink-0 justify-center items-center">
                 <h4 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-4">Weight Distribution</h4>
                 <div className="w-full h-64 relative">
                   {fieldManager.localActs.length > 0 ? (
                     <ResponsiveContainer width="100%" height="100%">
                       <PieChart>
                         <Pie data={fieldManager.localActs} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3} dataKey="weight">
                           {fieldManager.localActs.map((entry, idx) => <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />)}
                         </Pie>
                         <RechartsTooltip formatter={(value) => [`${value}% weight`, 'Weight']} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}/>
                       </PieChart>
                     </ResponsiveContainer>
                   ) : (
                     <div className="absolute inset-0 flex items-center justify-center text-slate-400 font-medium">No Data</div>
                   )}
                 </div>
                 <div className="w-full mt-8 flex flex-col gap-3">
                   <button onClick={() => setFieldManager({isOpen: false, field: null, localActs: []})} className="w-full py-3.5 text-slate-600 font-bold hover:bg-white/60 rounded-2xl transition-colors">Cancel</button>
                   <button onClick={handleSaveFieldManager} className={`w-full py-3.5 bg-gradient-to-r ${theme.accentGradient} text-white font-black tracking-wide rounded-2xl shadow-xl transition-all ${theme.accentHover}`}>Save Activities</button>
                 </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Actitud */}
      {attitudeModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 fade-enter">
          <div className="bg-white rounded-3xl shadow-2xl p-8 w-[450px] modal-enter border border-slate-100">
             <div className="flex items-center gap-3 mb-2 text-purple-700">
               <div className="bg-purple-100 p-2 rounded-xl"><Activity size={24}/></div>
               <h3 className="text-2xl font-bold">Attitude Adjustments</h3>
             </div>
             <p className="text-sm text-slate-500 mb-6 font-medium">Modifying scores for: <span className="text-slate-800 font-bold">{safeArray(students).find(s=>s.id===attitudeModal.studentId)?.name}</span></p>
             
             <div className="space-y-3">
               {FIELDS.map(field => {
                 const currentVal = attitudeLogs[attitudeModal.studentId]?.[field] || 0;
                 return (
                   <div key={field} className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-200/60 hover:border-slate-300 transition-colors hidden">
                     {/* Mantenemos el estado local antiguo oculto por si acaso */}
                   </div>
                 )
               })}
             </div>
             {/* NUEVO DISEÑO LEDGER BANK (El correcto) */}
             <div className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto pr-2">
                 <div className="bg-white/50 p-5 rounded-[2rem] border border-white/60 shadow-sm flex flex-col gap-3">
                   <h4 className="font-black text-slate-700 flex items-center gap-2 text-sm"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> 1. Record to Bank</h4>
                   <div className="flex gap-3">
                     <div className="flex items-center bg-white rounded-2xl border border-white/80 p-1 shadow-inner shrink-0">
                       <button onClick={() => setAttitudeModal({...attitudeModal, val: attitudeModal.val - 0.1})} className="w-10 h-10 rounded-xl bg-red-50 text-red-600 hover:bg-red-500 hover:text-white font-black text-lg transition-all">-</button>
                       <span className={`w-14 text-center font-black text-lg ${attitudeModal.val > 0 ? 'text-emerald-600' : attitudeModal.val < 0 ? 'text-red-600' : 'text-slate-400'}`}>{attitudeModal.val > 0 ? '+' : ''}{attitudeModal.val.toFixed(1)}</span>
                       <button onClick={() => setAttitudeModal({...attitudeModal, val: attitudeModal.val + 0.1})} className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white font-black text-lg transition-all">+</button>
                     </div>
                     <input type="text" placeholder="Reason (e.g. Great effort)" value={attitudeModal.reason} onChange={e => setAttitudeModal({...attitudeModal, reason: e.target.value})} className={`w-full border border-white/80 rounded-2xl px-4 focus:bg-white bg-white/50 outline-none transition-all shadow-inner font-medium placeholder:text-slate-400 ${theme.accentRing} focus:ring-4`} onKeyDown={e => e.key === 'Enter' && handleAddToBank()}/>
                   </div>
                   <button onClick={handleAddToBank} className="w-full py-3 bg-slate-900 hover:bg-black text-white font-bold rounded-2xl shadow-xl transition-all tracking-wide">Add to Bank</button>
                 </div>

                 <div className="bg-white/50 p-5 rounded-[2rem] border border-white/60 shadow-sm flex flex-col gap-3">
                   <h4 className="font-black text-slate-700 flex items-center gap-2 text-sm"><div className="w-2 h-2 rounded-full bg-indigo-500"></div> 2. Apply Bank Points to Grade</h4>
                   <div className="flex gap-3">
                     <div className="flex items-center bg-white rounded-2xl border border-white/80 p-1 shadow-inner shrink-0">
                       <button onClick={() => setAttitudeModal({...attitudeModal, transferVal: attitudeModal.transferVal - 0.1})} className="w-10 h-10 rounded-xl bg-red-50 text-red-600 hover:bg-red-500 hover:text-white font-black text-lg transition-all">-</button>
                       <span className={`w-14 text-center font-black text-lg text-indigo-600`}>{attitudeModal.transferVal > 0 ? '+' : ''}{attitudeModal.transferVal.toFixed(1)}</span>
                       <button onClick={() => setAttitudeModal({...attitudeModal, transferVal: attitudeModal.transferVal + 0.1})} className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-500 hover:text-white font-black text-lg transition-all">+</button>
                     </div>
                     <select value={attitudeModal.transferField} onChange={e => setAttitudeModal({...attitudeModal, transferField: e.target.value})} className={`w-full border border-white/80 rounded-2xl px-4 focus:bg-white bg-white/50 outline-none transition-all shadow-inner font-bold text-slate-700 ${theme.accentRing} focus:ring-4`}>
                       {FIELDS.map(f => <option key={f} value={f}>Apply to {f}</option>)}
                     </select>
                   </div>
                   <button onClick={handleTransferFromBank} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-xl transition-all tracking-wide">Deduct & Apply</button>
                 </div>
                 
                 <div className="mt-2 p-5 bg-white/40 rounded-[2rem] shadow-inner border border-white/60">
                    <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 flex justify-between items-center">
                      Ledger History
                      <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full font-black text-sm border border-emerald-200 shadow-sm">
                         Bank: {getAttitudeData(attitudeModal.studentId, activeClass).bank > 0 ? '+' : ''}{getAttitudeData(attitudeModal.studentId, activeClass).bank.toFixed(1)}
                      </span>
                    </h4>
                    <div className="space-y-2 max-h-[150px] overflow-y-auto pr-1">
                      {(() => {
                        const { logs } = getAttitudeData(attitudeModal.studentId, activeClass);
                        if (logs.length === 0) return <p className="text-sm text-slate-400 font-medium italic text-center py-2">No records yet.</p>;
                        return logs.map(log => {
                          const isTransfer = log.bankDelta !== null && log.fieldDelta !== null && log.field !== null;
                          const displayVal = isTransfer ? log.fieldDelta : (log.bankDelta || log.fieldDelta);
                          const displayColor = displayVal > 0 ? 'text-emerald-600' : 'text-red-600';
                          return (
                            <div key={log.id} className="text-xs font-medium text-slate-600 bg-white p-3 rounded-2xl border border-white flex items-center justify-between gap-2 shadow-sm group">
                              <div className="flex items-center gap-3">
                                <div className={`font-black w-8 text-right shrink-0 text-sm ${displayColor}`}>
                                  {displayVal > 0 ? '+' : ''}{Number(displayVal).toFixed(1)}
                                </div>
                                <div>
                                  <span className="font-bold text-slate-800 block truncate max-w-[150px]">{log.reason}</span>
                                  <span className="text-[10px] text-slate-500">{isTransfer ? `Applied to ${log.field}` : (log.field ? `Applied to ${log.field}` : 'Banked')} • {formatDate(log.date)}</span>
                                </div>
                              </div>
                              <button onClick={() => handleDeleteLog(attitudeModal.studentId, log.id)} className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all" title="Undo this entry"><Undo2 size={14}/></button>
                            </div>
                          )
                        })
                      })()}
                    </div>
                 </div>
             </div>

             <div className="mt-6 flex justify-end">
               <button onClick={() => setAttitudeModal({isOpen: false, studentId: null, reason: '', val: 0.1, transferVal: 0.1, transferField: 'Grammar'})} className="px-6 py-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-2xl transition-all w-full shadow-sm text-lg">Close Ledger</button>
             </div>
          </div>
        </div>
      )}

      {/* Modal de Sobreescritura Manual */}
      {overrideModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 fade-enter">
          <div className="bg-white rounded-3xl shadow-2xl p-8 w-[380px] modal-enter border-t-8 border-t-amber-400">
            <div className="flex items-center gap-3 mb-3 text-amber-600">
              <div className="bg-amber-50 p-2 rounded-xl"><Edit2 size={24}/></div>
              <h3 className="text-2xl font-bold text-slate-800">Manual Override</h3>
            </div>
            <p className="text-sm text-slate-500 mb-6 font-medium">Round the final mark up or down. Leave empty to restore the auto-calculated average.</p>
            
            <div className="relative mb-8">
              <input 
                type="number" step="0.1" autoFocus
                value={overrideModal.val} 
                onChange={e => setOverrideModal({...overrideModal, val: e.target.value})} 
                className="w-full text-center text-4xl font-black text-slate-800 border-2 border-slate-200 rounded-2xl p-6 focus:border-amber-400 focus:ring-4 focus:ring-amber-400/20 outline-none transition-all bg-slate-50 focus:bg-white placeholder:text-slate-300"
                placeholder="Auto"
              />
            </div>
            
            <div className="flex justify-end gap-3">
              <button onClick={() => setOverrideModal({isOpen: false, studentId: null, val: ''})} className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
              <button onClick={handleSaveOverride} className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-amber-500/30">Apply</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Comentarios */}
      {commentModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 fade-enter">
          <div className="bg-white rounded-3xl shadow-2xl p-8 w-[600px] modal-enter border border-slate-100">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                  <div className="bg-blue-100 text-blue-600 p-2 rounded-xl"><MessageSquare size={24}/></div>
                  Report Comments
                </h3>
                <p className="text-slate-500 mt-2 font-medium">Writing comments for: <span className="text-slate-800 font-bold">{safeArray(students).find(s=>s.id===commentModal.studentId)?.name}</span></p>
              </div>
              <button onClick={() => setCommentModal({isOpen: false, studentId: null, text: ''})} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-xl transition-colors"><X size={24}/></button>
            </div>
            
            <textarea 
              value={commentModal.text}
              onChange={e => setCommentModal({...commentModal, text: e.target.value})}
              className="w-full h-64 border-2 border-slate-200 rounded-2xl p-5 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none resize-none transition-all bg-slate-50 focus:bg-white text-slate-700 leading-relaxed"
              placeholder="Write detailed performance comments here. This will be included in the PDF export..."
            />
            
            <div className="flex justify-end mt-6">
              <button onClick={handleSaveComment} className="px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-600/30 flex items-center gap-2">
                <Save size={20}/> Save Comments
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Calendario */}
      <AnimatePresence>
        {calendarOpen && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
            <motion.div initial={{scale:0.95, y:20}} animate={{scale:1, y:0}} exit={{scale:0.95, y:20}} className="bg-white/90 backdrop-blur-3xl rounded-[3rem] shadow-2xl border border-white p-8 w-full max-w-5xl flex flex-col md:flex-row gap-8 max-h-[90vh]">
              <ClassCalendar activeClass={activeClass} onUpdate={updateClassData} theme={theme} onClose={() => setCalendarOpen(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- CALENDAR COMPONENT ---
function ClassCalendar({ activeClass, onUpdate, theme, onClose }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [eventModal, setEventModal] = useState({ isOpen: false, day: null, title: '', description: '' });

  const schedule = safeArray(activeClass?.schedule);
  const events = safeArray(activeClass?.events);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const startDay = firstDay === 0 ? 6 : firstDay - 1;

  const toggleScheduleDay = (dayIndex) => {
    const newSchedule = schedule.includes(dayIndex) ? schedule.filter(d => d !== dayIndex) : [...schedule, dayIndex];
    onUpdate({ schedule: newSchedule });
  };

  const handleSaveEvent = () => {
    if (eventModal.title.trim() && eventModal.day) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(eventModal.day).padStart(2, '0')}`;
      const newEvent = { id: generateId(), date: dateStr, title: eventModal.title.trim(), description: eventModal.description.trim() };
      onUpdate({ events: [...events, newEvent] });
      setEventModal({ isOpen: false, day: null, title: '', description: '' });
    }
  };

  const handleDeleteEvent = (eventId) => {
    if(window.confirm("Delete this event?")) {
      onUpdate({ events: events.filter(e => e.id !== eventId) });
    }
  };

  return (
    <>
      <div className="w-full md:w-64 flex flex-col gap-6 shrink-0 relative z-10">
        <div>
          <h3 className="text-3xl font-black text-slate-800 mb-2 flex items-center gap-3 tracking-tight"><div className={`bg-gradient-to-br ${theme.accentGradient} text-white p-3 rounded-2xl shadow-sm`}><CalendarDays size={28}/></div> Calendar</h3>
          <p className="text-sm font-bold text-slate-500">Plan ahead for {activeClass?.name}</p>
        </div>
        
        <div className="bg-white/50 p-5 rounded-[2rem] border border-white/60 shadow-sm flex flex-col gap-3">
          <h4 className="font-black text-slate-700 flex items-center gap-2 text-sm"><Clock size={16} className={theme.accentText}/> Class Schedule</h4>
          <p className="text-xs text-slate-500 font-medium">Select the days you teach this class to highlight them on the calendar.</p>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {DAYS_OF_WEEK.map((day, idx) => (
              <button 
                key={idx} 
                onClick={() => toggleScheduleDay(idx)} 
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${schedule.includes(idx) ? `bg-white border-${theme.accentText.split('-')[1]}-500 ${theme.accentText} shadow-sm` : 'bg-white/40 border-white text-slate-500 hover:bg-white/80'}`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>

        <button onClick={onClose} className="mt-auto w-full py-4 bg-white hover:bg-slate-50 text-slate-700 font-black rounded-2xl shadow-sm border border-slate-200 transition-all">Close Calendar</button>
      </div>

      <div className="flex-1 flex flex-col min-h-[400px] relative z-10">
        <div className="flex items-center justify-between mb-4 bg-white/60 p-4 rounded-3xl border border-white shadow-inner">
          <button onClick={() => setCurrentMonth(new Date(year, month - 1))} className="p-2 hover:bg-white rounded-xl transition-colors"><ArrowLeft size={20}/></button>
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-widest">{currentMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' })}</h2>
          <button onClick={() => setCurrentMonth(new Date(year, month + 1))} className="p-2 hover:bg-white rounded-xl transition-colors"><ArrowRight size={20}/></button>
        </div>
        
        <div className="flex-1 bg-white/40 rounded-[2.5rem] border border-white/60 p-6 shadow-sm flex flex-col overflow-hidden">
          <div className="grid grid-cols-7 gap-2 mb-2 shrink-0">
            {DAYS_OF_WEEK.map(day => <div key={day} className="text-center text-xs font-black text-slate-400 uppercase tracking-widest">{day}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-2 flex-1 auto-rows-fr">
            {Array.from({ length: startDay }).map((_, i) => <div key={`empty-${i}`} className="rounded-2xl bg-white/10" />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayOfWeek = new Date(year, month, day).getDay();
              const adjustedDayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
              const isClassDay = schedule.includes(adjustedDayOfWeek);
              const dayEvents = events.filter(e => e.date === dateStr);
              const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();

              return (
                <div key={day} onClick={() => setEventModal({ isOpen: true, day, title: '', description: '' })} className={`relative flex flex-col p-2 rounded-2xl border transition-all cursor-pointer overflow-hidden group ${isClassDay ? `bg-${theme.accentText.split('-')[1]}-50/50 border-${theme.accentText.split('-')[1]}-200/50 hover:bg-white hover:border-${theme.accentText.split('-')[1]}-300` : 'bg-white/50 border-white hover:bg-white'} ${isToday ? 'ring-2 ring-slate-800 shadow-md' : 'shadow-sm'}`}>
                  <span className={`text-sm font-black ${isClassDay ? theme.accentText : 'text-slate-600'} ${isToday ? 'bg-slate-800 text-white w-6 h-6 flex items-center justify-center rounded-full' : ''}`}>{day}</span>
                  <div className="flex-1 mt-1 space-y-1 overflow-y-auto scrollbar-hide">
                    {dayEvents.map(ev => (
                      <div key={ev.id} onClick={(e) => { e.stopPropagation(); handleDeleteEvent(ev.id); }} className={`text-[9px] font-bold px-1.5 py-0.5 rounded-lg truncate ${isClassDay ? `bg-${theme.accentText.split('-')[1]}-100 ${theme.accentText}` : 'bg-slate-100 text-slate-600'} hover:opacity-70`} title={ev.description ? `${ev.title}: ${ev.description}` : ev.title}>
                        {ev.title}
                      </div>
                    ))}
                  </div>
                  <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 pointer-events-none flex items-center justify-center transition-opacity">
                    <Plus size={24} className="text-slate-400 opacity-50"/>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {eventModal.isOpen && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 rounded-[3rem]">
            <motion.div initial={{scale:0.95}} animate={{scale:1}} exit={{scale:0.95}} className="bg-white/95 backdrop-blur-3xl rounded-[2.5rem] shadow-2xl border border-white p-8 w-full max-w-sm">
              <h3 className="text-xl font-black text-slate-800 mb-4">Add Event</h3>
              <p className="text-sm font-bold text-slate-500 mb-4">Date: {eventModal.day} {currentMonth.toLocaleString('en-US', { month: 'short', year: 'numeric' })}</p>
              <input type="text" autoFocus placeholder="Event Title" value={eventModal.title} onChange={e => setEventModal({...eventModal, title: e.target.value})} className={`w-full border border-white/60 rounded-2xl p-3 focus:bg-white bg-white/50 outline-none transition-all shadow-inner font-bold mb-3 ${theme.accentRing} focus:ring-4`} />
              <textarea placeholder="Description (Optional)" value={eventModal.description} onChange={e => setEventModal({...eventModal, description: e.target.value})} className={`w-full h-24 border border-white/60 rounded-2xl p-3 focus:bg-white bg-white/50 outline-none transition-all shadow-inner font-medium resize-none ${theme.accentRing} focus:ring-4 placeholder:text-slate-400`} />
              <div className="flex justify-end gap-2 mt-4">
                <button onClick={() => setEventModal({isOpen: false, day: null, title: '', description: ''})} className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
                <button onClick={handleSaveEvent} className={`px-4 py-2 bg-gradient-to-r ${theme.accentGradient} text-white font-black rounded-xl transition-all shadow-md`}>Save Event</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
