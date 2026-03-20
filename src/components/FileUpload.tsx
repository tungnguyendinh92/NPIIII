import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Upload, FileText, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { extractPartsFromExcel } from '../lib/gemini';
import { ProjectPart } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface FileUploadProps {
  onTasksExtracted: (tasks: ProjectPart[], mode: 'replace' | 'update') => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onTasksExtracted }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [uploadMode, setUploadMode] = useState<'replace' | 'update'>('update');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.name.match(/\.(xlsx|xls|csv)$/)) {
      alert('Please upload an Excel or CSV file.');
      return;
    }

    setIsProcessing(true);
    setStatus('idle');

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        if (jsonData.length === 0) {
          throw new Error('The file is empty.');
        }

        // Call AI to extract parts
        const parts = await extractPartsFromExcel(jsonData);
        onTasksExtracted(parts, uploadMode);
        setStatus('success');
        setTimeout(() => setStatus('idle'), 3000);
      };
      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error('Error processing file:', error);
      setStatus('error');
    } finally {
      setIsProcessing(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow-sm border border-black/5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-emerald-600" />
            <h2 className="font-semibold text-stone-800">Upload Project Data</h2>
          </div>
          <div className="flex items-center bg-stone-100 p-1 rounded-lg border border-black/5">
            <button 
              onClick={(e) => { e.stopPropagation(); setUploadMode('update'); }}
              className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${uploadMode === 'update' ? 'bg-white text-emerald-600 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
            >
              UPDATE (MERGE)
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); setUploadMode('replace'); }}
              className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${uploadMode === 'replace' ? 'bg-white text-red-600 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
            >
              REPLACE ALL
            </button>
          </div>
        </div>
        <AnimatePresence>
          {status === 'success' && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex items-center gap-1 text-emerald-600 text-sm font-medium"
            >
              <CheckCircle2 className="w-4 h-4" />
              Imported Successfully
            </motion.div>
          )}
          {status === 'error' && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex items-center gap-1 text-red-600 text-sm font-medium"
            >
              <AlertCircle className="w-4 h-4" />
              Import Failed
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-xl p-8 transition-all cursor-pointer
          flex flex-col items-center justify-center gap-3
          ${isDragging ? 'border-emerald-500 bg-emerald-50' : 'border-stone-200 hover:border-emerald-400 hover:bg-stone-50'}
          ${isProcessing ? 'pointer-events-none opacity-60' : ''}
        `}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          className="hidden"
          accept=".xlsx,.xls,.csv"
        />

        {isProcessing ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
            <p className="text-sm font-medium text-stone-600">AI is extracting information...</p>
          </div>
        ) : (
          <>
            <div className="p-4 bg-stone-100 rounded-full text-stone-400 group-hover:text-emerald-600 transition-colors">
              <FileText className="w-8 h-8" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-stone-800">Click or drag Excel file here</p>
              <p className="text-xs text-stone-400 mt-1">Supports .xlsx, .xls, .csv</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default FileUpload;
