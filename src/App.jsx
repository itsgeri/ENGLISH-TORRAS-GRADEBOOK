import React, { useState, useEffect, useMemo } from 'react';
import { 
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { 
  User, LogOut, Plus, Edit2, Trash2, Save, X, BarChart2, 
  MessageSquare, FileText, Activity, ChevronDown, ChevronRight, 
  AlertCircle, CheckCircle, Download, Layout
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup 
} from 'firebase/auth';
import { 
  getFirestore, doc, setDoc, onSnapshot, collection, query, deleteDoc, updateDoc 
} from 'firebase/firestore';

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

const FIELDS = ['Grammar', 'Listening', 'Reading', 'Writing', 'Speaking'];
const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

const generateId = () => Math.random().toString(36).substr(2, 9);

const calculateFieldScore = (studentId, field, activities, grades, attitude) => {
  const fieldActivities = activities.filter(a => a.field === field);
  if (fieldActivities.length === 0) return 0;
  let totalWeight = 0, weightedSum = 0;
  fieldActivities.forEach(act => {
    const w = Number(act.weight) || 0;
    const grade = Number(grades[`${studentId}_${act.id}`]) || 0;
    totalWeight += w;
    weightedSum += (grade * w);
  });
  const average = totalWeight > 0 ? (weightedSum / totalWeight) : 0;
  const modifier = attitude?.[studentId]?.[field] || 0;
  return Math.max(0, average + modifier);
};

const calculateFinalMark = (studentId, activities, grades, attitude, overrides) => {
  if (overrides?.[studentId]?.final !== undefined) return Number(overrides[studentId].final);
  let totalScore = 0, activeFields = 0;
  FIELDS.forEach(field => {
    const fieldActivities = activities.filter(a => a.field === field);
    if (fieldActivities.length > 0) {
      totalScore += calculateFieldScore(studentId, field, activities, grades, attitude);
      activeFields++;
    }
  });
  return activeFields > 0 ? (totalScore / activeFields) : 0;
};

function AuthScreen() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
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
    <div className="flex items-center justify-center min-h-screen bg-slate-50 font-sans p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-10 rounded-3xl shadow-2xl w-full max-w-md border border-slate-100 text-center"
      >
        <div className="bg-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-200">
          <Layout className="text-white" size={32} />
        </div>
        <h1 className="text-3xl font-black text-slate-800 mb-2 tracking-tight">Gradebook Online</h1>
        <p className="text-slate-500 mb-8 font-medium">Cloud-synced marks for language teachers.</p>

        {error && <div className="mb-6 p-3 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100">{error}</div>}

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-white border-2 border-slate-200 hover:border-blue-500 hover:bg-blue-50 text-slate-700 font-bold py-4 px-6 rounded-2xl transition-all duration-300 disabled:opacity-50"
        >
          {loading ? (
            <div className="w-6 h-6 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          ) : (
            <>
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/action/google.svg" className="w-6 h-6" alt="Google" />
              Sign in with Google
            </>
          )}
        </button>
        <p className="mt-8 text-xs text-slate-400 uppercase font-bold tracking-widest">Powered by Firebase & Torras</p>
      </motion.div>
    </div>
  );
}

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

  if (authLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
    </div>
  );

  return user ? <Dashboard user={user} /> : <AuthScreen />;
}

