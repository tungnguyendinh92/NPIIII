import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  LayoutDashboard, 
  Calendar, 
  Table as TableIcon, 
  Settings, 
  Bell, 
  Search,
  Menu,
  X,
  Sparkles,
  ChevronRight,
  ArrowUpDown,
  AlertCircle,
  MessageSquare,
  PanelRightClose,
  PanelRightOpen,
  Download,
  Edit2,
  Save,
  FileSpreadsheet,
  FileText as FileIcon,
  Image as ImageIcon,
  Presentation,
  LogOut,
  LogIn
} from 'lucide-react';
import { ProjectPart } from './types';
import Dashboard from './components/Dashboard';
import TimelineChart from './components/TimelineChart';
import ChatSidebar from './components/ChatSidebar';
import FileUpload from './components/FileUpload';
import IssueList from './components/IssueList';
import { motion, AnimatePresence } from 'motion/react';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import { toPng } from 'html-to-image';
import { auth, db, signInWithGoogle, logout, onAuthStateChanged, User, handleFirestoreError, OperationType } from './firebase';
import { collection, query, where, onSnapshot, setDoc, doc, deleteDoc } from 'firebase/firestore';

const MOCK_DATA: ProjectPart[] = [
  {
    id: '1',
    project: 'NS300',
    partToolDes: 'Des.TOOL,PLP,BASE,NS300,RCV,TXT',
    partNo: '282-11071-01',
    toolNo: '481-13093-01',
    molder: 'TOYO-DG',
    faLocation: 'TOYO-DG',
    toolingStartDate: '2025-07-05',
    t1Date: '2025-08-10',
    tfDate: '2026-02-10',
    currentStage: 'T2',
    tfTx: '',
    currentStageFinishDate: '2026-02-10',
    nextStage: '',
    latestStatusUpdate: 'ABS trial on 2/10/2026',
    threeDIssue: 'Minor gap on top',
    picture: 'https://picsum.photos/seed/tool1/400/300',
    toolDFM: 'Approved 1/30',
    t1: '2025-08-10',
    t2: '2025-09-15',
    t3: '2025-10-20',
    t4: '2025-11-25',
    t5: '2026-01-10',
    t6: '2026-02-10',
    odm: 'PEGATRON-BATAM',
    pde: 'Bong Gun Lee',
    pe: '',
    pte: 'Hoang Van Tam',
    beta: '2025-08-28',
    pilotRun: '2025-10-15',
    fai: '2026-01-20',
    xf: '2026-03-15'
  },
  {
    id: '2',
    project: 'RBE300Y',
    partToolDes: 'Des.TOOL,PLP,BASE,NS300,BTN,TXT',
    partNo: '282-11073-01',
    toolNo: '481-13092-01',
    molder: 'TOYO-DG',
    faLocation: 'TOYO-DG',
    toolingStartDate: '2025-07-03',
    t1Date: '2025-08-05',
    tfDate: '2025-07-03',
    currentStage: 'T1',
    tfTx: '',
    currentStageFinishDate: '2025-07-03',
    nextStage: '',
    latestStatusUpdate: 'T1 consider to be TF candidate',
    picture: 'https://picsum.photos/seed/tool2/400/300',
    odm: 'PEGATRON-BATAM',
    pde: 'Bong Gun Lee',
    pe: '',
    pte: 'Hoang Van Tam',
    beta: '2025-08-28',
    pilotRun: '2025-11-01',
    fai: '2026-02-01',
    xf: '2026-04-01'
  },
  {
    id: '3',
    project: 'NS300',
    partToolDes: 'Des.TOOL,PLP,COVER,NS300,RCV,TXT',
    partNo: '282-11075-01',
    toolNo: '481-13094-01',
    molder: 'FOXCONN',
    faLocation: 'FOXCONN',
    toolingStartDate: '2025-07-10',
    t1Date: '2025-08-15',
    tfDate: '2026-02-15',
    currentStage: 'T3',
    tfTx: '',
    currentStageFinishDate: '2026-02-15',
    nextStage: '',
    latestStatusUpdate: 'T3 trial on 2/15/2026',
    threeDIssue: 'Surface scratch',
    picture: 'https://picsum.photos/seed/tool3/400/300',
    odm: 'PEGATRON-BATAM',
    pde: 'Bong Gun Lee',
    pe: '',
    pte: 'Hoang Van Tam',
    beta: '2025-09-05',
    pilotRun: '2025-10-25',
    fai: '2026-01-25',
    xf: '2026-03-20'
  },
  {
    id: '4',
    project: 'RBE300Y',
    partToolDes: 'Des.TOOL,PLP,FRAME,NS300,RCV,TXT',
    partNo: '282-11077-01',
    toolNo: '481-13095-01',
    molder: 'FOXCONN',
    faLocation: 'FOXCONN',
    toolingStartDate: '2025-07-15',
    t1Date: '2025-08-20',
    tfDate: '2026-02-20',
    currentStage: 'T1',
    tfTx: '',
    currentStageFinishDate: '2026-02-20',
    nextStage: '',
    latestStatusUpdate: 'T1 trial on 2/20/2026',
    threeDIssue: 'Dimension out of spec',
    picture: 'https://picsum.photos/seed/tool4/400/300',
    odm: 'PEGATRON-BATAM',
    pde: 'Bong Gun Lee',
    pe: '',
    pte: 'Hoang Van Tam',
    beta: '2025-09-10',
    pilotRun: '2025-11-05',
    fai: '2026-02-05',
    xf: '2026-04-05'
  }
];

