import React, { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
  AreaChart, Area
} from 'recharts';
import { ProjectPart } from '../types';
import { 
  LayoutDashboard, TrendingUp, PieChart as PieIcon, BarChart3, 
  Package, CheckCircle2, Clock, Calendar, Info, MapPin, Camera, AlertCircle
} from 'lucide-react';
import { format, isAfter, isBefore, startOfDay } from 'date-fns';
import FileUpload from './FileUpload';

interface DashboardProps {
  parts: ProjectPart[];
  onModelStatusUpdate: (project: string, status: string) => void;
  onFileUpload: (newParts: ProjectPart[], mode: 'replace' | 'update') => void;
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-4 rounded-xl shadow-xl border border-black/5 flex flex-col gap-2 max-w-[240px]">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600">
            <LayoutDashboard className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">{data.project}</span>
            <span className="text-sm font-bold text-stone-800 truncate">{data.partToolDes}</span>
          </div>
        </div>
        
        {data.picture && (
          <div className="w-full h-32 rounded-lg overflow-hidden border border-black/5 bg-stone-50">
            <img 
              src={data.picture} 
              alt={data.name} 
              className="w-full h-full object-cover" 
              referrerPolicy="no-referrer"
            />
          </div>
        )}
        
        <div className="flex items-center justify-between pt-2 border-t border-black/5">
          <span className="text-[10px] font-bold text-stone-500 uppercase">Current / Next</span>
          <div className="flex flex-col items-end gap-1">
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-full uppercase">
              {data.stageLabel}
            </span>
            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full uppercase">
              Next: {data.upcomingStage}
            </span>
          </div>
        </div>
        <div className="text-[10px] text-stone-400 font-mono">PN: {data.name}</div>
      </div>
    );
  }
  return null;
};

