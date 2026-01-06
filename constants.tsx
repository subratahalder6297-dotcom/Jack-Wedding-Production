
import React from 'react';
import { Camera, Video, Heart, Baby, Mic, Clapperboard } from 'lucide-react';

export const LOGO_URL = "https://picsum.photos/seed/jackprod/200/200";

// The cartoon picture provided by the user
export const CHARACTER_IMAGE_URL = "https://images.lucidapp.com/v1/assets/95316492-c840-410a-8a3d-4e9415712534/original.png";

// Professional Champagne Gold Palette
export const COLORS = {
  goldPrimary: '#C5A059',
  goldDark: '#8E6D31',
  goldLight: '#E2C792',
  slateDark: '#0F172A',
};

export const CONTACT_INFO = {
  phone: "9330995776",
  formattedPhone: "+91 93309 95776",
  email: "subratahalder6297@email.com",
  facebook: "https://www.facebook.com/share/1EmTehRbZP/"
};

export const SERVICES = [
  "Wedding Shoots",
  "Pre-Wedding Shoots",
  "Engagement",
  "Baby Photoshoot",
  "Podcast"
];

export const SERVICE_OFFERINGS = [
  {
    title: "Wedding Shoots",
    description: "Cinematic capture of your most precious day with high-end production quality and artistic storytelling.",
    icon: <Video className="w-6 h-6" />,
  },
  {
    title: "Pre-Wedding Shoots",
    description: "Creative storytelling sessions at breathtaking locations before you say 'I do'.",
    icon: <Camera className="w-6 h-6" />,
  },
  {
    title: "Engagement",
    description: "Capturing the official beginning of your beautiful journey together with elegance and joy.",
    icon: <Heart className="w-6 h-6" />,
  },
  {
    title: "Baby Photoshoot",
    description: "Adorable and timeless portraits of your little ones in a professional and comfortable setting.",
    icon: <Baby className="w-6 h-6" />,
  },
  {
    title: "Podcast",
    description: "Professional multi-camera podcast production and high-fidelity streaming services.",
    icon: <Mic className="w-6 h-6" />,
  }
];

export const REVIEWS = [
  { name: "Rahul S.", text: "Absolutely stunning work! Jack and his team made our wedding look like a movie.", stars: 5 },
  { name: "Priya M.", text: "The attention to detail in our baby photoshoot was incredible. Highly recommend!", stars: 5 },
  { name: "Vikram K.", text: "Best production house in the city. Professional and creative.", stars: 5 }
];

export const POSTERS = [
  "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1510076857177-7470076d4098?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=600&auto=format&fit=crop"
];

export const LogoComponent = ({ className = "w-16 h-16" }: { className?: string }) => (
  <div className={`relative ${className} flex items-center justify-center`}>
    <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
      <defs>
        <linearGradient id="proGoldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#E2C792" />
          <stop offset="50%" stopColor="#C5A059" />
          <stop offset="100%" stopColor="#8E6D31" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="48" fill="none" stroke="url(#proGoldGradient)" strokeWidth="0.5" />
      <circle cx="50" cy="50" r="44" fill="none" stroke="url(#proGoldGradient)" strokeWidth="1.5" strokeOpacity="0.3" />
    </svg>
    <div className="z-10 text-center">
      <span className="block font-serif text-[10px] font-bold text-[#8E6D31] tracking-tighter leading-none">JACK</span>
      <span className="block text-[5px] text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] leading-none mt-0.5">Production</span>
    </div>
  </div>
);

export const APP_NAME = "Jack Production Storage";
