
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, Search, Shield, ChevronLeft, FileText, Video, Image as ImageIcon,
  Link as LinkIcon, Trash2, Lock, Eye, Folder as FolderIcon, ExternalLink,
  Phone, MessageCircle, Copy, Check, Facebook, Camera, ShieldCheck, Zap,
  Moon, Sun, Star, Clapperboard, Layout, Send, User, Calendar, Mic, MicOff, MapPin, X, MessageSquare, Waves, RefreshCw, ChevronRight, Sparkles,
  ArrowRight, Mail
} from 'lucide-react';
import { GoogleGenAI, Modality } from "@google/genai";
import { Folder, GDriveFile, ViewMode, Review } from './types';
import { getFolders, saveFolders, getReviews, saveReviews } from './lib/storage';
import { LogoComponent, CONTACT_INFO, CHARACTER_IMAGE_URL, SERVICES, SERVICE_OFFERINGS, REVIEWS as INITIAL_REVIEWS } from './constants';
import { Button } from './components/Button';
import { FolderCard } from './components/FolderCard';
import { generateFolderDescription } from './services/geminiService';

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
    <svg width="80" height="80" viewBox="0 0 100 100" fill="none">
      <circle cx="50" cy="50" r="48" stroke="currentColor" strokeWidth="2" strokeDasharray="5 5" />
      <circle cx="50" cy="50" r="35" stroke="currentColor" strokeWidth="4" />
      <circle cx="50" cy="50" r="15" fill="currentColor" fillOpacity="0.3" />
      <path d="M50 20 L50 30 M80 50 L70 50 M50 80 L50 70 M20 50 L30 50" stroke="currentColor" strokeWidth="2" />
    </svg>
  </div>
);

const FallingLenses = () => {
  const lenses = useMemo(() => Array.from({ length: 20 }).map((_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 20,
    duration: 12 + Math.random() * 15,
    size: 25 + Math.random() * 50,
    color: ['#E2C792', '#C5A059', '#6366f1', '#10b981', '#f43f5e'][Math.floor(Math.random() * 5)]
  })), []);
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 opacity-30">
      {lenses.map((lens) => (
        <div key={lens.id} className="lens-particle" style={{ left: `${lens.left}%`, animationDelay: `${lens.delay}s`, animationDuration: `${lens.duration}s`, color: lens.color }}>
          <svg width={lens.size} height={lens.size} viewBox="0 0 100 100" fill="none">
            <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.5" />
          </svg>
        </div>
      ))}
    </div>
  );
};

