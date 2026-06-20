
import { Folder, Review } from '../types';
import { db } from './firebase';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';

export const saveFolders = async (folders: Folder[]) => {
  for (const folder of folders) {
    await setDoc(doc(collection(db, 'folders'), folder.id), folder);
  }
};

export const deleteFolder = async (id: string) => {
  await deleteDoc(doc(db, 'folders', id));
};

export const getFolders = async (): Promise<Folder[]> => {
  const querySnapshot = await getDocs(collection(db, 'folders'));
  return querySnapshot.docs.map(doc => doc.data() as Folder);
};

export const saveReviews = async (reviews: Review[]) => {
  for (const review of reviews) {
    await setDoc(doc(collection(db, 'reviews'), review.id), review);
  }
};

export const getReviews = async (): Promise<Review[]> => {
  const querySnapshot = await getDocs(collection(db, 'reviews'));
  return querySnapshot.docs.map(doc => doc.data() as Review);
};
