import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDlC-GAtKekX_SPjacRvzg7gKTGGQChpzA",
  authDomain: "business-manager-7d11a.firebaseapp.com",
  projectId: "business-manager-7d11a",
  storageBucket: "business-manager-7d11a.firebasestorage.app",
  messagingSenderId: "655200131586",
  appId: "1:655200131586:web:0b41af39a725542b8ae51b",
  measurementId: "G-785LXLP9X2"
};

export const DB_VERSION = "business-manager-v7-multiuser";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
