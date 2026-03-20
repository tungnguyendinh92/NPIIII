import React, { useMemo } from 'react';
import { ProjectPart } from '../types';
import { AlertCircle, MessageSquare, Calendar, Tag, Settings } from 'lucide-react';

interface IssueListProps {
  parts: ProjectPart[];
  onEdit: (part: ProjectPart) => void;
}

const IssueList: React.FC<IssueListProps> = ({ parts, onEdit }) => {
  const issues = useMemo(() => {
    return parts.map(part => {
      // Find the latest "T" stage date and its corresponding issue/status
      const tStages = [
        { name: 'T1', date: part.t1 },
        { name: 'T2', date: part.t2 },
        { name: 'T3', date: part.t3 },
        { name: 'T4', date: part.t4 },
        { name: 'T5', date: part.t5 },
        { name: 'T6', date: part.t6 },
      ].filter(t => t.date);

      const latestT = tStages.length > 0 ? tStages[tStages.length - 1] : null;

      return {
        ...part,
        latestT,
      };
    }).filter(p => p.threeDIssue || p.latestStatusUpdate);
  }, [parts]);

  return (
    <div className="p-6 bg-stone-50 min-h-full">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg text-red-600">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-stone-800">Issue Tracking List</h2>
              <p className="text-stone-500 text-sm">Latest technical issues and status updates from the most recent stages.</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {issues.map((issue) => (
            <div key={issue.id} className="bg-white rounded-xl shadow-sm border border-black/5 overflow-hidden hover:shadow-md transition-shadow relative group">
              <button 
                onClick={() => onEdit(issue)}
                className="absolute top-4 right-4 p-2 bg-white border border-black/10 rounded-lg text-stone-400 hover:text-emerald-600 hover:border-emerald-200 transition-all opacity-0 group-hover:opacity-100 shadow-sm"
                title="Edit Issue"
              >
                <Settings className="w-4 h-4" />
              </button>
              <div className="flex flex-col md:flex-row">
                {/* Left: Part Info */}
                <div className="p-5 md:w-1/3 border-b md:border-b-0 md:border-r border-black/5 bg-stone-50/50">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full uppercase">
                      {issue.project}
                    </span>
                    <span className="text-[10px] font-mono text-stone-400">#{issue.partNo}</span>
                  </div>
                  <h3 className="font-bold text-stone-800 mb-1">{issue.partToolDes}</h3>
                  <div className="flex items-center gap-2 text-xs text-stone-500">
                    <Tag className="w-3 h-3" />
                    <span>Molder: {issue.molder}</span>
                  </div>
                  {issue.latestT && (
                    <div className="mt-4 flex items-center gap-2 p-2 bg-blue-50 rounded-lg border border-blue-100">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      <div>
                        <div className="text-[10px] font-bold text-blue-700 uppercase">Latest Stage: {issue.latestT.name}</div>
                        <div className="text-[10px] text-blue-600">{issue.latestT.date}</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right: Issues & Status */}
                <div className="p-5 flex-1 space-y-4">
                  {issue.threeDIssue && (
                    <div>
                      <div className="flex items-center gap-2 text-xs font-bold text-red-600 uppercase mb-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        3D Technical Issue
                      </div>
                      <p className="text-sm text-stone-700 bg-red-50/30 p-3 rounded-lg border border-red-100/50">
                        {issue.threeDIssue}
                      </p>
                    </div>
                  )}
                  
                  {issue.latestStatusUpdate && (
                    <div>
                      <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase mb-1">
                        <MessageSquare className="w-3.5 h-3.5" />
                        Latest Status Update
                      </div>
                      <p className="text-sm text-stone-600 italic bg-blue-50/30 p-3 rounded-lg border border-blue-100/50">
                        "{issue.latestStatusUpdate}"
                      </p>
                    </div>
                  )}

                  <div className="flex gap-4 pt-2">
                    <div className="text-[10px] text-stone-400">
                      <span className="font-bold">PDE:</span> {issue.pde}
                    </div>
                    <div className="text-[10px] text-stone-400">
                      <span className="font-bold">PTE:</span> {issue.pte}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {issues.length === 0 && (
            <div className="text-center py-20 bg-white rounded-xl border border-dashed border-stone-300">
              <AlertCircle className="w-12 h-12 text-stone-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-stone-400">No issues or status updates found.</h3>
              <p className="text-stone-400 text-sm">Try uploading an Excel file with issue information.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default IssueList;
