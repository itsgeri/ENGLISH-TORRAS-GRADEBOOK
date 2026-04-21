import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { 
  User, LogOut, Plus, Edit2, Trash2, Save, X, BarChart2, 
  MessageSquare, FileText, Activity, ChevronDown, ChevronRight, AlertCircle, CheckCircle, Download
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signOut, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot, collection, query, updateDoc } from 'firebase/firestore';

// --- CONFIGURACIÓN DE FIREBASE (Tus credenciales reales) ---
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
const googleProvider = new GoogleAuthProvider();

// --- CONSTANTES ---
const FIELDS = ['Grammar', 'Listening', 'Reading', 'Writing', 'Speaking'];
const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#14B8A6'];

// Colores exactos para la exportación a PDF
const PRINT_STYLES = {
  'Grammar': { short: 'GRAM.', head: '#e06666', cell: '#f4cccc' },
  'Listening': { short: 'LISTE.', head: '#f6b26b', cell: '#fce5cd' },
  'Reading': { short: 'READ.', head: '#ffd966', cell: '#fff2cc' },
  'Writing': { short: 'WRIT.', head: '#93c47d', cell: '#d9ead3' },
  'Speaking': { short: 'SPEAK', head: '#3c78d8', cell: '#c9daf8' }
};

const generateId = () => Math.random().toString(36).substr(2, 9);

const calculateFieldScore = (studentId, field, activities, grades, attitude) => {
  const fieldActivities = activities.filter(a => a.field === field);
  if (fieldActivities.length === 0) return 0;

  let totalWeight = 0;
  let weightedSum = 0;

  fieldActivities.forEach(act => {
    const w = Number(act.weight) || 0;
    const grade = Number(grades[`${studentId}_${act.id}`]) || 0;
    totalWeight += w;
    weightedSum += (grade * w);
  });

  let average = totalWeight > 0 ? (weightedSum / totalWeight) : 0;
  
  // Aplicar modificador de actitud
  const modifier = attitude?.[studentId]?.[field] || 0;
  return Math.max(0, average + modifier); // Evitar notas negativas
};

const calculateFinalMark = (studentId, activities, grades, attitude, overrides) => {
  if (overrides?.[studentId]?.final !== undefined) {
    return Number(overrides[studentId].final);
  }

  let totalScore = 0;
  let activeFields = 0;

  FIELDS.forEach(field => {
    const fieldActivities = activities.filter(a => a.field === field);
    if (fieldActivities.length > 0) {
      totalScore += calculateFieldScore(studentId, field, activities, grades, attitude);
      activeFields++;
    }
  });

  return activeFields > 0 ? (totalScore / activeFields) : 0;
};

