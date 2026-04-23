import React, { useState, useEffect, useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { 
  User, LogOut, Plus, Edit2, Trash2, Save, X, BarChart2, 
  MessageSquare, FileText, Settings, Activity, ArrowLeft, ArrowRight,
  ChevronDown, ChevronRight, Calculator, AlertCircle, Wand2, Undo2, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot, collection, query, deleteDoc, updateDoc } from 'firebase/firestore';

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

const FIELDS = ['Grammar', 'Listening', 'Reading', 'Writing', 'Speaking'];
const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#14B8A6'];

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
  },
  silver: {
    bg: 'from-slate-200 via-gray-100 to-zinc-200',
    blob1: 'bg-slate-300', blob2: 'bg-gray-300', blob3: 'bg-zinc-300',
    accentGradient: 'from-slate-700 to-zinc-700',
    accentText: 'text-slate-700',
    accentRing: 'focus:ring-slate-500/30',
    accentHover: 'hover:shadow-slate-500/25',
    iconBg: 'bg-slate-200',
    iconText: 'text-slate-700'
  }
};

const generateId = () => Math.random().toString(36).substr(2, 9);
const formatDate = (isoString) => new Date(isoString).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit' });

const calculateFieldScore = (studentId, field, activities, grades, attitudeLogs, overrides) => {
  if (overrides?.[studentId]?.[field] !== undefined) {
    return Number(overrides[studentId][field]);
  }

  const fieldActivities = activities.filter(a => a.field === field);
  if (fieldActivities.length === 0) return 0;

  let totalWeight = 0;
  let weightedSum = 0;

  fieldActivities.forEach(act => {
    const w = Number(act.weight) || 0;
    const grade = Number(grades[`${studentId}_${act.id}`]);
    if (!isNaN(grade)) {
      totalWeight += w;
      weightedSum += (grade * w);
    }
  });

  let average = totalWeight > 0 ? (weightedSum / totalWeight) : 0;
  
  // Calcular la actitud aplicada específicamente a este campo
  const studentLogs = attitudeLogs?.[studentId] || [];
  const fieldAttitude = studentLogs.reduce((acc, log) => {
    if (log.field === field && log.fieldDelta) return acc + log.fieldDelta;
    return acc;
  }, 0);

  return Math.max(0, average + fieldAttitude);
};

const calculateFinalMark = (studentId, activities, grades, attitudeLogs, overrides) => {
  if (overrides?.[studentId]?.final !== undefined) {
    return Number(overrides[studentId].final);
  }

  let totalScore = 0;
  let activeFields = 0;

  FIELDS.forEach(field => {
    const fieldActivities = activities.filter(a => a.field === field);
    if (fieldActivities.length > 0) {
      totalScore += calculateFieldScore(studentId, field, activities, grades, attitudeLogs, overrides);
      activeFields++;
    }
  });

  return activeFields > 0 ? (totalScore / activeFields) : 0;
};

const getAttitudeData = (studentId, activeClass) => {
  const logs = activeClass.attitudeLogs?.[studentId] || [];
  let bank = 0;
  
  logs.forEach(log => {
    if (log.bankDelta !== null) bank += log.bankDelta;
  });

  return { bank };
};

