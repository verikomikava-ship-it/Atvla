import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, FacebookAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCkQ9FdXJKKntdXxLDTOBVjC3xC3sepxxU",
  authDomain: "atvla-aadf5.firebaseapp.com",
  projectId: "atvla-aadf5",
  storageBucket: "atvla-aadf5.firebasestorage.app",
  messagingSenderId: "31626545497",
  appId: "1:31626545497:web:ec8154859c53d0635fa448",
  measurementId: "G-DR2DNRCGH0",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
export const facebookProvider = new FacebookAuthProvider();