export default function App() {
  const [parts, setParts] = useState<ProjectPart[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const DEFAULT_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxrIGSF7Xizp31yFDdSk65COG-rwtDFnbwn8PiRIQa1aLKaKW5zZ9GvDOrXFE1eokWNxg/exec';
  const [scriptUrl, setScriptUrl] = useState<string>(import.meta.env.VITE_GOOGLE_SCRIPT_URL || DEFAULT_SCRIPT_URL);
  const [activeView, setActiveView] = useState<'dashboard' | 'timeline' | 'table' | 'issues'>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isChatVisible, setIsChatVisible] = useState(true);
  const [chatWidth, setChatWidth] = useState(384); // Default 96 (384px)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [editingPart, setEditingPart] = useState<ProjectPart | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const isResizing = useRef(false);
  const mainContentRef = useRef<HTMLDivElement>(null);

  // Auth listener (Firebase)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  const loadSheetsData = async () => {
    if (!scriptUrl) {
      setIsLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/proxy?url=${encodeURIComponent(scriptUrl)}`);
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data) && data.length > 0) {
          setParts(data);
        }
      }
    } catch (error) {
      console.error("Failed to load Sheets data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSheetsData();
  }, [scriptUrl]);

  // Firestore listener (as fallback or secondary)
  useEffect(() => {
    if (!isAuthReady || !user || scriptUrl) {
      if (isAuthReady && !user && !scriptUrl) {
        setParts(MOCK_DATA);
        setIsLoading(false);
      }
      return;
    }

    const q = query(collection(db, 'parts'), where('uid', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const partsData = snapshot.docs.map(doc => ({ ...doc.data() } as ProjectPart));
      if (partsData.length > 0) {
        setParts(partsData);
      } else {
        setParts(MOCK_DATA.map(p => ({ ...p, uid: user.uid })));
      }
      setIsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'parts');
    });

    return () => unsubscribe();
  }, [user, isAuthReady, scriptUrl]);

  const handlePartUpdate = async (updatedPart: ProjectPart) => {
    const newParts = parts.map(p => p.id === updatedPart.id ? updatedPart : p);
    setParts(newParts);
    setEditingPart(null);

    // Save to Sheets if connected
    if (scriptUrl) {
      saveToSheets(newParts);
    }

    // Save to Firebase if connected
    if (user) {
      try {
        const partWithUid = { ...updatedPart, uid: user.uid };
        await setDoc(doc(db, 'parts', updatedPart.id), partWithUid);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `parts/${updatedPart.id}`);
      }
    }
  };

  const saveToSheets = async (data: ProjectPart[]) => {
    if (!scriptUrl) return;
    setIsSyncing(true);
    try {
      await fetch(`/api/proxy?url=${encodeURIComponent(scriptUrl)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    } catch (error) {
      console.error("Failed to save to Sheets:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePartsUpdate = async (newParts: ProjectPart[], mode: 'replace' | 'update' = 'replace') => {
    let updatedPartsList: ProjectPart[] = [];
    if (mode === 'replace') {
      updatedPartsList = newParts;
    } else {
      const merged = [...parts];
      newParts.forEach(newPart => {
        const index = merged.findIndex(p => p.partNo === newPart.partNo && p.project === newPart.project);
        if (index !== -1) {
          merged[index] = { ...merged[index], ...newPart };
        } else {
          merged.push(newPart);
        }
      });
      updatedPartsList = merged;
    }
    
    setParts(updatedPartsList);

    if (scriptUrl) {
      saveToSheets(updatedPartsList);
    }

    if (user) {
      try {
        for (const part of newParts) {
          await setDoc(doc(db, 'parts', part.id), { ...part, uid: user.uid });
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'parts');
      }
    }
  };

  const handleModelStatusUpdate = async (project: string, status: string) => {
    if (!user) return;
    try {
      const projectParts = parts.filter(p => p.project === project);
      for (const part of projectParts) {
        await setDoc(doc(db, 'parts', part.id), { ...part, modelStatus: status, uid: user.uid });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'parts');
    }
  };

  const sortedParts = useMemo(() => {
    let filtered = [...parts];
    if (selectedProject !== 'all') {
      filtered = filtered.filter(p => p.project === selectedProject);
    }
    return filtered.sort((a, b) => {
      const projA = a.project || '';
      const projB = b.project || '';
      return sortOrder === 'asc' ? projA.localeCompare(projB) : projB.localeCompare(projA);
    });
  }, [parts, sortOrder, selectedProject]);

  const projects = useMemo(() => {
    const unique = Array.from(new Set(parts.map(p => p.project).filter(Boolean)));
    return ['all', ...unique];
  }, [parts]);

  const exportToCSV = () => {
    const headers = Object.keys(parts[0] || {}).join(',');
    const rows = parts.map(p => Object.values(p).map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([`${headers}\n${rows}`], { type: 'text/csv;charset=utf-8' });
    saveAs(blob, `project_data_${new Date().toISOString().slice(0,10)}.csv`);
    setShowExportMenu(false);
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(parts);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Parts");
    XLSX.writeFile(wb, `project_data_${new Date().toISOString().slice(0,10)}.xlsx`);
    setShowExportMenu(false);
  };

  const exportToImage = async () => {
    if (mainContentRef.current) {
      const dataUrl = await toPng(mainContentRef.current, { backgroundColor: '#f5f5f4' });
      saveAs(dataUrl, `dashboard_capture_${new Date().toISOString().slice(0,10)}.png`);
    }
    setShowExportMenu(false);
  };

  const startResizing = useCallback((e: React.MouseEvent) => {
    isResizing.current = true;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', stopResizing);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing.current) return;
    const newWidth = window.innerWidth - e.clientX;
    if (newWidth > 280 && newWidth < 600) {
      setChatWidth(newWidth);
    }
  }, []);

  const stopResizing = useCallback(() => {
    isResizing.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', stopResizing);
  }, []);

  return (
    <div className="flex h-screen bg-stone-50 overflow-hidden font-sans">
      {/* Left Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 260 : 80 }}
        className="bg-white border-r border-black/5 flex flex-col z-40"
      >
        <div className="p-6 flex items-center gap-3 border-b border-black/5">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-600/20">
            <Sparkles className="w-6 h-6" />
          </div>
          {isSidebarOpen && (
            <motion.span 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="font-bold text-stone-800 text-lg tracking-tight"
            >
              InsightPro
            </motion.span>
          )}
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <SidebarItem 
            icon={<LayoutDashboard className="w-5 h-5" />} 
            label="Dashboard" 
            active={activeView === 'dashboard'} 
            onClick={() => setActiveView('dashboard')}
            collapsed={!isSidebarOpen}
          />
          <SidebarItem 
            icon={<Calendar className="w-5 h-5" />} 
            label="Timeline" 
            active={activeView === 'timeline'} 
            onClick={() => setActiveView('timeline')}
            collapsed={!isSidebarOpen}
          />
          <SidebarItem 
            icon={<AlertCircle className="w-5 h-5" />} 
            label="Issue List" 
            active={activeView === 'issues'} 
            onClick={() => setActiveView('issues')}
            collapsed={!isSidebarOpen}
          />
          <SidebarItem 
            icon={<TableIcon className="w-5 h-5" />} 
            label="Data Table" 
            active={activeView === 'table'} 
            onClick={() => setActiveView('table')}
            collapsed={!isSidebarOpen}
          />
        </nav>

        <div className="p-4 border-t border-black/5">
          <SidebarItem 
            icon={<Settings className="w-5 h-5" />} 
            label="Settings" 
            active={false} 
            onClick={() => {}}
            collapsed={!isSidebarOpen}
          />
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-black/5 flex items-center justify-between px-6 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-stone-100 rounded-lg transition-colors text-stone-500"
            >
              {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="relative hidden sm:block">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input 
                type="text" 
                placeholder="Search projects..." 
                className="bg-stone-100 border-none rounded-full pl-10 pr-4 py-1.5 text-sm w-64 focus:ring-2 focus:ring-emerald-500/20 transition-all"
              />
            </div>
            <div className="h-6 w-px bg-stone-200 mx-2 hidden sm:block" />
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider hidden lg:block">Filter Model:</span>
              <select 
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="bg-stone-100 border-none rounded-lg px-3 py-1.5 text-xs font-bold text-stone-700 focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none"
              >
                {projects.map(p => (
                  <option key={p} value={p}>{p.toUpperCase()}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {scriptUrl ? (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-lg border border-emerald-100">
                <div className="flex flex-col items-start">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Sheets Sync Active</span>
                  <span className="text-[9px] text-emerald-600 truncate max-w-[150px]">Using Apps Script Proxy</span>
                </div>
                <div className="flex items-center gap-2 ml-2">
                  <button 
                    onClick={() => saveToSheets(parts)}
                    disabled={isSyncing}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold transition-all ${isSyncing ? 'bg-stone-200 text-stone-400' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
                    title="Backup to Google Sheets"
                  >
                    <Save className={`w-3 h-3 ${isSyncing ? 'animate-pulse' : ''}`} />
                    {isSyncing ? 'SYNCING...' : 'SAO LƯU'}
                  </button>
                  <button 
                    onClick={() => setScriptUrl('')}
                    className="p-1 hover:bg-red-100 rounded text-red-500 transition-colors"
                    title="Disable Sync"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input 
                  type="text" 
                  placeholder="Paste Script URL here..."
                  className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-[10px] w-48 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setScriptUrl((e.target as HTMLInputElement).value);
                    }
                  }}
                />
                <button 
                  className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-[10px] font-bold hover:bg-emerald-700 transition-all"
                  onClick={() => {
                    const input = document.querySelector('input[placeholder="Paste Script URL here..."]') as HTMLInputElement;
                    if (input.value) setScriptUrl(input.value);
                  }}
                >
                  <FileSpreadsheet className="w-3 h-3" />
                  SYNC
                </button>
              </div>
            )}

            {user ? (
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-end hidden sm:flex">
                  <span className="text-xs font-bold text-stone-800">{user.displayName}</span>
                  <span className="text-[10px] text-stone-400">{user.email}</span>
                </div>
                <button 
                  onClick={logout}
                  className="p-2 hover:bg-red-50 text-stone-400 hover:text-red-500 rounded-lg transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
                <div className="w-8 h-8 rounded-full bg-stone-200 border border-black/5 overflow-hidden">
                  <img src={user.photoURL || ''} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
              </div>
            ) : (
              <button 
                onClick={signInWithGoogle}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all active:scale-95"
              >
                <LogIn className="w-4 h-4" />
                LOGIN WITH GOOGLE
              </button>
            )}
            <button 
              onClick={() => setIsChatVisible(!isChatVisible)}
              className={`p-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-bold ${isChatVisible ? 'bg-emerald-50 text-emerald-600' : 'text-stone-500 hover:bg-stone-100'}`}
              title={isChatVisible ? "Hide AI Assistant" : "Show AI Assistant"}
            >
              {isChatVisible ? <PanelRightClose className="w-5 h-5" /> : <PanelRightOpen className="w-5 h-5" />}
              <span className="hidden lg:inline">{isChatVisible ? "Hide AI" : "Show AI"}</span>
            </button>
            <button className="p-2 hover:bg-stone-100 rounded-lg transition-colors text-stone-500 relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
          </div>

          {/* Export Menu */}
          <AnimatePresence>
            {showExportMenu && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute top-16 right-6 w-48 bg-white rounded-xl shadow-xl border border-black/5 p-2 z-50"
              >
                <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest p-2 mb-1 border-b border-black/5">Export As</div>
                <button onClick={exportToCSV} className="w-full flex items-center gap-3 p-2 hover:bg-stone-50 rounded-lg text-sm text-stone-700 transition-colors">
                  <FileIcon className="w-4 h-4 text-blue-600" /> CSV File
                </button>
                <button onClick={exportToExcel} className="w-full flex items-center gap-3 p-2 hover:bg-stone-50 rounded-lg text-sm text-stone-700 transition-colors">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Excel Spreadsheet
                </button>
                <button onClick={exportToImage} className="w-full flex items-center gap-3 p-2 hover:bg-stone-50 rounded-lg text-sm text-stone-700 transition-colors">
                  <ImageIcon className="w-4 h-4 text-purple-600" /> PNG Image
                </button>
                <button onClick={() => setShowExportMenu(false)} className="w-full flex items-center gap-3 p-2 hover:bg-stone-50 rounded-lg text-sm text-stone-700 transition-colors opacity-50">
                  <Presentation className="w-4 h-4 text-amber-600" /> PPT Presentation (Soon)
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </header>

        {/* View Content */}
        <div className="flex-1 overflow-y-auto" ref={mainContentRef}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {activeView === 'dashboard' && (
                <div className="h-full">
                  <Dashboard 
                    parts={sortedParts} 
                    onModelStatusUpdate={handleModelStatusUpdate} 
                    onFileUpload={handlePartsUpdate}
                  />
                </div>
              )}
              {activeView === 'timeline' && (
                <div className="p-6 h-full">
                  <TimelineChart parts={sortedParts} onPartUpdate={handlePartUpdate} onEdit={setEditingPart} />
                </div>
              )}
              {activeView === 'issues' && (
                <IssueList parts={sortedParts} onEdit={setEditingPart} />
              )}
              {activeView === 'table' && (
                <div className="p-6">
                  <div className="mb-4 flex justify-end items-center gap-4">
                    <div className="text-xs font-bold text-stone-400 uppercase tracking-widest">Controls</div>
                    <button 
                      onClick={() => setShowExportMenu(!showExportMenu)}
                      className="flex items-center gap-2 px-4 py-2 bg-white border border-black/10 rounded-xl text-xs font-bold text-stone-700 hover:bg-stone-50 transition-all shadow-sm active:scale-95"
                    >
                      <Download className="w-4 h-4 text-blue-600" />
                      EXPORT DATA
                    </button>
                    <button 
                      onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                      className="flex items-center gap-2 px-4 py-2 bg-white border border-black/10 rounded-xl text-xs font-bold text-stone-700 hover:bg-stone-50 transition-all shadow-sm active:scale-95"
                    >
                      <ArrowUpDown className="w-4 h-4 text-emerald-600" />
                      SORT BY PROJECT: {sortOrder.toUpperCase()}
                    </button>
                  </div>
                  <DataTable parts={sortedParts} onPartUpdate={handlePartUpdate} onEdit={setEditingPart} />
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingPart && (
          <EditPartModal 
            part={editingPart} 
            onClose={() => setEditingPart(null)} 
            onSave={handlePartUpdate} 
          />
        )}
      </AnimatePresence>

      {/* Right Sidebar - AI Chat */}
      {isChatVisible && (
        <div className="relative flex">
          {/* Resize handle */}
          <div 
            onMouseDown={startResizing}
            className="w-1.5 h-full cursor-col-resize bg-transparent hover:bg-emerald-500/20 transition-colors absolute left-0 z-50"
          />
          <div style={{ width: chatWidth }}>
            <ChatSidebar tasks={parts} onTasksUpdate={handlePartsUpdate} />
          </div>
        </div>
      )}
    </div>
  );
}

function SidebarItem({ icon, label, active, onClick, collapsed }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void, collapsed: boolean }) {
  return (
    <button 
      onClick={onClick}
      className={`
        w-full flex items-center gap-3 p-3 rounded-xl transition-all group
        ${active ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'text-stone-500 hover:bg-stone-100'}
        ${collapsed ? 'justify-center' : ''}
      `}
    >
      <div className={`${active ? 'text-white' : 'text-stone-400 group-hover:text-emerald-600'} transition-colors`}>
        {icon}
      </div>
      {!collapsed && (
        <span className="font-medium text-sm">{label}</span>
      )}
      {!collapsed && active && (
        <ChevronRight className="w-4 h-4 ml-auto opacity-60" />
      )}
    </button>
  );
}

function DataTable({ parts, onPartUpdate, onEdit }: { parts: ProjectPart[], onPartUpdate: (part: ProjectPart) => void, onEdit: (part: ProjectPart) => void }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-black/5 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-stone-50 border-b border-black/5">
              <th className="p-4 text-xs font-semibold text-stone-500 uppercase tracking-wider">Project</th>
              <th className="p-4 text-xs font-semibold text-stone-500 uppercase tracking-wider">Part/Tool Des.</th>
              <th className="p-4 text-xs font-semibold text-stone-500 uppercase tracking-wider">Part No.</th>
              <th className="p-4 text-xs font-semibold text-stone-500 uppercase tracking-wider">Tool No.</th>
              <th className="p-4 text-xs font-semibold text-stone-500 uppercase tracking-wider">Current Stage</th>
              <th className="p-4 text-xs font-semibold text-stone-500 uppercase tracking-wider">3D Issue</th>
              <th className="p-4 text-xs font-semibold text-stone-500 uppercase tracking-wider">Tool DFM</th>
              <th className="p-4 text-xs font-semibold text-stone-500 uppercase tracking-wider">T1-T6</th>
              <th className="p-4 text-xs font-semibold text-stone-500 uppercase tracking-wider">Deadlines</th>
              <th className="p-4 text-xs font-semibold text-stone-500 uppercase tracking-wider">Status</th>
              <th className="p-4 text-xs font-semibold text-stone-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {parts.map((part) => (
              <tr key={part.id} className="border-b border-black/5 hover:bg-stone-50 transition-colors group">
                <td className="p-4 text-sm font-medium text-stone-800">{part.project}</td>
                <td className="p-4 text-sm text-stone-600 max-w-[200px] truncate" title={part.partToolDes}>{part.partToolDes}</td>
                <td className="p-4 text-sm font-mono text-stone-500">{part.partNo}</td>
                <td className="p-4 text-sm font-mono text-stone-500">{part.toolNo}</td>
                <td className="p-4">
                  <div className="flex flex-col gap-1">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase w-fit ${
                      part.currentStage === 'TF' ? 'bg-emerald-100 text-emerald-700' : 
                      part.currentStage === 'T1' ? 'bg-blue-100 text-blue-700' : 'bg-stone-100 text-stone-600'
                    }`}>
                      {part.currentStage}
                    </span>
                    <span className="text-[10px] text-stone-400">{part.currentStageFinishDate}</span>
                  </div>
                </td>
                <td className="p-4 text-sm text-stone-600">{part.threeDIssue}</td>
                <td className="p-4 text-sm text-stone-600">{part.toolDFM}</td>
                <td className="p-4 text-sm text-stone-600">
                  <div className="flex flex-wrap gap-1 max-w-[150px]">
                    {['t1', 't2', 't3', 't4', 't5', 't6'].map(key => (
                      part[key as keyof ProjectPart] && (
                        <span key={key} className="text-[9px] bg-stone-100 px-1 rounded border border-black/5">
                          {key.toUpperCase()}: {part[key as keyof ProjectPart]}
                        </span>
                      )
                    ))}
                  </div>
                </td>
                <td className="p-4 text-sm text-stone-600">
                  <div className="flex flex-col gap-1">
                    {part.beta && <div className="text-[9px] flex justify-between gap-2"><span>BETA:</span> <span className="font-bold text-red-600">{part.beta}</span></div>}
                    {part.pilotRun && <div className="text-[9px] flex justify-between gap-2"><span>PILOT:</span> <span className="font-bold text-red-600">{part.pilotRun}</span></div>}
                    {part.fai && <div className="text-[9px] flex justify-between gap-2"><span>FAI:</span> <span className="font-bold text-red-600">{part.fai}</span></div>}
                    {part.xf && <div className="text-[9px] flex justify-between gap-2"><span>XF:</span> <span className="font-bold text-red-600">{part.xf}</span></div>}
                  </div>
                </td>
                <td className="p-4 text-sm text-stone-500 italic max-w-[200px] truncate">{part.latestStatusUpdate}</td>
                <td className="p-4">
                  <button 
                    onClick={() => onEdit(part)}
                    className="p-2 hover:bg-emerald-50 text-stone-400 hover:text-emerald-600 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EditPartModal({ part, onClose, onSave }: { part: ProjectPart, onClose: () => void, onSave: (part: ProjectPart) => void }) {
  const [formData, setFormData] = useState<ProjectPart>(part);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        <div className="p-6 border-b border-black/5 flex items-center justify-between bg-stone-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
              <Edit2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-stone-800">Edit Part Details</h2>
              <p className="text-xs text-stone-500">Update information for {part.partNo}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-stone-200 rounded-full transition-colors">
            <X className="w-5 h-5 text-stone-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Project Model</label>
              <input name="project" value={formData.project} onChange={handleChange} className="w-full bg-stone-100 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 transition-all" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Part Number</label>
              <input name="partNo" value={formData.partNo} onChange={handleChange} className="w-full bg-stone-100 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 transition-all" />
            </div>
            <div className="col-span-full space-y-1">
              <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Part Description</label>
              <textarea name="partToolDes" value={formData.partToolDes} onChange={handleChange} rows={2} className="w-full bg-stone-100 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 transition-all resize-none" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Current Stage</label>
              <select name="currentStage" value={formData.currentStage} onChange={handleChange} className="w-full bg-stone-100 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 transition-all">
                {['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'TF', 'FAI', 'XF', 'MP'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Molder</label>
              <input name="molder" value={formData.molder} onChange={handleChange} className="w-full bg-stone-100 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 transition-all" />
            </div>
            <div className="col-span-full space-y-1">
              <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Picture URL</label>
              <input name="picture" value={formData.picture || ''} onChange={handleChange} placeholder="https://example.com/image.jpg" className="w-full bg-stone-100 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 transition-all" />
            </div>
          </div>

          <div className="border-t border-black/5 pt-6">
            <h3 className="text-xs font-bold text-stone-800 uppercase tracking-widest mb-4">Key Deadlines</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {['beta', 'pilotRun', 'fai', 'xf'].map(key => (
                <div key={key} className="space-y-1">
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">{key}</label>
                  <input type="date" name={key} value={formData[key as keyof ProjectPart] as string || ''} onChange={handleChange} className="w-full bg-stone-100 border-none rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-emerald-500/20 transition-all" />
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-black/5 pt-6">
            <h3 className="text-xs font-bold text-stone-800 uppercase tracking-widest mb-4">Issues & Status</h3>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">3D Technical Issue</label>
                <textarea name="threeDIssue" value={formData.threeDIssue} onChange={handleChange} rows={2} className="w-full bg-stone-100 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 transition-all resize-none" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Latest Status Update</label>
                <textarea name="latestStatusUpdate" value={formData.latestStatusUpdate} onChange={handleChange} rows={2} className="w-full bg-stone-100 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 transition-all resize-none" />
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-black/5 bg-stone-50 flex justify-end gap-3">
          <button onClick={onClose} className="px-6 py-2.5 text-sm font-bold text-stone-500 hover:text-stone-700 transition-colors">CANCEL</button>
          <button onClick={() => onSave(formData)} className="flex items-center gap-2 px-8 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all active:scale-95">
            <Save className="w-4 h-4" />
            SAVE CHANGES
          </button>
        </div>
      </motion.div>
    </div>
  );
}