const Dashboard: React.FC<DashboardProps> = ({ parts, onModelStatusUpdate, onFileUpload }) => {
  const today = startOfDay(new Date());

  // Data processing for charts
  const stageData = useMemo(() => {
    return parts.reduce((acc: any[], part) => {
      const stage = part.currentStage || 'Unknown';
      const existing = acc.find(d => d.name === stage);
      if (existing) existing.value++;
      else acc.push({ name: stage, value: 1 });
      return acc;
    }, []);
  }, [parts]);

  const molderData = useMemo(() => {
    return parts.reduce((acc: any[], part) => {
      const molder = part.molder || 'Unknown';
      const existing = acc.find(d => d.name === molder);
      if (existing) existing.value++;
      else acc.push({ name: molder, value: 1 });
      return acc;
    }, []);
  }, [parts]);

  const stageProgressData = useMemo(() => {
    const stageMap: Record<string, number> = {
      'T1': 1, 'T2': 2, 'T3': 3, 'T4': 4, 'T5': 5, 'T6': 6, 'TF': 7, 'FAI': 8, 'XF': 9
    };
    
    return parts.map(part => {
      const milestones = [
        { name: 'Beta', date: part.beta ? new Date(part.beta) : null },
        { name: 'Pilot Run', date: part.pilotRun ? new Date(part.pilotRun) : null },
        { name: 'FAI', date: part.fai ? new Date(part.fai) : null },
        { name: 'XF', date: part.xf ? new Date(part.xf) : null },
      ].filter(m => m.date && m.date > today)
       .sort((a, b) => a.date!.getTime() - b.date!.getTime());

      const upcomingStage = milestones.length > 0 ? milestones[0].name : 'MP';

      return {
        name: part.partNo,
        project: part.project,
        partToolDes: part.partToolDes,
        picture: part.picture,
        stage: stageMap[part.currentStage] || 0,
        stageLabel: part.currentStage,
        upcomingStage: upcomingStage
      };
    }).sort((a, b) => b.stage - a.stage);
  }, [parts, today]);

  // Project Pipeline Logic
  const projectPipelines = useMemo(() => {
    const projects: Record<string, ProjectPart[]> = {};
    parts.forEach(p => {
      if (!projects[p.project]) projects[p.project] = [];
      projects[p.project].push(p);
    });

    return Object.entries(projects).map(([name, projectParts]) => {
      const getAvgDate = (field: keyof ProjectPart) => {
        const dates = projectParts
          .map(p => p[field] ? new Date(p[field] as string).getTime() : null)
          .filter((t): t is number => t !== null && !isNaN(t));
        if (dates.length === 0) return null;
        return new Date(dates.reduce((a, b) => a + b, 0) / dates.length);
      };

      const stages = [
        { id: '3D', label: '3D', date: getAvgDate('threeDDate') || getAvgDate('toolingStartDate') },
        { id: 'DFM', label: 'Tool DFM', date: getAvgDate('dfmDate') },
        { id: 'T1', label: 'T1', date: getAvgDate('t1Date') },
        { id: 'Beta', label: 'Beta', date: getAvgDate('beta') },
        { id: 'Pilot', label: 'Pilot', date: getAvgDate('pilotRun') },
        { id: 'MP', label: 'MP', date: getAvgDate('fai') },
        { id: 'XF', label: 'XF', date: getAvgDate('xf') },
      ].filter(s => s.date);

      let currentPos = 0;
      if (stages.length > 0) {
        for (let i = 0; i < stages.length; i++) {
          if (today >= stages[i].date!) {
            currentPos = i;
          }
        }
        if (currentPos < stages.length - 1) {
          const start = stages[currentPos].date!.getTime();
          const end = stages[currentPos + 1].date!.getTime();
          const now = today.getTime();
          const progress = (now - start) / (end - start);
          currentPos += Math.max(0, Math.min(0.95, progress));
        }
      }

      return {
        name,
        stages,
        currentPos,
        status: projectParts[0].modelStatus || '',
        count: projectParts.length
      };
    });
  }, [parts, today]);

  return (
    <div className="flex flex-col gap-8 p-6 bg-stone-50 min-h-full">
      {/* Row 1: Upload Project Data */}
      <section className="bg-white p-6 rounded-2xl shadow-sm border border-black/5">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
            <Package className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-bold text-stone-800">1. Upload Project Data</h2>
        </div>
        <FileUpload onTasksExtracted={onFileUpload} />
      </section>

      {/* Row 2: Project Timeline Pipeline */}
      <section className="bg-white p-6 rounded-2xl shadow-sm border border-black/5">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
            <TrendingUp className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-bold text-stone-800">2. Project Execution Pipeline</h2>
        </div>
        
        <div className="space-y-12">
          {projectPipelines.map((project) => (
            <div key={project.name} className="relative">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <span className="px-3 py-1 bg-stone-100 text-stone-600 text-xs font-bold rounded-full uppercase tracking-wider">
                    {project.name}
                  </span>
                  <span className="text-xs text-stone-400">{project.count} Parts</span>
                </div>
                <div className="flex-1 mx-8">
                  <textarea 
                    placeholder="Update model status..."
                    defaultValue={project.status}
                    onBlur={(e) => onModelStatusUpdate(project.name, e.target.value)}
                    rows={1}
                    className="w-full bg-stone-50 border border-black/5 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all resize-y min-h-[32px]"
                  />
                </div>
              </div>

              {/* The Pipe */}
              <div className="relative h-12 flex items-center px-4">
                {/* Background Pipe */}
                <div className="absolute left-4 right-4 h-3 my-auto bg-stone-100 rounded-full" />
                
                {/* Progress Pipe */}
                <div 
                  className="absolute left-4 h-3 my-auto bg-emerald-500/20 rounded-full transition-all duration-1000"
                  style={{ 
                    width: `calc(${(project.currentPos / (project.stages.length - 1)) * 100}% - 32px)`,
                    minWidth: '12px'
                  }}
                />

                {/* Stage Markers */}
                <div className="absolute left-4 right-4 flex justify-between items-center">
                  {project.stages.map((stage, idx) => (
                    <div key={stage.id} className="flex flex-col items-center relative">
                      <div 
                        className={`w-4 h-4 rounded-full border-2 z-10 transition-all duration-500 ${
                          idx <= project.currentPos ? 'bg-emerald-500 border-white shadow-sm' : 'bg-white border-stone-200'
                        }`}
                      />
                      <div className="absolute top-6 flex flex-col items-center whitespace-nowrap">
                        <span className={`text-[10px] font-bold uppercase tracking-tighter ${
                          idx <= project.currentPos ? 'text-emerald-600' : 'text-stone-400'
                        }`}>
                          {stage.label}
                        </span>
                        <span className="text-[8px] text-stone-300 font-mono">
                          {stage.date ? format(stage.date, 'MM/dd') : '--'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Red Point (Today) */}
                <div 
                  className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-lg z-20 transition-all duration-1000 animate-pulse"
                  style={{ 
                    left: `calc(1rem + ${(project.currentPos / (project.stages.length - 1)) * 100}% - 0.5rem)`,
                  }}
                />
              </div>
            </div>
          ))}
          
          {projectPipelines.length === 0 && (
            <div className="text-center py-10 text-stone-400 italic text-sm">
              No project data available to draw pipeline.
            </div>
          )}
        </div>
      </section>

      {/* Row 3: Charts */}
      <section className="bg-white p-6 rounded-2xl shadow-sm border border-black/5">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
            <BarChart3 className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-bold text-stone-800">3. Analytics & Distribution</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Stage Distribution */}
          <div className="bg-stone-50/50 p-6 rounded-xl border border-black/[0.03]">
            <h3 className="text-sm font-bold text-stone-600 uppercase tracking-widest mb-6">Stage Distribution</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stageData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {stageData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Molder Distribution */}
          <div className="bg-stone-50/50 p-6 rounded-xl border border-black/[0.03]">
            <h3 className="text-sm font-bold text-stone-600 uppercase tracking-widest mb-6">Molder Distribution</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={molderData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                  <Tooltip 
                    cursor={{ fill: '#f3f4f6' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Stage Progress Trend */}
          <div className="bg-stone-50/50 p-6 rounded-xl border border-black/[0.03]">
            <h3 className="text-sm font-bold text-stone-600 uppercase tracking-widest mb-6">Stage Progress Trend</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stageProgressData}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#888' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} />
                  <Tooltip 
                    content={<CustomTooltip />}
                  />
                  <Area type="monotone" dataKey="stage" stroke="#f59e0b" fillOpacity={1} fill="url(#colorValue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
