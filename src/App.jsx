import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, query, onSnapshot, orderBy, doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc, serverTimestamp, where, getDocs, writeBatch } from 'firebase/firestore';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// ============ FIREBASE CONFIG ============
const firebaseConfig = {
  apiKey: "AIzaSyDlC-GAtKekX_SPjacRvzg7gKTGGQChpzA",
  authDomain: "business-manager-7d11a.firebaseapp.com",
  projectId: "business-manager-7d11a",
  storageBucket: "business-manager-7d11a.firebasestorage.app",
  messagingSenderId: "655200131586",
  appId: "1:655200131586:web:0b41af39a725542b8ae51b",
  measurementId: "G-785LXLP9X2"
};
const DB_VERSION = "business-manager-v7-multiuser";
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ============ CONSTANTS ============
const NECK_TYPES = ['গোল গলা', 'ভি গলা', 'ক্রস ভি গলা', 'কলার', 'ভি কলার', 'পাঞ্জাবী কলার'];
const FABRIC_TYPES = ['PP (170-180 GSM)', 'Sugar Mesh', 'Box Mesh', 'Honeycomb', 'Jacquard', 'Brush Jacquard'];
const SIZES = ['M', 'L', 'XL', 'XXL', 'Free Size', 'Mixed'];
const PAYMENT_METHODS = [
  { id: 'Cash', label: 'Cash (নগদ)' },
  { id: 'Bkash', label: 'bKash' },
  { id: 'Nagad', label: 'Nagad' },
  { id: 'Rocket', label: 'Rocket' },
  { id: 'Bank', label: 'Bank' },
];
const EXPENSE_CATEGORIES = ['Rent', 'Electricity', 'Transport', 'Salary', 'Marketing', 'Tea/Snacks', 'Other'];

// ============ HELPERS ============
const safeParse = (val) => { if (val === undefined || val === null || val === '') return 0; const num = parseFloat(String(val)); return isNaN(num) ? 0 : num; };
const formatCurrency = (amount) => new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', minimumFractionDigits: 0 }).format(safeParse(amount)).replace('BDT', '৳');
const resizeImage = (file) => new Promise((resolve) => {
  const reader = new FileReader();
  reader.onload = (event) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 300;
      const scaleSize = MAX_WIDTH / img.width;
      canvas.width = MAX_WIDTH; canvas.height = img.height * scaleSize;
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL(file.type));
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
});
const getDateString = (item) => { if (item?.toDate) return item.toDate(); if (item?.seconds) return new Date(item.seconds * 1000); if (typeof item === 'string') return new Date(item); return new Date(); };

// ============ PATHAO API ============
const getProxyUrl = () => typeof window !== 'undefined' ? `${window.location.origin}/api/pathao` : '/api/pathao';
async function proxyCall(endpoint, token, body, method = 'POST') {
  const res = await fetch(getProxyUrl(), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint, method, body, token }) });
  if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message || err.error || `API Error ${res.status}`); }
  return res.json();
}
const getPathaoToken = async (cred) => { const d = await proxyCall('/aladdin/api/v1/issue-token', undefined, { client_id: cred.clientId, client_secret: cred.clientSecret, username: cred.username, password: cred.password, grant_type: 'password' }); return d.access_token; };
const getPathaoCities = (token) => proxyCall('/aladdin/api/v1/city-list', token, undefined, 'GET');
const getPathaoZones = (token, cityId) => proxyCall(`/aladdin/api/v1/cities/${cityId}/zone-list`, token, undefined, 'GET');
const getPathaoAreas = (token, zoneId) => proxyCall(`/aladdin/api/v1/zones/${zoneId}/area-list`, token, undefined, 'GET');
const createPathaoOrder = (token, payload) => proxyCall('/aladdin/api/v1/orders', token, payload);

// ============ ICONS (SVG) ============
const Icon = ({ d, size = 20, className = '', stroke = 'currentColor', fill = 'none' }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>{typeof d === 'string' ? <path d={d} /> : d}</svg>
);

// Lucide icon paths
const LayoutDashboardIcon = ({ size = 20, className = '' }) => <Icon size={size} className={className} d={<><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></>} />;
const PackageIcon = ({ size = 20, className = '' }) => <Icon size={size} className={className} d={<><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></>} />;
const ShoppingBagIcon = ({ size = 20, className = '' }) => <Icon size={size} className={className} d={<><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></>} />;
const ListIcon = ({ size = 20, className = '' }) => <Icon size={size} className={className} d={<><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></>} />;
const TruckIcon = ({ size = 20, className = '' }) => <Icon size={size} className={className} d={<><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></>} />;
const UsersIcon = ({ size = 20, className = '' }) => <Icon size={size} className={className} d={<><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>} />;
const CreditCardIcon = ({ size = 20, className = '' }) => <Icon size={size} className={className} d={<><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></>} />;
const SettingsIcon = ({ size = 20, className = '' }) => <Icon size={size} className={className} d={<><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></>} />;
const LogOutIcon = ({ size = 20, className = '' }) => <Icon size={size} className={className} d={<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></>} />;
const MapPinIcon = ({ size = 20, className = '' }) => <Icon size={size} className={className} d={<><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></>} />;
const WifiOffIcon = ({ size = 20, className = '' }) => <Icon size={size} className={className} d={<><path d="M12 20h.01"/><path d="M8.5 16.429a5 5 0 0 1 7 0"/><path d="M5 12.859a10 10 0 0 1 5.17-2.69"/><path d="M19 12.859a10 10 0 0 0-2.007-1.523"/><path d="M2 8.82a15 15 0 0 1 4.177-2.643"/><path d="M22 8.82a15 15 0 0 0-11.288-3.764"/><path d="m2 2 20 20"/></>} />;
const PlusIcon = ({ size = 20, className = '' }) => <Icon size={size} className={className} d={<><path d="M5 12h14"/><path d="M12 5v14"/></>} />;
const XIcon = ({ size = 20, className = '' }) => <Icon size={size} className={className} d={<><path d="M18 6 6 18"/><path d="m6 6 12 12"/></>} />;
const PrinterIcon = ({ size = 20, className = '' }) => <Icon size={size} className={className} d={<><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></>} />;
const Trash2Icon = ({ size = 20, className = '' }) => <Icon size={size} className={className} d={<><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></>} />;
const Edit2Icon = ({ size = 20, className = '' }) => <Icon size={size} className={className} d={<><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></>} />;
const SearchIcon = ({ size = 20, className = '' }) => <Icon size={size} className={className} d={<><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></>} />;
const SaveIcon = ({ size = 20, className = '' }) => <Icon size={size} className={className} d={<><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></>} />;
const EyeIcon = ({ size = 20, className = '' }) => <Icon size={size} className={className} d={<><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></>} />;
const EyeOffIcon = ({ size = 20, className = '' }) => <Icon size={size} className={className} d={<><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></>} />;
const TrendingUpIcon = ({ size = 20, className = '' }) => <Icon size={size} className={className} d={<><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></>} />;
const CheckCircle2Icon = ({ size = 20, className = '' }) => <Icon size={size} className={className} d={<><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></>} />;
const FileTextIcon = ({ size = 20, className = '' }) => <Icon size={size} className={className} d={<><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/></>} />;
const CalendarDaysIcon = ({ size = 20, className = '' }) => <Icon size={size} className={className} d={<><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/></>} />;
const AlertCircleIcon = ({ size = 20, className = '' }) => <Icon size={size} className={className} d={<><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></>} />;
const StoreIcon = ({ size = 20, className = '' }) => <Icon size={size} className={className} d={<><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2v0a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12v0a2 2 0 0 1-2-2V7"/></>} />;
const ArrowRightIcon = ({ size = 20, className = '' }) => <Icon size={size} className={className} d={<><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></>} />;
const PhoneIcon = ({ size = 20, className = '' }) => <Icon size={size} className={className} d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />;
const ImagePlusIcon = ({ size = 20, className = '' }) => <Icon size={size} className={className} d={<><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7"/><line x1="16" x2="22" y1="5" y2="5"/><line x1="19" x2="19" y1="2" y2="8"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></>} />;
const Loader2Icon = ({ size = 20, className = '' }) => <Icon size={size} className={className} d="M21 12a9 9 0 1 1-6.219-8.56" />;
const BanknoteIcon = ({ size = 16 }) => <Icon size={size} d={<><rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></>} />;
const SmartphoneIcon = ({ size = 16 }) => <Icon size={size} d={<><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/></>} />;
const LandmarkIcon = ({ size = 16 }) => <Icon size={size} d={<><line x1="3" x2="21" y1="22" y2="22"/><line x1="6" x2="6" y1="18" y2="11"/><line x1="10" x2="10" y1="18" y2="11"/><line x1="14" x2="14" y1="18" y2="11"/><line x1="18" x2="18" y1="18" y2="11"/><polygon points="12 2 20 7 4 7"/></>} />;

const paymentIcons = { Cash: <BanknoteIcon />, Bkash: <SmartphoneIcon />, Nagad: <SmartphoneIcon />, Rocket: <SmartphoneIcon />, Bank: <LandmarkIcon /> };

// ============ NAV ITEMS ============
const NAV_ITEMS = [
  { key: 'dashboard', label: 'ড্যাশবোর্ড', Icon: LayoutDashboardIcon },
  { key: 'inventory', label: 'ইনভেন্টরি', Icon: PackageIcon },
  { key: 'pos', label: 'POS (অর্ডার)', Icon: ShoppingBagIcon },
  { key: 'orders', label: 'অর্ডার লিস্ট', Icon: ListIcon },
  { key: 'supplier', label: 'সাপ্লায়ার', Icon: TruckIcon },
  { key: 'customers', label: 'কাস্টমার ডাটা', Icon: UsersIcon },
  { key: 'expenses', label: 'খরচপাতি', Icon: CreditCardIcon },
  { key: 'settings', label: 'সেটিংস', Icon: SettingsIcon },
];

// ============ AUTH SCREEN ============
const AuthScreen = () => {
  const [view, setView] = useState('login');
  const [formData, setFormData] = useState({ email: '', password: '', shopName: '', address: '', phone: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreateAccount = async (e) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      const uc = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      await setDoc(doc(db, 'artifacts', DB_VERSION, 'users', uc.user.uid, 'settings', 'profile'), { shopName: formData.shopName, address: formData.address, phone: formData.phone, email: formData.email, createdAt: serverTimestamp() });
    } catch { setError("ইমেইলটি ইতিমধ্যে ব্যবহৃত হয়েছে বা পাসওয়ার্ড দুর্বল।"); setLoading(false); }
  };

  const handleLogin = async (e) => {
    e.preventDefault(); setLoading(true); setError('');
    try { await signInWithEmailAndPassword(auth, formData.email, formData.password); }
    catch { setError("ইমেইল বা পাসওয়ার্ড ভুল।"); setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md shadow-2xl border-t-4 border-primary bg-card rounded-2xl p-10">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-gradient-to-br from-primary to-purple-600 rounded-3xl flex items-center justify-center text-primary-foreground mx-auto mb-6 shadow-xl"><StoreIcon size={40} /></div>
          <h1 className="text-3xl font-black text-foreground tracking-tight">Business Manager</h1>
          <p className="text-muted-foreground font-medium">প্রফেশনাল ডিজিটাল পার্টনার</p>
        </div>
        {error && <div className="bg-destructive/10 text-destructive p-4 rounded-xl text-sm mb-8 flex items-center gap-3 border border-destructive/20 animate-pulse"><AlertCircleIcon size={18} /> {error}</div>}
        {view === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2"><label className="text-xs font-bold uppercase tracking-wider text-foreground">ইমেইল</label><input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required placeholder="example@gmail.com" className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm outline-none focus:border-primary" /></div>
            <div className="space-y-2"><label className="text-xs font-bold uppercase tracking-wider text-foreground">পাসওয়ার্ড</label><input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} required className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm outline-none focus:border-primary" /></div>
            <button type="submit" className="w-full py-4 text-lg shadow-lg bg-primary text-primary-foreground rounded-xl font-bold flex items-center justify-center gap-2" disabled={loading}>{loading ? 'লগিন হচ্ছে...' : 'লগিন করুন'} <ArrowRightIcon size={20} /></button>
            <div className="text-center mt-8"><button type="button" onClick={() => setView('signup')} className="text-primary font-bold text-sm hover:underline">নতুন একাউন্ট খুলুন</button></div>
          </form>
        ) : (
          <form onSubmit={handleCreateAccount} className="space-y-5">
            <div className="space-y-2"><label className="text-xs font-bold uppercase tracking-wider text-foreground">দোকানের নাম</label><input value={formData.shopName} onChange={e => setFormData({...formData, shopName: e.target.value})} required className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm outline-none focus:border-primary" /></div>
            <div className="space-y-2"><label className="text-xs font-bold uppercase tracking-wider text-foreground">মোবাইল</label><input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} required className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm outline-none focus:border-primary" /></div>
            <div className="space-y-2"><label className="text-xs font-bold uppercase tracking-wider text-foreground">ঠিকানা</label><input value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} required className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm outline-none focus:border-primary" /></div>
            <div className="space-y-2"><label className="text-xs font-bold uppercase tracking-wider text-foreground">ইমেইল</label><input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm outline-none focus:border-primary" /></div>
            <div className="space-y-2"><label className="text-xs font-bold uppercase tracking-wider text-foreground">পাসওয়ার্ড</label><input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} required placeholder="কমপক্ষে ৬ অক্ষর" className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm outline-none focus:border-primary" /></div>
            <button type="submit" className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-bold" disabled={loading}>{loading ? 'রেজিস্ট্রেশন হচ্ছে...' : 'রেজিস্ট্রেশন করুন'}</button>
            <div className="text-center mt-6"><button type="button" onClick={() => setView('login')} className="text-muted-foreground font-bold text-sm">লগিন করুন</button></div>
          </form>
        )}
      </div>
    </div>
  );
};