function Dashboard({ user }) {
  const [classes, setClasses] = useState([]);
  const [activeClassId, setActiveClassId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newClassName, setNewClassName] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'users', user.uid, 'classes'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setClasses(data);
      if (data.length > 0 && !activeClassId) setActiveClassId(data[0].id);
    });
    return () => unsubscribe();
  }, [user.uid]);

  const handleCreateClass = async () => {
    if (!newClassName.trim()) return;
    const id = generateId();
    await setDoc(doc(db, 'users', user.uid, 'classes', id), {
      name: newClassName,
      students: [],
      activities: [],
      grades: {},
      attitude: {},
      overrides: {}
    });
    setNewClassName('');
    setIsModalOpen(false);
    setActiveClassId(id);
  };

  const activeClass = classes.find(c => c.id === activeClassId);

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-800">
      {/* Sidebar */}
      <motion.div 
        animate={{ width: sidebarOpen ? 280 : 80 }}
        className="bg-slate-900 text-slate-300 flex flex-col no-print relative z-50"
      >
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          {sidebarOpen && <span className="font-black text-xl text-white tracking-tighter">GRADEBOOK</span>}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-slate-800 rounded-xl">
            {sidebarOpen ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {classes.map(c => (
            <button
              key={c.id}
              onClick={() => setActiveClassId(c.id)}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all ${activeClassId === c.id ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800'}`}
            >
              <Layout size={18} />
              {sidebarOpen && <span className="font-bold truncate">{c.name}</span>}
            </button>
          ))}
          <button 
            onClick={() => setIsModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-slate-700 p-3 rounded-2xl hover:border-slate-500 hover:text-white transition-all"
          >
            <Plus size={20} />
            {sidebarOpen && <span className="font-bold">Add Class</span>}
          </button>
        </div>

        <div className="p-6 border-t border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3 mb-4">
            <img src={user.photoURL} className="w-8 h-8 rounded-full" alt="User" />
            {sidebarOpen && <span className="text-xs font-bold truncate">{user.displayName}</span>}
          </div>
          <button onClick={() => signOut(auth)} className="flex items-center gap-3 text-red-400 hover:text-red-300 font-bold text-sm">
            <LogOut size={18} />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </motion.div>

      {/* Main View */}
      <div className="flex-1 overflow-hidden flex flex-col bg-white rounded-l-[40px] shadow-2xl relative z-10">
        {activeClass ? (
          <ClassView activeClass={activeClass} userId={user.uid} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-300">
            <Layout size={64} strokeWidth={1} className="mb-4" />
            <p className="font-bold">Select or create a class to begin</p>
          </div>
        )}
      </div>

      {/* Modal New Class */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
              className="bg-white p-8 rounded-[32px] shadow-2xl w-full max-w-sm"
            >
              <h3 className="text-2xl font-black mb-6">New Class Name</h3>
              <input 
                autoFocus className="w-full bg-slate-100 border-none p-4 rounded-2xl mb-6 focus:ring-4 focus:ring-blue-500/20 outline-none font-bold"
                value={newClassName} onChange={e => setNewClassName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreateClass()}
              />
              <div className="flex gap-3">
                <button onClick={() => setIsModalOpen(false)} className="flex-1 py-4 font-bold text-slate-500 hover:bg-slate-100 rounded-2xl">Cancel</button>
                <button onClick={handleCreateClass} className="flex-1 py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg">Create</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ClassView({ activeClass, userId }) {
  const [studentInput, setStudentInput] = useState('');
  const [modals, setModals] = useState({ type: null, data: null });

  const update = async (data) => {
    await updateDoc(doc(db, 'users', userId, 'classes', activeClass.id), data);
  };

  const addStudent = (e) => {
    if (e.key === 'Enter' && studentInput.trim()) {
      update({ students: [...activeClass.students, { id: generateId(), name: studentInput.trim(), comments: '' }] });
      setStudentInput('');
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <header className="px-10 py-8 flex justify-between items-center no-print">
        <h1 className="text-4xl font-black tracking-tight text-slate-800">{activeClass.name}</h1>
        <div className="flex gap-3">
          <button 
            onClick={() => setModals({ type: 'charts' })}
            className="flex items-center gap-2 bg-indigo-50 text-indigo-600 px-6 py-3 rounded-2xl font-bold hover:bg-indigo-100"
          >
            <BarChart2 size={20} /> Analytics
          </button>
          <button 
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold hover:bg-black shadow-lg"
          >
            <Download size={20} /> Export PDF
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-auto px-10 pb-10 no-print">
        <div className="border border-slate-200 rounded-[32px] overflow-hidden bg-white shadow-sm">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-slate-50 sticky top-0 z-20">
              <tr>
                <th className="w-64 p-5 text-left font-black border-b border-r border-slate-200 uppercase tracking-widest text-slate-400 text-[10px]">Student Name</th>
                {FIELDS.map(f => {
                  const acts = activeClass.activities.filter(a => a.field === f);
                  return (
                    <th key={f} colSpan={Math.max(1, acts.length)} className="p-4 border-b border-r border-slate-200 bg-white group transition-all hover:bg-slate-50">
                      <div className="flex items-center justify-center gap-2">
                        <span className="font-black text-slate-700">{f}</span>
                        <button onClick={() => setModals({ type: 'activity', data: f })} className="opacity-0 group-hover:opacity-100 p-1 bg-blue-100 text-blue-600 rounded-lg">
                          <Plus size={14} />
                        </button>
                      </div>
                    </th>
                  );
                })}
                <th className="w-24 p-4 border-b border-slate-200 bg-slate-900 text-white font-black">FINAL</th>
                <th className="w-24 p-4 border-b border-slate-200 bg-slate-50"></th>
              </tr>
              <tr className="bg-slate-50/50">
                <th className="p-3 border-b border-r border-slate-200">
                  <input 
                    placeholder="+ New Student..." 
                    className="w-full bg-transparent p-2 outline-none font-bold placeholder:text-slate-300"
                    value={studentInput} onChange={e => setStudentInput(e.target.value)} onKeyDown={addStudent}
                  />
                </th>
                {FIELDS.map(f => {
                  const acts = activeClass.activities.filter(a => a.field === f);
                  if (acts.length === 0) return <th key={f} className="border-b border-r border-slate-100 bg-slate-50/30"></th>;
                  return acts.map(a => (
                    <th key={a.id} className="p-3 border-b border-r border-slate-200 relative group bg-white hover:bg-slate-50">
                      <div className="text-[10px] font-black text-slate-400 uppercase truncate px-2">{a.name}</div>
                      <div className="text-[11px] font-bold text-blue-600">{a.weight}%</div>
                      <button onClick={async () => {
                        if(confirm("Delete activity?")) {
                          update({ activities: activeClass.activities.filter(act => act.id !== a.id) });
                        }
                      }} className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all">
                        <Trash2 size={12} />
                      </button>
                    </th>
                  ))
                })}
                <th className="border-b border-slate-200 bg-slate-900"></th>
                <th className="border-b border-slate-200"></th>
              </tr>
            </thead>
            <tbody>
              {activeClass.students.map(s => {
                const final = calculateFinalMark(s.id, activeClass.activities, activeClass.grades, activeClass.attitude, activeClass.overrides);
                const isOverridden = activeClass.overrides?.[s.id]?.final !== undefined;
                return (
                  <tr key={s.id} className="group hover:bg-blue-50 transition-colors">
                    <td className="p-4 border-b border-r border-slate-100 bg-white group-hover:bg-blue-50/50 font-bold text-slate-700 flex justify-between items-center">
                      {s.name}
                      <button onClick={() => update({ students: activeClass.students.filter(st => st.id !== s.id) })} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500">
                        <Trash2 size={14} />
                      </button>
                    </td>
                    {FIELDS.map(f => {
                      const acts = activeClass.activities.filter(a => a.field === f);
                      if (acts.length === 0) return <td key={f} className="border-b border-r border-slate-50 bg-slate-50/20"></td>;
                      return acts.map(a => (
                        <td key={a.id} className="p-2 border-b border-r border-slate-100 transition-all hover:bg-white">
                          <input 
                            type="number" className="w-full text-center bg-transparent outline-none font-bold text-slate-600 focus:text-blue-600"
                            value={activeClass.grades[`${s.id}_${a.id}`] ?? ''}
                            onChange={(e) => update({ grades: { ...activeClass.grades, [`${s.id}_${a.id}`]: e.target.value === '' ? '' : Number(e.target.value) } })}
                          />
                        </td>
                      ))
                    })}
                    <td 
                      className={`p-4 border-b border-slate-200 text-center font-black text-lg cursor-pointer ${isOverridden ? 'bg-amber-100 text-amber-700' : 'bg-slate-50 text-slate-800'}`}
                      onClick={() => setModals({ type: 'override', data: s })}
                    >
                      {final.toFixed(1)}
                      {isOverridden && <span className="text-[10px] absolute ml-1 mt-1 opacity-40">M</span>}
                    </td>
                    <td className="p-4 border-b border-slate-100">
                      <div className="flex gap-2 justify-center">
                        <button onClick={() => setModals({ type: 'attitude', data: s })} className={`p-2 rounded-xl ${Object.keys(activeClass.attitude[s.id] || {}).length > 0 ? 'bg-purple-100 text-purple-600' : 'text-slate-300 hover:text-purple-600'}`}><Activity size={16} /></button>
                        <button onClick={() => setModals({ type: 'comment', data: s })} className={`p-2 rounded-xl ${s.comments ? 'bg-blue-100 text-blue-600' : 'text-slate-300 hover:text-blue-600'}`}><MessageSquare size={16} /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals & Overlays Implementation... */}
      <AnimatePresence>
        {modals.type && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 no-print"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="bg-white rounded-[40px] shadow-2xl p-10 w-full max-w-lg border border-slate-100 relative"
            >
              <button onClick={() => setModals({ type: null, data: null })} className="absolute top-6 right-6 p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-all"><X size={24} /></button>
              
              {modals.type === 'activity' && (
                <div>
                  <h2 className="text-3xl font-black mb-2">New Activity</h2>
                  <p className="text-slate-500 mb-8 font-medium">Adding to <span className="text-blue-600 font-bold">{modals.data}</span></p>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Activity Title</label>
                      <input id="act-name" autoFocus className="w-full bg-slate-100 p-4 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-blue-500/20" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Weight (%)</label>
                      <input id="act-weight" type="number" defaultValue="20" className="w-full bg-slate-100 p-4 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-blue-500/20" />
                    </div>
                    <button onClick={async () => {
                      const name = document.getElementById('act-name').value;
                      const weight = Number(document.getElementById('act-weight').value);
                      if(!name) return;
                      await update({ activities: [...activeClass.activities, { id: generateId(), name, field: modals.data, weight }] });
                      setModals({ type: null });
                    }} className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl shadow-lg hover:shadow-blue-200 transition-all">Add Activity</button>
                  </div>
                </div>
              )}

              {modals.type === 'attitude' && (
                <div>
                   <h2 className="text-3xl font-black mb-2">Attitude</h2>
                   <p className="text-slate-500 mb-8 font-medium">Bonus points for <span className="text-blue-600 font-bold">{modals.data.name}</span></p>
                   <div className="space-y-3">
                     {FIELDS.map(f => {
                       const cur = activeClass.attitude[modals.data.id]?.[f] || 0;
                       return (
                         <div key={f} className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100">
                           <span className="font-bold text-slate-700">{f}</span>
                           <div className="flex items-center gap-4 bg-white p-2 rounded-xl shadow-sm border border-slate-100">
                             <button onClick={() => {
                               const newAtt = { ...activeClass.attitude };
                               newAtt[modals.data.id] = { ...newAtt[modals.data.id], [f]: cur - 0.5 };
                               update({ attitude: newAtt });
                             }} className="w-8 h-8 rounded-lg bg-red-50 text-red-600 font-black hover:bg-red-500 hover:text-white transition-all">-</button>
                             <span className="w-8 text-center font-black">{cur > 0 ? '+' : ''}{cur}</span>
                             <button onClick={() => {
                               const newAtt = { ...activeClass.attitude };
                               newAtt[modals.data.id] = { ...newAtt[modals.data.id], [f]: cur + 0.5 };
                               update({ attitude: newAtt });
                             }} className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 font-black hover:bg-emerald-500 hover:text-white transition-all">+</button>
                           </div>
                         </div>
                       )
                     })}
                   </div>
                </div>
              )}

              {modals.type === 'comment' && (
                <div>
                   <h2 className="text-3xl font-black mb-2">Comments</h2>
                   <p className="text-slate-500 mb-8 font-medium">For <span className="text-blue-600 font-bold">{modals.data.name}</span></p>
                   <textarea 
                    className="w-full h-48 bg-slate-50 p-5 rounded-2xl font-medium outline-none focus:ring-4 focus:ring-blue-500/20 border-none resize-none mb-6"
                    placeholder="Write performance review here..."
                    defaultValue={modals.data.comments}
                    id="comment-area"
                   />
                   <button onClick={async () => {
                     const text = document.getElementById('comment-area').value;
                     const updated = activeClass.students.map(s => s.id === modals.data.id ? { ...s, comments: text } : s);
                     await update({ students: updated });
                     setModals({ type: null });
                   }} className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl shadow-lg">Save Comments</button>
                </div>
              )}

              {modals.type === 'override' && (
                <div className="text-center">
                  <h2 className="text-3xl font-black mb-2 text-amber-600">Override</h2>
                  <p className="text-slate-500 mb-8 font-medium">Rounding final mark for <span className="text-slate-800 font-bold">{modals.data.name}</span></p>
                  <input 
                    id="override-val" type="number" step="0.1" autoFocus
                    className="w-full text-5xl font-black text-center bg-slate-50 p-8 rounded-3xl outline-none mb-6"
                    placeholder="Auto"
                    defaultValue={activeClass.overrides[modals.data.id]?.final || ''}
                  />
                  <div className="flex gap-4">
                    <button onClick={async () => {
                      const newVal = document.getElementById('override-val').value;
                      const ov = { ...activeClass.overrides };
                      if(!newVal) delete ov[modals.data.id];
                      else ov[modals.data.id] = { final: Number(newVal) };
                      await update({ overrides: ov });
                      setModals({ type: null });
                    }} className="flex-1 py-5 bg-amber-500 text-white font-black rounded-2xl shadow-lg">Apply</button>
                    <button onClick={async () => {
                       const ov = { ...activeClass.overrides };
                       delete ov[modals.data.id];
                       await update({ overrides: ov });
                       setModals({ type: null });
                    }} className="flex-1 py-5 bg-slate-100 text-slate-500 font-bold rounded-2xl">Reset</button>
                  </div>
                </div>
              )}

              {modals.type === 'charts' && (
                <div className="max-h-[80vh] overflow-y-auto pr-2">
                   <h2 className="text-3xl font-black mb-8 text-indigo-600">Weight Dashboard</h2>
                   <div className="grid grid-cols-1 gap-10">
                     {FIELDS.map(f => {
                       const acts = activeClass.activities.filter(a => a.field === f);
                       const data = acts.map(a => ({ name: a.name, value: a.weight }));
                       return (
                         <div key={f} className="bg-slate-50 p-6 rounded-3xl">
                            <h3 className="font-black text-lg mb-4 text-slate-700">{f} Breakdown</h3>
                            {data.length > 0 ? (
                              <div className="h-48">
                                <ResponsiveContainer width="100%" height="100%">
                                  <PieChart>
                                    <Pie data={data} dataKey="value" cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={5}>
                                      {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip />
                                  </PieChart>
                                </ResponsiveContainer>
                              </div>
                            ) : <p className="text-slate-400 italic text-center p-10">No data</p>}
                         </div>
                       )
                     })}
                   </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Print View Implementation... */}
      <div id="print-section" className="hidden print:block p-10 bg-white">
        <div className="text-center border-b-4 border-slate-900 pb-4 mb-10">
          <h1 className="text-5xl font-black uppercase text-slate-900 tracking-tight">{activeClass.name}</h1>
          <p className="text-xl font-bold text-slate-500 mt-2 tracking-widest">Final Grade Report</p>
        </div>
        
        <table className="w-full border-collapse mb-12">
          <thead>
            <tr className="bg-slate-100">
              <th className="border-2 border-slate-300 p-4 text-left font-black uppercase text-xs">Student Name</th>
              {FIELDS.map(f => <th key={f} className="border-2 border-slate-300 p-4 font-black uppercase text-xs">{f}</th>)}
              <th className="border-2 border-slate-900 p-4 bg-slate-900 text-white font-black text-sm">FINAL MARK</th>
            </tr>
          </thead>
          <tbody>
            {activeClass.students.map(s => (
              <tr key={s.id}>
                <td className="border-2 border-slate-300 p-4 font-black text-slate-800 uppercase text-xs">{s.name}</td>
                {FIELDS.map(f => {
                  const score = calculateFieldScore(s.id, f, activeClass.activities, activeClass.grades, activeClass.attitude);
                  return <td key={f} className="border-2 border-slate-300 p-4 text-center font-bold text-slate-700">{score > 0 ? score.toFixed(1) : '-'}</td>
                })}
                <td className="border-2 border-slate-900 p-4 text-center font-black text-lg bg-slate-50 text-slate-900">
                  {calculateFinalMark(s.id, activeClass.activities, activeClass.grades, activeClass.attitude, activeClass.overrides).toFixed(1)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="break-before-page">
          <h2 className="text-3xl font-black mb-8 text-slate-900 border-b-2 border-slate-200 pb-2">Student Comments</h2>
          <div className="space-y-10">
            {activeClass.students.map(s => (
              <div key={s.id} className="border-l-8 border-slate-900 pl-8 py-4">
                <h3 className="font-black text-2xl uppercase text-slate-900 mb-2">{s.name}</h3>
                <p className="text-slate-700 leading-relaxed text-lg font-medium whitespace-pre-wrap">
                  {s.comments || "No specific comments provided."}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #print-section, #print-section * { visibility: visible; }
          #print-section { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
        }
      `}</style>
    </div>
  );
}
