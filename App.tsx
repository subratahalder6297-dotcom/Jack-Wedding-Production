
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, Search, Shield, ChevronLeft, FileText, Video, Image as ImageIcon,
  Link as LinkIcon, Trash2, Lock, Eye, Folder as FolderIcon, ExternalLink,
  Phone, MessageCircle, Copy, Check, Facebook, Camera, ShieldCheck, Zap,
  Moon, Sun, Star, Clapperboard, Layout, Send, User, Calendar, Mic, MicOff, MapPin, X, MessageSquare, Waves, RefreshCw, ChevronRight, Sparkles,
  ArrowRight, Mail, Home, Briefcase, MessageCircleHeart
} from 'lucide-react';
import { GoogleGenAI, Modality } from "@google/genai";
import { Folder, GDriveFile, ViewMode, Review } from './types';
import { getFolders, saveFolders, getReviews, saveReviews } from './lib/storage';
import { LogoComponent, CONTACT_INFO, CHARACTER_IMAGE_URL, SERVICES, SERVICE_OFFERINGS, REVIEWS as INITIAL_REVIEWS } from './constants';
import { Button } from './components/Button';
import { FolderCard } from './components/FolderCard';
import { generateFolderDescription } from './services/geminiService';

// --- App Navigation State ---
type AppTab = 'home' | 'samples' | 'ai' | 'reviews';

// --- Audio Utilities for Live API ---
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const RollingLens = () => (
  <div className="rolling-lens-element text-gold-500 opacity-80">
    <svg width="60" height="60" viewBox="0 0 100 100" fill="none">
      <circle cx="50" cy="50" r="48" stroke="currentColor" strokeWidth="2" strokeDasharray="5 5" />
      <circle cx="50" cy="50" r="35" stroke="currentColor" strokeWidth="4" />
      <circle cx="50" cy="50" r="15" fill="currentColor" fillOpacity="0.3" />
    </svg>
  </div>
);

