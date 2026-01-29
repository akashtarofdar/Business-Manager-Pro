import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  LayoutDashboard, ShoppingBag, CreditCard, Users, Menu, X, Plus, Search, 
  Trash2, Save, Printer, AlertCircle, Package, Phone, CheckCircle, FileText, 
  Settings, List, DollarSign, Eye, EyeOff, Banknote, Smartphone, Landmark, 
  Edit2, Info, MapPin, TrendingUp, Minus, Check, LogOut, Store, ArrowRight, Lock 
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, addDoc, query, onSnapshot, doc, deleteDoc, updateDoc, serverTimestamp, orderBy, setDoc, getDoc } from 'firebase/firestore';

// --- Firebase Configuration (আপনার আসল চাবি) ---
const firebaseConfig = {
  apiKey: "AIzaSyDlC-GAtKekX_SPjacRvzg7gKTGGQChpzA",
  authDomain: "business-manager-7d11a.firebaseapp.com",
  projectId: "business-manager-7d11a",
  storageBucket: "business-manager-7d11a.firebasestorage.app",
  messagingSenderId: "655200131586",
  appId: "1:655200131586:web:0b41af39a725542b8ae51b",
  measurementId: "G-785LXLP9X2"
};

// ডাটাবেস আইডেন্টিফায়ার (একবারই ঘোষণা করা হয়েছে যাতে Error না আসে)
const databaseId = "business-manager-7d11a-v1";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- ধ্রুবকসমূহ ---
const NECK_TYPES = ['গোল গলা', 'ভি গলা', 'কলার', 'ভি কলার'];
const FABRIC_TYPES = ['PP', 'Sugar Mesh', 'Box Mesh', 'Honeycomb', 'Jacquard'];
const SIZES = ['M', 'L', 'XL', 'XXL', 'Free Size'];

