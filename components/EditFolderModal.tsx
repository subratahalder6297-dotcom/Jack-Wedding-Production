import React, { useState } from 'react';
import { Folder } from '../types';
import { Button } from './Button';
import { X, Save } from 'lucide-react';

interface EditFolderModalProps {
  folder: Folder;
  onClose: () => void;
  onSave: (updatedFolder: Folder) => void;
}

export const EditFolderModal: React.FC<EditFolderModalProps> = ({ folder, onClose, onSave }) => {
  const [name, setName] = useState(folder.name || '');
  const [description, setDescription] = useState(folder.description || '');
  const [weddingDate, setWeddingDate] = useState(folder.weddingDate || '');
  const [venue, setVenue] = useState(folder.venue || '');
  const [progressStatus, setProgressStatus] = useState(folder.progressStatus || '');
  const [thumbnail, setThumbnail] = useState(folder.thumbnail || '');
  const [teaserVideoUrl, setTeaserVideoUrl] = useState(folder.teaserVideoUrl || '');
  
  // Find existing files to prepopulate URL inputs
  const existingFullVideo = folder.files?.find(f => f.collection === 'Full Video');
  const existingTrailer = folder.files?.find(f => f.collection === 'Trailer');
  const existingReels = folder.files?.find(f => f.collection === 'Reels');

  const [fullVideoUrl, setFullVideoUrl] = useState(existingFullVideo?.url || '');
  const [trailerUrl, setTrailerUrl] = useState(existingTrailer?.url || '');
  const [reelsUrl, setReelsUrl] = useState(existingReels?.url || '');

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/65 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 rounded-t-[3.5rem] sm:rounded-[3.5rem] w-full max-w-lg shadow-2xl p-8 border border-slate-100 dark:border-slate-800 animate-in slide-in-from-bottom duration-300 relative max-h-[90vh] overflow-y-auto hide-scrollbar">
        <button onClick={onClose} className="absolute top-8 right-8 p-2 text-slate-400 hover:text-rose-500 transition-colors">
          <X size={20} />
        </button>
        <h3 className="font-serif text-3xl font-bold italic tracking-tight mb-8">Edit Configuration</h3>
        
        <div className="space-y-5">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-gold-600 ml-2">Archive Title</label>
            <input className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none font-bold text-sm" value={name} onChange={e => setName(e.target.value)} placeholder="Title..." />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-gold-600 ml-2">Description</label>
            <textarea className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none font-bold text-sm min-h-24 resize-none" value={description} onChange={e => setDescription(e.target.value)} placeholder="Description..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-gold-600 ml-2">Wedding Date</label>
              <input type="text" className="w-full px-4 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none font-bold text-sm" value={weddingDate} onChange={e => setWeddingDate(e.target.value)} placeholder="e.g. October 14, 2026" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-gold-600 ml-2">Venue / Location</label>
              <input type="text" className="w-full px-4 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none font-bold text-sm" value={venue} onChange={e => setVenue(e.target.value)} placeholder="e.g. Victoria Memorial, Kolkata" />
            </div>
            <div className="space-y-2 col-span-2">
              <label className="text-[10px] font-black uppercase text-gold-600 ml-2">Progress Status</label>
              <input type="text" className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none font-bold text-sm" value={progressStatus} onChange={e => setProgressStatus(e.target.value)} placeholder="e.g. 100% Delivered" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-gold-600 ml-2">Portfolio Cover (Thumbnail)</label>
            <input className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none font-bold text-sm" value={thumbnail} onChange={e => setThumbnail(e.target.value)} placeholder="Image URL..." />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-gold-600 ml-2">Hero Section Video</label>
            <input className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none font-bold text-sm" value={teaserVideoUrl} onChange={e => setTeaserVideoUrl(e.target.value)} placeholder="Video URL..." />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-gold-600 ml-2">Full Video Link</label>
            <input className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none font-bold text-sm" value={fullVideoUrl} onChange={e => setFullVideoUrl(e.target.value)} placeholder="Full video URL..." />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-gold-600 ml-2">Trailer Link</label>
            <input className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none font-bold text-sm" value={trailerUrl} onChange={e => setTrailerUrl(e.target.value)} placeholder="Trailer URL..." />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-gold-600 ml-2">Reels Link</label>
            <input className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none font-bold text-sm" value={reelsUrl} onChange={e => setReelsUrl(e.target.value)} placeholder="Reels URL..." />
          </div>

          <div className="pt-6">
            <Button variant="gold" className="w-full h-14 rounded-2xl gap-2" onClick={() => {
              // Update files array with the links
              let updatedFiles = folder.files ? [...folder.files] : [];
              
              const updateLink = (collection: string, url: string, defaultName: string) => {
                const existingIndex = updatedFiles.findIndex(f => f.collection === collection);
                if (url) {
                  if (existingIndex >= 0) {
                    updatedFiles[existingIndex] = {
                      ...updatedFiles[existingIndex],
                      url
                    };
                  } else {
                    updatedFiles.push({
                      id: Date.now().toString() + Math.random(),
                      name: defaultName,
                      url,
                      type: 'video',
                      addedAt: Date.now(),
                      collection
                    });
                  }
                } else if (existingIndex >= 0) {
                  // remove if url is empty
                  updatedFiles.splice(existingIndex, 1);
                }
              };

              updateLink('Full Video', fullVideoUrl, 'Highlight Film');
              updateLink('Trailer', trailerUrl, 'Cinematic Trailer');
              updateLink('Reels', reelsUrl, 'Social Media Reel');

              onSave({
                ...folder,
                name,
                description,
                weddingDate,
                venue,
                progressStatus,
                thumbnail,
                teaserVideoUrl,
                files: updatedFiles
              });
            }}>
              <Save size={18} /> Save Configurations
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