const FallingLenses = () => {
  const lenses = useMemo(() => Array.from({ length: 15 }).map((_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 20,
    duration: 15 + Math.random() * 15,
    size: 20 + Math.random() * 40,
    color: ['#E2C792', '#C5A059', '#6366f1'][Math.floor(Math.random() * 3)]
  })), []);
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 opacity-20">
      {lenses.map((lens) => (
        <div key={lens.id} className="lens-particle" style={{ left: `${lens.left}%`, animationDelay: `${lens.delay}s`, animationDuration: `${lens.duration}s`, color: lens.color }}>
          <svg width={lens.size} height={lens.size} viewBox="0 0 100 100" fill="none">
            <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="1" strokeOpacity="0.5" />
          </svg>
        </div>
      ))}
    </div>
  );
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>('home');
  const [folders, setFolders] = useState<Folder[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('client');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [creationStep, setCreationStep] = useState(1);
  const [isEditingFolder, setIsEditingFolder] = useState<Folder | null>(null);
  const [isAddingFile, setIsAddingFile] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState<Record<string, boolean>>({});
  const [newReview, setNewReview] = useState({ name: '', text: '', stars: 5 });

  // Form states
  const [fName, setFName] = useState('');
  const [fPass, setFPass] = useState('');
  const [fThumb, setFThumb] = useState('');
  const [fService, setFService] = useState('');
  const [fIsSample, setFIsSample] = useState(false);
  const [fDescription, setFDescription] = useState('');
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFileUrl, setNewFileUrl] = useState('');

  // AI Features State
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionResult, setTranscriptionResult] = useState('');
  const [mapQuery, setMapQuery] = useState('');
  const [mapAnswer, setMapAnswer] = useState('');
  const [isMapLoading, setIsMapLoading] = useState(false);
  
  // Live API Audio Refs
  const liveSessionRef = useRef<any>(null);
  const [isLiveActive, setIsLiveActive] = useState(false);
  const nextStartTimeRef = useRef(0);
  const audioSourcesRef = useRef(new Set<AudioBufferSourceNode>());

  useEffect(() => {
    setFolders(getFolders());
    const storedReviews = getReviews();
    if (storedReviews.length === 0) {
      const mappedInitial = INITIAL_REVIEWS.map((r, i) => ({
        id: `initial-${i}`,
        name: r.name,
        text: r.text,
        stars: r.stars,
        date: Date.now() - (i * 86400000)
      }));
      setReviews(mappedInitial);
      saveReviews(mappedInitial);
    } else {
      setReviews(storedReviews);
    }

    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  useEffect(() => { saveFolders(folders); }, [folders]);
  useEffect(() => { saveReviews(reviews); }, [reviews]);

  const toggleDarkMode = () => {
    const nextMode = !isDarkMode;
    setIsDarkMode(nextMode);
    document.documentElement.classList.toggle('dark', nextMode);
    localStorage.setItem('theme', nextMode ? 'dark' : 'light');
  };

  const resetFolderForm = () => {
    setFName(''); setFPass(''); setFThumb(''); setFService(''); setFIsSample(false); setFDescription('');
    setCreationStep(1);
  };

  const handleUnlockFolder = (id: string) => {
    const folder = folders.find(f => f.id === id);
    if (!folder) return;
    if (!folder.password || isUnlocked[id]) {
      setActiveFolderId(id);
      return;
    }
    const entered = prompt('Enter the archive access password:');
    if (entered === folder.password) {
      setIsUnlocked(prev => ({ ...prev, [id]: true }));
      setActiveFolderId(id);
    } else if (entered !== null) alert('Access Denied: Invalid Key.');
  };

  const handleStartTranscription = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const audioChunks: Blob[] = [];
      mediaRecorder.ondataavailable = (event) => audioChunks.push(event.data);
      mediaRecorder.onstop = async () => {
        setIsTranscribing(true);
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Audio = (reader.result as string).split(',')[1];
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: {
              parts: [
                { text: "Please transcribe the following audio note for a production client. Return only the transcription text." },
                { inlineData: { mimeType: 'audio/wav', data: base64Audio } }
              ]
            }
          });
          setTranscriptionResult(response.text || 'Transcription failed.');
          setIsTranscribing(false);
        };
        reader.readAsDataURL(audioBlob);
      };
      mediaRecorder.start();
      setIsRecording(true);
      setTimeout(() => {
        if (mediaRecorder.state === "recording") {
          mediaRecorder.stop();
          setIsRecording(false);
          stream.getTracks().forEach(t => t.stop());
        }
      }, 5000);
    } catch (err) { alert('Microphone access required.'); }
  };

  const handleMapSearch = async () => {
    if (!mapQuery.trim()) return;
    setIsMapLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      let location = null;
      try {
        const pos = await new Promise<GeolocationPosition>((res, rej) => 
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 })
        );
        location = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      } catch (e) {}

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: mapQuery,
        config: {
          tools: [{ googleMaps: {} }],
          toolConfig: { retrievalConfig: location ? { latLng: location } : undefined }
        }
      });
      setMapAnswer(response.text || 'No results found.');
    } catch (err) { setMapAnswer('Error. Check connection.'); }
    finally { setIsMapLoading(false); }
  };

  const startLiveChat = async () => {
    if (isLiveActive) {
      liveSessionRef.current?.close();
      setIsLiveActive(false);
      return;
    }
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            setIsLiveActive(true);
            const source = inputAudioContext.createMediaStreamSource(stream);
            const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) int16[i] = inputData[i] * 32768;
              sessionPromise.then(session => {
                session.sendRealtimeInput({ media: { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' } });
              });
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContext.destination);
          },
          onmessage: async (message) => {
            const base64 = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64) {
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContext.currentTime);
              const buffer = await decodeAudioData(decode(base64), outputAudioContext, 24000, 1);
              const source = outputAudioContext.createBufferSource();
              source.buffer = buffer;
              source.connect(outputAudioContext.destination);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              audioSourcesRef.current.add(source);
              source.onended = () => audioSourcesRef.current.delete(source);
            }
            if (message.serverContent?.interrupted) {
              audioSourcesRef.current.forEach(s => s.stop());
              audioSourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onclose: () => setIsLiveActive(false),
          onerror: () => setIsLiveActive(false)
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
          systemInstruction: 'You are Jack, elite production director. Be warm, professional.'
        }
      });
      liveSessionRef.current = await sessionPromise;
    } catch (err) { alert('Live Link Failed.'); }
  };

  const activeFolder = useMemo(() => folders.find(f => f.id === activeFolderId), [folders, activeFolderId]);
  const clientFolders = useMemo(() => folders.filter(f => !f.isSample && f.name.toLowerCase().includes(searchQuery.toLowerCase())), [folders, searchQuery]);
  const sampleFolders = useMemo(() => folders.filter(f => f.isSample), [folders]);

  return (
    <div className="h-screen flex flex-col relative bg-main-gradient dark:bg-slate-950 overflow-hidden font-sans select-none">
      <FallingLenses />
      <RollingLens />
      
      {/* App Shell Header */}
      <header className="px-6 py-4 flex items-center justify-between z-40 bg-white/40 dark:bg-slate-900/40 backdrop-blur-lg border-b border-indigo-50/20 dark:border-slate-800/50">
        <div className="flex items-center gap-3" onClick={() => setActiveFolderId(null)}>
          <LogoComponent className="w-8 h-8" />
          <h1 className="font-serif text-lg font-bold uppercase tracking-tight dark:text-gold-200">Jack Production</h1>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={toggleDarkMode} className="p-2 text-slate-500 dark:text-slate-400 active:scale-90 transition-transform">
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button 
            onClick={() => setViewMode(viewMode === 'admin' ? 'client' : 'admin')}
            className={`p-1.5 rounded-full border-2 transition-all ${viewMode === 'admin' ? 'border-amber-400 bg-amber-400/10' : 'border-indigo-200 bg-transparent'}`}
          >
            {viewMode === 'admin' ? <Shield size={16} className="text-amber-500" /> : <Eye size={16} className="text-slate-400" />}
          </button>
        </div>
      </header>

      {/* Main App Content Viewport */}
      <main className="flex-1 overflow-y-auto hide-scrollbar relative pb-24">
        {activeFolderId ? (
          /* Sub-view: Folder Assets */
          <div className="animate-in slide-in-from-right duration-300 p-6">
             <button className="flex items-center gap-2 mb-6 text-slate-400 text-[10px] font-black uppercase tracking-widest" onClick={() => setActiveFolderId(null)}>
                <ChevronLeft size={16} /> Back to Vault
             </button>
             <div className="mb-10">
                <h2 className="font-serif text-4xl font-bold italic tracking-tight mb-2">{activeFolder?.name}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed italic">{activeFolder?.description}</p>
             </div>
             
             <div className="space-y-4">
                {activeFolder?.files.map(f => (
                   <div key={f.id} className="p-5 bg-white/50 dark:bg-slate-900/50 backdrop-blur rounded-[2rem] border border-white dark:border-slate-800 flex items-center justify-between group active:scale-[0.98] transition-all">
                      <div className="flex items-center gap-4">
                         <div className="p-4 bg-gold-50 dark:bg-slate-800 rounded-2xl text-gold-500">
                            {f.type === 'video' ? <Video size={20}/> : <ImageIcon size={20}/>}
                         </div>
                         <div>
                            <h4 className="font-bold text-sm tracking-tight">{f.name}</h4>
                            <span className="text-[9px] font-black uppercase text-slate-400">Ready for Playback</span>
                         </div>
                      </div>
                      <button onClick={() => window.open(f.url, '_blank')} className="p-3 text-indigo-500 bg-indigo-50 dark:bg-slate-800 rounded-xl">
                         <ExternalLink size={18} />
                      </button>
                   </div>
                ))}
             </div>
          </div>
        ) : (
          /* Main Tab Views */
          <div className="animate-in fade-in duration-500">
            {activeTab === 'home' && (
              <div className="p-6 space-y-10">
                <div className="pt-8 space-y-4">
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gold-600 block">Cinematic Archives</span>
                  <h2 className="font-serif text-5xl font-bold tracking-tighter leading-none italic">Curated <br/> <span className="text-gold-500">Memories</span></h2>
                </div>

                <div className="relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text" placeholder="Search archives..."
                    className="w-full pl-12 pr-4 py-4 bg-white/50 dark:bg-slate-900/50 backdrop-blur border border-indigo-100/50 dark:border-slate-800 rounded-full text-sm outline-none focus:bg-white transition-all font-medium"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                     <h3 className="font-serif text-xl font-bold italic">Client Vaults</h3>
                     <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">{clientFolders.length} Archives</span>
                  </div>
                  <div className="grid grid-cols-1 gap-6">
                    {clientFolders.map(folder => (
                      <FolderCard key={folder.id} folder={folder} viewMode={viewMode} onOpen={handleUnlockFolder} />
                    ))}
                    {clientFolders.length === 0 && (
                      <div className="py-20 text-center text-slate-400 bg-slate-50/50 dark:bg-slate-900/30 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
                        <FolderIcon className="mx-auto mb-4 opacity-30" size={40}/>
                        <p className="text-xs font-black uppercase tracking-widest">No matching archives</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'samples' && (
              <div className="p-6 space-y-10">
                <div className="pt-8">
                  <h2 className="font-serif text-4xl font-bold italic">Production <span className="text-gold-500">Showcase</span></h2>
                  <p className="text-sm text-slate-500 mt-2">Explore our high-end production standards.</p>
                </div>
                <div className="grid grid-cols-1 gap-8">
                  {sampleFolders.map(folder => (
                    <FolderCard key={folder.id} folder={folder} viewMode={viewMode} onOpen={handleUnlockFolder} />
                  ))}
                </div>
                <div className="mt-12 space-y-4">
                   <h3 className="font-serif text-xl font-bold italic">Our Capabilities</h3>
                   <div className="grid grid-cols-2 gap-3">
                     {SERVICE_OFFERINGS.map((s, i) => (
                       <div key={i} className="p-5 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 space-y-3">
                          <div className="w-10 h-10 bg-gold-50 dark:bg-gold-900/20 rounded-xl flex items-center justify-center text-gold-500">
                            {s.icon}
                          </div>
                          <h4 className="font-bold text-xs tracking-tight">{s.title}</h4>
                       </div>
                     ))}
                   </div>
                </div>
              </div>
            )}

            {activeTab === 'ai' && (
              <div className="p-6 space-y-8">
                <div className="pt-8">
                  <h2 className="font-serif text-4xl font-bold italic">Production <span className="text-indigo-500">Lab</span></h2>
                  <p className="text-sm text-slate-500 mt-2 italic">Empowering your vision with elite AI tools.</p>
                </div>

                {/* Voice Sheet */}
                <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-indigo-50 dark:border-slate-800 space-y-6">
                   <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-500">Voice Transcribe</h4>
                   <div className="flex items-center gap-5">
                      <button 
                        onClick={handleStartTranscription}
                        className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${isRecording ? 'bg-rose-500 animate-pulse shadow-rose-200' : 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500'}`}
                      >
                        {isRecording ? <MicOff size={24}/> : <Mic size={24}/>}
                      </button>
                      <div className="flex-1">
                         <p className="text-xs font-bold leading-tight">{isRecording ? 'Capturing Production Notes...' : isTranscribing ? 'Gemini is processing...' : 'Record Production Feedback'}</p>
                      </div>
                   </div>
                   {transcriptionResult && (
                     <div className="p-5 bg-slate-50 dark:bg-slate-800 rounded-2xl text-[11px] font-medium italic border border-slate-100 dark:border-slate-700">
                       "{transcriptionResult}"
                     </div>
                   )}
                </div>

                {/* Map Sheet */}
                <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-gold-50 dark:border-slate-800 space-y-6">
                   <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-gold-600">Location Guide</h4>
                   <div className="flex gap-2">
                      <input 
                        type="text" placeholder="Ask about shoot locations..."
                        className="flex-1 px-5 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-xs font-bold"
                        value={mapQuery} onChange={e => setMapQuery(e.target.value)}
                      />
                      <button onClick={handleMapSearch} className="bg-gold-500 text-white p-3 rounded-2xl">
                        {isMapLoading ? <RefreshCw className="animate-spin" size={18}/> : <MapPin size={18}/>}
                      </button>
                   </div>
                   {mapAnswer && (
                     <div className="p-5 bg-amber-50/50 dark:bg-amber-950/20 rounded-2xl text-[10px] leading-relaxed font-medium">
                        {mapAnswer}
                     </div>
                   )}
                </div>

                {/* Direct Live Sheet */}
                <div className="pt-4">
                   <Button 
                    variant={isLiveActive ? 'danger' : 'gold'} 
                    className="w-full h-16 rounded-[1.5rem] gap-3"
                    onClick={startLiveChat}
                   >
                     {isLiveActive ? <Waves className="animate-pulse" /> : <MessageSquare size={20}/>}
                     {isLiveActive ? 'End Live Session' : 'Direct Link to Jack'}
                   </Button>
                </div>
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="p-6 space-y-10">
                <div className="pt-8">
                   <h2 className="font-serif text-4xl font-bold italic">Client <span className="text-gold-500">Voices</span></h2>
                   <p className="text-sm text-slate-500 mt-2">Hear from those we've captured.</p>
                </div>

                <div className="space-y-6">
                  {reviews.map(r => (
                    <div key={r.id} className="p-8 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 space-y-4">
                       <div className="flex justify-between items-center">
                          <h4 className="font-bold text-sm tracking-tight">{r.name}</h4>
                          <div className="flex gap-1 text-amber-400">
                             {Array.from({length: r.stars}).map((_, i) => <Star key={i} size={10} fill="currentColor"/>)}
                          </div>
                       </div>
                       <p className="text-xs text-slate-500 italic leading-relaxed">"{r.text}"</p>
                    </div>
                  ))}
                </div>

                <form onSubmit={(e) => { e.preventDefault(); if(newReview.text) { setReviews([{...newReview, id: Date.now().toString(), date: Date.now()}, ...reviews]); setNewReview({name:'', text:'', stars:5}); } }} className="p-8 bg-slate-900 dark:bg-black rounded-[3rem] text-white space-y-6">
                   <h4 className="font-serif text-xl italic font-bold">Leave a Testimony</h4>
                   <input 
                     placeholder="Your Name" className="w-full px-5 py-3 rounded-xl bg-white/10 border-none text-xs" 
                     value={newReview.name} onChange={e => setNewReview({...newReview, name: e.target.value})}
                   />
                   <textarea 
                    placeholder="Describe your cinematic experience..." rows={3}
                    className="w-full px-5 py-3 rounded-xl bg-white/10 border-none text-xs resize-none"
                    value={newReview.text} onChange={e => setNewReview({...newReview, text: e.target.value})}
                   />
                   <Button variant="gold" className="w-full h-14 rounded-2xl text-[10px] font-black uppercase tracking-widest">Post Testimony</Button>
                </form>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Floating Action Button (Admin Only) */}
      {viewMode === 'admin' && !activeFolderId && (
        <button 
          onClick={() => setIsCreatingFolder(true)}
          className="fixed bottom-28 right-6 w-14 h-14 bg-gold-gradient rounded-2xl shadow-2xl text-white flex items-center justify-center z-[50] active:scale-90 transition-transform"
        >
          <Plus size={24} />
        </button>
      )}

      {/* Bottom App Dock */}
      <nav className="fixed bottom-0 left-0 right-0 h-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border-t border-indigo-50/30 dark:border-slate-800/50 flex items-center justify-around px-6 z-[60] pb-2">
         {[
           { id: 'home', icon: Home, label: 'Vaults' },
           { id: 'samples', icon: Clapperboard, label: 'Samples' },
           { id: 'ai', icon: Zap, label: 'AI Lab' },
           { id: 'reviews', icon: MessageCircleHeart, label: 'Voice' },
         ].map(tab => (
           <button 
            key={tab.id}
            onClick={() => { setActiveTab(tab.id as AppTab); setActiveFolderId(null); }}
            className={`flex flex-col items-center gap-1.5 px-3 py-1.5 transition-all ${activeTab === tab.id ? 'text-gold-500 scale-110' : 'text-slate-400 opacity-60'}`}
           >
              <tab.icon size={22} className={activeTab === tab.id ? 'fill-gold-500/10' : ''} />
              <span className="text-[9px] font-black uppercase tracking-tighter">{tab.label}</span>
           </button>
         ))}
      </nav>

      {/* Photographer Character Overlay */}
      <div className="photographer-boy scale-75 md:scale-100 opacity-80 pointer-events-none">
        <img src={CHARACTER_IMAGE_URL} alt="Photographer" className="w-full drop-shadow-2xl" />
      </div>
      <div className="camera-flash"></div>

      {/* Admin Folder Deploy Sheet (Bottom Sheet Style) */}
      {isCreatingFolder && (
        <div className="fixed inset-0 z-[100] bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-slate-900 rounded-t-[3.5rem] shadow-2xl animate-in slide-in-from-bottom duration-500 max-h-[90vh] overflow-y-auto">
             <div className="w-12 h-1 bg-slate-200 dark:bg-slate-800 rounded-full mx-auto mt-4 mb-6" />
             <div className="p-8 space-y-8">
                <div className="flex items-center justify-between">
                   <h3 className="font-serif text-3xl font-bold italic tracking-tight">Deploy Archive</h3>
                   <button onClick={() => setIsCreatingFolder(false)} className="p-2 text-slate-400 hover:text-rose-500"><X size={24}/></button>
                </div>
                
                {creationStep === 1 && (
                  <div className="space-y-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase text-gold-600 ml-2">Archive Name</label>
                       <input className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none font-bold" value={fName} onChange={e => setFName(e.target.value)} placeholder="Smith & Jones Wedding..." />
                    </div>
                    <Button variant="gold" className="w-full h-14 rounded-2xl" onClick={() => setCreationStep(2)}>Next Step</Button>
                  </div>
                )}
                
                {creationStep === 2 && (
                  <div className="space-y-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase text-gold-600 ml-2">Access Password</label>
                       <input className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none font-bold" value={fPass} onChange={e => setFPass(e.target.value)} placeholder="Secret Key..." />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase text-gold-600 ml-2">Thumbnail URL</label>
                       <input className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none font-bold" value={fThumb} onChange={e => setFThumb(e.target.value)} placeholder="Image link..." />
                    </div>
                    <Button variant="gold" className="w-full h-14 rounded-2xl" onClick={async () => {
                      setIsAiGenerating(true);
                      const desc = await generateFolderDescription(fName);
                      setFDescription(desc);
                      setIsAiGenerating(false);
                      setCreationStep(3);
                    }} isLoading={isAiGenerating}>Deploy to Vault</Button>
                  </div>
                )}

                {creationStep === 3 && (
                   <div className="space-y-6 text-center">
                      <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto text-emerald-500">
                        <Check size={40} />
                      </div>
                      <h4 className="font-serif text-2xl font-bold italic">Vault Synchronized</h4>
                      <p className="text-sm text-slate-500 px-6">"{fDescription}"</p>
                      <Button variant="gold" className="w-full h-14 rounded-2xl" onClick={() => {
                        const newF: Folder = { id: Date.now().toString(), name: fName, password: fPass, thumbnail: fThumb, description: fDescription, files: [], createdAt: Date.now(), isLocked: !!fPass };
                        setFolders([newF, ...folders]);
                        setIsCreatingFolder(false);
                        resetFolderForm();
                      }}>Finish Deployment</Button>
                   </div>
                )}
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
