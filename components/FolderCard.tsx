
import React from 'react';
import { Folder } from '../types';
import { Folder as FolderIcon, Lock, ExternalLink, Settings, Trash2, Camera, Edit3 } from 'lucide-react';
import { Button } from './Button';

interface FolderCardProps {
  folder: Folder;
  viewMode: 'admin' | 'client';
  onOpen: (id: string) => void;
  onDelete?: (id: string) => void;
  onEdit?: (folder: Folder) => void;
}

export const FolderCard: React.FC<FolderCardProps> = ({ folder, viewMode, onOpen, onDelete, onEdit }) => {
  const isLocked = !!folder.password;

  return (
    <div className="group relative bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 hover:border-gold-300 dark:hover:border-gold-600 transition-all duration-500 overflow-hidden hover:shadow-[0_40px_80px_rgba(197,160,89,0.25)] hover:-translate-y-3">
      {/* Thumbnail Section */}
      <div className="aspect-video w-full bg-slate-100 dark:bg-slate-800 relative overflow-hidden">
        {folder.thumbnail ? (
          <img 
            src={folder.thumbnail} 
            alt={folder.name} 
            className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-700">
            <Camera size={64} strokeWidth={1} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-80 transition-opacity group-hover:opacity-60"></div>
        
        {/* Category Badge */}
        {folder.serviceType && (
          <div className="absolute top-6 left-6 px-4 py-1.5 bg-gold-500 text-white text-[11px] font-black uppercase tracking-widest rounded-full shadow-2xl">
            {folder.serviceType}
          </div>
        )}

        {/* Admin Quick Edit Thumbnail Button */}
        {viewMode === 'admin' && (
          <button 
            onClick={(e) => { e.stopPropagation(); onEdit?.(folder); }}
            className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity z-10"
          >
            <div className="bg-white/20 backdrop-blur-md p-4 rounded-full border border-white/30 text-white flex items-center gap-3 font-bold text-sm">
              <Edit3 size={20} /> Update Portfolio Cover
            </div>
          </button>
        )}

        {/* Admin Overlay Controls */}
        {viewMode === 'admin' && (
          <div className="absolute top-6 right-6 flex gap-3 translate-y-[-15px] opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 z-20">
            <Button 
              variant="secondary" 
              size="sm" 
              className="h-10 w-10 p-0 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur border-none text-slate-700 dark:text-slate-200 shadow-2xl" 
              onClick={(e) => { e.stopPropagation(); onEdit?.(folder); }}
            >
              <Settings size={18} />
            </Button>
            <Button 
              variant="danger" 
              size="sm" 
              className="h-10 w-10 p-0 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur border-none shadow-2xl" 
              onClick={(e) => { e.stopPropagation(); onDelete?.(folder.id); }}
            >
              <Trash2 size={18} />
            </Button>
          </div>
        )}
      </div>

      <div className="p-8 md:p-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
             <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl text-indigo-500 shadow-sm">
                <FolderIcon size={22} fill="currentColor" fillOpacity={0.1} />
             </div>
             <span className="text-xs font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest">
                {folder.files.length} ASSETS READY
             </span>
          </div>
          {isLocked && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-50 dark:bg-rose-950/30 rounded-lg text-rose-500 border border-rose-100 dark:border-rose-900/50 shadow-sm">
              <Lock size={14} />
              <span className="text-[10px] font-black uppercase tracking-widest">Secured</span>
            </div>
          )}
        </div>

        <h3 className="font-serif text-3xl font-bold text-slate-800 dark:text-slate-100 truncate mb-4 italic">
          {folder.name}
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 min-h-[44px] font-medium leading-relaxed italic">
          {folder.description || 'Exclusive production assets curated by Jack Wedding Production.'}
        </p>

        <div className="mt-8">
          <Button 
            variant={isLocked ? "outline" : "gold"} 
            size="md" 
            onClick={() => onOpen(folder.id)}
            className="w-full gap-3 rounded-2xl h-14 text-xs shadow-2xl group-hover:scale-[1.03] transition-transform"
          >
            {isLocked ? (
              <><Lock size={18} className="text-rose-500" /> Unlock Private Archive</>
            ) : (
              <>Explore Production Vault <ExternalLink size={18} /></>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
