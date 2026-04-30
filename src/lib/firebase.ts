import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, updateProfile } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);
export const signOutUser = () => signOut(auth);
export const updateCurrentUserProfile = (profile: { displayName?: string; photoURL?: string }) => {
  if (!auth.currentUser) {
    throw new Error('No authenticated user');
  }

  return updateProfile(auth.currentUser, profile);
};

export async function testConnection() {
  try {
    // Attempt to fetch a non-existent doc to test connectivity and permissions
    await getDocFromServer(doc(db, 'system', 'connectivity'));
  } catch (error: any) {
    if (error?.code === 'failed-precondition' || error?.code === 'permission-denied') {
      // These are "expected" if the doc is truly restricted, 
      // but they still mean we can talk to the server.
      return;
    }
    console.error("Firebase connection test failed: ", error);
    throw error;
  }
}
