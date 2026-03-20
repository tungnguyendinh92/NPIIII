import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { format, addDays, differenceInDays, isSameDay, eachDayOfInterval, startOfMonth, addMonths, subMonths } from 'date-fns';
import { ProjectPart } from '../types';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Calendar, ArrowUpDown, MousePointer2 } from 'lucide-react';

interface TimelineChartProps {
  parts: ProjectPart[];
  onPartUpdate: (updatedPart: ProjectPart) => void;
  onEdit: (part: ProjectPart) => void;
}

const TimelineChart: React.FC<TimelineChartProps> = ({ parts, onPartUpdate, onEdit }) => {
  const today = new Date();

  const safeParseDate = (dateStr: string | undefined | null): Date | null => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  };

  const initialDate = useMemo(() => {
    // Default to 6 months before today to show history
    const sixMonthsAgo = subMonths(today, 6);
    
    const allDates: number[] = [];
    parts.forEach(p => {
      [
        p.toolingStartDate, p.t1Date, p.tfDate, p.currentStageFinishDate,
        p.beta, p.pilotRun, p.fai, p.xf, p.threeDDate, p.dfmDate
      ].forEach(dStr => {
        const d = safeParseDate(dStr);
        if (d) allDates.push(d.getTime());
      });
    });

    if (allDates.length === 0) return startOfMonth(sixMonthsAgo);
    
    const minDate = new Date(Math.min(...allDates, sixMonthsAgo.getTime()));
    return startOfMonth(minDate);
  }, [parts]);

  const [viewDate, setViewDate] = useState(initialDate);
  
  // Show 8 years of data (approx 2920 days)
  const [daysToShow, setDaysToShow] = useState(2920); 
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [draggingPoint, setDraggingPoint] = useState<{ partId: string, field: keyof ProjectPart, startX: number, initialDate: string } | null>(null);

  const sortedParts = useMemo(() => {
    return [...parts].sort((a, b) => {
      const projA = a.project || '';
      const projB = b.project || '';
      return sortOrder === 'asc' ? projA.localeCompare(projB) : projB.localeCompare(projA);
    });
  }, [parts, sortOrder]);

  const days = eachDayOfInterval({
    start: viewDate,
    end: addDays(viewDate, daysToShow),
  });

  // Calculate dayWidth so roughly 30 days fit in the viewport
  const dayWidth = 40; 

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only drag if clicking on the timeline area, not the sticky column
    const target = e.target as HTMLElement;
    if (target.closest('.sticky')) return;

    setIsDragging(true);
    setStartX(e.pageX - (containerRef.current?.offsetLeft || 0));
    setScrollLeft(containerRef.current?.scrollLeft || 0);
  };

  const handleMouseLeave = () => setIsDragging(false);
  const handleMouseUp = () => {
    setIsDragging(false);
    setDraggingPoint(null);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggingPoint) {
      const x = e.pageX - (containerRef.current?.offsetLeft || 0);
      const diffX = x - draggingPoint.startX;
      const daysDiff = Math.round(diffX / dayWidth);
      
      if (daysDiff !== 0) {
        const initialDate = new Date(draggingPoint.initialDate);
        const newDate = addDays(initialDate, daysDiff);
        const part = parts.find(p => p.id === draggingPoint.partId);
        if (part) {
          onPartUpdate({ ...part, [draggingPoint.field]: format(newDate, 'yyyy-MM-dd') });
          setDraggingPoint(prev => prev ? { ...prev, startX: x, initialDate: format(newDate, 'yyyy-MM-dd') } : null);
        }
      }
      return;
    }

    if (!isDragging || !containerRef.current) return;
    e.preventDefault();
    const x = e.pageX - (containerRef.current.offsetLeft || 0);
    const walk = (x - startX) * 1.5; // Scroll speed
    containerRef.current.scrollLeft = scrollLeft - walk;
  };

  const handlePointMouseDown = (e: React.MouseEvent, partId: string, field: keyof ProjectPart, initialDate: string) => {
    e.stopPropagation();
    setDraggingPoint({
      partId,
      field,
      startX: e.pageX - (containerRef.current?.offsetLeft || 0),
      initialDate
    });
  };

  const jumpToMonth = (months: number) => {
    if (containerRef.current) {
      const pixelsToMove = months * 30 * dayWidth;
      containerRef.current.scrollLeft += pixelsToMove;
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-black/5 overflow-hidden">
      <div className="p-4 border-b border-black/5 flex items-center justify-between bg-stone-50">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-600" />
            <h2 className="font-semibold text-stone-800">Project Timeline</h2>
          </div>
          <div className="h-4 w-px bg-stone-300 mx-2" />
          <button 
            onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
            className="flex items-center gap-2 px-3 py-1.5 bg-white border border-black/10 rounded-lg text-xs font-bold text-stone-700 hover:bg-stone-100 transition-all shadow-sm active:scale-95"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-emerald-600" />
            SORT BY PROJECT: {sortOrder.toUpperCase()}
          </button>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 text-[10px] text-stone-400 font-bold uppercase tracking-wider">
            <MousePointer2 className="w-3 h-3" />
            Drag to scroll
          </div>
          <div className="flex items-center bg-white border border-black/10 rounded-lg p-1 shadow-sm">
            <button 
              onClick={() => jumpToMonth(-1)}
              className="p-1.5 hover:bg-stone-100 rounded-md transition-colors text-stone-600"
              title="Previous Month"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-xs font-bold text-stone-700 min-w-[100px] text-center px-2 uppercase tracking-tight">
              Navigate
            </span>
            <button 
              onClick={() => jumpToMonth(1)}
              className="p-1.5 hover:bg-stone-100 rounded-md transition-colors text-stone-600"
              title="Next Month"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div 
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        className={`flex-1 overflow-x-auto overflow-y-auto select-none scroll-smooth ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      >
        <div className="relative min-w-max">
          {/* Header Row */}
          <div className="flex sticky top-0 z-30 bg-stone-50 border-b border-black/5">
            {/* Frozen Column Header */}
            <div className="w-64 flex-shrink-0 p-4 font-bold text-[10px] text-stone-500 uppercase tracking-widest bg-stone-50 border-r border-black/5 sticky left-0 z-40">
              Part Information
            </div>
            {/* Days Header */}
            <div className="flex">
              {days.map((day, i) => {
                const isFirstOfMonth = day.getDate() === 1;
                const monthLabel = format(day, 'MMM yyyy');
                return (
                  <div 
                    key={i} 
                    style={{ width: dayWidth }}
                    className={`flex-shrink-0 h-14 flex flex-col items-center justify-center border-r border-black/[0.03] relative ${isFirstOfMonth ? 'bg-emerald-50/30 border-l border-emerald-200' : ''}`}
                  >
                    {isFirstOfMonth && (
                      <div className="absolute top-1 left-0 px-2 pointer-events-none">
                        <span className="text-[9px] font-black text-emerald-700 whitespace-nowrap bg-emerald-100 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                          {monthLabel}
                        </span>
                      </div>
                    )}
                    <div className={`text-[10px] font-bold mt-4 ${isFirstOfMonth ? 'text-emerald-600' : 'text-stone-400'}`}>
                      {format(day, 'd')}
                    </div>
                    <div className="text-[8px] text-stone-300 uppercase font-medium">
                      {format(day, 'EE').charAt(0)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Data Rows */}
          <div className="flex flex-col">
            {sortedParts.map((part) => {
              const start = safeParseDate(part.toolingStartDate);
              const tf = safeParseDate(part.tfDate);
              const t1 = safeParseDate(part.t1Date);
              const currentStageDate = safeParseDate(part.currentStageFinishDate);

              const startOffset = start ? differenceInDays(start, viewDate) * dayWidth : null;
              const tfOffset = tf ? differenceInDays(tf, viewDate) * dayWidth : null;
              const t1Offset = t1 ? differenceInDays(t1, viewDate) * dayWidth : null;
              const currentStageOffset = currentStageDate ? differenceInDays(currentStageDate, viewDate) * dayWidth : null;

              const checkpoints = [
                { date: safeParseDate(part.beta), label: 'Beta', color: 'bg-red-500', field: 'beta' as keyof ProjectPart },
                { date: safeParseDate(part.pilotRun), label: 'Pilot', color: 'bg-red-500', field: 'pilotRun' as keyof ProjectPart },
                { date: safeParseDate(part.fai), label: 'FAI', color: 'bg-red-500', field: 'fai' as keyof ProjectPart },
                { date: safeParseDate(part.xf), label: 'XF', color: 'bg-red-500', field: 'xf' as keyof ProjectPart },
              ].filter((cp): cp is { date: Date, label: string, color: string, field: keyof ProjectPart } => cp.date !== null);

              return (
                <div key={part.id} className="flex border-b border-black/[0.03] hover:bg-stone-50/50 transition-colors group">
                  {/* Frozen Column Data */}
                  <div 
                    onClick={() => onEdit(part)}
                    className="w-64 flex-shrink-0 p-4 bg-white border-r border-black/5 sticky left-0 z-20 group-hover:bg-stone-50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-[9px] font-bold rounded uppercase tracking-tighter">
                        {part.project}
                      </span>
                      <span className="text-[9px] font-mono text-stone-400">#{part.partNo}</span>
                    </div>
                    <div className="text-xs font-bold text-stone-800 truncate" title={part.partToolDes}>
                      {part.partToolDes}
                    </div>
                    <div className="text-[10px] text-stone-400 mt-1 flex items-center gap-1">
                      <span className="font-bold text-stone-500 uppercase text-[8px]">Molder:</span> 
                      {part.molder}
                    </div>
                  </div>

                  {/* Timeline Area */}
                  <div className="flex relative h-24 flex-1 min-w-max">
                    {/* Grid Lines */}
                    {days.map((day, i) => (
                      <div 
                        key={i} 
                        style={{ width: dayWidth }} 
                        className={`flex-shrink-0 h-full border-r border-black/[0.02] ${day.getDate() === 1 ? 'bg-emerald-50/10' : ''}`} 
                      />
                    ))}

                    {/* Tooling Bar */}
                    {start && tf && (
                      <motion.div 
                        layoutId={`bar-${part.id}`}
                        onClick={(e) => { e.stopPropagation(); onEdit(part); }}
                        className="absolute top-6 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center px-3 z-10 cursor-pointer hover:bg-emerald-500/20 transition-colors"
                        style={{ 
                          left: Math.max(0, startOffset!), 
                          width: Math.max(40, tfOffset! - startOffset!) 
                        }}
                      >
                        <div className="text-[9px] font-black text-emerald-700 uppercase tracking-tighter truncate">
                          Tooling Phase
                        </div>
                      </motion.div>
                    )}

                    {/* Blue Highlights for Tooling Start and T1 */}
                    {startOffset !== null && (
                      <div 
                        className="absolute top-6 flex flex-col items-center z-20 cursor-ew-resize group/point" 
                        style={{ left: startOffset }}
                        onMouseDown={(e) => handlePointMouseDown(e, part.id, 'toolingStartDate', part.toolingStartDate || format(new Date(), 'yyyy-MM-dd'))}
                      >
                        <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-sm group-hover/point:scale-125 transition-transform" />
                        <div className="text-[8px] font-bold text-blue-600 mt-1 bg-white/80 px-1 rounded uppercase">Start</div>
                      </div>
                    )}
                    {t1Offset !== null && (
                      <div 
                        className="absolute top-6 flex flex-col items-center z-20 cursor-ew-resize group/point" 
                        style={{ left: t1Offset }}
                        onMouseDown={(e) => handlePointMouseDown(e, part.id, 't1Date', part.t1Date || format(new Date(), 'yyyy-MM-dd'))}
                      >
                        <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-sm group-hover/point:scale-125 transition-transform" />
                        <div className="text-[8px] font-bold text-blue-600 mt-1 bg-white/80 px-1 rounded uppercase">T1</div>
                      </div>
                    )}

                    {/* Current Stage Marker */}
                    {currentStageOffset !== null && (
                      <div 
                        className="absolute top-14 flex flex-col items-center z-20 cursor-ew-resize group/point" 
                        style={{ left: currentStageOffset }}
                        onMouseDown={(e) => handlePointMouseDown(e, part.id, 'currentStageFinishDate', part.currentStageFinishDate || format(new Date(), 'yyyy-MM-dd'))}
                      >
                        <div className="w-3 h-3 bg-indigo-600 rounded-full border border-white shadow-sm group-hover/point:scale-125 transition-transform" />
                        <div className="text-[8px] font-black text-indigo-700 mt-1 bg-white/80 px-1 rounded uppercase tracking-tighter">
                          {part.currentStage}
                        </div>
                      </div>
                    )}

                    {/* Checkpoints */}
                    {checkpoints.map((cp, i) => {
                      const cpOffset = differenceInDays(cp.date, viewDate) * dayWidth;
                      return (
                        <div 
                          key={i} 
                          className="absolute top-4 flex flex-col items-center z-30 cursor-ew-resize group/point" 
                          style={{ left: cpOffset }}
                          onMouseDown={(e) => handlePointMouseDown(e, part.id, cp.field, format(cp.date, 'yyyy-MM-dd'))}
                        >
                          <div className={`w-4 h-4 ${cp.color} rotate-45 border-2 border-white shadow-md group-hover/point:scale-125 transition-transform`} />
                          <div className="text-[9px] font-black mt-1 px-1.5 py-0.5 rounded text-white bg-red-600 shadow-sm uppercase tracking-tighter whitespace-nowrap">
                            {cp.label}
                          </div>
                          <div className="text-[8px] font-bold text-red-700 bg-white/90 px-1 rounded mt-0.5 border border-red-100">
                            {format(cp.date, 'MM/dd')}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimelineChart;