// --- কমন ইউআই কম্পোনেন্টস ---
const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-2xl shadow-sm border border-slate-100 p-6 ${className}`}>{children}</div>
);

const Button = ({ children, onClick, variant = "primary", className = "", disabled = false, type="button", icon }) => {
  const baseStyle = "px-5 py-2.5 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 text-sm shadow-sm active:scale-95 disabled:opacity-50";
  const variants = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700",
    secondary: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50",
    danger: "bg-red-50 text-red-600 border border-red-100 hover:bg-red-100"
  };
  return <button type={type} onClick={onClick} disabled={disabled} className={`${baseStyle} ${variants[variant]} ${className}`}>{icon}{children}</button>;
};

const Input = ({ label, type = "text", value, onChange, placeholder, required = false }) => (
  <div className="flex flex-col gap-2 w-full">
    {label && <label className="text-xs font-bold text-slate-600 uppercase tracking-wider ml-1">{label}</label>}
    <input
      type={type} value={value} onChange={onChange} placeholder={placeholder} required={required}
      className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none transition-all text-slate-800 text-sm bg-slate-50/50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
    />
  </div>
);

// --- অথেন্টিকেশন স্ক্রিন ---
const AuthScreen = ({ onLoginSuccess }) => {
  const [view, setView] = useState('signup');
  const [formData, setFormData] = useState({ phone: '', password: '', shopName: '', address: '', otp: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedOTP, setGeneratedOTP] = useState('');

  const handleSignupInit = (e) => {
    e.preventDefault();
    if (formData.phone.length < 11) { setError("সঠিক ফোন নাম্বার দিন"); return; }
    // OTP সিমুলেশন: স্ক্রিনে কোডটি দেখানো হচ্ছে যাতে আপনি টেস্ট করতে পারেন
    const mockOTP = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOTP(mockOTP);
    setView('otp');
    setError('');
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    if (formData.otp !== generatedOTP) { setError("ভুল ওটিপি!"); return; }
    setLoading(true);
    // Firebase ইমেইল ফরম্যাট তৈরি করা হচ্ছে (ফোন নাম্বার ব্যবহার করে)
    const email = `${formData.phone}@manager.local`;
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, formData.password);
        // প্রোফাইল সেভ করা
        await setDoc(doc(db, 'artifacts', databaseId, 'users', userCredential.user.uid, 'settings', 'profile'), {
            shopName: formData.shopName, address: formData.address, phone: formData.phone, createdAt: serverTimestamp()
        });
        onLoginSuccess();
    } catch (err) { 
        console.error(err);
        setError("ত্রুটি হয়েছে বা এই নম্বরে একাউন্ট আছে।"); 
        setLoading(false); 
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
        await signInWithEmailAndPassword(auth, `${formData.phone}@manager.local`, formData.password);
        onLoginSuccess();
    } catch (err) { setError("নম্বর বা পাসওয়ার্ড ভুল।"); setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md !p-8 shadow-xl border-t-4 border-indigo-600">
        <div className="text-center mb-8">
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white mx-auto mb-4 shadow-lg"><Store size={32} /></div>
            <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">বিজনেস ম্যানেজার</h1>
            <p className="text-slate-500 text-sm mt-1">দোকানের ডিজিটাল হিসাব সহকারী</p>
        </div>
        {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6 border border-red-100">{error}</div>}
        
        {view === 'login' && (
            <form onSubmit={handleLogin} className="space-y-5">
                <Input label="ফোন নাম্বার" placeholder="017xxxxxxxx" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} required />
                <Input label="পাসওয়ার্ড" type="password" placeholder="******" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} required />
                <Button type="submit" className="w-full py-3.5" disabled={loading}>{loading ? 'যাচাই হচ্ছে...' : 'লগিন করুন'}</Button>
                <button type="button" onClick={() => setView('signup')} className="w-full text-center text-indigo-600 font-bold text-sm mt-4 hover:underline">নতুন একাউন্ট খুলুন</button>
            </form>
        )}

        {view === 'signup' && (
            <form onSubmit={handleSignupInit} className="space-y-4">
                <Input label="দোকানের নাম" placeholder="আপনার দোকানের নাম" value={formData.shopName} onChange={e => setFormData({...formData, shopName: e.target.value})} required />
                <Input label="ফোন নাম্বার" placeholder="017xxxxxxxx" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} required />
                <Input label="ঠিকানা" placeholder="দোকানের ঠিকানা" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} required />
                <Input label="পাসওয়ার্ড" type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} required />
                <Button type="submit" className="w-full py-3.5">রেজিস্ট্রেশন শুরু করুন</Button>
                <button type="button" onClick={() => setView('login')} className="text-slate-500 text-sm mt-4 w-full text-center hover:text-indigo-600">লগিন করুন</button>
            </form>
        )}

        {view === 'otp' && (
            <div className="space-y-6 text-center animate-in zoom-in">
                <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100">
                    <p className="text-xs font-bold text-indigo-400 uppercase mb-2">ভেরিফিকেশন সিমুলেশন</p>
                    <p className="text-sm text-slate-600 mb-2">আপনার কোডটি হলো:</p>
                    <p className="text-3xl font-mono font-bold text-indigo-700 tracking-[0.3em]">{generatedOTP}</p>
                </div>
                <form onSubmit={handleCreateAccount} className="space-y-4 text-left">
                    <Input label="কোডটি নিচে লিখুন" value={formData.otp} onChange={e => setFormData({...formData, otp: e.target.value})} required />
                    <Button type="submit" className="w-full py-3.5" disabled={loading}>একাউন্ট তৈরি সম্পন্ন করুন</Button>
                </form>
                <button onClick={() => setView('signup')} className="text-xs text-slate-400 hover:text-red-500">নম্বর ভুল হয়েছে? ফিরে যান</button>
            </div>
        )}
      </Card>
    </div>
  );
};

// --- মেইন ড্যাশবোর্ড অ্যাপ ---
export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [shopProfile, setShopProfile] = useState(null);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const docRef = doc(db, 'artifacts', databaseId, 'users', u.uid, 'settings', 'profile');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) setShopProfile(docSnap.data());
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const getColl = (c) => collection(db, 'artifacts', databaseId, 'users', user.uid, c);
    
    const unsubProducts = onSnapshot(query(getColl('products'), orderBy('createdAt', 'desc')), (s) => setProducts(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubOrders = onSnapshot(query(getColl('orders'), orderBy('createdAt', 'desc')), (s) => setOrders(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    
    return () => { unsubProducts(); unsubOrders(); };
  }, [user]);

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50 font-bold text-indigo-600">লোড হচ্ছে...</div>;
  if (!user || !shopProfile) return <AuthScreen onLoginSuccess={() => {}} />;

  return (
    <div className="flex h-screen bg-slate-100 font-sans text-slate-800 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col hidden md:flex">
        <div className="p-6 border-b border-white/10 flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center font-bold">BM</div>
            <h1 className="font-bold text-lg leading-tight">বিজনেস<br/>ম্যানেজার</h1>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <NavItem active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard size={20}/>} label="ড্যাশবোর্ড" />
          <NavItem active={activeTab === 'inventory'} onClick={() => setActiveTab('inventory')} icon={<Package size={20}/>} label="স্টক/পণ্য" />
          <NavItem active={activeTab === 'pos'} onClick={() => setActiveTab('pos')} icon={<ShoppingBag size={20}/>} label="নতুন অর্ডার" />
        </nav>
        <div className="p-4 border-t border-white/10 bg-black/20">
            <p className="text-xs text-slate-400 mb-2 truncate">{shopProfile.shopName}</p>
            <button onClick={() => signOut(auth)} className="text-red-400 text-xs font-bold flex items-center gap-2 hover:text-red-300 transition"><LogOut size={14}/> লগ আউট</button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden bg-[#F8FAFC]">
        <header className="h-16 bg-white border-b flex items-center justify-between px-8 shadow-sm">
          <h2 className="font-bold text-slate-800 text-lg uppercase">{activeTab}</h2>
          <div className="text-xs font-bold text-slate-500 flex items-center gap-2"><MapPin size={12}/> {shopProfile.address}</div>
        </header>

        <div className="flex-1 overflow-auto p-8">
            {activeTab === 'dashboard' && <DashboardView products={products} orders={orders} />}
            {activeTab === 'inventory' && <InventoryView products={products} user={user} />}
            {activeTab === 'pos' && <POSView products={products} user={user} />}
        </div>
      </main>
    </div>
  );
}

function NavItem({ active, onClick, icon, label }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${active ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
      {icon} <span className="text-sm font-medium">{label}</span>
    </button>
  );
}

// --- Dashboard View ---
const DashboardView = ({ products, orders }) => {
    const totalSales = orders.reduce((s, o) => s + parseFloat(o.totalAmount || 0), 0);
    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="text-center"><h3 className="text-slate-500 text-xs font-bold mb-1">মোট বিক্রয়</h3><p className="text-2xl font-black text-indigo-600">৳{totalSales.toLocaleString()}</p></Card>
                <Card className="text-center"><h3 className="text-slate-500 text-xs font-bold mb-1">মোট অর্ডার</h3><p className="text-2xl font-black text-emerald-600">{orders.length}</p></Card>
                <Card className="text-center"><h3 className="text-slate-500 text-xs font-bold mb-1">মোট পণ্য</h3><p className="text-2xl font-black text-blue-600">{products.length}</p></Card>
            </div>
            <Card className="p-20 text-center">
                <CheckCircle size={48} className="mx-auto text-emerald-500 mb-4" />
                <h3 className="text-xl font-bold">আপনার ড্যাশবোর্ড সচল আছে!</h3>
                <p className="text-slate-500 mt-2">এখন আপনি স্টক এবং অর্ডার এন্ট্রি শুরু করতে পারেন।</p>
            </Card>
        </div>
    );
};

// --- Inventory View ---
const InventoryView = ({ products, user }) => {
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({ name: '', buyPrice: '', sellPrice: '', stock: '' });

    const handleSubmit = async (e) => {
        e.preventDefault();
        await addDoc(collection(db, 'artifacts', databaseId, 'users', user.uid, 'products'), { ...formData, createdAt: serverTimestamp() });
        setShowModal(false); setFormData({ name: '', buyPrice: '', sellPrice: '', stock: '' });
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center"><h2 className="text-xl font-bold">ইনভেন্টরি</h2><Button onClick={() => setShowModal(true)} icon={<Plus size={18}/>}>নতুন পণ্য</Button></div>
            <Card className="p-0 overflow-hidden shadow-md">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase border-b"><tr className="p-4"><th className="p-4">পণ্যের নাম</th><th className="p-4">কেনা</th><th className="p-4">বেচা</th><th className="p-4">স্টক</th></tr></thead>
                    <tbody className="divide-y">{products.map(p => (
                        <tr key={p.id} className="hover:bg-slate-50 text-sm">
                            <td className="p-4 font-bold">{p.name}</td><td className="p-4">৳{p.buyPrice}</td><td className="p-4 text-indigo-600 font-bold">৳{p.sellPrice}</td><td className="p-4"><span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full font-bold text-xs">{p.stock} pcs</span></td>
                        </tr>
                    ))}</tbody>
                </table>
            </Card>
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <Card className="w-full max-w-md animate-in zoom-in">
                        <div className="flex justify-between items-center mb-6 font-bold text-lg"><h3>নতুন পণ্য যোগ করুন</h3><button onClick={() => setShowModal(false)}><X size={20}/></button></div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <Input label="পণ্যের নাম" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                            <div className="grid grid-cols-2 gap-4">
                                <Input label="কেনা দাম" type="number" value={formData.buyPrice} onChange={e => setFormData({...formData, buyPrice: e.target.value})} required />
                                <Input label="বিক্রয় দাম" type="number" value={formData.sellPrice} onChange={e => setFormData({...formData, sellPrice: e.target.value})} required />
                            </div>
                            <Input label="স্টক পরিমাণ" type="number" value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} required />
                            <Button type="submit" className="w-full mt-4">সংরক্ষণ করুন</Button>
                        </form>
                    </Card>
                </div>
            )}
        </div>
    );
};

// --- POS View ---
const POSView = ({ products, user }) => {
    return (
        <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <ShoppingBag size={64} className="mb-4 opacity-20" />
            <p className="font-medium">নতুন অর্ডার মডিউল লোড হচ্ছে...</p>
            <p className="text-xs mt-1 italic">ইনভেন্টরি থেকে পণ্য যোগ করার পর এখানে বিক্রয় শুরু করুন।</p>
        </div>
    );
};