// --- COMPONENTE DE LOGIN ---
function AuthScreen() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setError("Failed to login with Google. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 font-sans text-slate-800 p-4">
      <div className="bg-white p-10 rounded-3xl shadow-xl w-full max-w-md transform transition-all duration-500 hover:shadow-2xl text-center">
        <div className="flex justify-center mb-6 text-blue-600">
          <div className="bg-blue-50 p-5 rounded-full">
            <FileText size={48} className="text-blue-600" />
          </div>
        </div>
        <h2 className="text-3xl font-bold mb-3 text-slate-800">Torras Gradebook</h2>
        <p className="text-slate-500 mb-8">Sign in securely to access your classes.</p>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 text-sm rounded-xl border border-red-100 flex items-center justify-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full bg-white border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-xl p-4 transition-all duration-300 shadow-sm disabled:opacity-70 flex items-center justify-center gap-3 text-lg"
        >
          {loading ? (
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Sign in with Google
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// --- APP PRINCIPAL ---
export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return <MainDashboard user={user} />;
}

// --- DASHBOARD (Sidebar y Selector de Clases) ---
function MainDashboard({ user }) {
  const [classes, setClasses] = useState([]);
  const [activeClassId, setActiveClassId] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);

  // Modals & UI State
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'users', user.uid, 'classes'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const classData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setClasses(classData);
      if (classData.length > 0 && !activeClassId) {
        setActiveClassId(classData[0].id);
      } else if (classData.length === 0) {
        setActiveClassId(null);
      }
      setDataLoading(false);
    }, (error) => console.error("Firestore Error:", error));
    return () => unsubscribe();
  }, [user, activeClassId]);

  const handleCreateClass = async () => {
    if (!newClassName.trim()) return;
    const newId = `class_${Date.now()}`;
    const newClass = {
      name: newClassName,
      students: [],
      activities: [],
      grades: {},
      attitude: {},
      overrides: {}
    };
    await setDoc(doc(db, 'users', user.uid, 'classes', newId), newClass);
    setActiveClassId(newId);
    setNewClassName('');
    setIsClassModalOpen(false);
  };

  const activeClass = classes.find(c => c.id === activeClassId);

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-800 overflow-hidden">
      {/* Estilos de Animación e Impresión */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #print-section, #print-section * { visibility: visible; }
          #print-section { position: absolute; left: 0; top: 0; width: 100%; padding: 0px; background: white; z-index: 9999; }
          .no-print { display: none !important; }
        }
        .modal-enter { animation: modalEnter 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .fade-enter { animation: fadeEnter 0.3s ease-out forwards; }
        @keyframes modalEnter {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes fadeEnter { from { opacity: 0; } to { opacity: 1; } }
      `}</style>

      {/* Barra Lateral */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-20'} transition-all duration-300 ease-in-out bg-slate-900 text-slate-300 flex flex-col no-print z-30 shadow-2xl relative`}>
        <div className="p-5 flex items-center justify-between border-b border-slate-800">
          <div className={`flex items-center gap-3 overflow-hidden whitespace-nowrap transition-all duration-300 ${sidebarOpen ? 'w-full opacity-100' : 'w-0 opacity-0'}`}>
            <div className="bg-blue-500/20 p-1.5 rounded-lg">
              <FileText size={20} className="text-blue-400"/>
            </div>
            <h1 className="font-bold text-lg text-white tracking-wide">Gradebook</h1>
          </div>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-slate-800 rounded-xl transition-colors absolute right-4">
            {sidebarOpen ? <ChevronDown size={20}/> : <ChevronRight size={20}/>}
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto py-6">
          {sidebarOpen && <div className="px-6 text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">My Classes</div>}
          <div className="space-y-1 px-3">
            {classes.map(c => (
              <button
                key={c.id}
                onClick={() => setActiveClassId(c.id)}
                className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-4 transition-all duration-200 group
                  ${activeClassId === c.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'hover:bg-slate-800 hover:text-white'}`}
                title={c.name}
              >
                <div className={`p-1.5 rounded-md transition-colors ${activeClassId === c.id ? 'bg-white/20' : 'bg-slate-800 group-hover:bg-slate-700'}`}>
                  <User size={16} />
                </div>
                {sidebarOpen && <span className="truncate font-medium">{c.name}</span>}
              </button>
            ))}
          </div>
          <button 
            onClick={() => setIsClassModalOpen(true)} 
            className={`mt-6 mx-auto flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 py-3 rounded-xl border border-slate-700 transition-all duration-200 hover:border-slate-600 hover:text-white
              ${sidebarOpen ? 'w-[calc(100%-1.5rem)] px-4' : 'w-12 h-12 p-0'}`}
          >
            <Plus size={20} className={!sidebarOpen ? 'mx-auto' : ''}/> 
            {sidebarOpen && <span className="font-medium">Add Class</span>}
          </button>
        </div>
        
        <div className="p-5 border-t border-slate-800 bg-slate-950/50">
          <div className="flex flex-col gap-4">
            <div className={`flex items-center gap-3 overflow-hidden whitespace-nowrap transition-all duration-300 ${sidebarOpen ? 'w-full opacity-100' : 'w-0 opacity-0 hidden'}`}>
               <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.email}&background=0D8ABC&color=fff`} alt="avatar" className="w-8 h-8 rounded-full" />
               <span className="truncate text-sm font-medium text-slate-400">{user.email}</span>
            </div>
            <button onClick={() => signOut(auth)} className={`flex items-center gap-3 text-red-400/80 hover:text-red-400 transition-colors group ${!sidebarOpen ? 'justify-center' : ''}`}>
               <LogOut size={18} className="shrink-0 group-hover:-translate-x-1 transition-transform" />
               {sidebarOpen && <span className="text-sm font-semibold">Log Out</span>}
            </button>
          </div>
        </div>
      </div>

      {/* Contenido Principal */}
      <div className="flex-1 flex flex-col min-w-0 bg-white z-20 shadow-[-10px_0_30px_-15px_rgba(0,0,0,0.3)] rounded-l-[2rem] overflow-hidden">
        {dataLoading ? (
           <div className="flex-1 flex flex-col items-center justify-center text-slate-400 space-y-4">
             <div className="w-8 h-8 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin"></div>
             <p>Loading data...</p>
           </div>
        ) : activeClass ? (
           <ClassView key={activeClass.id} activeClass={activeClass} userId={user.uid} />
        ) : (
           <div className="flex-1 flex flex-col items-center justify-center p-8 text-center fade-enter">
             <div className="bg-slate-50 p-6 rounded-full mb-6">
               <FileText size={64} className="text-slate-300" />
             </div>
             <h2 className="text-2xl font-bold text-slate-700 mb-2">No Classes Found</h2>
             <p className="text-slate-500 mb-8 max-w-sm">Create your first class to start tracking grades, adding activities, and generating reports.</p>
             <button onClick={() => setIsClassModalOpen(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-xl transition-all duration-300 shadow-lg shadow-blue-600/30 hover:shadow-blue-600/40 hover:-translate-y-0.5 font-medium">
               <Plus size={20} /> Create Your First Class
             </button>
           </div>
        )}
      </div>

      {/* Modal Crear Clase */}
      {isClassModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 fade-enter">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-[400px] modal-enter border border-slate-100">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-800">Create New Class</h3>
              <button onClick={() => setIsClassModalOpen(false)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition-colors"><X size={20}/></button>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">Class Name</label>
              <input 
                type="text" autoFocus
                placeholder="e.g. English 101 - Morning" 
                className="w-full border border-slate-300 rounded-xl p-3 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all duration-300"
                value={newClassName} onChange={e => setNewClassName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreateClass()}
              />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setIsClassModalOpen(false)} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
              <button onClick={handleCreateClass} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-all duration-300 shadow-lg shadow-blue-600/30">Create Class</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- VISTA DE LA CLASE (GRID TIPO EXCEL) ---
function ClassView({ activeClass, userId }) {
  const [studentName, setStudentName] = useState('');
  const [saveStatus, setSaveStatus] = useState('idle'); // 'idle', 'saving', 'saved', 'error'
  
  // Modal States
  const [activityModal, setActivityModal] = useState({ isOpen: false, field: 'Grammar', name: '', weight: 10 });
  const [attitudeModal, setAttitudeModal] = useState({ isOpen: false, studentId: null });
  const [commentModal, setCommentModal] = useState({ isOpen: false, studentId: null, text: '' });
  const [overrideModal, setOverrideModal] = useState({ isOpen: false, studentId: null, val: '' });
  const [chartsOpen, setChartsOpen] = useState(false);

  // Guardar en Firebase con indicador visual
  const updateClassData = async (updates) => {
    setSaveStatus('saving');
    try {
      const classRef = doc(db, 'users', userId, 'classes', activeClass.id);
      await updateDoc(classRef, updates);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error(error);
      setSaveStatus('error');
    }
  };

  const handleAddStudent = async (e) => {
    if (e.key === 'Enter' && studentName.trim()) {
      const newStudent = { id: generateId(), name: studentName.trim(), comments: '' };
      await updateClassData({ students: [...activeClass.students, newStudent] });
      setStudentName('');
    }
  };

  const handleDeleteStudent = async (studentId) => {
    if(window.confirm("Are you sure you want to remove this student? All their data will be lost.")) {
      const updatedStudents = activeClass.students.filter(s => s.id !== studentId);
      await updateClassData({ students: updatedStudents });
    }
  };

  const handleAddActivity = async () => {
    if (!activityModal.name.trim()) return;
    const newActivity = { 
      id: generateId(), 
      field: activityModal.field, 
      name: activityModal.name, 
      weight: Number(activityModal.weight) 
    };
    await updateClassData({ activities: [...activeClass.activities, newActivity] });
    setActivityModal({ ...activityModal, isOpen: false, name: '' });
  };

  const handleDeleteActivity = async (activityId) => {
    if(window.confirm("Delete this activity? All associated grades will be permanently lost.")) {
      const updatedActivities = activeClass.activities.filter(a => a.id !== activityId);
      await updateClassData({ activities: updatedActivities });
    }
  };

  const handleGradeChange = (studentId, activityId, value) => {
    const numVal = value === '' ? '' : Number(value);
    const newGrades = { ...activeClass.grades, [`${studentId}_${activityId}`]: numVal };
    updateClassData({ grades: newGrades });
  };

  const handleAttitudeChange = (studentId, field, value) => {
    const studentAttitude = activeClass.attitude[studentId] || {};
    const newAttitude = { 
      ...activeClass.attitude, 
      [studentId]: { ...studentAttitude, [field]: Number(value) } 
    };
    updateClassData({ attitude: newAttitude });
  };

  const handleSaveComment = async () => {
    const updatedStudents = activeClass.students.map(s => 
      s.id === commentModal.studentId ? { ...s, comments: commentModal.text } : s
    );
    await updateClassData({ students: updatedStudents });
    setCommentModal({ isOpen: false, studentId: null, text: '' });
  };

  const handleSaveOverride = async () => {
    const val = overrideModal.val === '' ? undefined : Number(overrideModal.val);
    const newOverrides = { ...activeClass.overrides };
    
    if (val === undefined) {
      delete newOverrides[overrideModal.studentId];
    } else {
      newOverrides[overrideModal.studentId] = { final: val };
    }

    await updateClassData({ overrides: newOverrides });
    setOverrideModal({ isOpen: false, studentId: null, val: '' });
  };

  // Función para exportar datos a CSV (Excel)
  const exportToCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    // Cabeceras
    csvContent += "Student Name,Grammar,Listening,Reading,Writing,Speaking,Final Mark,Comments\n";

    activeClass.students.forEach(student => {
      const grammar = calculateFieldScore(student.id, 'Grammar', activeClass.activities, activeClass.grades, activeClass.attitude).toFixed(2);
      const listening = calculateFieldScore(student.id, 'Listening', activeClass.activities, activeClass.grades, activeClass.attitude).toFixed(2);
      const reading = calculateFieldScore(student.id, 'Reading', activeClass.activities, activeClass.grades, activeClass.attitude).toFixed(2);
      const writing = calculateFieldScore(student.id, 'Writing', activeClass.activities, activeClass.grades, activeClass.attitude).toFixed(2);
      const speaking = calculateFieldScore(student.id, 'Speaking', activeClass.activities, activeClass.grades, activeClass.attitude).toFixed(2);
      const final = calculateFinalMark(student.id, activeClass.activities, activeClass.grades, activeClass.attitude, activeClass.overrides).toFixed(2);
      const comments = `"${(student.comments || '').replace(/"/g, '""')}"`; // Escapar comillas dobles

      const row = [`"${student.name}"`, grammar, listening, reading, writing, speaking, final, comments];
      csvContent += row.join(",") + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${activeClass.name}_grades.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col h-full relative fade-enter">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-8 py-5 flex items-center justify-between z-20 no-print sticky top-0 rounded-tl-[2rem]">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">{activeClass.name}</h2>
            <p className="text-sm font-medium text-slate-500 flex items-center gap-2 mt-1">
              <User size={14}/> {activeClass.students.length} Students Enrolled
            </p>
          </div>
          
          {/* Autosave Indicator */}
          <div className="ml-6 flex items-center gap-2 text-sm font-bold bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
            {saveStatus === 'idle' && <span className="text-slate-400">All changes saved</span>}
            {saveStatus === 'saving' && <><div className="w-4 h-4 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div> <span className="text-blue-600">Saving...</span></>}
            {saveStatus === 'saved' && <><CheckCircle size={16} className="text-emerald-500"/> <span className="text-emerald-600">Saved</span></>}
            {saveStatus === 'error' && <><AlertCircle size={16} className="text-red-500"/> <span className="text-red-600">Error</span></>}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={exportToCSV} className="flex items-center gap-2 bg-slate-100 text-slate-700 hover:bg-slate-200 px-4 py-2.5 rounded-xl transition-colors font-semibold border border-slate-200 shadow-sm" title="Download Excel CSV">
            <Download size={18} /> Data
          </button>
          <button onClick={() => setChartsOpen(true)} className="flex items-center gap-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800 px-4 py-2.5 rounded-xl transition-colors font-semibold border border-indigo-200/50 shadow-sm">
            <BarChart2 size={18} /> Charts
          </button>
          <button onClick={() => window.print()} className="flex items-center gap-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 px-4 py-2.5 rounded-xl transition-colors font-semibold border border-emerald-200/50 shadow-sm">
            <FileText size={18} /> Export PDF
          </button>
        </div>
      </div>

      {/* Grid Principal (Estilo Excel) */}
      <div className="flex-1 overflow-auto bg-slate-50/50 no-print relative">
        <table className="w-full border-collapse table-fixed min-w-max">
          <thead className="bg-white sticky top-0 z-10 shadow-sm">
            {/* Fila 1: Nombres de Campos */}
            <tr>
              <th className="w-64 p-0 sticky left-0 z-20 bg-white border-b-2 border-r border-slate-200">
                <div className="px-6 py-4 flex items-center justify-between h-full bg-slate-50/80 backdrop-blur-md">
                  <span className="font-bold text-slate-700 text-sm uppercase tracking-wider">Students</span>
                </div>
              </th>
              {FIELDS.map(field => {
                const acts = activeClass.activities.filter(a => a.field === field);
                return (
                  <th key={field} colSpan={Math.max(1, acts.length)} className="border-b-2 border-r border-slate-200 p-3 text-center bg-white group transition-colors hover:bg-slate-50">
                    <div className="flex items-center justify-center gap-2">
                      <span className="font-bold text-slate-800 tracking-wide">{field}</span>
                      <button onClick={() => setActivityModal({ isOpen: true, field, name: '', weight: 10 })} className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-blue-100 rounded-lg text-blue-600">
                        <Plus size={16} />
                      </button>
                    </div>
                  </th>
                );
              })}
              <th className="w-28 border-b-2 border-r border-slate-200 p-3 bg-slate-100 text-center font-black text-slate-800">
                FINAL
              </th>
              <th className="w-28 border-b-2 border-slate-200 p-3 bg-white text-center text-slate-600 font-bold">
                EXTRAS
              </th>
            </tr>

            {/* Fila 2: Nombres de Actividades */}
            <tr className="text-sm">
              <th className="sticky left-0 z-20 bg-white border-b-2 border-r border-slate-200 p-3 text-left align-bottom shadow-[4px_0_10px_-5px_rgba(0,0,0,0.1)]">
                 <input 
                    type="text" 
                    placeholder="+ Type name & press Enter..." 
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none font-normal transition-all bg-slate-50 hover:bg-white"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    onKeyDown={handleAddStudent}
                 />
              </th>
              {FIELDS.map(field => {
                const acts = activeClass.activities.filter(a => a.field === field);
                if (acts.length === 0) {
                  return <th key={`empty-${field}`} className="border-b-2 border-r border-slate-100 p-3 text-slate-400 italic text-center font-normal bg-slate-50/50">No activities</th>;
                }
                return acts.map(act => (
                  <th key={act.id} className="border-b-2 border-r border-slate-200 p-3 text-center font-normal min-w-[100px] relative group bg-white hover:bg-slate-50 transition-colors">
                    <div className="font-semibold text-slate-700 truncate px-4">{act.name}</div>
                    <div className="text-xs text-blue-500 font-bold mt-1 bg-blue-50 inline-block px-2 py-0.5 rounded-full">{act.weight}%</div>
                    <button onClick={() => handleDeleteActivity(act.id)} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 hover:bg-red-50 p-1 rounded transition-all">
                      <Trash2 size={14}/>
                    </button>
                  </th>
                ));
              })}
              <th className="border-b-2 border-r border-slate-200 bg-slate-100"></th>
              <th className="border-b-2 border-slate-200 bg-white"></th>
            </tr>
          </thead>

          <tbody>
            {activeClass.students.map((student, idx) => {
              const finalMark = calculateFinalMark(student.id, activeClass.activities, activeClass.grades, activeClass.attitude, activeClass.overrides);
              const isOverridden = activeClass.overrides?.[student.id]?.final !== undefined;

              return (
                <tr key={student.id} className="hover:bg-blue-50/50 transition-colors group">
                  {/* Nombre Estudiante */}
                  <td className="sticky left-0 z-10 bg-white group-hover:bg-blue-50/50 border-b border-r border-slate-200 p-0 shadow-[4px_0_10px_-5px_rgba(0,0,0,0.1)] transition-colors">
                    <div className="flex items-center justify-between px-6 py-3">
                      <span className="font-semibold text-slate-700">{student.name}</span>
                      <button onClick={() => handleDeleteStudent(student.id)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-all">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>

                  {/* Celdas de Notas */}
                  {FIELDS.map(field => {
                    const acts = activeClass.activities.filter(a => a.field === field);
                    if (acts.length === 0) {
                      return <td key={`empty-${field}`} className="border-b border-r border-slate-100 bg-slate-50/30"></td>;
                    }
                    return acts.map((act, i) => {
                      return (
                        <td key={act.id} className="border-b border-r border-slate-200 p-2 bg-white group-hover:bg-transparent transition-colors">
                          <input 
                            type="number"
                            min="0" max="100"
                            className="w-full text-center p-2 rounded-lg hover:bg-slate-100 focus:bg-white focus:ring-2 focus:ring-blue-500/40 outline-none transition-all font-medium text-slate-700 placeholder:text-slate-300"
                            placeholder="-"
                            value={activeClass.grades[`${student.id}_${act.id}`] ?? ''}
                            onChange={(e) => handleGradeChange(student.id, act.id, e.target.value)}
                          />
                        </td>
                      )
                    });
                  })}

                  {/* Nota Final */}
                  <td 
                    className={`border-b border-r border-slate-200 p-2 text-center cursor-pointer transition-all duration-300 relative
                      ${isOverridden 
                        ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 shadow-inner' 
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-800'}
                    `}
                    onClick={() => setOverrideModal({ isOpen: true, studentId: student.id, val: isOverridden ? activeClass.overrides[student.id].final : finalMark.toFixed(2) })}
                    title="Click to manually override this grade"
                  >
                    <div className="flex items-center justify-center gap-1.5 font-bold text-lg">
                      {finalMark.toFixed(1)}
                      {isOverridden && <AlertCircle size={14} className="text-amber-600 absolute top-2 right-2" title="Manually Overridden" />}
                    </div>
                  </td>

                  {/* Extras (Botones) */}
                  <td className="border-b border-slate-200 p-2 bg-white group-hover:bg-transparent transition-colors">
                    <div className="flex items-center justify-center gap-2">
                      <button 
                        onClick={() => setAttitudeModal({ isOpen: true, studentId: student.id })}
                        className={`p-2 rounded-xl transition-all duration-200 ${Object.keys(activeClass.attitude[student.id] || {}).length > 0 ? 'bg-purple-100 text-purple-700 hover:bg-purple-200 shadow-sm' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'}`}
                        title="Attitude (+/-)"
                      >
                        <Activity size={18} />
                      </button>
                      <button 
                        onClick={() => setCommentModal({ isOpen: true, studentId: student.id, text: student.comments || '' })}
                        className={`p-2 rounded-xl transition-all duration-200 relative ${student.comments ? 'bg-blue-100 text-blue-700 hover:bg-blue-200 shadow-sm' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'}`}
                        title="Report Comments"
                      >
                        <MessageSquare size={18} />
                        {student.comments && <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white"></span>}
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        
        {/* Placeholder if empty */}
        {activeClass.students.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 pointer-events-none fade-enter mt-20">
            <User size={48} className="mb-4 opacity-20" />
            <p className="font-medium text-lg text-slate-500">No students yet</p>
            <p className="text-sm">Type a name in the bottom left input to start.</p>
          </div>
        )}
      </div>

      {/* --- NUEVO FORMATO DE IMPRESIÓN (PDF) EXACTO A LA IMAGEN --- */}
      <div id="print-section" className="hidden no-print bg-white p-4">
        <h1 className="text-xl font-bold mb-4 text-black uppercase">{activeClass.name}</h1>
        
        <table className="w-full border-collapse mb-6 text-[14px] border border-black">
          <thead>
            <tr>
              <th className="border border-black p-2 text-left bg-white font-normal uppercase text-black">NAME</th>
              {FIELDS.map(f => {
                const style = PRINT_STYLES[f] || { short: f.substring(0,5).toUpperCase(), head: '#d9d9d9', cell: '#f3f3f3' };
                return (
                  <th key={f} className="border border-black p-2 text-center font-normal uppercase text-black" style={{ backgroundColor: style.head }}>
                    {style.short}
                  </th>
                );
              })}
              <th className="border border-black p-2 text-center bg-[#b7b7b7] font-normal uppercase text-black">FINAL</th>
            </tr>
          </thead>
          <tbody>
            {activeClass.students.map(student => {
              const final = calculateFinalMark(student.id, activeClass.activities, activeClass.grades, activeClass.attitude, activeClass.overrides);
              const isOverridden = activeClass.overrides?.[student.id]?.final !== undefined;
              return (
                <tr key={student.id}>
                  <td className="border border-black p-2 bg-white text-black">{student.name}</td>
                  {FIELDS.map(field => {
                    const score = calculateFieldScore(student.id, field, activeClass.activities, activeClass.grades, activeClass.attitude);
                    const style = PRINT_STYLES[field] || { cell: '#f3f3f3' };
                    
                    // Formateo de notas (ej. "7,5" en vez de "7.5")
                    let displayScore = '-';
                    if (score > 0) {
                      displayScore = score % 1 === 0 ? score.toString() : score.toFixed(1).replace('.', ',');
                    }

                    return (
                      <td key={field} className="border border-black p-2 text-center text-black" style={{ backgroundColor: style.cell }}>
                        {displayScore}
                      </td>
                    )
                  })}
                  <td className="border border-black p-2 text-center text-black" style={{ backgroundColor: '#efefef' }}>
                    {final % 1 === 0 ? final.toString() : final.toFixed(1).replace('.', ',')} {isOverridden ? '*' : ''}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        
        <div className="space-y-4 max-w-4xl">
          {activeClass.students.map(student => {
            if (!student.comments) return null;
            return (
              <p key={student.id} className="text-[14px] text-justify leading-relaxed text-black font-serif">
                <strong>{student.name}:</strong> {student.comments}
              </p>
            )
          })}
        </div>
      </div>

      {/* Modal Añadir Actividad */}
      {activityModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 fade-enter">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-[400px] modal-enter border border-slate-100">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <span className="bg-blue-100 text-blue-600 p-1.5 rounded-lg"><Plus size={20}/></span>
                Add to {activityModal.field}
              </h3>
            </div>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Activity Name</label>
                <input type="text" autoFocus value={activityModal.name} onChange={e => setActivityModal({...activityModal, name: e.target.value})} className="w-full border border-slate-300 rounded-xl p-3 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Weight (%)</label>
                <div className="relative">
                  <input type="number" min="0" value={activityModal.weight} onChange={e => setActivityModal({...activityModal, weight: e.target.value})} className="w-full border border-slate-300 rounded-xl p-3 pr-10 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"/>
                  <span className="absolute right-4 top-3 text-slate-400 font-bold">%</span>
                </div>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">Weights are proportional. E.g., if you have two activities with weights 10 and 20, the second counts twice as much as the first.</p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-8">
              <button onClick={() => setActivityModal({isOpen: false, field: '', name: '', weight: 0})} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
              <button onClick={handleAddActivity} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-all shadow-lg shadow-blue-600/30">Add Activity</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Actitud */}
      {attitudeModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 fade-enter">
          <div className="bg-white rounded-3xl shadow-2xl p-8 w-[450px] modal-enter border border-slate-100">
             <div className="flex items-center gap-3 mb-2 text-purple-700">
               <div className="bg-purple-100 p-2 rounded-xl"><Activity size={24}/></div>
               <h3 className="text-2xl font-bold">Attitude Adjustments</h3>
             </div>
             <p className="text-sm text-slate-500 mb-6 font-medium">Modifying scores for: <span className="text-slate-800 font-bold">{activeClass.students.find(s=>s.id===attitudeModal.studentId)?.name}</span></p>
             
             <div className="space-y-3">
               {FIELDS.map(field => {
                 const currentVal = activeClass.attitude[attitudeModal.studentId]?.[field] || 0;
                 return (
                   <div key={field} className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-200/60 hover:border-slate-300 transition-colors">
                     <span className="font-semibold text-slate-700">{field}</span>
                     <div className="flex items-center gap-3 bg-white p-1 rounded-xl shadow-sm border border-slate-100">
                       <button onClick={() => handleAttitudeChange(attitudeModal.studentId, field, currentVal - 0.5)} className="w-10 h-10 rounded-lg bg-red-50 text-red-600 hover:bg-red-500 hover:text-white font-bold text-xl transition-all flex items-center justify-center">-</button>
                       <span className={`w-12 text-center font-black text-lg ${currentVal > 0 ? 'text-emerald-600' : currentVal < 0 ? 'text-red-600' : 'text-slate-400'}`}>
                         {currentVal > 0 ? '+' : ''}{currentVal}
                       </span>
                       <button onClick={() => handleAttitudeChange(attitudeModal.studentId, field, currentVal + 0.5)} className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white font-bold text-xl transition-all flex items-center justify-center">+</button>
                     </div>
                   </div>
                 )
               })}
             </div>
             <div className="mt-8 flex justify-end">
               <button onClick={() => setAttitudeModal({isOpen: false, studentId: null})} className="px-6 py-3 bg-slate-900 hover:bg-black text-white font-bold rounded-xl transition-all w-full shadow-lg shadow-slate-900/20">Done</button>
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
                <p className="text-slate-500 mt-2 font-medium">Writing comments for: <span className="text-slate-800 font-bold">{activeClass.students.find(s=>s.id===commentModal.studentId)?.name}</span></p>
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

      {/* Modal de Gráficos (Dashboard) */}
      {chartsOpen && (
        <div className="fixed inset-0 bg-slate-100/95 backdrop-blur-md z-50 flex flex-col fade-enter">
          <div className="bg-white p-6 border-b border-slate-200 flex justify-between items-center shadow-sm">
            <h2 className="text-2xl font-black flex items-center gap-3 text-slate-800">
              <div className="bg-indigo-100 text-indigo-600 p-2 rounded-xl"><BarChart2 size={28}/></div>
              Weight Distributions
            </h2>
            <button onClick={() => setChartsOpen(false)} className="p-3 bg-slate-100 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-xl transition-all font-bold flex items-center gap-2">
              <X size={20}/> Close Dashboard
            </button>
          </div>
          
          <div className="flex-1 overflow-auto p-8">
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {FIELDS.map(field => {
                const acts = activeClass.activities.filter(a => a.field === field);
                const totalW = acts.reduce((acc, curr) => acc + curr.weight, 0);
                const data = acts.map(a => ({ name: a.name, value: a.weight }));

                return (
                  <div key={field} className="bg-white p-6 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col h-[380px] modal-enter">
                    <div className="text-center mb-4">
                      <h3 className="font-black text-xl text-slate-800 tracking-wide">{field}</h3>
                      <p className="text-sm font-medium text-slate-400 mt-1 uppercase tracking-wider">Weight Breakdown</p>
                    </div>
                    {data.length > 0 ? (
                      <div className="flex-1 relative">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={data}
                              cx="50%" cy="45%"
                              innerRadius={65} outerRadius={90}
                              paddingAngle={5}
                              dataKey="value"
                              stroke="none"
                            >
                              {data.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                            </Pie>
                            <Tooltip 
                              formatter={(value) => [`${value}% weight`, 'Weight']} 
                              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                            />
                            <Legend verticalAlign="bottom" height={36} iconType="circle"/>
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 m-4">
                        <PieChart size={32} className="mb-2 opacity-20"/>
                        <span className="font-medium">No activities added</span>
                      </div>
                    )}
                    <div className="text-center text-sm font-bold text-slate-600 bg-slate-50 py-2 rounded-xl mt-2">
                      Total Points in {field}: <span className="text-indigo-600">{totalW}</span>
                    </div>
                  </div>
                );
              })}

              {/* Distribución Global */}
              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-6 rounded-3xl shadow-xl shadow-indigo-500/30 flex flex-col h-[380px] modal-enter text-white">
                 <div className="text-center mb-2">
                   <h3 className="font-black text-xl tracking-wide">Global Distribution</h3>
                   <p className="text-sm font-medium text-indigo-100 mt-1 uppercase tracking-wider">Final Average</p>
                 </div>
                 <p className="text-sm text-center text-indigo-100/80 mb-4 px-4 font-medium">The final mark averages the 5 fields equally (20% each).</p>
                 <div className="flex-1 relative filter drop-shadow-lg">
                   <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={FIELDS.map(f => ({name: f, value: 20}))}
                          cx="50%" cy="45%"
                          innerRadius={65} outerRadius={90}
                          paddingAngle={2}
                          dataKey="value"
                          stroke="rgba(255,255,255,0.2)"
                          strokeWidth={2}
                        >
                          {FIELDS.map((f, index) => <Cell key={`global-${index}`} fill={COLORS[index % COLORS.length]} />)}
                        </Pie>
                        <Tooltip 
                          formatter={(value) => [`${value}% of Final Grade`, 'Global Weight']}
                          contentStyle={{ borderRadius: '12px', border: 'none', color: '#1e293b' }} 
                        />
                      </PieChart>
                    </ResponsiveContainer>
                 </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