function AuthScreen({ onDebugLogin }) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [keys, setKeys] = useState([]);
  const [portalAnim, setPortalAnim] = useState(false);

  // Código Konami: Arriba Arriba Abajo Abajo Izquierda Derecha Izquierda Derecha B A
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
    setError('');
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      setError(err.message.replace('Firebase: ', ''));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-slate-50 font-sans text-slate-800 flex items-center justify-center p-4 overflow-hidden">
      {/* Orbes de Fondo */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none opacity-60">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-violet-300 mix-blend-multiply filter blur-[100px] opacity-70 animate-blob"></div>
        <div className="absolute top-[20%] -right-[10%] w-[40%] h-[40%] rounded-full bg-cyan-300 mix-blend-multiply filter blur-[100px] opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-[20%] left-[20%] w-[50%] h-[50%] rounded-full bg-pink-300 mix-blend-multiply filter blur-[100px] opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      <AnimatePresence>
        {!portalAnim ? (
          <motion.div exit={{ scale: 0, opacity: 0, filter: "blur(20px)" }} transition={{ duration: 1, ease: "easeInOut" }} className="bg-white/60 backdrop-blur-3xl p-10 rounded-[3rem] shadow-2xl border border-white w-full max-w-md relative z-10">
            <div className="flex justify-center mb-6">
              <div className="bg-violet-100 p-4 rounded-3xl shadow-inner border border-white">
                <FileText size={40} className="text-violet-600" />
              </div>
            </div>
            <h2 className="text-3xl font-black text-center mb-1 text-slate-800 tracking-tight">NeoGradebook</h2>
            <div className="flex justify-center mb-6"><span className="text-[10px] font-black bg-violet-100 text-violet-600 px-3 py-1 rounded-full uppercase tracking-widest border border-violet-200/50">v0.2 BETA</span></div>
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
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900 overflow-hidden">
            <motion.div animate={{ rotate: 360, scale: [1, 2, 3, 50] }} transition={{ duration: 2.5, ease: "circIn" }} className="w-64 h-64 rounded-full border-[10px] border-t-cyan-400 border-r-fuchsia-500 border-b-violet-500 border-l-pink-400 shadow-[0_0_100px_rgba(139,92,246,0.8)] flex items-center justify-center relative">
               <div className="absolute inset-0 rounded-full border-[5px] border-white/50 animate-ping"></div>
               <span className="text-white font-black text-2xl tracking-widest uppercase mix-blend-overlay">Sandbox Loading...</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PatchNotesModal({ onClose, theme }) {
  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-50 px-4">
      <motion.div initial={{scale:0.9, y:20}} animate={{scale:1, y:0}} exit={{scale:0.9, y:20}} className="bg-white/90 backdrop-blur-3xl rounded-[3rem] shadow-2xl border border-white p-8 w-full max-w-2xl max-h-[85vh] flex flex-col">
        <div className="flex justify-between items-start mb-6 shrink-0">
          <div>
            <span className={`inline-block px-3 py-1 bg-gradient-to-r ${theme.accentGradient} text-white text-[10px] font-black uppercase tracking-widest rounded-full mb-3 shadow-md`}>Update v0.2 BETA</span>
            <h2 className="text-3xl font-black text-slate-800 tracking-tight">Welcome to the New NeoGradebook PRO!</h2>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full transition-colors"><X size={20}/></button>
        </div>
        
        <div className="flex-1 overflow-y-auto pr-4 scrollbar-hide space-y-6">
          <p className="text-slate-600 font-medium leading-relaxed">
            This update brings a massive overhaul to the interface and incredibly powerful new tools for your workflow. Here is what's new and how to use it:
          </p>

          <div className="space-y-4">
            <div className="bg-white/60 p-5 rounded-3xl border border-white shadow-sm flex gap-4">
              <div className={`p-3 rounded-2xl ${theme.iconBg} ${theme.iconText} shrink-0 h-fit`}><Activity size={24}/></div>
              <div>
                <h3 className="font-black text-slate-800 text-lg mb-1">The Attitude Bank & Overrides</h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-2">You can now separate logging attitude points from applying them! Add points directly to a student's <b>Bank</b>, and then spend them on any field whenever you want. You can also manually override <b>any field average</b> by clicking on it.</p>
              </div>
            </div>

            <div className="bg-white/60 p-5 rounded-3xl border border-white shadow-sm flex gap-4">
              <div className={`p-3 rounded-2xl ${theme.iconBg} ${theme.iconText} shrink-0 h-fit`}><Settings size={24}/></div>
              <div>
                <h3 className="font-black text-slate-800 text-lg mb-1">Liquid Glass Customization</h3>
                <p className="text-sm text-slate-600 leading-relaxed">The entire UI has been redesigned with a gorgeous <i>Glassmorphism</i> aesthetic. Open your <b>Global Settings</b> to change the theme gradient, set your School Name for PDFs, or toggle Compact Grid Mode.</p>
              </div>
            </div>

            <div className="bg-white/60 p-5 rounded-3xl border border-white shadow-sm flex gap-4">
              <div className={`p-3 rounded-2xl ${theme.iconBg} ${theme.iconText} shrink-0 h-fit`}><Wand2 size={24}/></div>
              <div>
                <h3 className="font-black text-slate-800 text-lg mb-1">Workflow Magic</h3>
                <ul className="text-sm text-slate-600 leading-relaxed list-disc pl-4 space-y-1">
                  <li>Hover over an activity header and click the 🪄 to bulk fill empty grades.</li>
                  <li>Click any column header (Students or FINAL) to sort your class.</li>
                  <li>Failing grades (&lt;5) now highlight automatically.</li>
                  <li>Print a single student's report card directly from their row.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-6 pt-6 border-t border-slate-200/50 shrink-0">
          <button onClick={onClose} className={`w-full py-4 bg-gradient-to-r ${theme.accentGradient} text-white font-black rounded-2xl shadow-xl transition-all tracking-wide text-lg`}>Let's get started!</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isDebug, setIsDebug] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!isDebug) {
        setUser(currentUser);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, [isDebug]);

  const handleDebugLogin = () => {
    setIsDebug(true);
    setUser({ uid: 'sandbox_user', email: 'sandbox@local.test' });
    setAuthLoading(false);
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="w-10 h-10 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen onDebugLogin={handleDebugLogin} />;
  }

  return <MainDashboard user={user} isDebug={isDebug} />;
}

function MainDashboard({ user, isDebug }) {
  const [classes, setClasses] = useState([]);
  const [activeClassId, setActiveClassId] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);
  
  const [globalSettings, setGlobalSettings] = useState({ theme: 'aurora', aiContext: '', schoolName: '', compactMode: false, highlightFailing: true, geminiApiKey: '' });
  const [hasSeenPatchNotes, setHasSeenPatchNotes] = useState(localStorage.getItem('seenPatchNotes_v0.2') === 'true');

  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const theme = THEMES[globalSettings.theme] || THEMES.aurora;

  // Cargar Configuración
  useEffect(() => {
    const savedSettings = localStorage.getItem(`neoGradebookSettings_${user.uid}`);
    if (savedSettings) {
      setGlobalSettings(JSON.parse(savedSettings));
    }
  }, [user.uid]);

  const handleSaveSettings = (newSettings) => {
    setGlobalSettings(newSettings);
    localStorage.setItem(`neoGradebookSettings_${user.uid}`, JSON.stringify(newSettings));
    setIsSettingsOpen(false);
  };

  const closePatchNotes = () => {
    setHasSeenPatchNotes(true);
    localStorage.setItem('seenPatchNotes_v0.2', 'true');
  };

  // Cargar Datos
  useEffect(() => {
    if (isDebug) {
      const mockClass = {
        id: 'sandbox_1', name: 'Sandbox Class 101',
        students: [{id:'s1', name:'Joan Petit', comments:''}],
        activities: [], grades: {}, attitudeLogs: {}, overrides: {}
      };
      setClasses([mockClass]);
      setActiveClassId(mockClass.id);
      setDataLoading(false);
      return;
    }

    const q = query(collection(db, 'users', user.uid, 'classes'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const classData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setClasses(classData);
      if (classData.length > 0 && !activeClassId) setActiveClassId(classData[0].id);
      else if (classData.length === 0) setActiveClassId(null);
      setDataLoading(false);
    }, (error) => console.error("Firestore Error:", error));
    return () => unsubscribe();
  }, [user.uid, activeClassId, isDebug]);

  const handleCreateClass = async () => {
    if (!newClassName.trim()) return;
    const newId = `class_${Date.now()}`;
    const newClass = { name: newClassName, students: [], activities: [], grades: {}, attitudeLogs: {}, overrides: {} };
    
    if (isDebug) {
      setClasses([...classes, { id: newId, ...newClass }]);
    } else {
      await setDoc(doc(db, 'users', user.uid, 'classes', newId), newClass);
    }
    
    setActiveClassId(newId);
    setNewClassName('');
    setIsClassModalOpen(false);
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
      `}</style>

      {/* Blobs de Cristal Ambientales */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none opacity-50">
        <div className={`absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full ${theme.blob1} mix-blend-multiply filter blur-[100px] opacity-70 animate-blob`}></div>
        <div className={`absolute top-[20%] right-[-10%] w-[40%] h-[40%] rounded-full ${theme.blob2} mix-blend-multiply filter blur-[100px] opacity-70 animate-blob animation-delay-2000`}></div>
        <div className={`absolute bottom-[-20%] left-[20%] w-[50%] h-[50%] rounded-full ${theme.blob3} mix-blend-multiply filter blur-[100px] opacity-70 animate-blob animation-delay-4000`}></div>
      </div>

      <AnimatePresence>
        {!hasSeenPatchNotes && <PatchNotesModal onClose={closePatchNotes} theme={theme} />}
      </AnimatePresence>

      {/* Barra Lateral Esmerilada */}
      <div className={`${sidebarOpen ? 'w-72' : 'w-24'} transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] bg-white/40 backdrop-blur-3xl m-4 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 flex flex-col relative z-20`}>
        <div className="p-6 flex items-center justify-between">
          <div className={`flex items-center gap-3 overflow-hidden whitespace-nowrap transition-all duration-500 ${sidebarOpen ? 'w-full opacity-100' : 'w-0 opacity-0 hidden'}`}>
            <div className={`bg-gradient-to-br ${theme.accentGradient} p-2 rounded-2xl shadow-sm`}><FileText size={20} className="text-white"/></div>
            <div>
              <h1 className="font-black text-lg text-slate-800 tracking-tight leading-none">NeoGradebook</h1>
              <span className={`text-[9px] font-black ${theme.accentText} uppercase tracking-widest`}>v0.2 BETA</span>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className={`p-2 hover:bg-white/80 rounded-xl transition-colors ${!sidebarOpen && 'mx-auto'}`}>
            {sidebarOpen ? <ChevronDown size={20} className="text-slate-400"/> : <ChevronRight size={20} className="text-slate-600"/>}
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto py-6 px-4 scrollbar-hide space-y-2">
          {sidebarOpen && <div className="px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">My Classes</div>}
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
               <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shrink-0 border border-slate-200"><User size={14} className="text-slate-400" /></div>
               <span className="truncate text-xs font-bold text-slate-500">{user.email}</span>
            </div>
            <button onClick={() => { if(isDebug) window.location.reload(); else signOut(auth); }} className={`flex items-center gap-3 text-red-500 hover:text-red-600 transition-colors group ${!sidebarOpen ? 'justify-center' : ''}`}>
               <LogOut size={18} className="shrink-0 group-hover:-translate-x-1 transition-transform" />
               {sidebarOpen && <span className="text-sm font-black tracking-wide">Log Out</span>}
            </button>
          </div>
        </div>
      </div>

      {/* Área de Contenido Principal */}
      <div className="flex-1 flex flex-col min-w-0 z-10 py-4 pr-4 pl-0">
        {dataLoading ? (
           <div className="flex-1 flex flex-col items-center justify-center text-slate-500 space-y-4">
             <div className="w-8 h-8 border-4 border-white border-t-violet-500 rounded-full animate-spin"></div>
             <p className="font-bold tracking-widest uppercase text-xs">Loading data...</p>
           </div>
        ) : activeClass ? (
           <ClassView key={activeClass.id} activeClass={activeClass} userId={user.uid} isDebug={isDebug} globalSettings={globalSettings} theme={theme} setClasses={setClasses} classes={classes} />
        ) : (
           <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white/40 backdrop-blur-3xl rounded-[3rem] border border-white shadow-sm">
             <div className={`p-6 rounded-[2.5rem] mb-6 bg-white shadow-sm border border-slate-100 ${theme.accentText}`}><FileText size={64} /></div>
             <h2 className="text-3xl font-black text-slate-800 mb-3 tracking-tight">No Classes Found</h2>
             <p className="text-slate-500 mb-8 max-w-sm font-medium">Create your first class to start tracking grades in style.</p>
             <button onClick={() => setIsClassModalOpen(true)} className={`flex items-center gap-2 bg-gradient-to-r ${theme.accentGradient} text-white px-8 py-4 rounded-2xl transition-all duration-300 shadow-xl ${theme.accentHover} hover:-translate-y-0.5 font-black tracking-wide`}>
               <Plus size={20} /> Create First Class
             </button>
           </div>
        )}
      </div>

      {/* Modal de Configuración Global */}
      <AnimatePresence>
      {isSettingsOpen && (
        <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <motion.div initial={{scale:0.95, y:10}} animate={{scale:1, y:0}} exit={{scale:0.95, y:10}} className="bg-white/90 backdrop-blur-3xl rounded-[3rem] shadow-2xl border border-white p-8 w-full max-w-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3"><Settings className={theme.accentText}/> Global Settings</h3>
              <button onClick={() => setIsSettingsOpen(false)} className="text-slate-400 hover:bg-slate-100 p-2 rounded-full transition-colors"><X size={20}/></button>
            </div>
            
            <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 scrollbar-hide">
              
              <div className="bg-white/50 p-5 rounded-[2rem] border border-white/60 shadow-sm">
                <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${theme.blob1}`}></div> UI Appearance</h4>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {[
                    {id:'aurora', name:'Aurora', colors:'from-violet-400 to-fuchsia-400'},
                    {id:'peach', name:'Peach', colors:'from-rose-400 to-orange-400'},
                    {id:'ocean', name:'Ocean', colors:'from-blue-400 to-cyan-400'},
                    {id:'mint', name:'Mint', colors:'from-emerald-400 to-teal-400'},
                    {id:'silver', name:'Silver', colors:'from-slate-400 to-zinc-400'}
                  ].map(t => (
                    <button key={t.id} onClick={() => setGlobalSettings({...globalSettings, theme: t.id})} className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all ${globalSettings.theme === t.id ? `border-${t.id==='silver'?'slate':t.id==='mint'?'emerald':t.id==='ocean'?'blue':t.id==='peach'?'rose':'violet'}-500 bg-white shadow-sm` : 'border-transparent hover:bg-white/50'}`}>
                       <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${t.colors} shadow-sm`}></div>
                       <span className="text-xs font-bold text-slate-600">{t.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white/50 p-5 rounded-[2rem] border border-white/60 shadow-sm">
                <h4 className="font-bold text-slate-700 mb-2 flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${theme.blob2}`}></div> General Preferences</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-500 mb-1 ml-1">School Name (For PDFs)</label>
                    <input type="text" value={globalSettings.schoolName} onChange={e => setGlobalSettings({...globalSettings, schoolName: e.target.value})} className={`w-full border border-white/80 rounded-2xl p-3 focus:bg-white bg-white/50 outline-none transition-all shadow-inner font-medium ${theme.accentRing} focus:ring-4`} placeholder="e.g. Springfield High"/>
                  </div>
                  <label className="flex items-center gap-3 p-3 bg-white/50 rounded-2xl border border-white/60 cursor-pointer hover:bg-white transition-colors">
                    <input type="checkbox" checked={globalSettings.compactMode} onChange={e => setGlobalSettings({...globalSettings, compactMode: e.target.checked})} className="w-5 h-5 rounded text-violet-600 focus:ring-violet-500 border-gray-300"/>
                    <span className="font-bold text-slate-700">Compact Grid Mode</span>
                  </label>
                  <label className="flex items-center gap-3 p-3 bg-white/50 rounded-2xl border border-white/60 cursor-pointer hover:bg-white transition-colors">
                    <input type="checkbox" checked={globalSettings.highlightFailing} onChange={e => setGlobalSettings({...globalSettings, highlightFailing: e.target.checked})} className="w-5 h-5 rounded text-violet-600 focus:ring-violet-500 border-gray-300"/>
                    <span className="font-bold text-slate-700">Highlight Failing Grades (&lt; 5.0)</span>
                  </label>
                </div>
              </div>

              <div className="bg-white/50 p-5 rounded-[2rem] border border-white/60 shadow-sm">
                <h4 className="font-bold text-slate-700 mb-2 flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${theme.blob3}`}></div> AI Writing Style Context</h4>
                <p className="text-xs text-slate-500 mb-3 font-medium leading-relaxed">Paste 2 or 3 of your best previous report comments here. The Gemini AI will analyze them and mimic your tone, vocabulary, and structure perfectly when generating new drafts.</p>
                <textarea value={globalSettings.aiContext} onChange={e => setGlobalSettings({...globalSettings, aiContext: e.target.value})} className={`w-full h-24 mb-4 border border-white/80 rounded-2xl p-4 focus:bg-white bg-white/50 outline-none transition-all shadow-inner font-medium resize-none ${theme.accentRing} focus:ring-4 placeholder:text-slate-400 leading-relaxed`} placeholder="Example: Joan has shown exceptional dedication this term. While his grammar needs refinement..."/>
                
                <h4 className="font-bold text-slate-700 mb-2 flex items-center gap-2 text-sm mt-2">Gemini API Key</h4>
                <p className="text-xs text-slate-500 mb-2 font-medium">Get a free key from aistudio.google.com to enable Magic Drafts.</p>
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

      {/* Modal de Creación de Clase */}
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

function ClassView({ activeClass, userId, isDebug, globalSettings, theme, setClasses, classes, onDeleteClass }) {
  const [studentName, setStudentName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved', 'saving'
  
  const [editingStudentId, setEditingStudentId] = useState(null);
  const [editStudentName, setEditStudentName] = useState('');

  const [activityModal, setActivityModal] = useState({ isOpen: false, field: 'Grammar', name: '', weight: 10 });
  const [attitudeModal, setAttitudeModal] = useState({ isOpen: false, studentId: null, reason: '', val: 0.1, transferVal: 0.1, transferField: 'Grammar' });
  const [commentModal, setCommentModal] = useState({ isOpen: false, studentId: null, text: '', aiPrompt: '', aiLanguage: 'English' });
  const [overrideModal, setOverrideModal] = useState({ isOpen: false, studentId: null, field: null, val: '' });
  const [isGenerating, setIsGenerating] = useState(false);

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

  const handleAddStudent = async (e) => {
    if (e.key === 'Enter' && studentName.trim()) {
      const newStudent = { id: generateId(), name: studentName.trim(), comments: '' };
      await updateClassData({ students: [...activeClass.students, newStudent] });
      setStudentName('');
    }
  };

  const handleDeleteStudent = async (studentId) => {
    if(window.confirm("Remove this student completely?")) {
      await updateClassData({ students: activeClass.students.filter(s => s.id !== studentId) });
    }
  };

  const handleRenameStudent = async (studentId) => {
    if (editStudentName.trim() && editStudentName !== activeClass.students.find(s => s.id === studentId)?.name) {
      const updated = activeClass.students.map(s => s.id === studentId ? { ...s, name: editStudentName.trim() } : s);
      await updateClassData({ students: updated });
    }
    setEditingStudentId(null);
  };

  const handleAddActivity = async () => {
    if (!activityModal.name.trim()) return;
    const newActivity = { id: generateId(), field: activityModal.field, name: activityModal.name, weight: Number(activityModal.weight) };
    await updateClassData({ activities: [...activeClass.activities, newActivity] });
    setActivityModal({ ...activityModal, isOpen: false, name: '' });
  };

  const handleDeleteActivity = async (activityId) => {
    if(window.confirm("Delete activity and all its grades?")) {
      await updateClassData({ activities: activeClass.activities.filter(a => a.id !== activityId) });
    }
  };

  const handleEqualizeWeights = async (field) => {
    const fieldActivities = activeClass.activities.filter(a => a.field === field);
    if (fieldActivities.length === 0) return;
    
    const equalWeight = Number((100 / fieldActivities.length).toFixed(2));
    const updatedActivities = activeClass.activities.map(a => 
      a.field === field ? { ...a, weight: equalWeight } : a
    );
    await updateClassData({ activities: updatedActivities });
  };

  const handleBulkFill = async (activityId) => {
    const val = window.prompt("Enter a grade to fill all empty cells for this activity:");
    if (val === null || val.trim() === '') return;
    const numVal = Number(val);
    if (isNaN(numVal)) return;

    const newGrades = { ...activeClass.grades };
    activeClass.students.forEach(s => {
      const key = `${s.id}_${activityId}`;
      if (newGrades[key] === undefined || newGrades[key] === '') {
        newGrades[key] = numVal;
      }
    });
    await updateClassData({ grades: newGrades });
  };

  const handleGradeChange = (studentId, activityId, value) => {
    const numVal = value === '' ? '' : Number(value);
    updateClassData({ grades: { ...activeClass.grades, [`${studentId}_${activityId}`]: numVal } });
  };

  const handleAddToBank = async () => {
    if (!attitudeModal.reason.trim()) return;
    const log = { id: generateId(), date: new Date().toISOString(), reason: attitudeModal.reason, bankDelta: attitudeModal.val, fieldDelta: null, field: null };
    const currentLogs = activeClass.attitudeLogs?.[attitudeModal.studentId] || [];
    await updateClassData({ attitudeLogs: { ...activeClass.attitudeLogs, [attitudeModal.studentId]: [log, ...currentLogs] } });
    setAttitudeModal({...attitudeModal, reason: '', val: 0.1});
  };

  const handleTransferFromBank = async () => {
    if (!attitudeModal.transferField) return;
    const log = { id: generateId(), date: new Date().toISOString(), reason: `Applied to ${attitudeModal.transferField}`, bankDelta: -attitudeModal.transferVal, fieldDelta: attitudeModal.transferVal, field: attitudeModal.transferField };
    const currentLogs = activeClass.attitudeLogs?.[attitudeModal.studentId] || [];
    await updateClassData({ attitudeLogs: { ...activeClass.attitudeLogs, [attitudeModal.studentId]: [log, ...currentLogs] } });
    setAttitudeModal({...attitudeModal, transferVal: 0.1});
  };

  const handleDeleteLog = async (studentId, logId) => {
     const currentLogs = activeClass.attitudeLogs?.[studentId] || [];
     const filteredLogs = currentLogs.filter(l => l.id !== logId);
     await updateClassData({ attitudeLogs: { ...activeClass.attitudeLogs, [studentId]: filteredLogs } });
  };

  const handleSaveOverride = async () => {
    const val = overrideModal.val === '' ? undefined : Number(overrideModal.val);
    const newOverrides = { ...activeClass.overrides };
    
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
    const updatedStudents = activeClass.students.map(s => s.id === commentModal.studentId ? { ...s, comments: commentModal.text } : s);
    await updateClassData({ students: updatedStudents });
    setCommentModal({ ...commentModal, isOpen: false });
  };

  const handleGenerateDraft = async () => {
    const apiKey = globalSettings.geminiApiKey || "";
    if (!apiKey && typeof __firebase_config === 'undefined') {
      window.alert("Please enter your Gemini API Key in the Global Settings to use the AI Assistant.");
      return;
    }

    setIsGenerating(true);
    try {
      const student = activeClass.students.find(s => s.id === commentModal.studentId);
      
      // Reunir notas
      const scores = FIELDS.map(f => {
         const s = calculateFieldScore(student.id, f, activeClass.activities, activeClass.grades, activeClass.attitudeLogs, activeClass.overrides);
         return `${f}: ${s.toFixed(1)}`;
      }).join(', ');
      const final = calculateFinalMark(student.id, activeClass.activities, activeClass.grades, activeClass.attitudeLogs, activeClass.overrides).toFixed(1);

      const systemInstruction = `You are an expert teacher writing a report card comment. 
      Language: ${commentModal.aiLanguage}. 
      Adopt the following writing style and tone based on these past examples: "${globalSettings.aiContext || 'Professional, constructive, and encouraging.'}".
      Do not include placeholders. Write a single, polished paragraph.`;

      const userQuery = `Student: ${student.name}. 
      Current Grades: ${scores}. Final Average: ${final}.
      Teacher's Quick Notes: ${commentModal.aiPrompt || 'Has done well this term.'}
      Write the final report card comment based on these notes and grades. Make it sound natural.`;

      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`;

      const payload = {
          contents: [{ parts: [{ text: userQuery }] }],
          systemInstruction: { parts: [{ text: systemInstruction }] },
      };

      const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
      });

      const result = await response.json();
      const candidate = result.candidates?.[0];
      
      if (candidate && candidate.content?.parts?.[0]?.text) {
         setCommentModal(prev => ({ ...prev, text: candidate.content.parts[0].text }));
      } else {
         window.alert("Failed to generate. Please check your API key.");
      }
    } catch (error) {
      console.error("AI Generation Error:", error);
      window.alert("An error occurred. Check the console for details.");
    } finally {
      setIsGenerating(false);
    }
  };

  const exportCSV = () => {
    let csv = `Student Name,${FIELDS.map(f => {
      const acts = activeClass.activities.filter(a => a.field === f);
      return acts.map(a => `${f} - ${a.name}`).join(',') + (acts.length > 0 ? `,${f} AVG` : `${f} AVG`);
    }).join(',')},FINAL MARK\n`;

    activeClass.students.forEach(student => {
      csv += `"${student.name}",`;
      FIELDS.forEach(field => {
        const acts = activeClass.activities.filter(a => a.field === field);
        acts.forEach(act => {
          csv += `${activeClass.grades[`${student.id}_${act.id}`] ?? ''},`;
        });
        const fieldScore = calculateFieldScore(student.id, field, activeClass.activities, activeClass.grades, activeClass.attitudeLogs, activeClass.overrides);
        csv += `${fieldScore.toFixed(2)},`;
      });
      const finalMark = calculateFinalMark(student.id, activeClass.activities, activeClass.grades, activeClass.attitudeLogs, activeClass.overrides);
      csv += `${finalMark.toFixed(2)}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeClass.name}_Grades.csv`;
    a.click();
  };

  // Lógica de Clasificación
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const processedStudents = useMemo(() => {
    let sortable = [...activeClass.students];
    
    // Filtrar
    if (searchTerm) {
      sortable = sortable.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }

    // Clasificar
    if (sortConfig.key) {
      sortable.sort((a, b) => {
        if (sortConfig.key === 'name') {
          return sortConfig.direction === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
        } else if (sortConfig.key === 'final') {
          const aFinal = calculateFinalMark(a.id, activeClass.activities, activeClass.grades, activeClass.attitudeLogs, activeClass.overrides);
          const bFinal = calculateFinalMark(b.id, activeClass.activities, activeClass.grades, activeClass.attitudeLogs, activeClass.overrides);
          return sortConfig.direction === 'asc' ? aFinal - bFinal : bFinal - aFinal;
        }
        return 0;
      });
    }
    return sortable;
  }, [activeClass, searchTerm, sortConfig]);

  // Cálculo de promedios de la clase
  const classAverages = useMemo(() => {
    const avgs = { activities: {}, fields: {}, final: 0 };
    if (activeClass.students.length === 0) return avgs;

    // Promedios de Actividades
    activeClass.activities.forEach(act => {
      let sum = 0, count = 0;
      activeClass.students.forEach(s => {
        const grade = activeClass.grades[`${s.id}_${act.id}`];
        if (grade !== undefined && grade !== '') { sum += grade; count++; }
      });
      avgs.activities[act.id] = count > 0 ? (sum / count) : 0;
    });

    // Promedios Finales y de Campos
    let finalSum = 0;
    FIELDS.forEach(field => {
      let fieldSum = 0;
      activeClass.students.forEach(s => {
        fieldSum += calculateFieldScore(s.id, field, activeClass.activities, activeClass.grades, activeClass.attitudeLogs, activeClass.overrides);
      });
      avgs.fields[field] = fieldSum / activeClass.students.length;
    });

    activeClass.students.forEach(s => {
      finalSum += calculateFinalMark(s.id, activeClass.activities, activeClass.grades, activeClass.attitudeLogs, activeClass.overrides);
    });
    avgs.final = finalSum / activeClass.students.length;

    return avgs;
  }, [activeClass]);


  return (
    <div className="flex flex-col h-full relative z-10">
      {/* ENCABEZADO */}
      <div className="bg-white/40 backdrop-blur-3xl border border-white/60 rounded-[2.5rem] px-8 py-5 flex flex-col md:flex-row items-center justify-between shadow-sm mb-4 no-print shrink-0 relative overflow-hidden">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
              {activeClass.name} 
              <button onClick={onDeleteClass} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all" title="Delete Class"><Trash2 size={22}/></button>
              {isDebug && <span className="text-xs font-bold bg-amber-100 text-amber-700 px-3 py-1 rounded-full shadow-sm border border-amber-200">Local Sandbox</span>}
            </h2>
            <div className="flex items-center gap-4 mt-2">
              <p className="text-sm font-bold text-slate-500 flex items-center gap-2 bg-white/60 px-3 py-1 rounded-full shadow-inner"><User size={14}/> {activeClass.students.length} Students</p>
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
        <div className="flex items-center gap-3">
          <button onClick={exportCSV} className={`flex items-center gap-2 bg-white/80 hover:bg-white text-slate-700 px-5 py-3 rounded-2xl transition-colors font-bold shadow-sm ${theme.accentText}`}>Export CSV</button>
          <button onClick={() => window.print()} className={`flex items-center gap-2 bg-gradient-to-r ${theme.accentGradient} text-white px-5 py-3 rounded-2xl transition-all shadow-lg ${theme.accentHover} font-black tracking-wide`}><FileText size={18} /> Print PDF</button>
        </div>
      </div>

      {/* CUADRÍCULA DE HOJA DE CÁLCULO */}
      <div className="flex-1 overflow-auto bg-white/40 backdrop-blur-3xl rounded-[3rem] border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] no-print relative">
        <table className="w-full border-collapse table-auto min-w-max">
          <thead className="bg-white/80 backdrop-blur-md sticky top-0 z-20 shadow-sm border-b border-white">
            {/* Fila 1: Encabezados de Campo */}
            <tr>
              <th className="w-64 p-0 sticky left-0 z-30 bg-white/90 backdrop-blur-md border-b-2 border-r border-slate-200 shadow-[4px_0_10px_-5px_rgba(0,0,0,0.05)] cursor-pointer hover:bg-white" onClick={() => handleSort('name')}>
                <div className="px-6 py-4 flex items-center justify-between h-full">
                  <span className="font-black text-slate-800 text-sm uppercase tracking-widest flex items-center gap-2">STUDENTS {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</span>
                </div>
              </th>
              {FIELDS.map(field => {
                const acts = activeClass.activities.filter(a => a.field === field);
                const fieldStyle = PRINT_STYLES[field];
                return (
                  <th key={field} colSpan={Math.max(1, acts.length) + 1} className="border-b-2 border-r border-slate-200 p-3 text-center group transition-colors hover:bg-white" style={{backgroundColor: `${fieldStyle.cell}30`}}>
                    <div className="flex items-center justify-center gap-3">
                      <span className="font-black text-lg tracking-wide" style={{color: fieldStyle.head}}>{field}</span>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setActivityModal({ isOpen: true, field, name: '', weight: 10 })} className="p-1.5 hover:bg-white rounded-xl shadow-sm text-slate-600 transition-all"><Plus size={16} /></button>
                        {acts.length > 0 && <button onClick={() => handleEqualizeWeights(field)} className="p-1.5 hover:bg-white rounded-xl shadow-sm text-slate-600 transition-all" title="Equalize Weights"><Calculator size={16} /></button>}
                      </div>
                    </div>
                  </th>
                );
              })}
              <th className="w-32 border-b-2 border-r border-slate-200 p-3 bg-white text-center font-black text-slate-800 tracking-widest cursor-pointer hover:bg-slate-50" onClick={() => handleSort('final')}>
                FINAL {sortConfig.key === 'final' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th className="w-32 border-b-2 border-slate-200 p-3 bg-white/50 text-center font-bold text-slate-500 uppercase tracking-widest text-xs">
                EXTRAS
              </th>
            </tr>

            {/* Fila 2: Encabezados de Actividad */}
            <tr className="text-sm">
              <th className="sticky left-0 z-30 bg-white/90 backdrop-blur-md border-b border-r border-slate-200 p-3 text-left align-bottom shadow-[4px_0_10px_-5px_rgba(0,0,0,0.05)]">
                 <input type="text" placeholder="+ Add student (Enter)" className="w-full text-sm bg-slate-100 border-none rounded-xl px-4 py-2 focus:bg-white focus:ring-2 focus:ring-slate-300 outline-none font-bold transition-all placeholder:text-slate-400 shadow-inner" value={studentName} onChange={(e) => setStudentName(e.target.value)} onKeyDown={handleAddStudent}/>
              </th>
              {FIELDS.map(field => {
                const acts = activeClass.activities.filter(a => a.field === field);
                const fieldStyle = PRINT_STYLES[field];
                return (
                  <React.Fragment key={`group-${field}`}>
                    {acts.length === 0 ? (
                      <th className="border-b border-r border-slate-100 p-3 text-slate-400 italic text-center font-medium bg-white/30 text-xs">No acts</th>
                    ) : (
                      acts.map(act => (
                        <th key={act.id} className="border-b border-r border-slate-200 p-3 text-center font-normal min-w-[110px] relative group bg-white/50 hover:bg-white transition-colors">
                          <div className="font-bold text-slate-700 truncate px-2">{act.name}</div>
                          <div className="text-[10px] font-black mt-1 bg-white inline-block px-2 py-0.5 rounded-full shadow-sm text-slate-500">{act.weight.toFixed(1)}%</div>
                          <div className="absolute top-2 right-1 opacity-0 group-hover:opacity-100 flex flex-col gap-1">
                            <button onClick={() => handleDeleteActivity(act.id)} className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1 rounded-lg transition-all"><Trash2 size={12}/></button>
                            <button onClick={() => handleBulkFill(act.id)} className="text-slate-400 hover:text-violet-500 hover:bg-violet-50 p-1 rounded-lg transition-all" title="Fill Empty Grades"><Wand2 size={12}/></button>
                          </div>
                        </th>
                      ))
                    )}
                    {/* Columna AVG para campo */}
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
              const finalMark = calculateFinalMark(student.id, activeClass.activities, activeClass.grades, activeClass.attitudeLogs, activeClass.overrides);
              const isFinalOverridden = activeClass.overrides?.[student.id]?.final !== undefined;
              const { bank: attitudeBank } = getAttitudeData(student.id, activeClass);
              
              // Contar Notas Faltantes
              let missingCount = 0;
              activeClass.activities.forEach(a => { if (activeClass.grades[`${student.id}_${a.id}`] === undefined || activeClass.grades[`${student.id}_${a.id}`] === '') missingCount++; });

              return (
                <tr key={student.id} className="group">
                  {/* Nombre del Estudiante */}
                  <td className="sticky left-0 z-10 bg-white/80 group-hover:bg-white border-b border-r border-white/60 p-0 shadow-[4px_0_10px_-5px_rgba(0,0,0,0.02)] transition-colors backdrop-blur-md">
                    <div className={`flex items-center justify-between px-6 ${cellPad}`}>
                      <div className="flex-1 pr-2">
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
                          <span className="font-black text-slate-800 block cursor-text flex items-center gap-2" onDoubleClick={() => {setEditingStudentId(student.id); setEditStudentName(student.name);}} title="Double click to rename">
                            {student.name}
                            <button onClick={() => {setEditingStudentId(student.id); setEditStudentName(student.name);}} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-slate-600 transition-opacity"><Edit2 size={12}/></button>
                          </span>
                        )}
                        {missingCount > 0 && <span className="text-[9px] font-black bg-red-100 text-red-600 px-1.5 py-0.5 rounded-md uppercase mt-1 inline-block">{missingCount} missing</span>}
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 shrink-0">
                        <button onClick={() => window.print()} className="text-slate-300 hover:text-violet-500 hover:bg-violet-50 p-2 rounded-xl transition-all" title="Print Student Report"><FileText size={16} /></button>
                        <button onClick={() => handleDeleteStudent(student.id)} className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-xl transition-all"><Trash2 size={16} /></button>
                      </div>
                    </div>
                  </td>

                  {/* Notas */}
                  {FIELDS.map(field => {
                    const acts = activeClass.activities.filter(a => a.field === field);
                    const fieldStyle = PRINT_STYLES[field];
                    const fieldScore = calculateFieldScore(student.id, field, activeClass.activities, activeClass.grades, activeClass.attitudeLogs, activeClass.overrides);
                    const isFieldOverridden = activeClass.overrides?.[student.id]?.[field] !== undefined;

                    // ¿La actitud modificó este campo?
                    const studentLogs = activeClass.attitudeLogs?.[student.id] || [];
                    const fieldAttitude = studentLogs.reduce((acc, log) => (log.field === field && log.fieldDelta) ? acc + log.fieldDelta : acc, 0);

                    return (
                      <React.Fragment key={`grades-${student.id}-${field}`}>
                        {acts.length === 0 ? (
                          <td className={`border-b border-r border-white/60 bg-white/20 ${cellPad}`}></td>
                        ) : (
                          acts.map((act) => {
                            const val = activeClass.grades[`${student.id}_${act.id}`];
                            const isFailing = globalSettings.highlightFailing && val !== undefined && val !== '' && val < 5;
                            return (
                              <td key={act.id} className={`border-b border-r border-white/60 bg-white/40 group-hover:bg-white/60 transition-colors relative ${cellPad}`}>
                                <input 
                                  type="number" min="0" max="100" 
                                  data-row={idx} data-col={act.id}
                                  className={`w-full text-center p-2 rounded-xl border-none focus:ring-2 focus:ring-slate-300 outline-none transition-all font-black text-slate-700 placeholder:text-slate-300 shadow-inner ${isFailing ? 'bg-red-50 text-red-700' : 'bg-slate-100 hover:bg-white focus:bg-white'}`} 
                                  placeholder="-" value={val ?? ''} 
                                  onChange={(e) => handleGradeChange(student.id, act.id, e.target.value)} 
                                  onKeyDown={(e) => {
                                    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                                      e.preventDefault();
                                      const nextRow = e.key === 'ArrowDown' ? idx + 1 : idx - 1;
                                      const nextInput = document.querySelector(`input[data-row="${nextRow}"][data-col="${act.id}"]`);
                                      if (nextInput) { nextInput.focus(); nextInput.select(); }
                                    }
                                  }}
                                />
                              </td>
                            )
                          })
                        )}
                        {/* Celda AVG */}
                        <td 
                          className={`border-b border-r border-white/60 text-center font-black cursor-pointer transition-all relative ${cellPad} ${isFieldOverridden ? 'bg-amber-100/50 hover:bg-amber-100 text-amber-800 shadow-inner' : 'bg-white/70 hover:bg-white text-slate-800'}`}
                          onClick={() => setOverrideModal({ isOpen: true, studentId: student.id, field: field, val: isFieldOverridden ? activeClass.overrides[student.id][field] : fieldScore.toFixed(2) })}
                          title={isFieldOverridden ? "Manually Overridden" : "Auto-calculated Average. Click to override."}
                        >
                          <div className="flex items-center justify-center gap-1">
                            {fieldScore.toFixed(1)}
                            {isFieldOverridden && <AlertCircle size={10} className="text-amber-500 absolute top-1 right-1" />}
                            {fieldAttitude !== 0 && !isFieldOverridden && (
                              <div className={`absolute bottom-1 right-1 flex items-center ${fieldAttitude > 0 ? 'text-emerald-500' : 'text-red-500'}`} title={`Attitude adjustment: ${fieldAttitude > 0 ? '+' : ''}${fieldAttitude.toFixed(1)}`}>
                                {fieldAttitude > 0 ? <ArrowUpRight size={12}/> : <ArrowDownRight size={12}/>}
                              </div>
                            )}
                          </div>
                        </td>
                      </React.Fragment>
                    )
                  })}

                  {/* Nota Final */}
                  <td 
                    className={`border-b border-r border-white/60 text-center cursor-pointer transition-all duration-300 relative ${cellPad} ${isFinalOverridden ? 'bg-amber-200/60 hover:bg-amber-300 text-amber-900 shadow-inner' : 'bg-slate-100/80 hover:bg-slate-200 text-slate-900'}`}
                    onClick={() => setOverrideModal({ isOpen: true, studentId: student.id, field: 'final', val: isFinalOverridden ? activeClass.overrides[student.id].final : finalMark.toFixed(2) })}
                    title="Click to manually override Final Grade"
                  >
                    <div className="flex items-center justify-center gap-1.5 font-black text-xl">
                      {finalMark.toFixed(1)}
                      {isFinalOverridden && <AlertCircle size={14} className="text-amber-600 absolute top-2 right-2" title="Manually Overridden" />}
                    </div>
                  </td>

                  {/* Extras */}
                  <td className={`border-b border-white/60 bg-white/20 group-hover:bg-transparent transition-colors ${cellPad}`}>
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => setAttitudeModal({ isOpen: true, studentId: student.id, reason: '', val: 0.1, transferVal: 0.1, transferField: 'Grammar' })} className={`p-2 rounded-2xl transition-all duration-300 relative ${attitudeBank !== 0 ? 'bg-emerald-100/80 text-emerald-700 hover:bg-emerald-200 shadow-sm' : 'text-slate-500 hover:bg-white/80 hover:text-slate-800'}`} title="Attitude Bank">
                        <Activity size={18} />
                        {attitudeBank !== 0 && <span className={`absolute -top-1.5 -right-1.5 text-[10px] font-black px-1.5 rounded-full border-2 border-white shadow-sm ${attitudeBank > 0 ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>{attitudeBank > 0 ? '+' : ''}{attitudeBank.toFixed(1)}</span>}
                      </button>
                      <button onClick={() => setCommentModal({ isOpen: true, studentId: student.id, text: student.comments || '', aiPrompt: '', aiLanguage: 'English' })} className={`p-2 rounded-2xl transition-all duration-300 relative ${student.comments ? `${theme.iconBg} ${theme.iconText} hover:bg-white shadow-sm` : 'text-slate-500 hover:bg-white/80 hover:text-slate-800'}`} title="Report Comments">
                        <MessageSquare size={18} />
                        {student.comments && <span className={`absolute -top-1 -right-1 w-3 h-3 ${theme.blob1} rounded-full border-2 border-white`}></span>}
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
            
            {/* Fila de Promedios de la Clase */}
            {processedStudents.length > 0 && (
              <tr className="sticky bottom-0 z-20">
                <td className="sticky left-0 bg-white/80 backdrop-blur-md border-t-4 border-white p-4 font-black text-right text-slate-500 uppercase tracking-widest text-xs shadow-[4px_0_10px_-5px_rgba(0,0,0,0.05)]">
                  CLASS AVERAGE
                </td>
                {FIELDS.map(field => {
                  const acts = activeClass.activities.filter(a => a.field === field);
                  const fieldStyle = PRINT_STYLES[field];
                  return (
                    <React.Fragment key={`avg-${field}`}>
                      {acts.length === 0 ? <td className="bg-white/60 backdrop-blur-md border-t-4 border-white border-r"></td> : acts.map(act => (
                        <td key={`avg-${act.id}`} className="bg-white/60 backdrop-blur-md border-t-4 border-white border-r p-2 text-center font-bold text-slate-500 text-sm">
                          {classAverages.activities[act.id] > 0 ? classAverages.activities[act.id].toFixed(1) : '-'}
                        </td>
                      ))}
                      <td className="bg-white/80 backdrop-blur-md border-t-4 border-white border-r p-2 text-center font-black shadow-inner" style={{color: fieldStyle.head}}>
                        {classAverages.fields[field] > 0 ? classAverages.fields[field].toFixed(1) : '-'}
                      </td>
                    </React.Fragment>
                  )
                })}
                <td className="bg-slate-200/80 backdrop-blur-md border-t-4 border-white border-r p-2 text-center font-black text-lg text-slate-800 shadow-inner">
                  {classAverages.final > 0 ? classAverages.final.toFixed(1) : '-'}
                </td>
                <td className="bg-white/60 backdrop-blur-md border-t-4 border-white"></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* --- SECCIÓN DE IMPRESIÓN OCULTA --- */}
      <div id="print-section" className="hidden no-print bg-white text-black">
        <div className="mb-4 text-center">
           {globalSettings.schoolName && <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-1">{globalSettings.schoolName}</p>}
           <h1 className="text-2xl font-black uppercase">{activeClass.name}</h1>
        </div>
        
        <table className="w-full border-collapse mb-6 text-[12px] border border-black">
          <thead>
            <tr>
              <th className="border border-black p-2 text-left font-normal uppercase">NAME</th>
              {FIELDS.map(f => {
                const style = PRINT_STYLES[f];
                return (
                  <th key={f} className="border border-black p-2 text-center font-normal uppercase" style={{ backgroundColor: style.head, color: 'white' }}>{style.short}</th>
                );
              })}
              <th className="border border-black p-2 text-center bg-gray-300 font-bold uppercase">FINAL</th>
            </tr>
          </thead>
          <tbody>
            {activeClass.students.map(student => {
              const final = calculateFinalMark(student.id, activeClass.activities, activeClass.grades, activeClass.attitudeLogs, activeClass.overrides);
              const isOverridden = activeClass.overrides?.[student.id]?.final !== undefined;
              return (
                <tr key={student.id}>
                  <td className="border border-black p-2 font-medium">{student.name}</td>
                  {FIELDS.map(field => {
                    const score = calculateFieldScore(student.id, field, activeClass.activities, activeClass.grades, activeClass.attitudeLogs, activeClass.overrides);
                    const style = PRINT_STYLES[field];
                    let displayScore = '-';
                    if (score > 0) displayScore = score % 1 === 0 ? score.toString() : score.toFixed(1).replace('.', ',');
                    return (
                      <td key={field} className="border border-black p-2 text-center font-bold" style={{ backgroundColor: style.cell }}>{displayScore}</td>
                    )
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
          {activeClass.students.map(student => {
            if (!student.comments) return null;
            return (
              <p key={student.id} className="text-[12px] text-justify leading-relaxed">
                <strong>{student.name}:</strong> {student.comments}
              </p>
            )
          })}
        </div>
      </div>

      {/* MODALES */}
      <AnimatePresence>
        {activityModal.isOpen && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
            <motion.div initial={{scale:0.95, y:20}} animate={{scale:1, y:0}} exit={{scale:0.95, y:20}} className="bg-white/90 backdrop-blur-3xl rounded-[3rem] shadow-2xl border border-white p-8 w-full max-w-sm">
              <h3 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-3"><div className={`p-2 rounded-xl ${theme.iconBg} ${theme.iconText}`}><Plus size={24}/></div> Add Activity</h3>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-slate-500 mb-2 ml-1">Activity Name</label>
                  <input type="text" autoFocus value={activityModal.name} onChange={e => setActivityModal({...activityModal, name: e.target.value})} className={`w-full border border-white/60 rounded-2xl p-4 focus:bg-white bg-white/50 outline-none transition-all shadow-inner font-bold ${theme.accentRing} focus:ring-4 placeholder:text-slate-400`} placeholder="e.g. Unit 1 Test"/>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-500 mb-2 ml-1">Weight (%) in {activityModal.field}</label>
                  <input type="number" min="0" value={activityModal.weight} onChange={e => setActivityModal({...activityModal, weight: e.target.value})} className={`w-full border border-white/60 rounded-2xl p-4 focus:bg-white bg-white/50 outline-none transition-all shadow-inner font-black text-lg ${theme.accentRing} focus:ring-4`}/>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-8">
                <button onClick={() => setActivityModal({isOpen: false, field: '', name: '', weight: 0})} className="px-6 py-3.5 text-slate-600 font-bold hover:bg-white/60 rounded-2xl transition-colors">Cancel</button>
                <button onClick={handleAddActivity} className={`px-6 py-3.5 bg-gradient-to-r ${theme.accentGradient} text-white font-black tracking-wide rounded-2xl shadow-xl transition-all ${theme.accentHover}`}>Add Activity</button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {attitudeModal.isOpen && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
            <motion.div initial={{scale:0.95, y:20}} animate={{scale:1, y:0}} exit={{scale:0.95, y:20}} className="bg-white/90 backdrop-blur-3xl rounded-[3rem] shadow-2xl border border-white p-8 w-full max-w-4xl flex flex-col md:flex-row gap-8 max-h-[90vh]">
               <div className="flex-[1.5] flex flex-col">
                 <h3 className="text-3xl font-black text-slate-800 mb-2 flex items-center gap-3"><div className="bg-emerald-100 text-emerald-600 p-3 rounded-2xl shadow-sm"><Activity size={28}/></div> Attitude Ledger</h3>
                 <p className="text-sm font-bold text-slate-500 mb-6">Managing points for: <span className="text-slate-800">{activeClass.students.find(s=>s.id===attitudeModal.studentId)?.name}</span></p>
                 
                 <div className="space-y-4 flex-1 overflow-y-auto pr-2 scrollbar-hide">
                   <div className="bg-white/50 p-5 rounded-[2rem] border border-white/60 shadow-sm flex flex-col gap-3">
                     <h4 className="font-black text-slate-700 flex items-center gap-2 text-sm"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> 1. Record to Bank</h4>
                     <div className="flex gap-3">
                       <div className="flex items-center bg-white rounded-2xl border border-white/80 p-1 shadow-inner shrink-0">
                         <button onClick={() => setAttitudeModal({...attitudeModal, val: attitudeModal.val - 0.1})} className="w-10 h-10 rounded-xl bg-red-50 text-red-600 hover:bg-red-500 hover:text-white font-black text-lg transition-all">-</button>
                         <span className={`w-14 text-center font-black text-lg ${attitudeModal.val > 0 ? 'text-emerald-600' : attitudeModal.val < 0 ? 'text-red-600' : 'text-slate-400'}`}>{attitudeModal.val > 0 ? '+' : ''}{attitudeModal.val.toFixed(1)}</span>
                         <button onClick={() => setAttitudeModal({...attitudeModal, val: attitudeModal.val + 0.1})} className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white font-black text-lg transition-all">+</button>
                       </div>
                       <input type="text" placeholder="Reason (e.g., Great effort)" value={attitudeModal.reason} onChange={e => setAttitudeModal({...attitudeModal, reason: e.target.value})} className={`w-full border border-white/80 rounded-2xl px-4 focus:bg-white bg-white/50 outline-none transition-all shadow-inner font-medium placeholder:text-slate-400 ${theme.accentRing} focus:ring-4`} onKeyDown={e => e.key === 'Enter' && handleAddToBank()}/>
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
                     <button onClick={handleTransferFromBank} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-xl transition-all tracking-wide">Deduct from Bank & Apply to Grade</button>
                   </div>
                 </div>
               </div>

               <div className="w-full md:w-80 flex flex-col gap-4">
                  <div className="bg-emerald-50/80 rounded-[2.5rem] border border-emerald-100 p-8 flex flex-col items-center justify-center shadow-sm shrink-0 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-200/50 rounded-full mix-blend-multiply blur-2xl"></div>
                    <span className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-2 relative z-10">Available Bank</span>
                    <span className="text-6xl font-black text-emerald-500 relative z-10">{(() => { const {bank} = getAttitudeData(attitudeModal.studentId, activeClass); return bank > 0 ? `+${bank.toFixed(1)}` : bank.toFixed(1); })()}</span>
                  </div>
                  <div className="flex-1 bg-white/40 rounded-[2.5rem] border border-white/60 p-5 overflow-y-auto shadow-inner scrollbar-hide flex flex-col">
                    <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 sticky top-0 bg-white/90 backdrop-blur-md p-2 rounded-xl z-10 text-center shrink-0">Ledger History</h4>
                    {(() => {
                      const logs = activeClass.attitudeLogs?.[attitudeModal.studentId] || [];
                      if (logs.length === 0) return <p className="text-sm text-slate-400 font-medium italic text-center mt-4">No records yet.</p>;
                      return <div className="space-y-2 flex-1 overflow-y-auto pr-1 scrollbar-hide">
                        {logs.map(log => {
                          const isTransfer = log.bankDelta !== null && log.fieldDelta !== null && log.field !== null;
                          const displayVal = isTransfer ? log.fieldDelta : (log.bankDelta || log.fieldDelta);
                          const displayColor = displayVal > 0 ? 'text-emerald-600' : 'text-red-600';

                          return (
                            <div key={log.id} className="text-xs font-medium text-slate-600 bg-white/80 p-3 rounded-2xl border border-white flex items-center justify-between gap-2 shadow-sm group">
                              <div className="flex items-center gap-3">
                                <div className={`font-black w-8 text-right shrink-0 text-sm ${displayColor}`}>
                                  {displayVal > 0 ? '+' : ''}{Number(displayVal).toFixed(1)}
                                </div>
                                <div>
                                  <span className="font-bold text-slate-800 block truncate max-w-[120px]">{log.reason}</span>
                                  <span className="text-[10px] text-slate-500">{isTransfer ? `Applied to ${log.field}` : (log.field ? `Applied to ${log.field}` : 'Banked')} • {formatDate(log.date).split(',')[0]}</span>
                                </div>
                              </div>
                              <button onClick={() => handleDeleteLog(attitudeModal.studentId, log.id)} className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all" title="Undo this entry"><Undo2 size={14}/></button>
                            </div>
                          )
                        })}
                      </div>
                    })()}
                  </div>
                  <button onClick={() => setAttitudeModal({isOpen: false, studentId: null, reason: '', val: 0.1, transferVal: 0.1, transferField: 'Grammar'})} className="w-full py-4 bg-white hover:bg-slate-50 text-slate-700 font-black rounded-2xl shadow-sm border border-slate-200 transition-all shrink-0">Close Ledger</button>
               </div>
            </motion.div>
          </motion.div>
        )}

        {overrideModal.isOpen && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
            <motion.div initial={{scale:0.95, y:20}} animate={{scale:1, y:0}} exit={{scale:0.95, y:20}} className="bg-white/90 backdrop-blur-3xl rounded-[3rem] shadow-2xl border border-white p-8 w-full max-w-sm">
              <h3 className="text-2xl font-black text-slate-800 mb-2 flex items-center gap-3"><div className="bg-amber-100 text-amber-600 p-2 rounded-xl"><Edit2 size={24}/></div> Manual Override</h3>
              <p className="text-sm font-medium text-slate-500 mb-6 leading-relaxed">Round the <b className="text-amber-600 uppercase">{overrideModal.field}</b> average. Leave empty to restore auto-calculation.</p>
              
              <div className="relative mb-8">
                <input type="number" step="0.1" autoFocus value={overrideModal.val} onChange={e => setOverrideModal({...overrideModal, val: e.target.value})} className={`w-full text-center text-5xl font-black text-slate-800 border border-white/60 rounded-[2rem] p-6 focus:bg-white bg-white/50 outline-none transition-all shadow-inner focus:ring-4 focus:ring-amber-500/30 placeholder:text-slate-300`} placeholder="Auto"/>
              </div>
              
              <div className="flex justify-end gap-3">
                <button onClick={() => setOverrideModal({isOpen: false, studentId: null, field: null, val: ''})} className="flex-1 py-3.5 text-slate-600 font-bold hover:bg-white/60 rounded-2xl transition-colors">Cancel</button>
                <button onClick={handleSaveOverride} className="flex-1 py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-black rounded-2xl transition-all shadow-xl shadow-amber-500/30 tracking-wide">Apply</button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {commentModal.isOpen && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
            <motion.div initial={{scale:0.95, y:20}} animate={{scale:1, y:0}} exit={{scale:0.95, y:20}} className="bg-white/90 backdrop-blur-3xl rounded-[3rem] shadow-2xl border border-white p-8 w-full max-w-6xl flex flex-col md:flex-row gap-8 max-h-[90vh]">
              
              {/* Columna Izquierda: Asistente IA */}
              <div className="flex-1 flex flex-col gap-4">
                <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3 shrink-0"><div className={`p-2 rounded-xl bg-gradient-to-br ${theme.accentGradient} text-white shadow-sm`}><Wand2 size={24}/></div> AI Assistant</h3>
                
                <div className="bg-white/50 p-5 rounded-[2rem] border border-white/60 shadow-sm shrink-0">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-bold text-slate-700">1. Language</label>
                    <select value={commentModal.aiLanguage} onChange={e => setCommentModal({...commentModal, aiLanguage: e.target.value})} className={`bg-white border border-white/80 rounded-xl px-3 py-1.5 text-sm font-bold text-slate-600 outline-none shadow-sm ${theme.accentRing} focus:ring-2`}>
                      <option>English</option><option>Spanish</option><option>Catalan</option>
                    </select>
                  </div>
                  <label className="block text-sm font-bold text-slate-700 mb-2 mt-4">2. Quick Notes</label>
                  <textarea value={commentModal.aiPrompt} onChange={e => setCommentModal({...commentModal, aiPrompt: e.target.value})} className={`w-full h-24 border border-white/80 rounded-2xl p-4 focus:bg-white bg-white/50 outline-none transition-all shadow-inner font-medium resize-none ${theme.accentRing} focus:ring-4 placeholder:text-slate-400`} placeholder="E.g. Great effort this term, speaking is improving but grammar needs work..."/>
                  <button disabled={isGenerating} className={`w-full mt-3 py-3 bg-slate-900 hover:bg-black text-white font-black tracking-wide rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-70`} onClick={handleGenerateDraft}>
                    {isGenerating ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : 'Generate Magic Draft'}
                  </button>
                </div>

                <div className="flex-1 flex flex-col min-h-[200px]">
                  <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">3. Final Official Comment</label>
                  <textarea value={commentModal.text} onChange={e => setCommentModal({...commentModal, text: e.target.value})} className={`w-full flex-1 border border-white/80 rounded-2xl p-5 focus:bg-white bg-white/50 outline-none transition-all shadow-inner font-medium resize-none ${theme.accentRing} focus:ring-4 leading-relaxed text-slate-700`} placeholder="The final comment that will appear on the PDF report goes here..."/>
                </div>

                <div className="flex justify-end gap-3 shrink-0 pt-2">
                  <button onClick={() => setCommentModal({isOpen: false, studentId: null, text: '', aiPrompt: '', aiLanguage: 'English'})} className="px-8 py-4 text-slate-600 font-bold hover:bg-white/60 rounded-2xl transition-colors">Cancel</button>
                  <button onClick={handleSaveComment} className={`px-8 py-4 bg-gradient-to-r ${theme.accentGradient} text-white font-black tracking-wide rounded-2xl transition-all shadow-xl ${theme.accentHover} flex items-center gap-2`}><Save size={20}/> Save Official Comment</button>
                </div>
              </div>

              {/* Columna Derecha: Huella Visual */}
              <div className="w-full md:w-96 bg-white/40 rounded-[3rem] border border-white/60 p-6 shadow-inner flex flex-col shrink-0">
                <div className="text-center mb-4 shrink-0">
                  <h4 className="font-black text-xl text-slate-800">{activeClass.students.find(s=>s.id===commentModal.studentId)?.name}</h4>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Academic Footprint</span>
                </div>
                
                <div className="flex-1 min-h-[250px] relative">
                  {(() => {
                    const radarData = FIELDS.map(f => {
                       const score = calculateFieldScore(commentModal.studentId, f, activeClass.activities, activeClass.grades, activeClass.attitudeLogs, activeClass.overrides);
                       return { subject: f, score: Math.min(10, score) * 10, fullMark: 100 };
                    });
                    
                    return (
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                          <PolarGrid stroke="#e2e8f0" />
                          <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 11, fontWeight: 'bold' }} />
                          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                          <Radar name="Student" dataKey="score" stroke={theme.accentText.replace('text-', '')} fill={theme.blob1.replace('bg-', '')} fillOpacity={0.5} />
                          <RechartsTooltip formatter={(value) => [(value / 10).toFixed(1), 'Score']} contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}/>
                        </RadarChart>
                      </ResponsiveContainer>
                    )
                  })()}
                </div>
                
                <div className="bg-white/60 p-4 rounded-3xl mt-4 shrink-0 border border-white shadow-sm">
                   <div className="flex justify-between items-center mb-1">
                     <span className="text-xs font-bold text-slate-500">Current Final Average</span>
                     <span className="text-xl font-black text-slate-800">{calculateFinalMark(commentModal.studentId, activeClass.activities, activeClass.grades, activeClass.attitudeLogs, activeClass.overrides).toFixed(2)}</span>
                   </div>
                   <div className="flex justify-between items-center">
                     <span className="text-xs font-bold text-slate-500">Attitude Bank</span>
                     <span className={`text-sm font-black ${getAttitudeData(commentModal.studentId, activeClass).bank > 0 ? 'text-emerald-500' : getAttitudeData(commentModal.studentId, activeClass).bank < 0 ? 'text-red-500' : 'text-slate-400'}`}>
                       {getAttitudeData(commentModal.studentId, activeClass).bank > 0 ? '+' : ''}{getAttitudeData(commentModal.studentId, activeClass).bank.toFixed(1)}
                     </span>
                   </div>
                </div>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
