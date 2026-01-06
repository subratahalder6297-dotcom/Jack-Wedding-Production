
import { Folder, Review } from '../types';

const FOLDER_KEY = 'jack_production_storage_folders';
const REVIEW_KEY = 'jack_production_storage_reviews';

export const saveFolders = (folders: Folder[]) => {
  localStorage.setItem(FOLDER_KEY, JSON.stringify(folders));
};

export const getFolders = (): Folder[] => {
  const data = localStorage.getItem(FOLDER_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveReviews = (reviews: Review[]) => {
  localStorage.setItem(REVIEW_KEY, JSON.stringify(reviews));
};

export const getReviews = (): Review[] => {
  const data = localStorage.getItem(REVIEW_KEY);
  return data ? JSON.parse(data) : [];
};