// ============ STAT CARD ============
const StatCard = ({ title, value, icon, color, onClick, textColor }) => (
  <div onClick={onClick} className={`bg-card p-6 rounded-3xl shadow-sm border border-border flex items-center gap-5 transition-all hover:shadow-xl hover:-translate-y-1 ${onClick ? 'cursor-pointer' : ''}`}>
    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${color} shadow-sm`}>{icon}</div>
    <div>
      <p className="text-muted-foreground text-[11px] font-black uppercase tracking-widest mb-1">{title}</p>
      <h4 className={`text-2xl font-black leading-none tracking-tighter ${textColor || 'text-foreground'}`}>{value}</h4>
    </div>
  </div>
);

// ============ DASHBOARD VIEW ============
const DashboardView = ({ orders, expenses, supplierPayments }) => {
  const [showProfit, setShowProfit] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [customRange, setCustomRange] = useState({ start: '', end: '' });

  useEffect(() => { let timer; if (showProfit) { timer = setTimeout(() => setShowProfit(false), 5000); } return () => clearTimeout(timer); }, [showProfit]);

  const filteredData = useMemo(() => {
    const now = new Date(); let startDate = null; let endDate = null;
    if (filterType === 'today') { startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()); endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59); }
    else if (filterType === 'week') { startDate = new Date(now); startDate.setDate(now.getDate() - 7); }
    else if (filterType === 'month') { startDate = new Date(now.getFullYear(), now.getMonth(), 1); }
    else if (filterType === 'year') { startDate = new Date(now.getFullYear(), 0, 1); }
    else if (filterType === 'custom' && customRange.start && customRange.end) { startDate = new Date(customRange.start); endDate = new Date(customRange.end); endDate.setHours(23, 59, 59); }
    const filterFn = (item) => { if (filterType === 'all') return true; if (!item.createdAt && !item.date) return false; const itemDate = getDateString(item.createdAt || item.date); if (startDate && endDate) return itemDate >= startDate && itemDate <= endDate; return startDate ? itemDate >= startDate : true; };
    return {
      orders: (orders || []).filter(filterFn), expenses: (expenses || []).filter(filterFn),
      supplierPayments: (supplierPayments || []).filter(p => { const d = p.date ? new Date(p.date) : getDateString(p.createdAt); if (filterType === 'all') return true; if (startDate && endDate) return d >= startDate && d <= endDate; return startDate ? d >= startDate : true; })
    };
  }, [orders, expenses, supplierPayments, filterType, customRange]);

  const stats = useMemo(() => {
    const totalSales = filteredData.orders.reduce((s, o) => s + safeParse(o.totalAmount), 0);
    const totalExpense = filteredData.expenses.reduce((s, e) => s + safeParse(e.amount), 0);
    let totalCOGS = 0; filteredData.orders.forEach(order => { order.items?.forEach(item => { totalCOGS += (safeParse(item.buyPrice) * safeParse(item.qty)); }); });
    const totalSoldCostLifetime = (orders || []).reduce((sum, o) => sum + (o.items?.reduce((s, i) => s + (safeParse(i.buyPrice) * safeParse(i.qty)), 0) || 0), 0);
    const totalSupplierPaidLifetime = (supplierPayments || []).reduce((sum, p) => sum + safeParse(p.amount), 0);
    const supplierDueLifetime = totalSoldCostLifetime - totalSupplierPaidLifetime;
    const periodSupplierPaid = filteredData.supplierPayments.reduce((sum, p) => sum + safeParse(p.amount), 0);
    const netProfit = totalSales - totalCOGS - totalExpense;
    return { totalSales, totalExpense, netProfit, periodSupplierPaid, supplierDueLifetime };
  }, [filteredData, orders, supplierPayments]);

  const chartData = useMemo(() => filteredData.orders.slice(-7).map(o => ({ name: o.customerName?.slice(0, 5) || 'Guest', sales: safeParse(o.totalAmount) })), [filteredData.orders]);
  const dueOrders = useMemo(() => (orders || []).filter(o => safeParse(o.dueAmount) > 0).sort((a, b) => safeParse(b.dueAmount) - safeParse(a.dueAmount)), [orders]);
  const filters = [{ key: 'all', label: 'সব (All)' }, { key: 'today', label: 'আজ' }, { key: 'week', label: 'এই সপ্তাহ' }, { key: 'month', label: 'এই মাস' }, { key: 'year', label: 'এই বছর' }];

  return (
    <div className="space-y-8">
      <div className="bg-card rounded-2xl border border-border shadow-sm">
        <div className="flex flex-wrap gap-2 items-center justify-between p-4">
          <div className="flex gap-2 flex-wrap">
            {filters.map(f => (<button key={f.key} onClick={() => setFilterType(f.key)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterType === f.key ? 'bg-primary text-primary-foreground shadow-md' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'}`}>{f.label}</button>))}
            <button onClick={() => setFilterType('custom')} className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${filterType === 'custom' ? 'bg-primary text-primary-foreground shadow-md' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'}`}><CalendarDaysIcon size={14} /> কাস্টম</button>
          </div>
          {filterType === 'custom' && (
            <div className="flex gap-2 items-center">
              <div><span className="text-[10px] text-muted-foreground font-bold block">শুরু</span><input type="date" value={customRange.start} onChange={e => setCustomRange({...customRange, start: e.target.value})} className="border border-input p-1.5 rounded-lg text-xs outline-none focus:border-primary bg-background" /></div>
              <span className="text-muted-foreground mt-4">-</span>
              <div><span className="text-[10px] text-muted-foreground font-bold block">শেষ</span><input type="date" value={customRange.end} onChange={e => setCustomRange({...customRange, end: e.target.value})} className="border border-input p-1.5 rounded-lg text-xs outline-none focus:border-primary bg-background" /></div>
            </div>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="মোট বিক্রয়" value={formatCurrency(stats.totalSales)} icon={<ShoppingBagIcon className="text-blue-600" />} color="bg-blue-50" />
        <StatCard title="মোট খরচ" value={formatCurrency(stats.totalExpense)} icon={<CreditCardIcon className="text-red-500" />} color="bg-red-50" />
        <StatCard title="নিট মুনাফা" value={showProfit ? formatCurrency(stats.netProfit) : "****"} icon={showProfit ? <EyeOffIcon className="text-emerald-600" /> : <EyeIcon className="text-emerald-600" />} color="bg-emerald-50" onClick={() => setShowProfit(!showProfit)} />
        <StatCard title="মোট অর্ডার" value={filteredData.orders.length} icon={<FileTextIcon className="text-primary" />} color="bg-indigo-50" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <StatCard title="সাপ্লায়ার পরিশোধ (ফিল্টার)" value={formatCurrency(stats.periodSupplierPaid)} icon={<CheckCircle2Icon className="text-teal-600" />} color="bg-teal-50" />
        <StatCard title="সাপ্লায়ার মোট বকেয়া (লাইফটাইম)" value={formatCurrency(stats.supplierDueLifetime)} icon={<TruckIcon className="text-orange-600" />} color="bg-orange-50" textColor="text-orange-600" />
      </div>
      <div className="bg-card rounded-2xl shadow-lg border border-border p-6">
        <h3 className="font-bold text-foreground mb-8 flex items-center gap-2 text-lg"><TrendingUpIcon size={24} className="text-primary" /> বিক্রয় গ্রাফ</h3>
        <div style={{ height: '300px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ bottom: 20, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" /><YAxis /><Tooltip />
              <Area type="monotone" dataKey="sales" stroke="hsl(239, 84%, 67%)" fill="hsl(239, 84%, 67%, 0.1)" strokeWidth={4} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      {dueOrders.length > 0 && (
        <div className="bg-card rounded-2xl shadow-lg border border-border p-6">
          <h3 className="font-bold text-foreground mb-6 flex items-center gap-2 text-lg"><AlertCircleIcon size={24} className="text-orange-500" /> বকেয়া তালিকা ({dueOrders.length} জন)</h3>
          <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
            {dueOrders.map(o => (
              <div key={o.id} className="flex items-center justify-between p-4 bg-orange-50/50 rounded-xl border border-orange-100">
                <div><p className="font-bold text-foreground">{o.customerName}</p><p className="text-xs text-muted-foreground">{o.phone} • #{o.id?.slice(-6).toUpperCase()}</p></div>
                <div className="text-right"><p className="text-xs text-muted-foreground">মোট: {formatCurrency(o.totalAmount)}</p><p className="text-lg font-black text-orange-600">{formatCurrency(o.dueAmount)} বকেয়া</p></div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ============ INVENTORY VIEW ============
const InventoryView = ({ products, user }) => {
  const [showModal, setShowModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [docId, setDocId] = useState(null);
  const [form, setForm] = useState({ name: '', buyPrice: '', sellPrice: '', stock: '', fabric: FABRIC_TYPES[0], neck: NECK_TYPES[0], image: '' });

  const handleImageUpload = async (e) => { const file = e.target.files?.[0]; if (file) { const resized = await resizeImage(file); setForm({...form, image: resized}); } };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = { name: form.name, buyPrice: safeParse(form.buyPrice), sellPrice: safeParse(form.sellPrice), stock: safeParse(form.stock), fabric: form.fabric, neck: form.neck, image: form.image || '' };
    if (isEdit && docId) await updateDoc(doc(db, 'artifacts', DB_VERSION, 'users', user.uid, 'products', docId), data);
    else await addDoc(collection(db, 'artifacts', DB_VERSION, 'users', user.uid, 'products'), {...data, createdAt: serverTimestamp()});
    setShowModal(false); setIsEdit(false); setForm({ name: '', buyPrice: '', sellPrice: '', stock: '', fabric: FABRIC_TYPES[0], neck: NECK_TYPES[0], image: '' });
  };

  const handleEdit = (p) => { setForm({ name: p.name, buyPrice: String(p.buyPrice), sellPrice: String(p.sellPrice), stock: String(p.stock), fabric: p.fabric, neck: p.neck, image: p.image || '' }); setDocId(p.id); setIsEdit(true); setShowModal(true); };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-foreground">ইনভেন্টরি ম্যানেজমেন্ট</h2>
        <button onClick={() => { setShowModal(true); setIsEdit(false); setForm({ name: '', buyPrice: '', sellPrice: '', stock: '', fabric: FABRIC_TYPES[0], neck: NECK_TYPES[0], image: '' }); }} className="bg-primary text-primary-foreground px-4 py-2 rounded-xl font-bold flex items-center gap-2"><PlusIcon size={18} /> নতুন পণ্য</button>
      </div>
      <div className="bg-card rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm border-collapse">
          <thead className="bg-secondary border-b border-border uppercase text-[11px] font-black text-muted-foreground tracking-wider">
            <tr><th className="p-5">পণ্যের বিবরণ</th><th className="p-5">বৈশিষ্ট্য</th><th className="p-5 text-right">দাম (৳)</th><th className="p-5 text-center">স্টক</th><th className="p-5 text-right">একশন</th></tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {(products || []).map(p => (
              <tr key={p.id} className="hover:bg-secondary/50 transition group">
                <td className="p-5"><div className="flex items-center gap-3">{p.image ? <img src={p.image} className="w-12 h-12 rounded-xl object-cover border border-border" /> : <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center"><PackageIcon size={20} className="text-muted-foreground" /></div>}<p className="font-bold text-foreground text-base">{p.name}</p></div></td>
                <td className="p-5"><div className="flex gap-2 flex-wrap"><span className="px-2.5 py-1 bg-primary/10 text-primary rounded-lg text-[10px] font-bold border border-primary/20">{p.fabric}</span><span className="px-2.5 py-1 bg-secondary text-muted-foreground rounded-lg text-[10px] font-bold border border-border">{p.neck}</span></div></td>
                <td className="p-5 text-right"><p className="text-xs text-muted-foreground font-medium">In: {formatCurrency(p.buyPrice)}</p><p className="font-black text-primary text-base">Out: {formatCurrency(p.sellPrice)}</p></td>
                <td className="p-5 text-center"><span className={`px-4 py-1.5 rounded-full font-black text-xs ${parseInt(String(p.stock)) < 5 ? 'bg-destructive/10 text-destructive' : 'bg-emerald-50 text-emerald-600'}`}>{p.stock}</span></td>
                <td className="p-5 text-right"><div className="flex justify-end gap-2"><button onClick={() => handleEdit(p)} className="p-2 bg-secondary hover:bg-secondary/80 rounded-lg text-muted-foreground transition"><Edit2Icon size={16} /></button><button onClick={() => deleteDoc(doc(db, 'artifacts', DB_VERSION, 'users', user.uid, 'products', p.id))} className="p-2 bg-destructive/10 hover:bg-destructive/20 rounded-lg text-destructive transition"><Trash2Icon size={16} /></button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showModal && (
        <div className="fixed inset-0 bg-foreground/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg shadow-2xl bg-card rounded-2xl p-8">
            <div className="flex justify-between items-center mb-8"><h3 className="font-black text-2xl text-foreground">{isEdit ? 'পণ্য আপডেট' : 'নতুন পণ্য'}</h3><button onClick={() => setShowModal(false)} className="p-2 hover:bg-secondary rounded-full"><XIcon /></button></div>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2"><label className="text-sm font-bold text-foreground">নাম</label><input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm outline-none focus:border-primary" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><label className="text-sm font-bold text-foreground">কাপড়</label><select value={form.fabric} onChange={e => setForm({...form, fabric: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm">{FABRIC_TYPES.map(f => <option key={f} value={f}>{f}</option>)}</select></div>
                <div className="space-y-2"><label className="text-sm font-bold text-foreground">গলা</label><select value={form.neck} onChange={e => setForm({...form, neck: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm">{NECK_TYPES.map(n => <option key={n} value={n}>{n}</option>)}</select></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2"><label className="text-sm font-bold text-foreground">কেনা</label><input type="number" value={form.buyPrice} onChange={e => setForm({...form, buyPrice: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm outline-none focus:border-primary" /></div>
                <div className="space-y-2"><label className="text-sm font-bold text-foreground">বেচা</label><input type="number" value={form.sellPrice} onChange={e => setForm({...form, sellPrice: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm outline-none focus:border-primary" /></div>
                <div className="space-y-2"><label className="text-sm font-bold text-foreground">স্টক</label><input type="number" value={form.stock} onChange={e => setForm({...form, stock: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm outline-none focus:border-primary" /></div>
              </div>
              <div className="space-y-2"><label className="text-sm font-bold text-foreground">পণ্যের ছবি</label><div className="flex items-center gap-4">{form.image && <img src={form.image} className="w-16 h-16 rounded-xl object-cover border border-border" />}<input type="file" accept="image/*" onChange={handleImageUpload} className="text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20" /></div></div>
              <button type="submit" className="w-full mt-4 py-4 text-lg bg-primary text-primary-foreground rounded-xl font-bold">সংরক্ষণ করুন</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// ============ INVOICE MODAL ============
const InvoiceModal = ({ order, shopProfile, onClose }) => {
  const printRef = useRef(null);
  const [previewImage, setPreviewImage] = useState(null);

  const handlePrint = () => {
    const content = printRef.current?.innerHTML; if (!content) return;
    const win = window.open('', '', 'height=1123,width=794'); if (!win) return;
    win.document.write(`<html><head><title>Invoice</title><style>@media print { body { margin: 0; } @page { margin: 10mm; } .no-print { display: none; } } body { font-family: 'Segoe UI', sans-serif; } table { border-collapse: collapse; width: 100%; } th, td { padding: 10px 12px; text-align: left; } th { background: #1e293b; color: white; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; } td { border-bottom: 1px solid #f1f5f9; font-size: 13px; } .text-right { text-align: right; } .text-center { text-align: center; } .font-black { font-weight: 900; } .text-sm { font-size: 13px; } .text-xs { font-size: 11px; } .mb-2 { margin-bottom: 8px; } .mt-4 { margin-top: 16px; } .p-4 { padding: 16px; } .border-t { border-top: 2px solid #1e293b; } .text-muted { color: #94a3b8; } .text-primary { color: #6366f1; } .text-success { color: #10b981; } .text-danger { color: #f43f5e; } .bg-light { background: #f8fafc; } .rounded { border-radius: 12px; } .flex { display: flex; } .justify-between { justify-content: space-between; } .items-center { align-items: center; } .gap-4 { gap: 16px; } .w-full { width: 100%; }</style></head><body>${content}</body></html>`);
    win.document.close(); setTimeout(() => win.print(), 500);
  };

  const dateStr = order.orderDate || (order.createdAt ? getDateString(order.createdAt).toLocaleDateString('bn-BD') : new Date().toLocaleDateString('bn-BD'));
  const due = safeParse(order.totalAmount) - safeParse(order.paidAmount);
  const paymentMethodLabels = { Cash: 'নগদ (Cash)', Bkash: 'বিকাশ (bKash)', Nagad: 'নগদ (Nagad)', Rocket: 'রকেট (Rocket)', Bank: 'ব্যাংক (Bank)' };

  return (
    <div className="fixed inset-0 bg-foreground/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-card rounded-xl max-w-2xl w-full flex flex-col max-h-[90vh] shadow-2xl">
        <div className="p-5 border-b border-border flex justify-between items-center bg-secondary font-bold rounded-t-xl no-print">
          <span>ইনভয়েস প্রিভিউ</span>
          <div className="flex gap-3"><button onClick={handlePrint} className="bg-primary text-primary-foreground px-4 py-2 rounded-xl font-bold flex items-center gap-2"><PrinterIcon size={18} /> প্রিন্ট</button><button onClick={onClose} className="p-2 hover:bg-secondary rounded-full"><XIcon size={20} /></button></div>
        </div>
        <div className="overflow-y-auto p-10 bg-card" ref={printRef}>
          <div style={{ borderBottom: '3px solid #1e293b', paddingBottom: '24px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {shopProfile.logo && <img src={shopProfile.logo} style={{ width: '60px', height: '60px', borderRadius: '12px', objectFit: 'cover', border: '2px solid #e2e8f0' }} />}
              <div><h1 style={{ fontSize: '28px', fontWeight: 900, color: '#6366f1', letterSpacing: '-1px', marginBottom: '4px' }}>{shopProfile.shopName}</h1><p style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>{shopProfile.address}</p><p style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>📞 {shopProfile.phone}</p></div>
            </div>
            <div style={{ textAlign: 'right' }}><h2 style={{ fontSize: '32px', fontWeight: 900, color: '#cbd5e1', letterSpacing: '4px' }}>INVOICE</h2><p style={{ fontWeight: 700, color: '#1e293b', fontSize: '16px', marginTop: '4px' }}>#INV-{order.id?.slice(-6).toUpperCase()}</p><p style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 700 }}>তারিখ: {dateStr}</p></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
            <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <p style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '8px' }}>বিল প্রাপক</p>
              <p style={{ fontSize: '18px', fontWeight: 900, color: '#1e293b' }}>{order.customerName}</p><p style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>📞 {order.phone}</p>
              {order.address && <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>📍 {order.address}</p>}
            </div>
            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-end', gap: '8px' }}>
              <div><p style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>পেমেন্ট স্ট্যাটাস</p><span style={{ fontSize: '18px', fontWeight: 900, color: order.status === 'Paid' ? '#10b981' : '#f43f5e' }}>{order.status === 'Paid' ? '✅ পরিশোধিত' : '⏳ বকেয়া আছে'}</span></div>
              {order.lastPaymentMethod && <div><p style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>পেমেন্ট মাধ্যম</p><span style={{ fontSize: '14px', fontWeight: 800, color: '#6366f1' }}>{paymentMethodLabels[order.lastPaymentMethod] || order.lastPaymentMethod}</span></div>}
            </div>
          </div>
          <table style={{ width: '100%', marginBottom: '24px', borderCollapse: 'collapse' }}>
            <thead><tr style={{ background: '#1e293b', color: 'white' }}><th style={{ padding: '12px 16px', textAlign: 'left', borderRadius: '8px 0 0 0', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px' }}>পণ্য</th><th style={{ padding: '12px', textAlign: 'center', fontSize: '11px', textTransform: 'uppercase' }}>সাইজ</th><th style={{ padding: '12px', textAlign: 'center', fontSize: '11px', textTransform: 'uppercase' }}>পরিমাণ</th><th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '11px', textTransform: 'uppercase' }}>দর</th><th style={{ padding: '12px 16px', textAlign: 'right', borderRadius: '0 8px 0 0', fontSize: '11px', textTransform: 'uppercase' }}>মোট</th></tr></thead>
            <tbody>
              {order.items?.map((i, idx) => (
                <React.Fragment key={idx}>
                  <tr style={{ borderBottom: i.designImage ? 'none' : '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: '#334155' }}><div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>{i.image && <img src={i.image} style={{ width: '36px', height: '36px', borderRadius: '6px', objectFit: 'cover', border: '1px solid #e2e8f0' }} />}<span>{i.name}</span></div></td>
                    <td style={{ padding: '12px', textAlign: 'center', fontWeight: 600, color: '#64748b' }}>{i.size}</td>
                    <td style={{ padding: '12px', textAlign: 'center', fontWeight: 900 }}>{i.qty}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>{formatCurrency(i.sellPrice)}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 900, letterSpacing: '-0.5px' }}>{formatCurrency(safeParse(i.sellPrice) * safeParse(i.qty))}</td>
                  </tr>
                  {i.designImage && (
                    <tr style={{ borderBottom: '1px solid #f1f5f9' }}><td colSpan={5} style={{ padding: '4px 16px 12px' }}><div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ fontSize: '10px', fontWeight: 700, color: '#6366f1', textTransform: 'uppercase' }}>ডিজাইন:</span><img src={i.designImage} style={{ width: '80px', height: '80px', borderRadius: '8px', objectFit: 'cover', border: '2px solid #6366f1', cursor: 'pointer' }} title="বড় করে দেখতে ক্লিক করুন" onClick={() => setPreviewImage(i.designImage)} /></div></td></tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ width: '280px', background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontWeight: 700, fontSize: '13px', marginBottom: '8px' }}><span>সাব-টোটাল</span><span style={{ fontWeight: 900 }}>{formatCurrency(order.subTotal)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontWeight: 700, fontSize: '13px', paddingBottom: '12px', borderBottom: '1px solid #e2e8f0' }}><span>ডেলিভারি চার্জ</span><span style={{ fontWeight: 900 }}>{formatCurrency(order.deliveryCharge)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: '18px', color: '#1e293b', paddingTop: '12px', letterSpacing: '-0.5px' }}><span>মোট বিল</span><span>{formatCurrency(order.totalAmount)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '14px', color: '#10b981', marginTop: '8px' }}><span>পরিশোধিত</span><span>- {formatCurrency(order.paidAmount)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: '16px', color: '#f43f5e', paddingTop: '12px', borderTop: '1px solid #e2e8f0', marginTop: '8px', letterSpacing: '-0.5px' }}><span>বকেয়া</span><span>{formatCurrency(due)}</span></div>
            </div>
          </div>
          {order.note && <div style={{ marginTop: '24px', padding: '12px 16px', background: '#fffbeb', borderRadius: '12px', border: '1px solid #fef3c7' }}><p style={{ fontSize: '11px', fontWeight: 800, color: '#d97706', textTransform: 'uppercase', marginBottom: '4px' }}>নোট</p><p style={{ fontSize: '13px', color: '#92400e' }}>{order.note}</p></div>}
          <div style={{ marginTop: '48px', textAlign: 'center', borderTop: '2px dashed #e2e8f0', paddingTop: '24px', opacity: 0.5 }}><p style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '4px', color: '#94a3b8' }}>ব্যবসা করার জন্য ধন্যবাদ</p></div>
        </div>
      </div>
      {previewImage && <div onClick={() => setPreviewImage(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out' }}><img src={previewImage} style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: '12px', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }} /></div>}
    </div>
  );
};

// ============ POS VIEW ============
const POSView = ({ products, user, shopProfile }) => {
  const [cart, setCart] = useState([]);
  const [customer, setCustomer] = useState({ name: '', phone: '', address: '', deliveryCharge: '0', advance: '0' });
  const [filter, setFilter] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [invoiceOrder, setInvoiceOrder] = useState(null);
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [orderNote, setOrderNote] = useState('');

  const addToCart = (p) => { const exist = cart.find(i => i.id === p.id); if (exist) setCart(cart.map(i => i.id === p.id ? {...i, qty: i.qty + 1} : i)); else setCart([...cart, {...p, qty: 1, size: 'Mixed'}]); };
  const addCustomItem = () => { const name = prompt("পণ্যের নাম:"); const price = prompt("দাম:"); if (name && price) setCart([...cart, { id: String(Date.now()), name, sellPrice: safeParse(price), buyPrice: 0, qty: 1, size: 'Mixed', stock: 0, fabric: '', neck: '' }]); };
  const removeFromCart = (id) => setCart(cart.filter(i => i.id !== id));
  const updateQty = (id, val) => setCart(cart.map(i => i.id === id ? {...i, qty: Math.max(1, parseInt(val) || 0)} : i));
  const incrementQty = (id, d) => setCart(cart.map(i => i.id === id ? {...i, qty: Math.max(1, i.qty + d)} : i));
  const updateSize = (id, s) => setCart(cart.map(i => i.id === id ? {...i, size: s} : i));
  const updatePrice = (id, p) => setCart(cart.map(i => i.id === id ? {...i, sellPrice: safeParse(p)} : i));

  const handleDesignImage = (id, file) => {
    const reader = new FileReader();
    reader.onload = (e) => { const img = new Image(); img.onload = () => { const canvas = document.createElement('canvas'); const max = 300; let w = img.width, h = img.height; if (w > max || h > max) { const r = Math.min(max / w, max / h); w *= r; h *= r; } canvas.width = w; canvas.height = h; canvas.getContext('2d')?.drawImage(img, 0, 0, w, h); const base64 = canvas.toDataURL('image/jpeg', 0.7); setCart(prev => prev.map(i => i.id === id ? {...i, designImage: base64} : i)); }; img.src = e.target?.result; };
    reader.readAsDataURL(file);
  };

  const financials = useMemo(() => { const subTotal = cart.reduce((s, i) => s + (safeParse(i.sellPrice) * i.qty), 0); const total = subTotal + safeParse(customer.deliveryCharge); const due = total - safeParse(customer.advance); return { subTotal, total, due }; }, [cart, customer]);

  const handleOrder = async () => {
    if (!cart.length || !customer.name || !customer.phone) return alert("কাস্টমার তথ্য দিন");
    const subTotal = cart.reduce((s, i) => s + (safeParse(i.sellPrice) * i.qty), 0);
    const total = subTotal + safeParse(customer.deliveryCharge); const due = total - safeParse(customer.advance);
    const orderData = { customerName: customer.name, phone: customer.phone, address: customer.address, items: cart.map(i => ({ id: i.id, name: i.name, sellPrice: i.sellPrice, buyPrice: i.buyPrice, qty: i.qty, size: i.size, image: i.image || '', designImage: i.designImage || '' })), subTotal, deliveryCharge: safeParse(customer.deliveryCharge), totalAmount: total, paidAmount: safeParse(customer.advance), dueAmount: due, status: due > 0 ? 'Due' : 'Paid', lastPaymentMethod: paymentMethod, note: orderNote, orderDate, createdAt: serverTimestamp() };
    const ref = await addDoc(collection(db, 'artifacts', DB_VERSION, 'users', user.uid, 'orders'), orderData);
    setInvoiceOrder({...orderData, id: ref.id, createdAt: new Date()});
    setCart([]); setCustomer({ name: '', phone: '', address: '', deliveryCharge: '0', advance: '0' }); setOrderNote('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="relative flex gap-3">
          <div className="relative flex-1"><SearchIcon className="absolute left-4 top-3.5 text-muted-foreground" size={20} /><input type="text" placeholder="পণ্য খুঁজুন..." className="w-full pl-12 pr-4 py-3 rounded-2xl border border-input outline-none focus:border-primary bg-card shadow-sm text-sm" value={filter} onChange={e => setFilter(e.target.value)} /></div>
          <button onClick={addCustomItem} className="border border-input bg-card px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-secondary"><PlusIcon size={18} /> কাস্টম</button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-5 overflow-y-auto pr-2 custom-scrollbar h-[600px]">
          {products.filter(p => p.name.toLowerCase().includes(filter.toLowerCase())).map(p => (
            <div key={p.id} onClick={() => addToCart(p)} className="bg-card p-5 rounded-2xl border border-border cursor-pointer hover:shadow-xl hover:border-primary/30 transition-all group relative overflow-hidden">
              {p.image && <img src={p.image} className="w-full h-24 object-cover rounded-xl mb-3" />}
              <h4 className="font-bold text-base mb-2 text-foreground">{p.name}</h4>
              <div className="flex justify-between items-end"><div><p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">{p.fabric}</p><p className="text-[10px] text-muted-foreground font-bold uppercase">Stock: {p.stock}</p></div><p className="text-primary font-black text-xl">{formatCurrency(p.sellPrice)}</p></div>
              <div className="absolute top-0 right-0 p-2 bg-primary rounded-bl-2xl opacity-0 group-hover:opacity-100 transition"><PlusIcon size={16} className="text-primary-foreground" /></div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-6 shadow-2xl border border-primary/10 h-fit sticky top-4 bg-card rounded-2xl p-6">
        <h3 className="font-black text-lg border-b border-border pb-4 flex items-center gap-2 text-foreground"><ShoppingBagIcon size={20} className="text-primary" /> অর্ডার লিস্ট ({cart.length})</h3>
        <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar max-h-[350px]">
          {cart.map(i => (
            <div key={i.id} className="bg-secondary p-3 rounded-xl border border-border relative group hover:border-primary/20 transition">
              <div className="flex justify-between text-xs mb-2"><div className="flex items-center gap-2">{i.image && <img src={i.image} className="w-8 h-8 rounded object-cover" />}<strong>{i.name}</strong></div><button onClick={() => removeFromCart(i.id)} className="text-destructive/60 hover:text-destructive"><XIcon size={14} /></button></div>
              <div className="flex items-center gap-2 mb-2">
                {i.designImage ? (<div className="relative"><img src={i.designImage} className="w-12 h-12 rounded-lg object-cover border border-border" /><button onClick={() => setCart(cart.map(c => c.id === i.id ? {...c, designImage: undefined} : c))} className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full w-4 h-4 flex items-center justify-center text-[8px]">✕</button></div>)
                : (<label className="flex items-center gap-1 text-[10px] text-primary cursor-pointer border border-dashed border-primary/40 rounded-lg px-2 py-1 hover:bg-primary/5 transition"><ImagePlusIcon size={14} /> ডিজাইন ছবি<input type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) handleDesignImage(i.id, e.target.files[0]); }} /></label>)}
              </div>
              <div className="flex justify-between items-center gap-2">
                <select value={i.size} onChange={e => updateSize(i.id, e.target.value)} className="text-[10px] border border-input p-1 rounded font-bold bg-background">{SIZES.map(s => <option key={s} value={s}>{s}</option>)}</select>
                <div className="flex items-center bg-card border border-input rounded-lg px-1 gap-1 h-7"><button onClick={() => incrementQty(i.id, -1)} className="px-2 text-primary font-bold hover:bg-secondary h-full rounded-l">-</button><input type="number" value={i.qty} onChange={e => updateQty(i.id, e.target.value)} className="w-10 text-center text-xs font-bold outline-none border-x border-input h-full bg-background" /><button onClick={() => incrementQty(i.id, 1)} className="px-2 text-primary font-bold hover:bg-secondary h-full rounded-r">+</button></div>
                <div className="flex flex-col items-end"><span className="text-[10px] text-muted-foreground">Rate</span><input type="number" value={i.sellPrice} onChange={e => updatePrice(i.id, e.target.value)} className="w-12 text-right font-black text-xs bg-transparent outline-none border-b border-dashed border-muted-foreground focus:border-primary" /></div>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-4 border-t border-border pt-4 text-xs">
          <div className="flex gap-3">
            <div className="flex-1 space-y-1"><label className="text-[10px] font-bold text-foreground">নাম</label><input placeholder="নাম" value={customer.name} onChange={e => setCustomer({...customer, name: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm outline-none focus:border-primary" /></div>
            <div className="flex-1 space-y-1"><label className="text-[10px] font-bold text-foreground">মোবাইল</label><input placeholder="মোবাইল" value={customer.phone} onChange={e => setCustomer({...customer, phone: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm outline-none focus:border-primary" /></div>
          </div>
          <div className="space-y-1"><label className="text-[10px] font-bold text-foreground">ঠিকানা</label><textarea placeholder="ঠিকানা" value={customer.address} onChange={e => setCustomer({...customer, address: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm resize-none" rows={2} /></div>
          <div className="space-y-1"><label className="text-[10px] font-bold text-foreground">অর্ডারের তারিখ</label><input type="date" value={orderDate} onChange={e => setOrderDate(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm outline-none focus:border-primary" /></div>
          <div className="space-y-1"><label className="text-[10px] font-bold text-foreground">নোট</label><textarea placeholder="অতিরিক্ত নোট..." value={orderNote} onChange={e => setOrderNote(e.target.value)} className="w-full px-4 py-2 rounded-xl border border-input bg-background text-sm resize-none" rows={2} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><label className="text-[10px] font-bold text-foreground">ডেলিভারি</label><input type="number" value={customer.deliveryCharge} onChange={e => setCustomer({...customer, deliveryCharge: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm outline-none focus:border-primary" /></div>
            <div className="space-y-1"><label className="text-[10px] font-bold text-foreground">অ্যাডভান্স</label><input type="number" value={customer.advance} onChange={e => setCustomer({...customer, advance: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm outline-none focus:border-primary" /></div>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {PAYMENT_METHODS.map(m => (<button key={m.id} onClick={() => setPaymentMethod(m.id)} className={`p-2 text-[10px] font-bold border border-input rounded-lg flex flex-col items-center gap-1 transition ${paymentMethod === m.id ? 'bg-primary text-primary-foreground shadow-md scale-105' : 'hover:bg-secondary'}`}>{paymentIcons[m.id]}{m.label}</button>))}
          </div>
          <div className="flex justify-between font-black text-xl border-t border-border pt-4 text-foreground"><span>মোট বিল:</span><span>{formatCurrency(financials.total)}</span></div>
          <button onClick={handleOrder} className="w-full py-4 shadow-xl text-lg font-bold bg-primary text-primary-foreground rounded-xl">অর্ডার কনফার্ম</button>
        </div>
      </div>
      {invoiceOrder && <InvoiceModal order={invoiceOrder} shopProfile={shopProfile} onClose={() => setInvoiceOrder(null)} />}
    </div>
  );
};

// ============ COURIER BOOKING MODAL ============
const CourierBookingModal = ({ order, user, credentials, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('form');
  const [trackingId, setTrackingId] = useState('');
  const [consignmentId, setConsignmentId] = useState('');
  const [cities, setCities] = useState([]);
  const [zones, setZones] = useState([]);
  const [areas, setAreas] = useState([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [cityId, setCityId] = useState(0);
  const [zoneId, setZoneId] = useState(0);
  const [areaId, setAreaId] = useState(0);
  const [weight, setWeight] = useState('0.5');
  const [codAmount, setCodAmount] = useState(String(order.dueAmount > 0 ? order.dueAmount : 0));
  const [instruction, setInstruction] = useState(order.note || '');
  const [deliveryType, setDeliveryType] = useState(48);

  useEffect(() => { const load = async () => { try { setLoadingLocations(true); const token = await getPathaoToken(credentials); const data = await getPathaoCities(token); setCities(data.data?.data || data.data || []); } catch (e) { alert('পাঠাও সংযোগ ব্যর্থ: ' + e.message); } finally { setLoadingLocations(false); } }; load(); }, [credentials]);
  useEffect(() => { if (!cityId) { setZones([]); setAreas([]); return; } const load = async () => { try { setLoadingLocations(true); const token = await getPathaoToken(credentials); const data = await getPathaoZones(token, cityId); setZones(data.data?.data || data.data || []); setZoneId(0); setAreas([]); setAreaId(0); } catch (e) { console.error(e); } finally { setLoadingLocations(false); } }; load(); }, [cityId]);
  useEffect(() => { if (!zoneId) { setAreas([]); return; } const load = async () => { try { setLoadingLocations(true); const token = await getPathaoToken(credentials); const data = await getPathaoAreas(token, zoneId); setAreas(data.data?.data || data.data || []); setAreaId(0); } catch (e) { console.error(e); } finally { setLoadingLocations(false); } }; load(); }, [zoneId]);

  const handleBookCourier = async () => {
    if (!cityId || !zoneId) return alert('সিটি ও জোন সিলেক্ট করুন');
    setLoading(true);
    try {
      const token = await getPathaoToken(credentials);
      const totalQty = order.items.reduce((s, i) => s + i.qty, 0);
      const itemNames = order.items.map(i => `${i.name} (${i.size}) x${i.qty}`).join(', ');
      const payload = { store_id: parseInt(credentials.storeId || '0'), merchant_order_id: order.id.slice(-8).toUpperCase(), recipient_name: order.customerName, recipient_phone: order.phone, recipient_address: order.address, recipient_city: cityId, recipient_zone: zoneId, ...(areaId ? { recipient_area: areaId } : {}), delivery_type: deliveryType, item_type: 2, special_instruction: instruction, item_quantity: totalQty, item_weight: parseFloat(weight), amount_to_collect: safeParse(codAmount), item_description: itemNames };
      const result = await createPathaoOrder(token, payload);
      const tId = result.data?.tracking_id || result.tracking_id || '';
      const cId = result.data?.consignment_id || result.consignment_id || '';
      await updateDoc(doc(db, 'artifacts', DB_VERSION, 'users', user.uid, 'orders', order.id), { courierStatus: 'Booked', trackingId: tId, consignmentId: String(cId) });
      setTrackingId(tId); setConsignmentId(String(cId)); setStep('success'); onSuccess();
    } catch (e) { alert('বুকিং ব্যর্থ: ' + e.message); } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-foreground/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-lg shadow-2xl my-8 bg-card rounded-2xl p-8">
        <div className="flex justify-between items-center mb-6"><h3 className="font-bold text-xl flex items-center gap-2 text-foreground"><TruckIcon size={22} className="text-primary" /> পাঠাও কুরিয়ার বুকিং</h3><button onClick={onClose} className="p-2 hover:bg-secondary rounded-full"><XIcon size={20} /></button></div>
        {step === 'success' ? (
          <div className="text-center space-y-6 py-8">
            <CheckCircle2Icon size={64} className="mx-auto text-emerald-500" /><h3 className="text-2xl font-black text-foreground">বুকিং সফল! 🎉</h3>
            <div className="bg-secondary p-6 rounded-xl border border-border space-y-3"><div><p className="text-xs text-muted-foreground font-bold uppercase">Tracking ID</p><p className="text-lg font-black text-primary">{trackingId}</p></div><div><p className="text-xs text-muted-foreground font-bold uppercase">Consignment ID</p><p className="text-lg font-black text-foreground">{consignmentId}</p></div></div>
            <button onClick={onClose} className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-bold">বন্ধ করুন</button>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="bg-secondary p-4 rounded-xl border border-border"><div className="flex justify-between text-sm"><span className="font-bold text-foreground">{order.customerName}</span><span className="font-black text-primary">{formatCurrency(order.totalAmount)}</span></div><p className="text-xs text-muted-foreground mt-1">📞 {order.phone}</p><p className="text-xs text-muted-foreground">📍 {order.address}</p></div>
            <div className="space-y-2"><label className="text-sm font-bold text-foreground flex items-center gap-1"><MapPinIcon size={14} /> সিটি</label><select value={cityId} onChange={e => setCityId(Number(e.target.value))} className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm"><option value={0}>সিটি সিলেক্ট করুন</option>{cities.map(c => <option key={c.city_id} value={c.city_id}>{c.city_name}</option>)}</select></div>
            <div className="space-y-2"><label className="text-sm font-bold text-foreground">জোন</label><select value={zoneId} onChange={e => setZoneId(Number(e.target.value))} className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm" disabled={!zones.length}><option value={0}>জোন সিলেক্ট করুন</option>{zones.map(z => <option key={z.zone_id} value={z.zone_id}>{z.zone_name}</option>)}</select></div>
            <div className="space-y-2"><label className="text-sm font-bold text-foreground">এরিয়া (ঐচ্ছিক)</label><select value={areaId} onChange={e => setAreaId(Number(e.target.value))} className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm" disabled={!areas.length}><option value={0}>এরিয়া সিলেক্ট করুন</option>{areas.map(a => <option key={a.area_id} value={a.area_id}>{a.area_name}</option>)}</select></div>
            <div className="space-y-2"><label className="text-sm font-bold text-foreground">ডেলিভারি টাইপ</label><div className="grid grid-cols-2 gap-3"><button onClick={() => setDeliveryType(48)} className={`p-3 rounded-xl border text-sm font-bold transition ${deliveryType === 48 ? 'bg-primary text-primary-foreground border-primary' : 'border-input hover:bg-secondary'}`}>🚚 Normal (48hr)</button><button onClick={() => setDeliveryType(12)} className={`p-3 rounded-xl border text-sm font-bold transition ${deliveryType === 12 ? 'bg-primary text-primary-foreground border-primary' : 'border-input hover:bg-secondary'}`}>⚡ On Demand (12hr)</button></div></div>
            <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><label className="text-sm font-bold text-foreground"><PackageIcon size={14} className="inline mr-1" />ওজন (kg)</label><input type="number" step="0.1" value={weight} onChange={e => setWeight(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm outline-none focus:border-primary" /></div><div className="space-y-2"><label className="text-sm font-bold text-foreground">COD পরিমাণ (৳)</label><input type="number" value={codAmount} onChange={e => setCodAmount(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm outline-none focus:border-primary" /></div></div>
            <div className="space-y-2"><label className="text-sm font-bold text-foreground">বিশেষ নির্দেশনা</label><textarea value={instruction} onChange={e => setInstruction(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm resize-none" rows={2} placeholder="ফ্র্যাজাইল, কল করে যাবেন..." /></div>
            {loadingLocations && <div className="flex items-center gap-2 text-xs text-primary"><Loader2Icon size={14} className="animate-spin" /> লোকেশন লোড হচ্ছে...</div>}
            <button onClick={handleBookCourier} disabled={loading || !cityId || !zoneId} className="w-full py-4 text-lg shadow-xl bg-primary text-primary-foreground rounded-xl font-bold disabled:opacity-50">{loading ? '⏳ বুকিং হচ্ছে...' : '📦 কুরিয়ার বুক করুন'}</button>
          </div>
        )}
      </div>
    </div>
  );
};

// ============ ORDER LIST VIEW ============
const OrderListView = ({ orders, user, shopProfile }) => {
  const [invoice, setInvoice] = useState(null);
  const [editPayment, setEditPayment] = useState(null);
  const [paymentAmt, setPaymentAmt] = useState('');
  const [updatedDelivery, setUpdatedDelivery] = useState('');
  const [editOrder, setEditOrder] = useState(null);
  const [editItems, setEditItems] = useState([]);
  const [editCustomer, setEditCustomer] = useState({ name: '', phone: '', address: '', note: '' });
  const [courierOrder, setCourierOrder] = useState(null);

  useEffect(() => { if (editPayment) setUpdatedDelivery(String(editPayment.deliveryCharge)); }, [editPayment]);
  useEffect(() => { if (editOrder) { setEditItems(editOrder.items?.map(i => ({...i})) || []); setEditCustomer({ name: editOrder.customerName, phone: editOrder.phone, address: editOrder.address, note: editOrder.note || '' }); } }, [editOrder]);

  const handleUpdatePayment = async () => {
    if (!editPayment) return; const amt = safeParse(paymentAmt); const del = safeParse(updatedDelivery);
    const newTotal = safeParse(editPayment.subTotal) + del; const newPaid = safeParse(editPayment.paidAmount) + amt; const newDue = newTotal - newPaid;
    await updateDoc(doc(db, 'artifacts', DB_VERSION, 'users', user.uid, 'orders', editPayment.id), { deliveryCharge: del, totalAmount: newTotal, paidAmount: newPaid, dueAmount: newDue, status: newDue <= 0 ? 'Paid' : 'Due' });
    setEditPayment(null); setPaymentAmt('');
  };

  const handleSaveEditOrder = async () => {
    if (!editOrder) return;
    const subTotal = editItems.reduce((s, i) => s + (safeParse(i.sellPrice) * safeParse(i.qty)), 0);
    const total = subTotal + safeParse(editOrder.deliveryCharge); const newDue = total - safeParse(editOrder.paidAmount);
    await updateDoc(doc(db, 'artifacts', DB_VERSION, 'users', user.uid, 'orders', editOrder.id), { customerName: editCustomer.name, phone: editCustomer.phone, address: editCustomer.address, note: editCustomer.note, items: editItems, subTotal, totalAmount: total, dueAmount: newDue, status: newDue <= 0 ? 'Paid' : 'Due' });
    setEditOrder(null);
  };

  const handleDeleteOrder = async (id) => { if (window.confirm("আপনি কি নিশ্চিত এই অর্ডারটি ডিলিট করতে চান?")) await deleteDoc(doc(db, 'artifacts', DB_VERSION, 'users', user.uid, 'orders', id)); };
  const hasPathaoCredentials = !!(shopProfile.pathaoCredentials?.clientId && shopProfile.pathaoCredentials?.clientSecret);

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-foreground">অর্ডার রেকর্ড</h2>
      <div className="bg-card rounded-2xl shadow-md overflow-hidden">
        <table className="w-full text-left text-sm border-collapse">
          <thead className="bg-secondary border-b border-border uppercase text-[11px] font-black text-muted-foreground tracking-wider">
            <tr><th className="p-5">মেমো</th><th className="p-5">কাস্টমার</th><th className="p-5 text-right w-32">বিল</th><th className="p-5 text-right w-32">বকেয়া</th><th className="p-5 text-center">স্ট্যাটাস</th><th className="p-5 text-center">কুরিয়ার</th><th className="p-5 text-right">একশন</th></tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {orders.map(o => (
              <tr key={o.id} className="hover:bg-secondary/50 transition">
                <td className="p-5"><span className="bg-secondary px-2 py-1 rounded text-xs font-bold text-muted-foreground">#{o.id.slice(-6).toUpperCase()}</span></td>
                <td className="p-5"><p className="font-bold text-foreground">{o.customerName}</p><p className="text-[11px] text-muted-foreground font-medium">{o.phone}</p></td>
                <td className="p-5 text-right font-black text-foreground">{formatCurrency(o.totalAmount)}</td>
                <td className="p-5 text-right font-black text-destructive">{formatCurrency(o.dueAmount)}</td>
                <td className="p-5 text-center"><span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wide ${o.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>{o.status}</span></td>
                <td className="p-5 text-center">
                  {o.trackingId ? (<div className="text-xs"><span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-bold text-[10px]">✅ Booked</span><p className="text-[10px] text-primary font-bold mt-1">{o.trackingId}</p></div>)
                  : hasPathaoCredentials ? (<button onClick={() => setCourierOrder(o)} className="text-primary hover:bg-primary/10 p-2 rounded-lg transition" title="কুরিয়ার বুক"><TruckIcon size={18} /></button>)
                  : (<span className="text-[10px] text-muted-foreground">সেটআপ নেই</span>)}
                </td>
                <td className="p-5 text-right"><div className="flex gap-2 justify-end items-center"><button onClick={() => setInvoice(o)} className="text-primary hover:bg-primary/10 p-2 rounded-lg transition"><PrinterIcon size={18} /></button><button onClick={() => setEditOrder(o)} className="text-amber-600 hover:bg-amber-50 p-2 rounded-lg transition" title="এডিট"><Edit2Icon size={18} /></button><button onClick={() => setEditPayment(o)} className="bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-primary/90 shadow-sm">আপডেট</button><button onClick={() => handleDeleteOrder(o.id)} className="text-destructive hover:bg-destructive/10 p-2 rounded-lg transition"><Trash2Icon size={18} /></button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {invoice && <InvoiceModal order={invoice} shopProfile={shopProfile} onClose={() => setInvoice(null)} />}
      {courierOrder && hasPathaoCredentials && <CourierBookingModal order={courierOrder} user={user} credentials={shopProfile.pathaoCredentials} onClose={() => setCourierOrder(null)} onSuccess={() => setCourierOrder(null)} />}
      {editPayment && (
        <div className="fixed inset-0 bg-foreground/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm shadow-2xl bg-card rounded-2xl p-8">
            <div className="flex justify-between items-center mb-6"><h3 className="font-bold text-lg">পেমেন্ট আপডেট</h3><button onClick={() => setEditPayment(null)} className="p-2 hover:bg-secondary rounded-full"><XIcon size={20} /></button></div>
            <div className="space-y-5">
              <div className="p-4 bg-primary/10 rounded-xl border border-primary/20"><p className="text-xs text-primary font-bold uppercase mb-1">বর্তমান বকেয়া</p><p className="text-2xl font-black text-primary">{formatCurrency(editPayment.dueAmount)}</p></div>
              <div className="space-y-2"><label className="text-sm font-bold text-foreground">ডেলিভারি চার্জ</label><input type="number" value={updatedDelivery} onChange={e => setUpdatedDelivery(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm outline-none focus:border-primary" /></div>
              <div className="space-y-2"><label className="text-sm font-bold text-foreground">জমা পরিমাণ</label><input type="number" value={paymentAmt} onChange={e => setPaymentAmt(e.target.value)} autoFocus placeholder="টাকা লিখুন" className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm outline-none focus:border-primary" /></div>
              <button onClick={handleUpdatePayment} className="w-full mt-2 py-3.5 text-base bg-primary text-primary-foreground rounded-xl font-bold">জমা নিশ্চিত করুন</button>
            </div>
          </div>
        </div>
      )}
      {editOrder && (
        <div className="fixed inset-0 bg-foreground/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-2xl shadow-2xl my-8 bg-card rounded-2xl p-8">
            <div className="flex justify-between items-center mb-6"><h3 className="font-bold text-xl">অর্ডার এডিট — #{editOrder.id.slice(-6).toUpperCase()}</h3><button onClick={() => setEditOrder(null)} className="p-2 hover:bg-secondary rounded-full"><XIcon size={20} /></button></div>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><label className="text-sm font-bold text-foreground">কাস্টমার নাম</label><input value={editCustomer.name} onChange={e => setEditCustomer({...editCustomer, name: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm outline-none focus:border-primary" /></div>
                <div className="space-y-2"><label className="text-sm font-bold text-foreground">ফোন</label><input value={editCustomer.phone} onChange={e => setEditCustomer({...editCustomer, phone: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm outline-none focus:border-primary" /></div>
              </div>
              <div className="space-y-2"><label className="text-sm font-bold text-foreground">ঠিকানা</label><input value={editCustomer.address} onChange={e => setEditCustomer({...editCustomer, address: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm outline-none focus:border-primary" /></div>
              <div className="space-y-2"><label className="text-sm font-bold text-foreground">নোট</label><textarea value={editCustomer.note} onChange={e => setEditCustomer({...editCustomer, note: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm resize-none" rows={2} /></div>
              <div><label className="text-sm font-bold text-foreground mb-3 block">আইটেম সমূহ</label><div className="space-y-3">
                {editItems.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-secondary rounded-xl border border-border">
                    <div className="flex-1"><p className="text-sm font-bold">{item.name}</p></div>
                    <select value={item.size} onChange={e => { const n = [...editItems]; n[idx].size = e.target.value; setEditItems(n); }} className="text-xs border border-input p-1.5 rounded-lg bg-background">{SIZES.map(s => <option key={s} value={s}>{s}</option>)}</select>
                    <input type="number" value={item.qty} onChange={e => { const n = [...editItems]; n[idx].qty = parseInt(e.target.value) || 1; setEditItems(n); }} className="w-16 text-center px-2 py-1.5 rounded-lg border border-input bg-background text-sm" />
                    <input type="number" value={item.sellPrice} onChange={e => { const n = [...editItems]; n[idx].sellPrice = safeParse(e.target.value); setEditItems(n); }} className="w-20 text-right px-2 py-1.5 rounded-lg border border-input bg-background text-sm" />
                    <button onClick={() => setEditItems(editItems.filter((_, i) => i !== idx))} className="p-1 text-destructive hover:bg-destructive/10 rounded"><XIcon size={16} /></button>
                  </div>
                ))}
              </div></div>
              <button onClick={handleSaveEditOrder} className="w-full py-4 text-lg bg-primary text-primary-foreground rounded-xl font-bold">পরিবর্তন সেভ করুন</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============ SUPPLIER VIEW ============
const SupplierView = ({ orders, supplierPayments, user }) => {
  const [form, setForm] = useState({ amount: '', date: '', notes: '' });
  const totalSoldCost = useMemo(() => (orders || []).reduce((sum, o) => sum + (o.items?.reduce((s, i) => s + (safeParse(i.buyPrice) * safeParse(i.qty)), 0) || 0), 0), [orders]);
  const totalPaid = useMemo(() => (supplierPayments || []).reduce((sum, p) => sum + safeParse(p.amount), 0), [supplierPayments]);

  const handleSubmit = async (e) => { e.preventDefault(); await addDoc(collection(db, 'artifacts', DB_VERSION, 'users', user.uid, 'supplier_payments'), { amount: parseFloat(form.amount), date: form.date, notes: form.notes, createdAt: serverTimestamp() }); setForm({ amount: '', date: '', notes: '' }); };
  const handleDelete = async (id) => { if (window.confirm("ডিলেট করবেন?")) await deleteDoc(doc(db, 'artifacts', DB_VERSION, 'users', user.uid, 'supplier_payments', id)); };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-foreground text-background rounded-2xl p-6"><p className="text-muted-foreground text-xs font-bold uppercase mb-1">মোট বিক্রিত পণ্যের কেনা দাম</p><h3 className="text-2xl font-black">{formatCurrency(totalSoldCost)}</h3></div>
          <div className="bg-orange-50 border border-orange-100 rounded-2xl p-6"><p className="text-orange-400 text-xs font-bold uppercase mb-1">সাপ্লায়ার বকেয়া</p><h3 className="text-2xl font-black text-orange-600">{formatCurrency(totalSoldCost - totalPaid)}</h3></div>
        </div>
        <div className="bg-card rounded-2xl border border-border p-6">
          <h3 className="font-bold text-xl mb-6 flex items-center gap-2"><TruckIcon size={24} className="text-primary" /> সাপ্লায়ার পেমেন্ট এন্ট্রি</h3>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2"><label className="text-sm font-bold text-foreground">টাকার পরিমাণ</label><input type="number" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} required placeholder="0.00" className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm outline-none focus:border-primary" /></div>
            <div className="space-y-2"><label className="text-sm font-bold text-foreground">পরিশোধের তারিখ</label><input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} required className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm outline-none focus:border-primary" /></div>
            <div className="space-y-2"><label className="text-sm font-bold text-foreground">নোট / মন্তব্য</label><textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="বিবরণ..." className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm resize-none" rows={3} /></div>
            <button type="submit" className="w-full py-4 shadow-lg text-lg bg-primary text-primary-foreground rounded-xl font-bold">পেমেন্ট সেভ করুন</button>
          </form>
        </div>
      </div>
      <div className="space-y-4">
        <h3 className="font-bold text-xl">পেমেন্ট হিস্ট্রি</h3>
        <div className="space-y-3 h-[500px] overflow-y-auto pr-2 custom-scrollbar">
          {supplierPayments.map(p => (
            <div key={p.id} className="bg-card p-5 rounded-2xl border border-border flex justify-between items-center shadow-sm">
              <div><p className="font-bold text-foreground">{p.date}</p><p className="text-xs text-muted-foreground">{p.notes || 'No notes'}</p></div>
              <div className="flex items-center gap-4"><span className="text-emerald-600 font-black text-xl">{formatCurrency(p.amount)}</span><button onClick={() => handleDelete(p.id)} className="p-2 bg-destructive/10 text-destructive rounded-lg hover:bg-destructive/20"><Trash2Icon size={16} /></button></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============ CUSTOMER VIEW ============
const CustomerView = ({ orders, user }) => {
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [formData, setFormData] = useState({ name: '', phone: '', address: '' });
  const customers = useMemo(() => {
    const map = {};
    orders.forEach(o => { if (!map[o.phone]) map[o.phone] = { name: o.customerName, phone: o.phone, address: o.address, totalOrders: 0, totalSpent: 0 }; map[o.phone].totalOrders += 1; map[o.phone].totalSpent += safeParse(o.totalAmount); });
    return Object.values(map);
  }, [orders]);

  const handleEditStart = (c) => { setEditingCustomer(c.phone); setFormData({ name: c.name, phone: c.phone, address: c.address }); };
  const handleUpdateCustomer = async () => {
    if (!editingCustomer) return;
    const batch = writeBatch(db);
    const q = query(collection(db, 'artifacts', DB_VERSION, 'users', user.uid, 'orders'), where("phone", "==", editingCustomer));
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((d) => { batch.update(d.ref, { customerName: formData.name, phone: formData.phone, address: formData.address }); });
    await batch.commit(); setEditingCustomer(null);
  };
  const handleDeleteCustomer = async (phone) => { if (window.confirm("সাবধান! এই কাস্টমারের সব অর্ডার ডিলিট হয়ে যাবে।")) { const co = orders.filter(o => o.phone === phone); for (const o of co) await deleteDoc(doc(db, 'artifacts', DB_VERSION, 'users', user.uid, 'orders', o.id)); } };

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-foreground">কাস্টমার ডাটাবেজ</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {customers.map((c, i) => (
          <div key={i} className="bg-card rounded-2xl border border-border p-6 hover:shadow-xl transition group relative">
            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition"><button onClick={() => handleEditStart(c)} className="text-primary/60 hover:text-primary"><Edit2Icon size={16} /></button><button onClick={() => handleDeleteCustomer(c.phone)} className="text-muted-foreground hover:text-destructive"><Trash2Icon size={16} /></button></div>
            <div className="flex items-start justify-between mb-4"><div className="w-12 h-12 bg-gradient-to-br from-primary to-purple-500 rounded-full flex items-center justify-center text-primary-foreground font-bold text-xl">{c.name.charAt(0)}</div><span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-black">{c.totalOrders} Orders</span></div>
            <h3 className="font-bold text-lg text-foreground">{c.name}</h3><p className="text-sm text-muted-foreground flex items-center gap-1 mb-1"><PhoneIcon size={14} /> {c.phone}</p><p className="text-xs text-muted-foreground truncate mb-4">{c.address}</p>
            <div className="pt-4 border-t border-border flex justify-between items-center"><span className="text-xs font-bold text-muted-foreground uppercase">Total Spent</span><span className="text-lg font-black text-foreground">{formatCurrency(c.totalSpent)}</span></div>
          </div>
        ))}
      </div>
      {editingCustomer && (
        <div className="fixed inset-0 bg-foreground/60 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md shadow-2xl bg-card rounded-2xl p-8">
            <div className="flex justify-between mb-4"><h3 className="font-bold text-lg">এডিট কাস্টমার</h3><button onClick={() => setEditingCustomer(null)}><XIcon /></button></div>
            <div className="space-y-4">
              <div className="space-y-2"><label className="text-sm font-bold text-foreground">নাম</label><input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm outline-none focus:border-primary" /></div>
              <div className="space-y-2"><label className="text-sm font-bold text-foreground">ফোন</label><input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm outline-none focus:border-primary" /></div>
              <div className="space-y-2"><label className="text-sm font-bold text-foreground">ঠিকানা</label><textarea value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm resize-none" rows={3} /></div>
              <button onClick={handleUpdateCustomer} className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold">আপডেট করুন</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============ EXPENSE VIEW ============
const ExpenseView = ({ expenses, user }) => {
  const [form, setForm] = useState({ title: '', amount: '', category: 'Marketing', date: new Date().toISOString().split('T')[0] });
  const [editItem, setEditItem] = useState(null);

  const handleSubmit = async (e) => { e.preventDefault(); await addDoc(collection(db, 'artifacts', DB_VERSION, 'users', user.uid, 'expenses'), { title: form.title, amount: safeParse(form.amount), category: form.category, date: form.date, createdAt: serverTimestamp() }); setForm({ title: '', amount: '', category: 'Marketing', date: new Date().toISOString().split('T')[0] }); };
  const handleUpdate = async (e) => { e.preventDefault(); if (!editItem) return; await updateDoc(doc(db, 'artifacts', DB_VERSION, 'users', user.uid, 'expenses', editItem.id), { title: editItem.title, amount: safeParse(editItem.amount), category: editItem.category, date: editItem.date || '' }); setEditItem(null); };
  const handleDelete = async (id) => { if (window.confirm('ডিলেট করবেন?')) await deleteDoc(doc(db, 'artifacts', DB_VERSION, 'users', user.uid, 'expenses', id)); };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="bg-card rounded-2xl border border-border p-6">
        <h3 className="font-bold mb-6 flex items-center gap-2 text-xl"><CreditCardIcon size={24} className="text-destructive" /> খরচ এন্ট্রি</h3>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2"><label className="text-sm font-bold text-foreground">বিবরণ</label><input value={form.title} onChange={e => setForm({...form, title: e.target.value})} required placeholder="কিসের খরচ?" className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm outline-none focus:border-primary" /></div>
          <div className="space-y-2"><label className="text-sm font-bold text-foreground">টাকা</label><input type="number" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} required placeholder="0" className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm outline-none focus:border-primary" /></div>
          <div className="space-y-2"><label className="text-sm font-bold text-foreground">তারিখ</label><input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm outline-none focus:border-primary" /></div>
          <div className="space-y-2"><label className="text-sm font-bold text-foreground">খাত</label><select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm">{EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
          <button type="submit" className="w-full py-4 mt-2 text-lg shadow-lg bg-primary text-primary-foreground rounded-xl font-bold flex items-center justify-center gap-2"><SaveIcon size={20} /> খরচ সেভ করুন</button>
        </form>
      </div>
      <div className="space-y-4">
        <h3 className="font-bold text-xl text-foreground">খরচের তালিকা</h3>
        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
          {expenses.map(ex => (
            <div key={ex.id} className="bg-card p-5 rounded-2xl border border-border flex justify-between items-center shadow-sm hover:shadow-md transition group">
              <div><p className="font-bold text-foreground text-lg">{ex.title}</p><div className="flex gap-2 items-center"><p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">{ex.category}</p>{ex.date && <p className="text-[10px] text-muted-foreground">• {ex.date}</p>}</div></div>
              <div className="flex items-center gap-5"><span className="text-destructive font-black text-xl">-{formatCurrency(ex.amount)}</span><div className="flex gap-1 opacity-0 group-hover:opacity-100 transition"><button onClick={() => setEditItem(ex)} className="p-2 hover:bg-primary/10 rounded-lg text-primary"><Edit2Icon size={18} /></button><button onClick={() => handleDelete(ex.id)} className="p-2 hover:bg-destructive/10 rounded-lg text-destructive"><Trash2Icon size={18} /></button></div></div>
            </div>
          ))}
        </div>
      </div>
      {editItem && (
        <div className="fixed inset-0 bg-foreground/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm shadow-2xl bg-card rounded-2xl p-8">
            <div className="flex justify-between mb-6"><h3 className="font-bold text-lg">এডিট খরচ</h3><button onClick={() => setEditItem(null)}><XIcon size={20} /></button></div>
            <form onSubmit={handleUpdate} className="space-y-5">
              <div className="space-y-2"><label className="text-sm font-bold text-foreground">বিবরণ</label><input value={editItem.title} onChange={e => setEditItem({...editItem, title: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm outline-none focus:border-primary" /></div>
              <div className="space-y-2"><label className="text-sm font-bold text-foreground">টাকা</label><input type="number" value={String(editItem.amount)} onChange={e => setEditItem({...editItem, amount: safeParse(e.target.value)})} className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm outline-none focus:border-primary" /></div>
              <div className="space-y-2"><label className="text-sm font-bold text-foreground">তারিখ</label><input type="date" value={editItem.date || ''} onChange={e => setEditItem({...editItem, date: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm outline-none focus:border-primary" /></div>
              <div className="space-y-2"><label className="text-sm font-bold text-foreground">খাত</label><select value={editItem.category} onChange={e => setEditItem({...editItem, category: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm">{EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
              <button type="submit" className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold">আপডেট করুন</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// ============ SETTINGS VIEW ============
const SettingsView = ({ profile, user }) => {
  const [data, setData] = useState(profile);
  const [pathao, setPathao] = useState(profile.pathaoCredentials || { clientId: '', clientSecret: '', username: '', password: '', storeId: '' });

  const handleSave = async (e) => { e.preventDefault(); const saveData = {...data, pathaoCredentials: pathao}; await setDoc(doc(db, 'artifacts', DB_VERSION, 'users', user.uid, 'settings', 'profile'), saveData, { merge: true }); alert("আপনার তথ্য আপডেট হয়েছে!"); };
  const handleLogoUpload = async (e) => { const file = e.target.files?.[0]; if (file) { const resized = await resizeImage(file); setData({...data, logo: resized}); } };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="bg-card rounded-2xl border-t-4 border-primary shadow-2xl p-10">
        <div className="flex items-center gap-5 mb-10 border-b border-border pb-8">
          <div className="w-16 h-16 bg-primary/10 rounded-3xl flex items-center justify-center text-primary border border-primary/20 shadow-sm"><SettingsIcon size={32} /></div>
          <div><h2 className="text-3xl font-black text-foreground">ব্যবসায়িক প্রোফাইল</h2><p className="text-sm text-muted-foreground font-medium">ইনভয়েসে এই তথ্যগুলো ব্যবহার হবে</p></div>
        </div>
        <form onSubmit={handleSave} className="space-y-6">
          <div className="space-y-2"><label className="text-sm font-bold text-foreground">দোকানের লোগো</label><div className="flex items-center gap-4">{data.logo && <img src={data.logo} className="w-20 h-20 rounded-xl object-cover border border-border" />}<input type="file" accept="image/*" onChange={handleLogoUpload} className="text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20" /></div></div>
          <div className="space-y-2"><label className="text-sm font-bold text-foreground">দোকানের নাম</label><input value={data.shopName} onChange={e => setData({...data, shopName: e.target.value})} required className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm outline-none focus:border-primary" /></div>
          <div className="space-y-2"><label className="text-sm font-bold text-foreground">মোবাইল নাম্বার</label><input value={data.phone} onChange={e => setData({...data, phone: e.target.value})} required className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm outline-none focus:border-primary" /></div>
          <div className="space-y-2"><label className="text-sm font-bold text-foreground">দোকানের ঠিকানা</label><textarea value={data.address} onChange={e => setData({...data, address: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm resize-none" rows={3} required /></div>
          <div className="border-t border-border pt-6 mt-6">
            <div className="flex items-center gap-3 mb-6"><div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center text-accent-foreground"><TruckIcon size={22} /></div><div><h3 className="text-lg font-black text-foreground">পাঠাও কুরিয়ার সেটআপ</h3><p className="text-xs text-muted-foreground">ওয়ান-ক্লিক কুরিয়ার বুকিংয়ের জন্য</p></div></div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><label className="text-sm font-bold text-foreground">Client ID</label><input value={pathao.clientId} onChange={e => setPathao({...pathao, clientId: e.target.value})} placeholder="Pathao Client ID" className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm outline-none focus:border-primary" /></div><div className="space-y-2"><label className="text-sm font-bold text-foreground">Client Secret</label><input value={pathao.clientSecret} onChange={e => setPathao({...pathao, clientSecret: e.target.value})} placeholder="Pathao Client Secret" className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm outline-none focus:border-primary" /></div></div>
              <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><label className="text-sm font-bold text-foreground">Username (Email)</label><input value={pathao.username} onChange={e => setPathao({...pathao, username: e.target.value})} placeholder="merchant@email.com" className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm outline-none focus:border-primary" /></div><div className="space-y-2"><label className="text-sm font-bold text-foreground">Password</label><input type="password" value={pathao.password} onChange={e => setPathao({...pathao, password: e.target.value})} placeholder="••••••" className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm outline-none focus:border-primary" /></div></div>
              <div className="space-y-2"><label className="text-sm font-bold text-foreground">Store ID</label><input value={pathao.storeId || ''} onChange={e => setPathao({...pathao, storeId: e.target.value})} placeholder="পাঠাও থেকে প্রাপ্ত Store ID" className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm outline-none focus:border-primary" /></div>
            </div>
          </div>
          <button type="submit" className="w-full py-4 text-lg shadow-xl bg-primary text-primary-foreground rounded-xl font-bold flex items-center justify-center gap-2"><SaveIcon size={20} /> তথ্য আপডেট করুন</button>
        </form>
      </div>
    </div>
  );
};

// ============ MAIN APP ============
const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [shopProfile, setShopProfile] = useState(null);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [supplierPayments, setSupplierPayments] = useState([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const onlineHandler = () => setIsOnline(true);
    const offlineHandler = () => setIsOnline(false);
    window.addEventListener('online', onlineHandler);
    window.addEventListener('offline', offlineHandler);
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const docRef = doc(db, 'artifacts', DB_VERSION, 'users', currentUser.uid, 'settings', 'profile');
        try { const docSnap = await getDoc(docRef); if (docSnap.exists()) setShopProfile(docSnap.data()); else { const defaultProfile = { shopName: 'My Business', address: '', phone: '', email: currentUser.email || '' }; await setDoc(docRef, defaultProfile); setShopProfile(defaultProfile); } } catch { setShopProfile({ shopName: 'My Business', address: '', phone: '' }); }
      }
      setLoading(false);
    });
    return () => { unsubscribe(); window.removeEventListener('online', onlineHandler); window.removeEventListener('offline', offlineHandler); };
  }, []);

  useEffect(() => {
    if (!user) return;
    const uid = user.uid;
    const unsubs = [
      onSnapshot(query(collection(db, 'artifacts', DB_VERSION, 'users', uid, 'products'), orderBy('createdAt', 'desc')), (s) => setProducts(s.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(query(collection(db, 'artifacts', DB_VERSION, 'users', uid, 'orders'), orderBy('createdAt', 'desc')), (s) => setOrders(s.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(query(collection(db, 'artifacts', DB_VERSION, 'users', uid, 'expenses'), orderBy('createdAt', 'desc')), (s) => setExpenses(s.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(query(collection(db, 'artifacts', DB_VERSION, 'users', uid, 'supplier_payments'), orderBy('date', 'desc')), (s) => setSupplierPayments(s.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(doc(db, 'artifacts', DB_VERSION, 'users', uid, 'settings', 'profile'), (d) => d.exists() && setShopProfile(d.data())),
    ];
    return () => unsubs.forEach(u => u());
  }, [user]);

  if (loading) return <div className="h-screen flex items-center justify-center bg-background font-bold text-primary animate-pulse text-lg">লোড হচ্ছে...</div>;
  if (!user || !shopProfile) return <AuthScreen />;

  const tabLabels = { dashboard: 'ড্যাশবোর্ড', inventory: 'ইনভেন্টরি', pos: 'POS (অর্ডার)', orders: 'অর্ডার লিস্ট', supplier: 'সাপ্লায়ার', customers: 'কাস্টমার ডাটা', expenses: 'খরচপাতি', settings: 'সেটিংস' };

  return (
    <div className="flex h-screen bg-background font-sans text-foreground overflow-hidden selection:bg-primary/10 selection:text-primary">
      {!isOnline && <div className="absolute top-0 left-0 w-full bg-destructive text-destructive-foreground text-center text-xs py-1 z-[100] font-black uppercase tracking-widest flex items-center justify-center gap-2"><WifiOffIcon size={14} /> Offline Mode Activated</div>}
      <aside className="w-72 bg-card border-r border-border flex-col hidden md:flex z-20 shadow-xl">
        <div className="p-8 border-b border-border flex items-center gap-4">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center font-bold text-primary-foreground shadow-lg">BM</div>
          <div><h1 className="font-black text-xl text-foreground tracking-tight">Business</h1><p className="text-[10px] text-primary font-bold uppercase tracking-widest">Manager Pro</p></div>
        </div>
        <nav className="flex-1 p-6 space-y-2 overflow-y-auto custom-scrollbar">
          {NAV_ITEMS.map(item => (
            <button key={item.key} onClick={() => setActiveTab(item.key)} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 ${activeTab === item.key ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground hover:bg-card hover:text-primary hover:shadow-md'}`}>
              <item.Icon size={20} /> <span className="text-sm font-bold tracking-wide">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-6 border-t border-border bg-secondary/50">
          <div className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border shadow-sm mb-4">
            {shopProfile.logo ? <img src={shopProfile.logo} className="w-10 h-10 rounded-full object-cover border border-border" /> : <div className="w-10 h-10 bg-primary/10 text-primary rounded-full flex items-center justify-center font-bold">{shopProfile.shopName?.charAt(0)}</div>}
            <div className="overflow-hidden"><p className="text-sm font-bold truncate text-foreground">{shopProfile.shopName}</p><p className="text-[10px] text-muted-foreground truncate">{shopProfile.email}</p></div>
          </div>
          <button onClick={() => signOut(auth)} className="w-full flex items-center justify-center gap-2 text-destructive text-xs font-bold py-3 hover:bg-destructive/10 rounded-xl transition border border-transparent hover:border-destructive/20"><LogOutIcon size={14} /> লগ আউট</button>
        </div>
      </aside>
      <main className="flex-1 flex flex-col overflow-hidden bg-background">
        <header className="h-20 bg-card border-b border-border flex items-center justify-between px-8 shadow-sm z-10">
          <h2 className="font-black text-2xl text-foreground uppercase tracking-tight">{tabLabels[activeTab]}</h2>
          <div className="text-xs font-bold text-muted-foreground bg-secondary px-4 py-2 rounded-full border border-border flex items-center gap-2"><MapPinIcon size={14} className="text-primary" /> {shopProfile.address || 'ঠিকানা সেট করুন'}</div>
        </header>
        <div className="flex-1 overflow-auto p-4 md:p-8 custom-scrollbar">
          {activeTab === 'dashboard' && <DashboardView orders={orders} expenses={expenses} supplierPayments={supplierPayments} />}
          {activeTab === 'inventory' && <InventoryView products={products} user={user} />}
          {activeTab === 'pos' && <POSView products={products} user={user} shopProfile={shopProfile} />}
          {activeTab === 'orders' && <OrderListView orders={orders} user={user} shopProfile={shopProfile} />}
          {activeTab === 'supplier' && <SupplierView orders={orders} supplierPayments={supplierPayments} user={user} />}
          {activeTab === 'customers' && <CustomerView orders={orders} user={user} />}
          {activeTab === 'expenses' && <ExpenseView expenses={expenses} user={user} />}
          {activeTab === 'settings' && <SettingsView profile={shopProfile} user={user} />}
        </div>
      </main>
    </div>
  );
};

export default App;
