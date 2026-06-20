
export interface GDriveFile {
  id: string;
  name: string;
  url: string;
  type: 'video' | 'image' | 'document' | 'other';
  addedAt: number;
  collection?: string;
  duration?: string;
  quality?: string;
  thumbnail?: string;
}

export interface Review {
  id: string;
  name: string;
  text: string;
  stars: number;
  date: number;
}

export interface Folder {
  id: string;
  name: string;
  description?: string;
  password?: string;
  thumbnail?: string; 
  teaserVideoUrl?: string;
  weddingDate?: string;
  venue?: string;
  progressStatus?: string;
  files: GDriveFile[];
  createdAt: number;
  isLocked: boolean;
  serviceType?: string; 
  isSample?: boolean; // New flag to distinguish production samples
}

export type ViewMode = 'admin' | 'client';