const App: React.FC = () => {
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
  const [copiedId, setCopiedId] = useState<string | null>(null);

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
  const [showAiAssistant, setShowAiAssistant] = useState(false);
  const [mapQuery, setMapQuery] = useState('');
  const [mapAnswer, setMapAnswer] = useState('');
  const [isMapLoading, setIsMapLoading] = useState(false);
  
  // Live API Audio Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const liveSessionRef = useRef<any>(null);
  const [isLiveActive, setIsLiveActive] = useState(false);
  const nextStartTimeRef = useRef(0);
  const audioSourcesRef = useRef(new Set<AudioBufferSourceNode>());

  useEffect(() => {
    setFolders(getFolders());
    
    // Initialize reviews with persistence and initial data fallback
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

  const toggleViewMode = () => {
    setViewMode(prev => prev === 'admin' ? 'client' : 'admin');
    setActiveFolderId(null);
  };

  const resetFolderForm = () => {
    setFName(''); setFPass(''); setFThumb(''); setFService(''); setFIsSample(false); setFDescription('');
    setCreationStep(1);
  };

  const openEditModal = (folder: Folder) => {
    setFName(folder.name);
    setFPass(folder.password || '');
    setFThumb(folder.thumbnail || '');
    setFService(folder.serviceType || '');
    setFIsSample(folder.isSample || false);
    setFDescription(folder.description || '');
    setIsEditingFolder(folder);
  };

  const nextStep = async () => {
    if (creationStep === 1 && !fName.trim()) {
      alert("Please provide an Archive Identity.");
      return;
    }
    
    if (creationStep === 3) {
      setIsAiGenerating(true);
      const description = await generateFolderDescription(fName);
      setFDescription(description);
      setIsAiGenerating(false);
    }
    
    setCreationStep(prev => prev + 1);
  };

  const prevStep = () => setCreationStep(prev => prev - 1);

  const handleCreateFolder = async () => {
    const newFolder: Folder = {
      id: crypto.randomUUID(),
      name: fName,
      description: fDescription,
      password: fPass || undefined,
      thumbnail: fThumb || undefined,
      serviceType: fService || undefined,
      isSample: fIsSample,
      files: [],
      createdAt: Date.now(),
      isLocked: false
    };

    setFolders(prev => [newFolder, ...prev]);
    setIsCreatingFolder(false);
    resetFolderForm();
  };

  const handleUpdateFolder = () => {
    if (!isEditingFolder) return;
    setFolders(prev => prev.map(f => f.id === isEditingFolder.id ? {
      ...f,
      name: fName,
      description: fDescription,
      password: fPass || undefined,
      thumbnail: fThumb || undefined,
      serviceType: fService || undefined,
      isSample: fIsSample
    } : f));
    setIsEditingFolder(null);
    resetFolderForm();
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

  const handleAddFile = () => {
    if (!newFileName.trim() || !newFileUrl.trim() || !activeFolderId) return;
    const file: GDriveFile = {
      id: crypto.randomUUID(),
      name: newFileName,
      url: newFileUrl,
      type: newFileUrl.includes('drive.google.com/file') || newFileUrl.includes('video') ? 'video' : 'document',
      addedAt: Date.now()
    };
    setFolders(prev => prev.map(f => f.id === activeFolderId ? { ...f, files: [file, ...f.files] } : f));
    setIsAddingFile(false);
    setNewFileName(''); setNewFileUrl('');
  };

  const handleDeleteFile = (fileId: string) => {
    if (!confirm('Permanently remove this production asset from the archive?')) return;
    setFolders(prev => prev.map(f => f.id === activeFolderId ? { ...f, files: f.files.filter(file => file.id !== fileId) } : f));
  };

  const submitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReview.name || !newReview.text) return;
    const review: Review = {
      id: crypto.randomUUID(),
      name: newReview.name,
      text: newReview.text,
      stars: newReview.stars,
      date: Date.now()
    };
    setReviews([review, ...reviews]);
    setNewReview({ name: '', text: '', stars: 5 });
  };

  // --- AI FEATURE: Audio Transcription (Gemini 3 Flash) ---
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
          // Create a new instance right before the call to ensure the latest API key is used
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
    } catch (err) {
      alert('Microphone access is required for transcription.');
    }
  };

  // --- AI FEATURE: Maps Grounding (Gemini 2.5 Flash) ---
  const handleMapSearch = async () => {
    if (!mapQuery.trim()) return;
    setIsMapLoading(true);
    try {
      // Create a new instance right before the call to ensure the latest API key is used
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      let location = null;
      try {
        const pos = await new Promise<GeolocationPosition>((res, rej) => 
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 })
        );
        location = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      } catch (e) { console.warn('Location data unavailable'); }

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: mapQuery,
        config: {
          tools: [{ googleMaps: {} }],
          toolConfig: {
            retrievalConfig: location ? { latLng: location } : undefined
          }
        }
      });
      setMapAnswer(response.text || 'No results found.');
    } catch (err) {
      setMapAnswer('Consultation error. Check your connection.');
    } finally {
      setIsMapLoading(false);
    }
  };

  // --- AI FEATURE: Live Audio Chat (Gemini 2.5 Native Audio) ---
  const startLiveChat = async () => {
    if (isLiveActive) {
      liveSessionRef.current?.close();
      setIsLiveActive(false);
      return;
    }

    try {
      // Create a new instance right before the call to ensure the latest API key is used
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = outputAudioContext;

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
          systemInstruction: 'You are Jack, an elite production director for Jack Wedding Production. You are assisting a client in real-time. Be warm, professional, and detailed.'
        }
      });
      liveSessionRef.current = await sessionPromise;
    } catch (err) {
      alert('Unable to initialize Live Production Assistant.');
    }
  };

  const activeFolder = useMemo(() => folders.find(f => f.id === activeFolderId), [folders, activeFolderId]);
  const clientFolders = useMemo(() => folders.filter(f => !f.isSample && f.name.toLowerCase().includes(searchQuery.toLowerCase())), [folders, searchQuery]);
  const sampleFolders = useMemo(() => folders.filter(f => f.isSample), [folders]);

  return (
    <div className="min-h-screen flex flex-col relative transition-colors duration-500 overflow-x-hidden">
      <FallingLenses />
      <RollingLens />
      
      {/* Cinematic UI: Photographer */}
      <div className="photographer-boy">
        <img src={CHARACTER_IMAGE_URL} alt="Photographer" className="w-full drop-shadow-2xl" />
      </div>
      <div className="camera-flash"></div>

      {/* Cinematic UI: Hanging Camera */}
      <div className="fixed top-0 left-12 z-50 pointer-events-none hidden lg:block">
        <div className="w-0.5 h-32 bg-slate-400 dark:bg-slate-700 mx-auto"></div>
        <div className="hanging-camera -mt-2">
          <div className="p-3 bg-slate-900 rounded-2xl shadow-2xl text-amber-400 border border-amber-900/20">
            <Camera size={28} />
          </div>
        </div>
      </div>

      {/* AI Production Assistant Panel */}
      <div className="fixed bottom-12 right-12 z-[100] flex flex-col items-end gap-4">
        {showAiAssistant && (
          <div className="bg-white dark:bg-slate-900 w-80 rounded-[2.5rem] shadow-2xl border border-gold-200 dark:border-slate-800 overflow-hidden animate-in slide-in-from-bottom-4 duration-300 mb-2">
             <div className="bg-gold-gradient p-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                   <Zap size={18} className="text-white fill-white" />
                   <h4 className="text-white font-serif font-bold text-lg">Production AI</h4>
                </div>
                <button onClick={() => setShowAiAssistant(false)} className="text-white/60 hover:text-white"><X size={20}/></button>
             </div>
             <div className="p-6 space-y-6 max-h-[450px] overflow-y-auto hide-scrollbar">
                {/* Voice Transcription */}
                <div className="space-y-3">
                   <h5 className="text-[10px] font-black uppercase tracking-widest text-gold-600">Voice Note Transcribe</h5>
                   <div className="flex items-center gap-3">
                      <button 
                        className={`rounded-full w-12 h-12 p-0 flex items-center justify-center transition-all ${isRecording ? 'bg-rose-500 text-white animate-pulse' : 'bg-gold-50 dark:bg-slate-800 text-gold-600 border border-gold-200 dark:border-slate-700'}`}
                        onClick={handleStartTranscription}
                        disabled={isTranscribing}
                      >
                        {isRecording ? <MicOff size={18}/> : <Mic size={18}/>}
                      </button>
                      <div className="flex-1 text-[11px] font-bold text-slate-500 uppercase tracking-tighter">
                        {isRecording ? 'Listening...' : isTranscribing ? 'Processing...' : 'Capture Audio Note'}
                      </div>
                   </div>
                   {transcriptionResult && (
                     <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-300 border border-slate-100 dark:border-slate-700">
                        "{transcriptionResult}"
                     </div>
                   )}
                </div>

                {/* Local Guide Search */}
                <div className="space-y-3">
                   <h5 className="text-[10px] font-black uppercase tracking-widest text-gold-600">Location Consultation</h5>
                   <div className="flex gap-2">
                      <input 
                        type="text" placeholder="Best park for shoot?"
                        className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-xs font-bold outline-none"
                        value={mapQuery}
                        onChange={(e) => setMapQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleMapSearch()}
                      />
                      <button onClick={handleMapSearch} className="bg-gold-500 text-white p-2 rounded-xl">
                        {isMapLoading ? <RefreshCw className="animate-spin" size={14}/> : <MapPin size={14}/>}
                      </button>
                   </div>
                   {mapAnswer && (
                     <div className="p-4 bg-indigo-50 dark:bg-indigo-950/30 rounded-2xl text-[10px] font-medium leading-relaxed border border-indigo-100 dark:border-indigo-900/50">
                        {mapAnswer}
                     </div>
                   )}
                </div>

                {/* Live Session */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                   <Button 
                    variant={isLiveActive ? 'danger' : 'gold'} 
                    className="w-full h-12 rounded-2xl gap-2 text-xs" 
                    onClick={startLiveChat}
                   >
                     {isLiveActive ? <Waves className="animate-pulse" /> : <MessageSquare size={16}/>}
                     {isLiveActive ? 'Terminate Link' : 'Open Live Direct'}
                   </Button>
                </div>
             </div>
          </div>
        )}
        <button 
          onClick={() => setShowAiAssistant(!showAiAssistant)}
          className="bg-gold-gradient p-5 rounded-full shadow-2xl text-white hover:scale-110 active:scale-95 transition-transform flex items-center gap-3"
        >
          {showAiAssistant ? <X size={24} /> : <Zap size={24} className="fill-white" />}
          {!showAiAssistant && <span className="text-[10px] font-black uppercase tracking-[0.2em] hidden md:block">Jack Production AI</span>}
        </button>
      </div>

      {/* Header */}
      <header className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-indigo-50 dark:border-slate-800 sticky top-0 z-40 px-4 py-3 md:px-8 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4 cursor-pointer" onClick={() => setActiveFolderId(null)}>
            <LogoComponent className="w-10 h-10 md:w-11 md:h-11" />
            <div className="hidden sm:block">
              <h1 className="font-serif text-lg md:text-xl font-bold tracking-tight uppercase">Jack Production</h1>
              <p className="text-[9px] text-indigo-400 uppercase tracking-[0.2em] font-black">Private Storage Vault</p>
            </div>
          </div>

          <div className="flex items-center gap-3 md:gap-5">
            <div className="hidden md:flex relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-gold-500 transition-colors" size={16} />
              <input 
                type="text" placeholder="Locate your archive..."
                className="pl-9 pr-4 py-2 bg-indigo-50/50 dark:bg-slate-800 border border-indigo-100 dark:border-slate-700 rounded-full text-sm outline-none w-48 lg:w-64 focus:bg-white dark:focus:bg-slate-700 transition-all font-medium"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="ghost" size="sm" className="h-10 w-10 p-0 rounded-full" onClick={toggleDarkMode}>
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </Button>
            <Button variant={viewMode === 'admin' ? 'primary' : 'outline'} size="sm" className="gap-2 rounded-full px-5 h-10 border-2" onClick={toggleViewMode}>
              {viewMode === 'admin' ? <Shield size={14} className="text-amber-400" /> : <Eye size={14} className="text-indigo-500" />}
              <span className="text-[11px] font-black uppercase tracking-wider">{viewMode === 'admin' ? 'Authorized' : 'Client'}</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-5 md:p-10 z-10">
        {!activeFolderId ? (
          <>
            {/* Cinematic Hero */}
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-20 gap-8 animate-in fade-in slide-in-from-top-10 duration-1000">
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-2 px-3 py-1 bg-gold-50 dark:bg-gold-900/30 text-gold-600 dark:text-gold-400 text-[10px] font-black uppercase tracking-[0.2em] rounded-full border border-gold-100 dark:border-gold-800">
                    <ShieldCheck size={12} fill="currentColor" /> Secure Hosting
                  </span>
                  <span className="h-1 w-1 rounded-full bg-slate-300"></span>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Jack Production Est. 2018</span>
                </div>
                <h2 className="font-serif text-5xl md:text-8xl font-bold tracking-tighter leading-[0.9]">
                  Cinematic <br/> <span className="text-gold-500 italic">Archives</span>
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-xl md:text-2xl max-w-2xl leading-relaxed font-medium italic">
                  Curated memory preservation for elite clients.
                </p>
              </div>
              {viewMode === 'admin' && (
                <Button variant="gold" className="gap-3 px-10 h-16 shadow-2xl rounded-2xl transform hover:scale-105 active:scale-95 transition-all text-sm" onClick={() => setIsCreatingFolder(true)}>
                  <Plus size={20} /> Deploy Archive
                </Button>
              )}
            </div>

            {/* Service Filter Ticker */}
            <div className="mb-20 overflow-x-auto hide-scrollbar flex gap-4 pb-4">
               {SERVICES.map(s => (
                 <div key={s} className="shrink-0 px-6 py-3 bg-white/40 dark:bg-slate-900/40 backdrop-blur rounded-2xl border border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-gold-600 hover:border-gold-300 transition-all cursor-pointer">
                    {s}
                 </div>
               ))}
            </div>

            {/* NEW: Jack Production Services Section */}
            <section className="mb-24">
              <div className="flex items-center gap-6 mb-12">
                <Zap size={24} className="text-gold-500" />
                <h3 className="font-serif text-4xl font-bold italic tracking-tight">Our Production Services</h3>
                <div className="h-[2px] flex-1 bg-gradient-to-r from-slate-100 to-transparent dark:from-slate-800"></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                {SERVICE_OFFERINGS.map((service, idx) => (
                  <div key={idx} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 hover:border-gold-200 transition-all duration-500 group relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                      {service.icon}
                    </div>
                    <div className="w-12 h-12 bg-gold-50 dark:bg-gold-900/20 rounded-2xl flex items-center justify-center text-gold-500 mb-6 group-hover:scale-110 transition-transform">
                      {service.icon}
                    </div>
                    <h4 className="text-xl font-bold mb-3 tracking-tight">{service.title}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                      {service.description}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-12 bg-gold-gradient p-1 rounded-[3rem] overflow-hidden shadow-2xl">
                <div className="bg-white dark:bg-slate-950 px-10 py-12 rounded-[2.8rem] flex flex-col md:flex-row items-center justify-between gap-10">
                  <div className="space-y-2">
                    <h4 className="font-serif text-3xl font-bold italic">Planning your next big project?</h4>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">To know more about our high-speed production packages, reach out to us directly.</p>
                    <a href={`mailto:${CONTACT_INFO.email}`} className="text-gold-600 font-bold hover:underline block mt-2">{CONTACT_INFO.email}</a>
                  </div>
                  <a href={`tel:${CONTACT_INFO.phone}`} className="flex items-center gap-4 group">
                    <div className="text-right">
                      <span className="block text-[10px] font-black uppercase tracking-[0.3em] text-gold-600 mb-1">Official Direct Line</span>
                      <span className="text-3xl font-black tracking-tighter">{CONTACT_INFO.formattedPhone}</span>
                    </div>
                    <div className="w-16 h-16 bg-gold-500 rounded-full flex items-center justify-center text-white shadow-xl group-hover:scale-110 transition-transform">
                      <ArrowRight size={24} />
                    </div>
                  </a>
                </div>
              </div>
            </section>

            {/* Production Samples */}
            <section className="mb-24">
              <div className="flex items-center gap-6 mb-12">
                <Clapperboard size={24} className="text-gold-500" />
                <h3 className="font-serif text-4xl font-bold italic tracking-tight">Production Samples</h3>
                <div className="h-[2px] flex-1 bg-gradient-to-r from-slate-100 to-transparent dark:from-slate-800"></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-12">
                {sampleFolders.length > 0 ? sampleFolders.map(folder => (
                  <FolderCard key={folder.id} folder={folder} viewMode={viewMode} onOpen={handleUnlockFolder} onDelete={(id) => setFolders(folders.filter(f => f.id !== id))} onEdit={openEditModal} />
                )) : (
                   [1,2].map(i => (
                    <div key={i} className="aspect-video rounded-[3rem] bg-slate-50/50 dark:bg-slate-900/50 border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center p-12 text-center group">
                       <Camera size={56} className="text-slate-300 dark:text-slate-700 mb-6 group-hover:scale-110 transition-transform" />
                       <h4 className="text-lg font-black uppercase tracking-widest text-slate-400">Archival Placeholder {i}</h4>
                    </div>
                   ))
                )}
              </div>
            </section>

            {/* Client Projects Grid */}
            <section className="mb-24">
              <div className="flex items-center justify-between mb-12">
                <div className="flex items-center gap-4">
                  <Layout size={20} className="text-indigo-500" />
                  <h3 className="font-serif text-4xl font-bold">Client Portfolios</h3>
                </div>
                <div className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-slate-900 px-4 py-2 rounded-full border border-slate-100 dark:border-slate-800">
                  Total Items: {clientFolders.length}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-12">
                {clientFolders.map(folder => (
                  <FolderCard key={folder.id} folder={folder} viewMode={viewMode} onOpen={handleUnlockFolder} onDelete={(id) => setFolders(folders.filter(f => f.id !== id))} onEdit={openEditModal} />
                ))}
              </div>
            </section>

            {/* Reviews Section */}
            <section className="mb-24">
              <div className="bg-slate-900 dark:bg-black rounded-[4rem] p-12 md:p-24 text-white relative overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] border border-slate-800">
                <div className="absolute top-0 right-0 p-10 opacity-5">
                  <Star size={300} fill="currentColor" />
                </div>
                <div className="max-w-4xl mx-auto relative z-10">
                  <div className="text-center mb-16 space-y-4">
                    <span className="text-gold-500 font-black uppercase tracking-[0.4em] text-[10px]">Client Testimonials</span>
                    <h3 className="font-serif text-5xl md:text-7xl font-bold italic tracking-tighter">Voices of Satisfaction</h3>
                  </div>
                  
                  {/* Review Submission Form */}
                  <form onSubmit={submitReview} className="bg-white/5 backdrop-blur-xl p-10 rounded-[3rem] border border-white/10 mb-20 space-y-6 shadow-2xl">
                    <div className="flex flex-col md:flex-row gap-6">
                      <div className="flex-1 space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gold-500/80 ml-2">Author Name</label>
                        <input 
                          type="text" placeholder="John Doe" required
                          className="w-full px-6 py-4 rounded-2xl bg-white/10 text-white placeholder:text-white/30 outline-none border border-white/5 focus:border-gold-500/50 transition-all font-bold"
                          value={newReview.name}
                          onChange={(e) => setNewReview({...newReview, name: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gold-500/80 ml-2 text-center block">Quality Rating</label>
                        <div className="flex items-center gap-3 bg-white/10 px-6 py-4 rounded-2xl border border-white/5 h-[58px]">
                          {[1,2,3,4,5].map(s => (
                            <Star 
                              key={s} size={22} 
                              className={`cursor-pointer transition-all hover:scale-125 ${newReview.stars >= s ? 'text-amber-400 fill-amber-400' : 'text-white/20'}`}
                              onClick={() => setNewReview({...newReview, stars: s})}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gold-500/80 ml-2">Your Production Feedback</label>
                      <textarea 
                        placeholder="Describe your cinematic journey with Jack..." required rows={3}
                        className="w-full px-6 py-4 rounded-2xl bg-white/10 text-white placeholder:text-white/30 outline-none border border-white/5 focus:border-gold-500/50 transition-all font-medium resize-none"
                        value={newReview.text}
                        onChange={(e) => setNewReview({...newReview, text: e.target.value})}
                      />
                    </div>
                    <Button type="submit" variant="gold" className="w-full h-16 rounded-[1.5rem] gap-3 shadow-2xl group">
                      <Send size={20} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" /> Post Review
                    </Button>
                  </form>

                  {/* Review Feed */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    {reviews.map((review) => (
                      <div key={review.id} className="bg-gradient-to-br from-white/10 to-transparent backdrop-blur-sm px-10 py-12 rounded-[3rem] border border-white/10 hover:bg-white/15 transition-all group">
                        <div className="flex justify-between items-start mb-6">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                              <User size={20} />
                            </div>
                            <div>
                              <h4 className="font-bold text-lg">{review.name}</h4>
                              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Verified Client</p>
                            </div>
                          </div>
                          <div className="flex gap-1 text-amber-400">
                            {Array.from({length: review.stars}).map((_, s) => <Star key={s} size={14} fill="currentColor" />)}
                          </div>
                        </div>
                        <p className="text-xl italic opacity-90 mb-8 font-serif leading-relaxed">"{review.text}"</p>
                        <div className="flex items-center gap-2 text-[10px] opacity-40 uppercase font-black tracking-widest">
                          <Calendar size={12} /> {new Date(review.date).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </>
        ) : (
          /* High-End Folder Detail View */
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 max-w-6xl mx-auto">
            <button className="flex items-center gap-3 mb-16 text-slate-400 hover:text-indigo-600 transition-all font-black uppercase text-[11px] tracking-[0.2em] group" onClick={() => setActiveFolderId(null)}>
              <div className="p-2 bg-white dark:bg-slate-900 rounded-full shadow-sm border border-slate-100 dark:border-slate-800 group-hover:-translate-x-1 transition-transform">
                <ChevronLeft size={16} />
              </div>
              Archive Directory
            </button>
            
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-3xl p-10 md:p-20 rounded-[4rem] shadow-[0_100px_150px_-50px_rgba(0,0,0,0.1)] border border-white dark:border-slate-800 relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-3 bg-gold-gradient"></div>
               
               <div className="flex flex-col md:flex-row md:items-start justify-between gap-12 mb-20">
                  <div className="flex gap-10 items-start">
                    <div className="hidden sm:flex p-8 bg-gold-50 dark:bg-gold-900/20 rounded-[2.5rem] text-gold-500 shrink-0 border border-gold-100 dark:border-gold-800/50 shadow-inner">
                      <FolderIcon size={48} fill="currentColor" fillOpacity={0.1} strokeWidth={1.5} />
                    </div>
                    <div className="space-y-6">
                      <h2 className="font-serif text-5xl md:text-7xl font-bold tracking-tighter italic">{activeFolder?.name}</h2>
                      <div className="flex flex-wrap gap-3">
                         <div className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-500">
                           Archived: {new Date(activeFolder?.createdAt || Date.now()).toLocaleDateString()}
                         </div>
                         <div className="px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-[10px] font-black uppercase tracking-widest text-emerald-600">
                           Cloud Ready
                         </div>
                      </div>
                      <p className="text-slate-500 dark:text-slate-400 text-2xl leading-relaxed font-serif max-w-3xl italic">{activeFolder?.description}</p>
                    </div>
                  </div>
                  {viewMode === 'admin' && (
                    <Button variant="gold" className="shrink-0 h-16 px-10 rounded-[1.5rem] gap-3 shadow-xl hover:scale-105" onClick={() => setIsAddingFile(true)}>
                      <LinkIcon size={20} /> Deploy Asset
                    </Button>
                  )}
               </div>

               <div className="space-y-6">
                  <div className="flex items-center gap-4 mb-10">
                    <span className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.3em]">Cinematic Masters ({activeFolder?.files.length || 0})</span>
                    <div className="h-px flex-1 bg-indigo-50 dark:bg-indigo-900/50"></div>
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                    {activeFolder?.files.length === 0 ? (
                      <div className="py-20 text-center bg-slate-50/50 dark:bg-slate-800/30 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
                        <FileText size={48} className="mx-auto text-slate-300 mb-4" strokeWidth={1} />
                        <h4 className="text-slate-400 font-black uppercase tracking-widest text-xs">Waiting for Archival Upload</h4>
                      </div>
                    ) : (
                      activeFolder?.files.map(f => (
                        <div key={f.id} className="p-8 bg-slate-50/50 dark:bg-slate-800/30 rounded-[2.5rem] flex flex-col sm:flex-row justify-between items-center group hover:bg-white dark:hover:bg-slate-700 hover:shadow-2xl transition-all duration-500 border border-transparent hover:border-gold-100 dark:hover:border-gold-900/50 gap-6">
                          <div className="flex items-center gap-8">
                            <div className="p-5 bg-white dark:bg-slate-900 rounded-[1.5rem] shadow-sm group-hover:scale-110 transition-transform">
                              {f.type === 'video' ? <Video size={28} className="text-indigo-500"/> : <ImageIcon size={28} className="text-gold-500"/>}
                            </div>
                            <div>
                              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block mb-1">Production Resource</span>
                              <h4 className="font-bold text-2xl tracking-tight">{f.name}</h4>
                            </div>
                          </div>
                          <div className="flex gap-4 w-full sm:w-auto">
                            <Button variant="outline" size="sm" className="flex-1 sm:flex-none rounded-xl h-14 px-8 border-indigo-100 dark:border-slate-700 hover:bg-indigo-50 font-black uppercase tracking-widest text-[10px]" onClick={() => window.open(f.url, '_blank')}>
                              Open Link
                            </Button>
                            {viewMode === 'admin' && (
                              <Button variant="danger" size="sm" className="h-14 w-14 p-0 rounded-xl" onClick={() => handleDeleteFile(f.id)}>
                                <Trash2 size={24}/>
                              </Button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
               </div>
            </div>
          </div>
        )}
      </main>

      {/* Cinematic Footer */}
      <footer className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-t border-indigo-50 dark:border-slate-800 pt-24 pb-16 px-8 z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-12">
          <div className="flex items-center gap-6">
            <LogoComponent className="w-14 h-14" />
            <div>
              <h3 className="font-serif text-3xl font-bold tracking-tight italic">Jack Production</h3>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gold-600 mt-1">Cinematic Standard Archives</p>
            </div>
          </div>
          <div className="flex flex-col items-center md:items-end gap-3">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Client Direct Support</p>
             <a href={`tel:${CONTACT_INFO.phone}`} className="text-3xl font-black text-slate-900 dark:text-white hover:text-gold-500 transition-colors tracking-tighter">{CONTACT_INFO.formattedPhone}</a>
             <a href={`mailto:${CONTACT_INFO.email}`} className="text-xs font-bold text-slate-500 hover:text-gold-600 transition-colors tracking-wider flex items-center gap-2">
               <Mail size={14} />
               {CONTACT_INFO.email}
             </a>
             <div className="flex gap-6 mt-4">
               <Facebook className="text-slate-400 hover:text-indigo-500 transition-colors cursor-pointer" size={20} />
               <Camera className="text-slate-400 hover:text-rose-500 transition-colors cursor-pointer" size={20} />
               <Phone className="text-slate-400 hover:text-emerald-500 transition-colors cursor-pointer" size={20} />
             </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-20 pt-10 border-t border-slate-100 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest gap-4">
           <p>© 2024 Jack Wedding Production. All Rights Reserved.</p>
           <div className="flex gap-8">
             <span>Terms of Access</span>
             <span>Privacy Policy</span>
             <span>Safe Storage Guarantee</span>
           </div>
        </div>
      </footer>

      {/* Admin Folder Wizard (Multi-step Creation) */}
      {isCreatingFolder && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-500">
          <div className="bg-white dark:bg-slate-900 rounded-[3.5rem] w-full max-w-2xl overflow-hidden shadow-[0_100px_150px_-50px_rgba(0,0,0,0.5)] border border-white/20">
            {/* Wizard Header & Progress */}
            <div className="bg-gold-gradient p-10 text-white relative">
              <div className="flex justify-between items-end mb-8">
                <div>
                  <h3 className="font-serif text-4xl font-bold italic tracking-tight">Archive Wizard</h3>
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] mt-2 opacity-80">Deploying Vault Step {creationStep}/4</p>
                </div>
                <button onClick={() => { setIsCreatingFolder(false); resetFolderForm(); }} className="text-white/50 hover:text-white transition-colors mb-2"><X size={28}/></button>
              </div>
              <div className="flex gap-2 h-1 bg-white/20 rounded-full overflow-hidden">
                 {[1,2,3,4].map(s => (
                   <div key={s} className={`flex-1 transition-all duration-700 ${creationStep >= s ? 'bg-white' : 'bg-transparent'}`} />
                 ))}
              </div>
            </div>

            <div className="p-10 md:p-14 min-h-[400px] flex flex-col">
              <div className="flex-1">
                {creationStep === 1 && (
                  <div className="space-y-8 animate-in slide-in-from-right-4 fade-in duration-500">
                    <div className="flex items-center gap-4 mb-2">
                       <div className="p-3 bg-gold-50 dark:bg-slate-800 rounded-2xl text-gold-600"><Plus size={24}/></div>
                       <h4 className="text-2xl font-bold tracking-tight">Project Identity</h4>
                    </div>
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[11px] font-black text-gold-600 uppercase tracking-widest ml-1">Archive Name</label>
                        <input autoFocus className="w-full px-8 py-5 rounded-3xl bg-slate-50 dark:bg-slate-800 border-none font-bold text-lg outline-none focus:bg-white dark:focus:bg-slate-700 transition-all border-2 border-transparent focus:border-gold-100" value={fName} onChange={e => setFName(e.target.value)} placeholder="e.g., Smith & Johnson Wedding..." />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-black text-gold-600 uppercase tracking-widest ml-1">Production Category</label>
                        <div className="grid grid-cols-2 gap-3">
                          {SERVICES.map(s => (
                            <button key={s} onClick={() => setFService(s)} className={`px-4 py-3 rounded-2xl border-2 text-[10px] font-black uppercase tracking-widest transition-all ${fService === s ? 'bg-gold-500 border-gold-500 text-white shadow-lg shadow-gold-200' : 'bg-slate-50 dark:bg-slate-800 border-transparent text-slate-500'}`}>
                               {s}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {creationStep === 2 && (
                  <div className="space-y-8 animate-in slide-in-from-right-4 fade-in duration-500">
                    <div className="flex items-center gap-4 mb-2">
                       <div className="p-3 bg-indigo-50 dark:bg-slate-800 rounded-2xl text-indigo-600"><ImageIcon size={24}/></div>
                       <h4 className="text-2xl font-bold tracking-tight">Visual Cover</h4>
                    </div>
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[11px] font-black text-gold-600 uppercase tracking-widest ml-1">Thumbnail URI</label>
                        <input autoFocus className="w-full px-8 py-5 rounded-3xl bg-slate-50 dark:bg-slate-800 border-none font-bold outline-none focus:bg-white dark:focus:bg-slate-700 transition-all border-2 border-transparent focus:border-gold-100" value={fThumb} onChange={e => setFThumb(e.target.value)} placeholder="Unsplash or direct image link..." />
                      </div>
                      <div className="aspect-video w-full rounded-[2.5rem] bg-slate-100 dark:bg-slate-800 overflow-hidden border-2 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center relative">
                        {fThumb ? (
                          <img src={fThumb} className="w-full h-full object-cover" alt="Preview" onError={() => alert('Invalid image link.')}/>
                        ) : (
                          <span className="text-xs font-black uppercase tracking-widest text-slate-400">Preview Placeholder</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {creationStep === 3 && (
                  <div className="space-y-8 animate-in slide-in-from-right-4 fade-in duration-500">
                    <div className="flex items-center gap-4 mb-2">
                       <div className="p-3 bg-emerald-50 dark:bg-slate-800 rounded-2xl text-emerald-600"><Lock size={24}/></div>
                       <h4 className="text-2xl font-bold tracking-tight">Security Vault</h4>
                    </div>
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[11px] font-black text-gold-600 uppercase tracking-widest ml-1">Access Key</label>
                        <input autoFocus className="w-full px-8 py-5 rounded-3xl bg-slate-50 dark:bg-slate-800 border-none font-bold outline-none focus:bg-white dark:focus:bg-slate-700 transition-all border-2 border-transparent focus:border-gold-100" value={fPass} onChange={e => setFPass(e.target.value)} placeholder="Required for private access..." />
                      </div>
                      <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-700">
                        <div className="relative">
                            <input type="checkbox" id="isSampleWiz" checked={fIsSample} onChange={e => setFIsSample(e.target.checked)} className="peer appearance-none w-12 h-12 rounded-xl bg-slate-200 dark:bg-slate-700 checked:bg-gold-500 transition-colors cursor-pointer" />
                            <Check className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" size={24} />
                        </div>
                        <label htmlFor="isSampleWiz" className="flex-1 cursor-pointer">
                            <span className="block text-lg font-black uppercase tracking-widest leading-none">Public Portfolio</span>
                            <span className="text-[11px] font-medium text-slate-400 mt-1 block">Allow this archive to be showcased in the samples gallery.</span>
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {creationStep === 4 && (
                  <div className="space-y-8 animate-in slide-in-from-right-4 fade-in duration-500">
                    <div className="flex items-center gap-4 mb-2">
                       <div className="p-3 bg-amber-50 dark:bg-slate-800 rounded-2xl text-amber-600"><Sparkles size={24}/></div>
                       <h4 className="text-2xl font-bold tracking-tight">Review Deployment</h4>
                    </div>
                    <div className="p-8 bg-gold-50/50 dark:bg-slate-800/50 rounded-[2.5rem] border border-gold-100 dark:border-gold-900/50 space-y-6">
                       <div className="space-y-1">
                          <span className="text-[10px] font-black uppercase tracking-widest text-gold-600">Cinematic Welcome (AI Generated)</span>
                          <p className="font-serif italic text-xl leading-relaxed">"{isAiGenerating ? 'Consulting Production AI...' : fDescription}"</p>
                       </div>
                       <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gold-100/50">
                          <div>
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">Archive Name</span>
                            <span className="font-bold text-sm">{fName}</span>
                          </div>
                          <div>
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">Category</span>
                            <span className="font-bold text-sm">{fService || 'General'}</span>
                          </div>
                          <div>
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">Security Status</span>
                            <span className="font-bold text-sm text-emerald-500">{fPass ? 'Encrypted' : 'Open'}</span>
                          </div>
                          <div>
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">Portfolio Status</span>
                            <span className="font-bold text-sm">{fIsSample ? 'Featured' : 'Private'}</span>
                          </div>
                       </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-4 mt-12">
                {creationStep > 1 && (
                  <Button variant="outline" className="flex-1 h-16 rounded-[1.5rem] font-black" onClick={prevStep}>
                    <ChevronLeft size={20} className="mr-2"/> PREVIOUS
                  </Button>
                )}
                <Button 
                  variant="gold" 
                  className="flex-2 h-16 rounded-[1.5rem] shadow-2xl font-black text-sm" 
                  isLoading={isAiGenerating} 
                  onClick={creationStep === 4 ? handleCreateFolder : nextStep}
                >
                  {creationStep === 4 ? 'DEPLOY ARCHIVE' : 'CONTINUE'}
                  {creationStep < 4 && <ChevronRight size={20} className="ml-2"/>}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Edit Modal (Standard) */}
      {isEditingFolder && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-500">
          <div className="bg-white dark:bg-slate-900 rounded-[3.5rem] w-full max-w-xl overflow-hidden shadow-2xl border border-white/20">
            <div className="bg-slate-900 p-10 text-white flex justify-between items-center">
               <h3 className="font-serif text-3xl font-bold italic">Edit Portfolio</h3>
               <button onClick={() => { setIsEditingFolder(null); resetFolderForm(); }} className="text-white/50 hover:text-white"><X size={28}/></button>
            </div>
            <div className="p-10 space-y-6">
               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Archive Identity</label>
                  <input className="w-full px-8 py-5 rounded-3xl bg-slate-50 dark:bg-slate-800 border-none font-bold" value={fName} onChange={e => setFName(e.target.value)} />
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Production Statement</label>
                  <textarea rows={3} className="w-full px-8 py-5 rounded-3xl bg-slate-50 dark:bg-slate-800 border-none font-medium text-sm" value={fDescription} onChange={e => setFDescription(e.target.value)} />
               </div>
               <div className="flex gap-4">
                  <Button variant="outline" className="flex-1 h-14 rounded-2xl" onClick={() => setIsEditingFolder(null)}>Discard</Button>
                  <Button variant="gold" className="flex-1 h-14 rounded-2xl" onClick={handleUpdateFolder}>Update Archive</Button>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Deploy Asset Modal */}
      {isAddingFile && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-12 w-full max-w-md shadow-2xl border border-white/20">
            <div className="mb-10 text-center">
              <div className="w-16 h-16 bg-gold-50 dark:bg-gold-900/30 rounded-full flex items-center justify-center mx-auto mb-6 text-gold-500">
                 <LinkIcon size={32} />
              </div>
              <h3 className="font-serif text-4xl font-bold italic tracking-tight">Deploy Production Asset</h3>
              <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 mt-2">Linking high-speed cloud resources</p>
            </div>
            <div className="space-y-6">
               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gold-600 ml-1">Asset Label</label>
                  <input className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none font-bold" placeholder="e.g., Highlight Film (4K)..." value={newFileName} onChange={e => setNewFileName(e.target.value)} />
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gold-600 ml-1">Cloud Source URI</label>
                  <input className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none font-bold" placeholder="Google Drive Link..." value={newFileUrl} onChange={e => setNewFileUrl(e.target.value)} />
               </div>
            </div>
            <div className="flex gap-4 mt-10">
              <Button variant="outline" className="flex-1 h-14 rounded-[1.2rem]" onClick={() => setIsAddingFile(false)}>Cancel</Button>
              <Button variant="gold" className="flex-1 h-14 rounded-[1.2rem] shadow-xl" onClick={handleAddFile}>Deploy Link</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
