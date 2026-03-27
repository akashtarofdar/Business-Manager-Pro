import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  LayoutDashboard, ShoppingBag, CreditCard, Users, Menu, X, Plus, Search, 
  Trash2, Save, Printer, AlertCircle, Package, Phone, CheckCircle, FileText, 
  Settings, List, DollarSign, Eye, EyeOff, Banknote, Smartphone, Landmark, 
  Edit2, Info, MapPin, TrendingUp, Minus, Check, LogOut, Store, ArrowRight, Lock, 
  Filter, Calendar, Upload, Truck, WifiOff, CalendarDays, ImagePlus
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, onAuthStateChanged, signOut, 
  createUserWithEmailAndPassword, signInWithEmailAndPassword 
} from 'firebase/auth';
import { 
  getFirestore, collection, addDoc, query, onSnapshot, doc, 
  deleteDoc, updateDoc, serverTimestamp, orderBy, setDoc, getDoc, writeBatch, where, getDocs 
} from 'firebase/firestore';

// --- Firebase Configuration ---
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

// --- Helper Functions ---
const safeParse = (val) => {
    if (val === undefined || val === null || val === '') return 0;
    const num = parseFloat(val);
    return isNaN(num) ? 0 : num;
};

const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-BD', { 
        style: 'currency', 
        currency: 'BDT', 
        minimumFractionDigits: 0 
    }).format(safeParse(amount)).replace('BDT', '৳');
};

const resizeImage = (file) => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 300;
                const scaleSize = MAX_WIDTH / img.width;
                canvas.width = MAX_WIDTH;
                canvas.height = img.height * scaleSize;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL(file.type));
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });
};

const getDateString = (item) => {
    if (item?.toDate) return item.toDate();
    if (item?.seconds) return new Date(item.seconds * 1000);
    if (typeof item === 'string') return new Date(item);
    return new Date();
};

// --- Constants ---
const NECK_TYPES = ['গোল গলা', 'ভি গলা', 'ক্রস ভি গলা', 'কলার', 'ভি কলার', 'পাঞ্জাবী কলার'];
const FABRIC_TYPES = ['PP (170-180 GSM)', 'Sugar Mesh', 'Box Mesh', 'Honeycomb', 'Jacquard', 'Brush Jacquard'];
const SIZES = ['M', 'L', 'XL', 'XXL', 'Free Size', 'Mixed'];
const EXPENSE_CATEGORIES = ['Rent', 'Electricity', 'Transport', 'Salary', 'Marketing', 'Tea/Snacks', 'Other'];
const PAYMENT_METHODS = [
    { id: 'Cash', label: 'Cash (নগদ)', color: 'bg-emerald-600', icon: <Banknote size={16}/> },
    { id: 'Bkash', label: 'bKash', color: 'bg-[#e2136e]', icon: <Smartphone size={16}/> },
    { id: 'Nagad', label: 'Nagad', color: 'bg-[#f7941d]', icon: <Smartphone size={16}/> },
    { id: 'Rocket', label: 'Rocket', color: 'bg-[#8c3494]', icon: <Smartphone size={16}/> },
    { id: 'Bank', label: 'Bank', color: 'bg-indigo-600', icon: <Landmark size={16}/> },
];

// --- Shared Components ---
const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-2xl shadow-sm border border-slate-200 p-6 ${className}`}>{children}</div>
);

const Button = ({ children, onClick, variant = "primary", className = "", disabled = false, type="button", icon }) => {
  const baseStyle = "px-5 py-3 rounded-xl font-bold transition-all duration-200 flex items-center justify-center gap-2 text-sm shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed tracking-wide";
  const variants = {
    primary: "bg-slate-900 text-white hover:bg-slate-800 shadow-slate-200",
    secondary: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300",
    danger: "bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100",
    success: "bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-200",
    outline: "border-2 border-dashed border-indigo-300 text-indigo-600 hover:bg-indigo-50"
  };
  return <button type={type} onClick={onClick} disabled={disabled} className={`${baseStyle} ${variants[variant]} ${className}`}>{icon}{children}</button>;
};

const Input = ({ label, type = "text", value, onChange, placeholder, required = false, readOnly = false, className="", ...props }) => (
  <div className="flex flex-col gap-2 w-full">
    {label && <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">{label}</label>}
    <input type={type} value={value ?? ''} onChange={onChange} placeholder={placeholder} required={required} readOnly={readOnly}
      className={`w-full px-4 py-3 rounded-xl border border-slate-200 outline-none transition-all text-slate-800 text-sm ${readOnly ? 'bg-slate-100 cursor-not-allowed' : 'bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10'} ${className}`} {...props} />
  </div>
);

const TextArea = ({ label, value, onChange, placeholder, required = false }) => (
  <div className="flex flex-col gap-2 w-full">
    {label && <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">{label}</label>}
    <textarea value={value ?? ''} onChange={onChange} placeholder={placeholder} required={required} rows={3}
      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none transition-all text-slate-800 text-sm bg-white resize-none" />
  </div>
);

const Select = ({ label, value, onChange, options }) => (
  <div className="flex flex-col gap-2 w-full">
    {label && <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">{label}</label>}
    <select value={value ?? ''} onChange={onChange} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none transition-all text-slate-800 bg-white text-sm cursor-pointer">
      {options.map((opt, idx) => <option key={idx} value={opt.value}>{opt.label}</option>)}
    </select>
  </div>
);

// --- Auth Components ---
const AuthScreen = ({ onLoginSuccess }) => {
  const [view, setView] = useState('login');
  const [formData, setFormData] = useState({ email: '', password: '', shopName: '', address: '', phone: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        await setDoc(doc(db, 'artifacts', DB_VERSION, 'users', userCredential.user.uid, 'settings', 'profile'), {
            shopName: formData.shopName, address: formData.address, phone: formData.phone, email: formData.email, createdAt: serverTimestamp()
        });
        onLoginSuccess();
    } catch (err) {
        setError("ইমেইলটি ইতিমধ্যে ব্যবহৃত হয়েছে বা পাসওয়ার্ড দুর্বল।");
        setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault(); setLoading(true);
    try { 
        await signInWithEmailAndPassword(auth, formData.email, formData.password); 
        onLoginSuccess(); 
    } 
    catch (err) { setError("ইমেইল বা পাসওয়ার্ড ভুল।"); setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <Card className="w-full max-w-md !p-10 shadow-2xl border-t-4 border-indigo-600">
        <div className="text-center mb-10"><div className="w-20 h-20 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-3xl flex items-center justify-center text-white mx-auto mb-6 shadow-xl"><Store size={40} /></div><h1 className="text-3xl font-black text-slate-800 tracking-tight">Business Manager</h1><p className="text-slate-500 font-medium">প্রফেশনাল ডিজিটাল পার্টনার</p></div>
        {error && <div className="bg-rose-50 text-rose-600 p-4 rounded-xl text-sm mb-8 flex items-center gap-3 border border-rose-100 animate-pulse"><AlertCircle size={18}/> {error}</div>}
        {view === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-6 animate-in fade-in">
            <Input label="ইমেইল" type="email" value={formData.email} onChange={e=>setFormData({...formData,email:e.target.value})} required placeholder="example@gmail.com"/>
            <Input label="পাসওয়ার্ড" type="password" value={formData.password} onChange={e=>setFormData({...formData,password:e.target.value})} required/>
            <Button type="submit" className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-lg shadow-lg shadow-indigo-200" disabled={loading}>{loading?'লগিন হচ্ছে...':'লগিন করুন'} <ArrowRight size={20}/></Button>
            <div className="text-center mt-8"><button type="button" onClick={()=>setView('signup')} className="text-indigo-600 font-bold text-sm hover:underline">নতুন একাউন্ট খুলুন</button></div>
          </form>
        ) : (
          <form onSubmit={handleCreateAccount} className="space-y-5 animate-in fade-in">
            <Input label="দোকানের নাম" value={formData.shopName} onChange={e=>setFormData({...formData,shopName:e.target.value})} required/>
            <Input label="মোবাইল" value={formData.phone} onChange={e=>setFormData({...formData,phone:e.target.value})} required/>
            <Input label="ঠিকানা" value={formData.address} onChange={e=>setFormData({...formData,address:e.target.value})} required/>
            <Input label="ইমেইল" type="email" value={formData.email} onChange={e=>setFormData({...formData,email:e.target.value})} required/>
            <Input label="পাসওয়ার্ড" type="password" value={formData.password} onChange={e=>setFormData({...formData,password:e.target.value})} required placeholder="কমপক্ষে ৬ অক্ষর"/><Button type="submit" className="w-full py-4 bg-indigo-600">রেজিস্ট্রেশন করুন</Button><div className="text-center mt-6"><button type="button" onClick={()=>setView('login')} className="text-slate-500 font-bold text-sm">লগিন করুন</button></div>
          </form>
        )}
      </Card>
    </div>
  );
};

// --- Main App ---
export default function App() {
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
    window.addEventListener('online', () => setIsOnline(true));
    window.addEventListener('offline', () => setIsOnline(false));
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const docRef = doc(db, 'artifacts', DB_VERSION, 'users', currentUser.uid, 'settings', 'profile');
        try {
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                setShopProfile(docSnap.data());
            } else {
                const defaultProfile = { shopName: 'My Business', address: '', phone: '', email: currentUser.email };
                await setDoc(docRef, defaultProfile);
                setShopProfile(defaultProfile);
            }
        } catch (e) {
            setShopProfile({ shopName: 'My Business', address: '', phone: '' });
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsubProducts = onSnapshot(query(collection(db, 'artifacts', DB_VERSION, 'users', user.uid, 'products'), orderBy('createdAt', 'desc')), (s) => setProducts(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubOrders = onSnapshot(query(collection(db, 'artifacts', DB_VERSION, 'users', user.uid, 'orders'), orderBy('createdAt', 'desc')), (s) => setOrders(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubExpenses = onSnapshot(query(collection(db, 'artifacts', DB_VERSION, 'users', user.uid, 'expenses'), orderBy('createdAt', 'desc')), (s) => setExpenses(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubSupplier = onSnapshot(query(collection(db, 'artifacts', DB_VERSION, 'users', user.uid, 'supplier_payments'), orderBy('date', 'desc')), (s) => setSupplierPayments(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubProfile = onSnapshot(doc(db, 'artifacts', DB_VERSION, 'users', user.uid, 'settings', 'profile'), (d) => d.exists() && setShopProfile(d.data()));
    
    return () => { unsubProducts(); unsubOrders(); unsubExpenses(); unsubSupplier(); unsubProfile(); };
  }, [user]);

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50 font-bold text-indigo-600 animate-pulse text-lg">লোড হচ্ছে...</div>;
  if (!user || !shopProfile) return <AuthScreen onLoginSuccess={() => {}} />;

  return (
    <div className="flex h-screen bg-slate-100 font-sans text-slate-800 overflow-hidden selection:bg-indigo-100 selection:text-indigo-900">
      {!isOnline && <div className="absolute top-0 left-0 w-full bg-red-600 text-white text-center text-xs py-1 z-[100] font-black uppercase tracking-widest">Offline Mode Activated</div>}
      <aside className="w-72 bg-white border-r border-slate-200 flex flex-col hidden md:flex z-20 shadow-xl">
        <div className="p-8 border-b border-slate-100 flex items-center gap-4">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-200">BM</div>
            <div>
                <h1 className="font-black text-xl text-slate-800 tracking-tight">Business</h1>
                <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest">Manager Pro</p>
            </div>
        </div>
        <nav className="flex-1 p-6 space-y-2 overflow-y-auto custom-scrollbar">
          <NavItem active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard size={20}/>} label="ড্যাশবোর্ড" />
          <NavItem active={activeTab === 'inventory'} onClick={() => setActiveTab('inventory')} icon={<Package size={20}/>} label="ইনভেন্টরি" />
          <NavItem active={activeTab === 'pos'} onClick={() => setActiveTab('pos')} icon={<ShoppingBag size={20}/>} label="POS (অর্ডার)" />
          <NavItem active={activeTab === 'orders'} onClick={() => setActiveTab('orders')} icon={<List size={20}/>} label="অর্ডার লিস্ট" />
          <NavItem active={activeTab === 'supplier'} onClick={() => setActiveTab('supplier')} icon={<Truck size={20}/>} label="সাপ্লায়ার" />
          <NavItem active={activeTab === 'customers'} onClick={() => setActiveTab('customers')} icon={<Users size={20}/>} label="কাস্টমার ডাটা" />
          <NavItem active={activeTab === 'expenses'} onClick={() => setActiveTab('expenses')} icon={<CreditCard size={20}/>} label="খরচপাতি" />
          <NavItem active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<Settings size={20}/>} label="সেটিংস" />
        </nav>
        <div className="p-6 border-t border-slate-100 bg-slate-50/50">
           <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200 shadow-sm mb-4">
             {shopProfile.logo ? <img src={shopProfile.logo} className="w-10 h-10 rounded-full object-cover border"/> : <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold">{shopProfile.shopName?.charAt(0)}</div>}
             <div className="overflow-hidden">
                <p className="text-sm font-bold truncate text-slate-800">{shopProfile.shopName}</p>
                <p className="text-[10px] text-slate-400 truncate">{shopProfile.email}</p>
             </div>
           </div>
           <button onClick={() => signOut(auth)} className="w-full flex items-center justify-center gap-2 text-rose-500 text-xs font-bold py-3 hover:bg-rose-50 rounded-xl transition border border-transparent hover:border-rose-100"><LogOut size={14}/> লগ আউট</button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden bg-[#F8FAFC]">
        <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-8 shadow-sm z-10">
          <h2 className="font-black text-2xl text-slate-800 uppercase tracking-tight">{activeTab.replace('_', ' ')}</h2>
          <div className="text-xs font-bold text-slate-500 bg-slate-100 px-4 py-2 rounded-full border border-slate-200 flex items-center gap-2"><MapPin size={14} className="text-indigo-500"/> {shopProfile.address || 'ঠিকানা সেট করুন'}</div>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-8 custom-scrollbar">
            {activeTab === 'dashboard' && <DashboardView products={products} orders={orders} expenses={expenses} supplierPayments={supplierPayments} />}
            {activeTab === 'inventory' && <InventoryView products={products} user={user} />}
            {activeTab === 'pos' && <POSView products={products} user={user} shopProfile={shopProfile} />}
            {activeTab === 'orders' && <OrderListView orders={orders} user={user} shopProfile={shopProfile} />}
            {activeTab === 'supplier' && <SupplierView products={products} supplierPayments={supplierPayments} user={user} orders={orders} />}
            {activeTab === 'customers' && <CustomerView orders={orders} user={user} />}
            {activeTab === 'expenses' && <ExpenseView expenses={expenses} user={user} />}
            {activeTab === 'settings' && <SettingsView profile={shopProfile} user={user} />}
        </div>
      </main>
    </div>
  );
}

const NavItem = ({ active, onClick, icon, label }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 group ${active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-500 hover:bg-white hover:text-indigo-600 hover:shadow-md'}`}>
    {icon} <span className="text-sm font-bold tracking-wide">{label}</span>
  </button>
);

// ==============================
// DASHBOARD VIEW (with Due List)
// ==============================
const StatCard = ({ title, value, icon, color, onClick, cursor, textColor="text-slate-900" }) => (
    <div onClick={onClick} className={`bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-5 transition-all hover:shadow-xl hover:-translate-y-1 ${cursor || ''}`}>
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${color} shadow-sm`}>{icon}</div>
        <div><p className="text-slate-400 text-[11px] font-black uppercase tracking-widest mb-1">{title}</p><h4 className={`text-2xl font-black ${textColor} leading-none tracking-tighter`}>{value}</h4></div>
    </div>
);

const DashboardView = ({ products, orders, expenses, supplierPayments }) => {
    const [showProfit, setShowProfit] = useState(false);
    const [filterType, setFilterType] = useState('all'); 
    const [customRange, setCustomRange] = useState({ start: '', end: '' });

    useEffect(() => { let timer; if (showProfit) { timer = setTimeout(() => setShowProfit(false), 5000); } return () => clearTimeout(timer); }, [showProfit]);

    const filteredData = useMemo(() => {
        const now = new Date();
        let startDate = null;
        let endDate = null;

        if (filterType === 'today') {
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        } else if (filterType === 'week') {
            startDate = new Date(now); startDate.setDate(now.getDate() - 7);
        } else if (filterType === 'month') {
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        } else if (filterType === 'year') {
            startDate = new Date(now.getFullYear(), 0, 1);
        } else if (filterType === 'custom' && customRange.start && customRange.end) {
            startDate = new Date(customRange.start);
            endDate = new Date(customRange.end);
            endDate.setHours(23, 59, 59);
        }

        const filterFn = (item) => {
            if (filterType === 'all') return true;
            if (!item.createdAt && !item.date) return false;
            const itemDate = getDateString(item.createdAt || item.date);
            if (startDate && endDate) return itemDate >= startDate && itemDate <= endDate;
            return startDate ? itemDate >= startDate : true;
        };

        return {
            orders: (orders || []).filter(filterFn),
            expenses: (expenses || []).filter(filterFn),
            supplierPayments: (supplierPayments || []).filter(p => {
                 const d = p.date ? new Date(p.date) : getDateString(p.createdAt);
                 if (filterType === 'all') return true;
                 if (startDate && endDate) return d >= startDate && d <= endDate;
                 return startDate ? d >= startDate : true;
            })
        };
    }, [orders, expenses, supplierPayments, filterType, customRange]);

    const stats = useMemo(() => {
        const totalSales = filteredData.orders.reduce((s, o) => s + safeParse(o.totalAmount), 0);
        const totalExpense = filteredData.expenses.reduce((s, e) => s + safeParse(e.amount), 0);
        let totalCOGS = 0;
        filteredData.orders.forEach(order => {
            order.items?.forEach(item => { totalCOGS += (safeParse(item.buyPrice) * safeParse(item.qty)); });
        });
        const totalSoldCostLifetime = (orders || []).reduce((sum, o) => sum + (o.items?.reduce((s, i) => s + (safeParse(i.buyPrice)*safeParse(i.qty)), 0) || 0), 0);
        const totalSupplierPaidLifetime = (supplierPayments || []).reduce((sum, p) => sum + safeParse(p.amount), 0);
        const supplierDueLifetime = totalSoldCostLifetime - totalSupplierPaidLifetime;
        const periodSupplierPaid = filteredData.supplierPayments.reduce((sum, p) => sum + safeParse(p.amount), 0);
        const netProfit = totalSales - totalCOGS - totalExpense;
        return { totalSales, totalExpense, netProfit, periodSupplierPaid, supplierDueLifetime };
    }, [filteredData, orders, supplierPayments]);

    const chartData = useMemo(() => filteredData.orders.slice(-7).map(o => ({ name: o.customerName?.slice(0, 5) || 'Guest', sales: safeParse(o.totalAmount) })), [filteredData.orders]);

    // NEW: Due Orders list
    const dueOrders = useMemo(() => {
        return (orders || []).filter(o => safeParse(o.dueAmount) > 0).sort((a, b) => safeParse(b.dueAmount) - safeParse(a.dueAmount));
    }, [orders]);

    return (
        <div className="space-y-8 animate-in fade-in">
             <Card className="flex flex-wrap gap-2 items-center justify-between !p-4 bg-white border border-slate-100">
                <div className="flex gap-2 flex-wrap">
                    <button onClick={()=>setFilterType('all')} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${filterType === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}>সব (All)</button>
                    {['today', 'week', 'month', 'year'].map(t => (
                        <button key={t} onClick={()=>setFilterType(t)} className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${filterType === t ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                            {t === 'today' ? 'আজ' : t === 'week' ? 'এই সপ্তাহ' : t === 'month' ? 'এই মাস' : 'এই বছর'}
                        </button>
                    ))}
                    <button onClick={()=>setFilterType('custom')} className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all flex items-center gap-2 ${filterType === 'custom' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}><CalendarDays size={14}/> কাস্টম</button>
                </div>
                {filterType === 'custom' && (
                    <div className="flex gap-2 items-center">
                        <div>
                            <span className="text-[10px] text-slate-400 font-bold block">শুরু</span>
                            <input type="date" value={customRange.start} onChange={e=>setCustomRange({...customRange, start: e.target.value})} className="border p-1.5 rounded-lg text-xs outline-none focus:border-indigo-500" />
                        </div>
                        <span className="text-slate-400 mt-4">-</span>
                        <div>
                             <span className="text-[10px] text-slate-400 font-bold block">শেষ</span>
                             <input type="date" value={customRange.end} onChange={e=>setCustomRange({...customRange, end: e.target.value})} className="border p-1.5 rounded-lg text-xs outline-none focus:border-indigo-500" />
                        </div>
                    </div>
                )}
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="মোট বিক্রয়" value={formatCurrency(stats.totalSales)} icon={<ShoppingBag className="text-blue-600"/>} color="bg-blue-50" />
                <StatCard title="মোট খরচ" value={formatCurrency(stats.totalExpense)} icon={<CreditCard className="text-rose-600"/>} color="bg-rose-50" />
                <StatCard title="নিট মুনাফা" value={showProfit ? formatCurrency(stats.netProfit) : "****"} icon={showProfit ? <EyeOff className="text-emerald-600"/> : <Eye className="text-emerald-600"/>} color="bg-emerald-50" onClick={() => setShowProfit(!showProfit)} cursor="cursor-pointer" />
                <StatCard title="মোট অর্ডার" value={filteredData.orders.length} icon={<FileText className="text-indigo-600"/>} color="bg-indigo-50" />
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <StatCard title="সাপ্লায়ার পরিশোধ (ফিল্টার অনুযায়ী)" value={formatCurrency(stats.periodSupplierPaid)} icon={<CheckCircle className="text-teal-600"/>} color="bg-teal-50" />
                 <StatCard title="সাপ্লায়ার মোট বকেয়া (লাইফটাইম)" value={formatCurrency(stats.supplierDueLifetime)} icon={<Truck className="text-orange-600"/>} color="bg-orange-50" textColor="text-orange-600" />
            </div>
            <Card className="h-96 shadow-lg border-none">
                <h3 className="font-bold text-slate-700 mb-8 flex items-center gap-2 text-lg"><TrendingUp size={24} className="text-indigo-600"/> বিক্রয় গ্রাফ</h3>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{bottom: 20, left: 10}}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="name"/><YAxis/><Tooltip/><Area type="monotone" dataKey="sales" stroke="#6366f1" fill="#6366f120" strokeWidth={4} /></AreaChart>
                </ResponsiveContainer>
            </Card>

            {/* NEW: Due List */}
            {dueOrders.length > 0 && (
                <Card className="shadow-lg">
                    <h3 className="font-bold text-slate-700 mb-6 flex items-center gap-2 text-lg">
                        <AlertCircle size={24} className="text-orange-500" /> বকেয়া তালিকা ({dueOrders.length} জন)
                    </h3>
                    <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
                        {dueOrders.map(o => (
                            <div key={o.id} className="flex items-center justify-between p-4 bg-orange-50/50 rounded-xl border border-orange-100">
                                <div>
                                    <p className="font-bold text-slate-800">{o.customerName}</p>
                                    <p className="text-xs text-slate-500">{o.phone} • #{o.id?.slice(-6).toUpperCase()}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-slate-500">মোট: {formatCurrency(o.totalAmount)}</p>
                                    <p className="text-lg font-black text-orange-600">{formatCurrency(o.dueAmount)} বকেয়া</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            )}
        </div>
    );
};

// ==============================
// INVENTORY VIEW (with Image)
// ==============================
const InventoryView = ({ products, user }) => {
    const [showModal, setShowModal] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [docId, setDocId] = useState(null);
    const [form, setForm] = useState({ name: '', buyPrice: '', sellPrice: '', stock: '', fabric: FABRIC_TYPES[0], neck: NECK_TYPES[0], image: '' });
    
    const handleImageUpload = async (e) => {
        const file = e.target.files?.[0];
        if (file) {
            const resized = await resizeImage(file);
            setForm({ ...form, image: resized });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const data = { 
            name: form.name, buyPrice: safeParse(form.buyPrice), sellPrice: safeParse(form.sellPrice), 
            stock: safeParse(form.stock), fabric: form.fabric, neck: form.neck, image: form.image || ''
        };
        if(isEdit) await updateDoc(doc(db, 'artifacts', DB_VERSION, 'users', user.uid, 'products', docId), data);
        else await addDoc(collection(db, 'artifacts', DB_VERSION, 'users', user.uid, 'products'), { ...data, createdAt: serverTimestamp() });
        setShowModal(false); setIsEdit(false); setForm({ name: '', buyPrice: '', sellPrice: '', stock: '', fabric: FABRIC_TYPES[0], neck: NECK_TYPES[0], image: '' });
    };
    const handleEdit = (p) => { 
        setForm({ name: p.name, buyPrice: String(p.buyPrice), sellPrice: String(p.sellPrice), stock: String(p.stock), fabric: p.fabric, neck: p.neck, image: p.image || '' }); 
        setDocId(p.id); setIsEdit(true); setShowModal(true); 
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex justify-between items-center"><h2 className="text-2xl font-bold text-slate-800">ইনভেন্টরি ম্যানেজমেন্ট</h2><Button onClick={() => {setShowModal(true); setIsEdit(false); setForm({ name: '', buyPrice: '', sellPrice: '', stock: '', fabric: FABRIC_TYPES[0], neck: NECK_TYPES[0], image: '' })}} icon={<Plus size={18}/>}>নতুন পণ্য</Button></div>
            <Card className="p-0 overflow-hidden shadow-sm border-none"><table className="w-full text-left text-sm border-collapse"><thead className="bg-slate-50 border-b border-slate-100 uppercase text-[11px] font-black text-slate-400 tracking-wider"><tr><th className="p-5">পণ্যের বিবরণ</th><th className="p-5">বৈশিষ্ট্য</th><th className="p-5 text-right">দাম (৳)</th><th className="p-5 text-center">স্টক</th><th className="p-5 text-right">একশন</th></tr></thead>
                <tbody className="divide-y divide-slate-50">{(products || []).map(p => (<tr key={p.id} className="hover:bg-slate-50/80 transition group"><td className="p-5">
                    <div className="flex items-center gap-3">
                        {p.image ? <img src={p.image} className="w-12 h-12 rounded-xl object-cover border border-slate-200" /> : <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center"><Package size={20} className="text-slate-400" /></div>}
                        <p className="font-bold text-slate-800 text-base">{p.name}</p>
                    </div>
                </td><td className="p-5"><div className="flex gap-2 flex-wrap"><span className="px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-bold border border-indigo-100">{p.fabric}</span><span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-bold border border-slate-200">{p.neck}</span></div></td><td className="p-5 text-right"><p className="text-xs text-slate-400 font-medium">In: {formatCurrency(p.buyPrice)}</p><p className="font-black text-indigo-600 text-base">Out: {formatCurrency(p.sellPrice)}</p></td><td className="p-5 text-center"><span className={`px-4 py-1.5 rounded-full font-black text-xs ${parseInt(p.stock) < 5 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>{p.stock}</span></td><td className="p-5 text-right"><div className="flex justify-end gap-2"><button onClick={()=>handleEdit(p)} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 transition"><Edit2 size={16}/></button><button onClick={() => deleteDoc(doc(db, 'artifacts', DB_VERSION, 'users', user.uid, 'products', p.id))} className="p-2 bg-red-50 hover:bg-red-100 rounded-lg text-red-500 transition"><Trash2 size={16}/></button></div></td></tr>))}</tbody>
            </table></Card>
            {showModal && <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4"><Card className="w-full max-w-lg animate-in zoom-in shadow-2xl"><div className="flex justify-between items-center mb-8"><h3 className="font-black text-2xl text-slate-800">{isEdit ? 'পণ্য আপডেট' : 'নতুন পণ্য'}</h3><button onClick={()=>setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-full"><X/></button></div><form onSubmit={handleSubmit} className="space-y-5"><Input label="নাম" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required/><div className="grid grid-cols-2 gap-4"><Select label="কাপড়" value={form.fabric} options={FABRIC_TYPES.map(f=>({label:f,value:f}))} onChange={e=>setForm({...form,fabric:e.target.value})}/><Select label="গলা" value={form.neck} options={NECK_TYPES.map(n=>({label:n,value:n}))} onChange={e=>setForm({...form,neck:e.target.value})}/></div><div className="grid grid-cols-3 gap-4"><Input label="কেনা" type="number" value={form.buyPrice} onChange={e=>setForm({...form,buyPrice:e.target.value})}/><Input label="বেচা" type="number" value={form.sellPrice} onChange={e=>setForm({...form,sellPrice:e.target.value})}/><Input label="স্টক" type="number" value={form.stock} onChange={e=>setForm({...form,stock:e.target.value})}/></div>
            <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1 block mb-2">পণ্যের ছবি</label>
                <div className="flex items-center gap-4">
                    {form.image && <img src={form.image} className="w-16 h-16 rounded-xl object-cover border border-slate-200" />}
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"/>
                </div>
            </div>
            <Button type="submit" className="w-full mt-4 py-4 text-lg">সংরক্ষণ করুন</Button></form></Card></div>}
        </div>
    );
};

// ==============================
// POS VIEW (with Date, Note, Design Image)
// ==============================
const POSView = ({ products, user, shopProfile }) => {
    const [cart, setCart] = useState([]);
    const [customer, setCustomer] = useState({ name: '', phone: '', address: '', deliveryCharge: '0', advance: '0' });
    const [filter, setFilter] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('Cash');
    const [invoiceOrder, setInvoiceOrder] = useState(null);
    // NEW: order date & note
    const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
    const [orderNote, setOrderNote] = useState('');

    const addToCart = (p) => {
        const exist = cart.find(i => i.id === p.id);
        if(exist) setCart(cart.map(i => i.id === p.id ? {...i, qty: i.qty + 1} : i));
        else setCart([...cart, { ...p, qty: 1, size: 'Mixed', buyPrice: p.buyPrice }]);
    };
    const addCustomItem = () => {
        const name = prompt("পণ্যের নাম:"); const price = prompt("দাম:");
        if(name && price) setCart([...cart, { id: Date.now(), name, sellPrice: safeParse(price), buyPrice: 0, qty: 1, size: 'Mixed' }]);
    };
    const removeFromCart = (id) => setCart(cart.filter(i => i.id !== id));
    const updateQty = (id, val) => setCart(cart.map(i => i.id === id ? {...i, qty: Math.max(1, parseInt(val) || 0)} : i));
    const incrementQty = (id, d) => setCart(cart.map(i => i.id === id ? {...i, qty: Math.max(1, i.qty + d)} : i));
    const updateSize = (id, s) => setCart(cart.map(i => i.id === id ? {...i, size: s} : i));
    const updatePrice = (id, p) => setCart(cart.map(i => i.id === id ? {...i, sellPrice: safeParse(p)} : i));

    // NEW: Design Image Upload
    const handleDesignImage = (id, file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const max = 300;
                let w = img.width, h = img.height;
                if (w > max || h > max) { const r = Math.min(max / w, max / h); w *= r; h *= r; }
                canvas.width = w; canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                const base64 = canvas.toDataURL('image/jpeg', 0.7);
                setCart(prev => prev.map(i => i.id === id ? { ...i, designImage: base64 } : i));
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    };

    const financials = useMemo(() => {
        const subTotal = cart.reduce((s, i) => s + (safeParse(i.sellPrice) * i.qty), 0);
        const total = subTotal + safeParse(customer.deliveryCharge);
        const due = total - safeParse(customer.advance);
        return { subTotal, total, due };
    }, [cart, customer]);

    const handleOrder = async () => {
        if(!cart.length || !customer.name || !customer.phone) return alert("কাস্টমার তথ্য দিন");
        const subTotal = cart.reduce((s, i) => s + (safeParse(i.sellPrice) * i.qty), 0);
        const total = subTotal + safeParse(customer.deliveryCharge);
        const due = total - safeParse(customer.advance);
        
        const orderData = {
            customerName: customer.name, phone: customer.phone, address: customer.address, 
            items: cart.map(i => ({ id: i.id, name: i.name, sellPrice: i.sellPrice, buyPrice: i.buyPrice, qty: i.qty, size: i.size, image: i.image || '', designImage: i.designImage || '' })),
            subTotal, deliveryCharge: safeParse(customer.deliveryCharge), totalAmount: total, 
            paidAmount: safeParse(customer.advance), dueAmount: due, 
            status: due > 0 ? 'Due' : 'Paid', lastPaymentMethod: paymentMethod, 
            note: orderNote, orderDate, createdAt: serverTimestamp()
        };
        const ref = await addDoc(collection(db, 'artifacts', DB_VERSION, 'users', user.uid, 'orders'), orderData);
        setInvoiceOrder({...orderData, id: ref.id, createdAt: new Date() }); 
        setCart([]); setCustomer({name:'', phone:'', address:'', deliveryCharge:'0', advance:'0'});
        setOrderNote('');
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4">
            <div className="lg:col-span-2 space-y-6">
                <div className="relative flex gap-3"><div className="relative flex-1"><Search className="absolute left-4 top-3.5 text-slate-400" size={20}/><input type="text" placeholder="পণ্য খুঁজুন..." className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-200 outline-none focus:border-indigo-500 bg-white shadow-sm" value={filter} onChange={e=>setFilter(e.target.value)}/></div><Button variant="outline" onClick={addCustomItem} icon={<Plus size={18}/>}>কাস্টম</Button></div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-5 overflow-y-auto pr-2 custom-scrollbar h-[600px]">{products.filter(p=>p.name.toLowerCase().includes(filter.toLowerCase())).map(p => (
                    <div key={p.id} onClick={()=>addToCart(p)} className="bg-white p-5 rounded-2xl border border-slate-100 cursor-pointer hover:shadow-xl hover:border-indigo-300 transition-all group relative overflow-hidden">
                        {p.image && <img src={p.image} className="w-full h-24 object-cover rounded-xl mb-3" />}
                        <h4 className="font-bold text-base mb-2 text-slate-800">{p.name}</h4>
                        <div className="flex justify-between items-end"><div><p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{p.fabric}</p><p className="text-[10px] text-slate-400 font-bold uppercase">Stock: {p.stock}</p></div><p className="text-indigo-600 font-black text-xl">{formatCurrency(p.sellPrice)}</p></div>
                        <div className="absolute top-0 right-0 p-2 bg-indigo-500 rounded-bl-2xl opacity-0 group-hover:opacity-100 transition"><Plus size={16} className="text-white"/></div>
                    </div>
                ))}</div>
            </div>
            <Card className="flex flex-col gap-6 shadow-2xl border-indigo-50 h-fit sticky top-4">
                <h3 className="font-black text-lg border-b pb-4 flex items-center gap-2 text-slate-800"><ShoppingBag size={20} className="text-indigo-600"/> অর্ডার লিস্ট ({cart.length})</h3>
                <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar max-h-[350px]">{cart.map(i => (
                    <div key={i.id} className="bg-slate-50 p-3 rounded-xl border border-slate-200 relative group hover:border-indigo-200 transition">
                        <div className="flex justify-between text-xs mb-2">
                            <div className="flex items-center gap-2">
                                {i.image && <img src={i.image} className="w-8 h-8 rounded object-cover" />}
                                <strong>{i.name}</strong>
                            </div>
                            <button onClick={()=>removeFromCart(i.id)} className="text-red-400 hover:text-red-600"><X size={14}/></button>
                        </div>
                        {/* NEW: Design Image Upload */}
                        <div className="flex items-center gap-2 mb-2">
                            {i.designImage ? (
                                <div className="relative">
                                    <img src={i.designImage} className="w-12 h-12 rounded-lg object-cover border border-slate-200" />
                                    <button onClick={() => setCart(cart.map(c => c.id === i.id ? { ...c, designImage: undefined } : c))} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[8px]">✕</button>
                                </div>
                            ) : (
                                <label className="flex items-center gap-1 text-[10px] text-indigo-600 cursor-pointer border border-dashed border-indigo-300 rounded-lg px-2 py-1 hover:bg-indigo-50 transition">
                                    <ImagePlus size={14} /> ডিজাইন ছবি
                                    <input type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) handleDesignImage(i.id, e.target.files[0]); }} />
                                </label>
                            )}
                        </div>
                        <div className="flex justify-between items-center gap-2">
                            <select value={i.size} onChange={e=>updateSize(i.id, e.target.value)} className="text-[10px] border p-1 rounded font-bold">{SIZES.map(s=><option key={s} value={s}>{s}</option>)}</select>
                            <div className="flex items-center bg-white border rounded-lg px-1 gap-1 h-7">
                                <button onClick={()=>incrementQty(i.id,-1)} className="px-2 text-indigo-600 font-bold hover:bg-slate-100 h-full rounded-l">-</button>
                                <input type="number" value={i.qty} onChange={(e)=>updateQty(i.id, e.target.value)} className="w-10 text-center text-xs font-bold outline-none border-x h-full"/>
                                <button onClick={()=>incrementQty(i.id,1)} className="px-2 text-indigo-600 font-bold hover:bg-slate-100 h-full rounded-r">+</button>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="text-[10px] text-slate-400">Rate</span>
                                <input type="number" value={i.sellPrice} onChange={(e)=>updatePrice(i.id, e.target.value)} className="w-12 text-right font-black text-xs bg-transparent outline-none border-b border-dashed border-slate-300 focus:border-indigo-500" />
                            </div>
                        </div>
                    </div>
                ))}</div>
                <div className="space-y-4 border-t pt-4 text-xs">
                    <div className="flex gap-3"><Input placeholder="নাম" value={customer.name} onChange={e=>setCustomer({...customer,name:e.target.value})}/><Input placeholder="মোবাইল" value={customer.phone} onChange={e=>setCustomer({...customer,phone:e.target.value})}/></div>
                    <TextArea placeholder="ঠিকানা" value={customer.address} onChange={e=>setCustomer({...customer,address:e.target.value})}/>
                    
                    {/* NEW: Order Date */}
                    <Input label="অর্ডারের তারিখ" type="date" value={orderDate} onChange={e=>setOrderDate(e.target.value)}/>
                    
                    {/* NEW: Note */}
                    <TextArea label="নোট" placeholder="অতিরিক্ত নোট..." value={orderNote} onChange={e=>setOrderNote(e.target.value)}/>
                    
                    <div className="grid grid-cols-2 gap-3"><Input label="ডেলিভারি" type="number" value={customer.deliveryCharge} onChange={e=>setCustomer({...customer,deliveryCharge:e.target.value})}/><Input label="অ্যাডভান্স" type="number" value={customer.advance} onChange={e=>setCustomer({...customer,advance:e.target.value})}/></div>
                    <div className="grid grid-cols-5 gap-2">{PAYMENT_METHODS.map(m => (<button key={m.id} onClick={() => setPaymentMethod(m.id)} className={`p-2 text-[10px] font-bold border rounded-lg flex flex-col items-center gap-1 transition ${paymentMethod === m.id ? 'bg-indigo-600 text-white shadow-md transform scale-105' : 'hover:bg-slate-50'}`}>{m.icon}{m.label}</button>))}</div>
                    <div className="flex justify-between font-black text-xl border-t pt-4 text-slate-800"><span>মোট বিল:</span><span>{formatCurrency(financials.total)}</span></div>
                    <Button onClick={handleOrder} className="w-full py-4 shadow-xl text-lg font-bold">অর্ডার কনফার্ম</Button>
                </div>
            </Card>
            {invoiceOrder && <InvoiceModal order={invoiceOrder} shopProfile={shopProfile} onClose={()=>setInvoiceOrder(null)} />}
        </div>
    );
};

// ==============================
// ORDER LIST VIEW (with Edit)
// ==============================
const OrderListView = ({ orders, user, shopProfile }) => {
    const [invoice, setInvoice] = useState(null);
    const [editPayment, setEditPayment] = useState(null);
    const [paymentAmt, setPaymentAmt] = useState('');
    const [updatedDelivery, setUpdatedDelivery] = useState('');
    // NEW: Edit order
    const [editOrder, setEditOrder] = useState(null);
    const [editItems, setEditItems] = useState([]);
    const [editCustomer, setEditCustomer] = useState({ name: '', phone: '', address: '', note: '' });

    useEffect(() => { if(editPayment) setUpdatedDelivery(String(editPayment.deliveryCharge)); }, [editPayment]);

    useEffect(() => {
        if (editOrder) {
            setEditItems(editOrder.items?.map(i => ({ ...i })) || []);
            setEditCustomer({ name: editOrder.customerName, phone: editOrder.phone, address: editOrder.address, note: editOrder.note || '' });
        }
    }, [editOrder]);

    const handleUpdatePayment = async () => {
        const amt = safeParse(paymentAmt);
        const del = safeParse(updatedDelivery);
        const newTotal = safeParse(editPayment.subTotal) + del;
        const newPaid = safeParse(editPayment.paidAmount) + amt;
        const newDue = newTotal - newPaid;
        await updateDoc(doc(db, 'artifacts', DB_VERSION, 'users', user.uid, 'orders', editPayment.id), {
            deliveryCharge: del, totalAmount: newTotal, paidAmount: newPaid, dueAmount: newDue, status: newDue <= 0 ? 'Paid' : 'Due'
        });
        setEditPayment(null); setPaymentAmt(''); alert("আপডেট সফল!");
    };
    
    // NEW: Save edited order
    const handleSaveEditOrder = async () => {
        if (!editOrder) return;
        const subTotal = editItems.reduce((s, i) => s + (safeParse(i.sellPrice) * safeParse(i.qty)), 0);
        const total = subTotal + safeParse(editOrder.deliveryCharge);
        const newDue = total - safeParse(editOrder.paidAmount);
        await updateDoc(doc(db, 'artifacts', DB_VERSION, 'users', user.uid, 'orders', editOrder.id), {
            customerName: editCustomer.name, phone: editCustomer.phone, address: editCustomer.address,
            note: editCustomer.note, items: editItems, subTotal, totalAmount: total, dueAmount: newDue,
            status: newDue <= 0 ? 'Paid' : 'Due'
        });
        setEditOrder(null);
    };

    const handleDeleteOrder = async (id) => {
        if(window.confirm("আপনি কি নিশ্চিত এই অর্ডারটি ডিলিট করতে চান?")) {
            await deleteDoc(doc(db, 'artifacts', DB_VERSION, 'users', user.uid, 'orders', id));
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in">
            <h2 className="text-2xl font-bold text-slate-800">অর্ডার রেকর্ড</h2>
            <Card className="p-0 overflow-hidden shadow-md border-none"><table className="w-full text-left text-sm border-collapse"><thead className="bg-slate-50 border-b border-slate-100 uppercase text-[11px] font-black text-slate-400 tracking-wider"><tr><th className="p-5">মেমো</th><th className="p-5">কাস্টমার</th><th className="p-5 text-right w-32">বিল</th><th className="p-5 text-right w-32">বকেয়া</th><th className="p-5 text-center">স্ট্যাটাস</th><th className="p-5 text-right">একশন</th></tr></thead>
                <tbody className="divide-y divide-slate-50">{orders.map(o => (<tr key={o.id} className="hover:bg-slate-50/80 transition"><td className="p-5"><span className="bg-slate-100 px-2 py-1 rounded text-xs font-bold text-slate-600">#{o.id.slice(-6).toUpperCase()}</span></td><td className="p-5"><p className="font-bold text-slate-800">{o.customerName}</p><p className="text-[11px] text-slate-400 font-medium">{o.phone}</p></td><td className="p-5 text-right font-black text-slate-700">{formatCurrency(o.totalAmount)}</td><td className="p-5 text-right font-black text-rose-500">{formatCurrency(o.dueAmount)}</td><td className="p-5 text-center"><span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wide ${o.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>{o.status}</span></td><td className="p-5 text-right">
                    <div className="flex gap-2 justify-end items-center">
                        <button onClick={()=>setInvoice(o)} className="text-indigo-500 hover:bg-indigo-50 p-2 rounded-lg transition"><Printer size={18}/></button>
                        <button onClick={()=>setEditOrder(o)} className="text-amber-600 hover:bg-amber-50 p-2 rounded-lg transition" title="এডিট"><Edit2 size={18}/></button>
                        <button onClick={()=>setEditPayment(o)} className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-700 shadow-sm">আপডেট</button>
                        <button onClick={()=>handleDeleteOrder(o.id)} className="text-red-400 hover:bg-red-50 p-2 rounded-lg transition"><Trash2 size={18}/></button>
                    </div>
                </td></tr>))}</tbody>
            </table></Card>
            {invoice && <InvoiceModal order={invoice} shopProfile={shopProfile} onClose={()=>setInvoice(null)} />}
            
            {/* Payment Update Modal */}
            {editPayment && <div className="fixed inset-0 bg-slate-900/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm"><Card className="w-full max-w-sm animate-in zoom-in shadow-2xl"><div className="flex justify-between items-center mb-6"><h3 className="font-bold text-lg">পেমেন্ট আপডেট</h3><button onClick={()=>setEditPayment(null)} className="p-2 hover:bg-slate-100 rounded-full"><X size={20}/></button></div><div className="space-y-5"><div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100"><p className="text-xs text-indigo-500 font-bold uppercase mb-1">বর্তমান বকেয়া</p><p className="text-2xl font-black text-indigo-700">{formatCurrency(editPayment.dueAmount)}</p></div><Input label="ডেলিভারি চার্জ" type="number" value={updatedDelivery} onChange={e => setUpdatedDelivery(e.target.value)} /><Input label="জমা পরিমাণ" type="number" value={paymentAmt} onChange={e => setPaymentAmt(e.target.value)} autoFocus placeholder="টাকা লিখুন" /><Button onClick={handleUpdatePayment} className="w-full mt-2 py-3.5 text-base">জমা নিশ্চিত করুন</Button></div></Card></div>}
            
            {/* NEW: Edit Order Modal */}
            {editOrder && (
                <div className="fixed inset-0 bg-slate-900/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
                    <Card className="w-full max-w-2xl animate-in zoom-in shadow-2xl my-8">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-xl">অর্ডার এডিট — #{editOrder.id.slice(-6).toUpperCase()}</h3>
                            <button onClick={() => setEditOrder(null)} className="p-2 hover:bg-slate-100 rounded-full"><X size={20} /></button>
                        </div>
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <Input label="কাস্টমার নাম" value={editCustomer.name} onChange={e => setEditCustomer({ ...editCustomer, name: e.target.value })} />
                                <Input label="ফোন" value={editCustomer.phone} onChange={e => setEditCustomer({ ...editCustomer, phone: e.target.value })} />
                            </div>
                            <Input label="ঠিকানা" value={editCustomer.address} onChange={e => setEditCustomer({ ...editCustomer, address: e.target.value })} />
                            <TextArea label="নোট" value={editCustomer.note} onChange={e => setEditCustomer({ ...editCustomer, note: e.target.value })} />
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1 block mb-3">আইটেম সমূহ</label>
                                <div className="space-y-3">
                                    {editItems.map((item, idx) => (
                                        <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                                            <div className="flex-1"><p className="text-sm font-bold">{item.name}</p></div>
                                            <select value={item.size} onChange={e => { const n = [...editItems]; n[idx].size = e.target.value; setEditItems(n); }} className="text-xs border p-1.5 rounded-lg">
                                                {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                            <input type="number" value={item.qty} onChange={e => { const n = [...editItems]; n[idx].qty = parseInt(e.target.value) || 1; setEditItems(n); }} className="w-16 text-center border rounded-lg px-2 py-1.5 text-sm" />
                                            <input type="number" value={item.sellPrice} onChange={e => { const n = [...editItems]; n[idx].sellPrice = safeParse(e.target.value); setEditItems(n); }} className="w-20 text-right border rounded-lg px-2 py-1.5 text-sm" />
                                            <button onClick={() => setEditItems(editItems.filter((_, i) => i !== idx))} className="p-1 text-red-500 hover:bg-red-50 rounded"><X size={16} /></button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <Button onClick={handleSaveEditOrder} className="w-full py-4 text-lg">পরিবর্তন সেভ করুন</Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};

// ==============================
// INVOICE MODAL (Professional, with Logo, Design Image, Payment Method)
// ==============================
const InvoiceModal = ({ order, shopProfile, onClose }) => {
    const printRef = useRef();
    const [previewImage, setPreviewImage] = useState(null);
    
    const handlePrint = () => {
        const content = printRef.current.innerHTML;
        const win = window.open('', '', 'height=1123,width=794');
        if (!win) return;
        win.document.write(`<html><head><title>Invoice</title><style>@media print { body { margin: 0; } @page { margin: 10mm; } .no-print { display: none; } } body { font-family: 'Segoe UI', sans-serif; } table { border-collapse: collapse; width: 100%; } th, td { padding: 10px 12px; text-align: left; } th { background: #1e293b; color: white; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; } td { border-bottom: 1px solid #f1f5f9; font-size: 13px; } .text-right { text-align: right; } .text-center { text-align: center; }</style></head><body>${content}</body></html>`);
        win.document.close();
        setTimeout(() => win.print(), 500);
    };

    const dateStr = order.orderDate || (order.createdAt?.toDate ? order.createdAt.toDate().toLocaleDateString('bn-BD') : new Date().toLocaleDateString('bn-BD'));
    const due = safeParse(order.totalAmount) - safeParse(order.paidAmount);

    const paymentMethodLabels = {
        Cash: 'নগদ (Cash)', Bkash: 'বিকাশ (bKash)', Nagad: 'নগদ (Nagad)', Rocket: 'রকেট (Rocket)', Bank: 'ব্যাংক (Bank)'
    };

    return (
        <div className="fixed inset-0 bg-slate-900/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-xl max-w-2xl w-full flex flex-col max-h-[90vh] shadow-2xl">
                <div className="p-5 border-b flex justify-between items-center bg-slate-50 font-bold rounded-t-xl no-print"><span>ইনভয়েস প্রিভিউ</span><div className="flex gap-3"><Button onClick={handlePrint} icon={<Printer size={18}/>}>প্রিন্ট</Button><button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full"><X size={20}/></button></div></div>
                <div className="overflow-y-auto p-10 bg-white" ref={printRef}>
                    {/* Header with Logo */}
                    <div style={{ borderBottom: '3px solid #1e293b', paddingBottom: '24px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            {shopProfile.logo && <img src={shopProfile.logo} style={{ width: '60px', height: '60px', borderRadius: '12px', objectFit: 'cover', border: '2px solid #e2e8f0' }} />}
                            <div>
                                <h1 style={{ fontSize: '28px', fontWeight: 900, color: '#6366f1', letterSpacing: '-1px', marginBottom: '4px' }}>{shopProfile.shopName}</h1>
                                <p style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>{shopProfile.address}</p>
                                <p style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>📞 {shopProfile.phone}</p>
                            </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <h2 style={{ fontSize: '32px', fontWeight: 900, color: '#cbd5e1', letterSpacing: '4px' }}>INVOICE</h2>
                            <p style={{ fontWeight: 700, color: '#1e293b', fontSize: '16px', marginTop: '4px' }}>#INV-{order.id?.slice(-6).toUpperCase()}</p>
                            <p style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 700 }}>তারিখ: {dateStr}</p>
                        </div>
                    </div>

                    {/* Customer Info */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
                        <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                            <p style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '8px' }}>বিল প্রাপক</p>
                            <p style={{ fontSize: '18px', fontWeight: 900, color: '#1e293b' }}>{order.customerName}</p>
                            <p style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>📞 {order.phone}</p>
                            {order.address && <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>📍 {order.address}</p>}
                        </div>
                        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-end', gap: '8px' }}>
                            <div>
                                <p style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>পেমেন্ট স্ট্যাটাস</p>
                                <span style={{ fontSize: '18px', fontWeight: 900, color: order.status === 'Paid' ? '#10b981' : '#f43f5e' }}>{order.status === 'Paid' ? '✅ পরিশোধিত' : '⏳ বকেয়া আছে'}</span>
                            </div>
                            {order.lastPaymentMethod && (
                                <div>
                                    <p style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>পেমেন্ট মাধ্যম</p>
                                    <span style={{ fontSize: '14px', fontWeight: 800, color: '#6366f1' }}>{paymentMethodLabels[order.lastPaymentMethod] || order.lastPaymentMethod}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Items Table */}
                    <table style={{ width: '100%', marginBottom: '24px', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#1e293b', color: 'white' }}>
                                <th style={{ padding: '12px 16px', textAlign: 'left', borderRadius: '8px 0 0 0', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px' }}>পণ্য</th>
                                <th style={{ padding: '12px', textAlign: 'center', fontSize: '11px', textTransform: 'uppercase' }}>সাইজ</th>
                                <th style={{ padding: '12px', textAlign: 'center', fontSize: '11px', textTransform: 'uppercase' }}>পরিমাণ</th>
                                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '11px', textTransform: 'uppercase' }}>দর</th>
                                <th style={{ padding: '12px 16px', textAlign: 'right', borderRadius: '0 8px 0 0', fontSize: '11px', textTransform: 'uppercase' }}>মোট</th>
                            </tr>
                        </thead>
                        <tbody>
                            {order.items?.map((i, idx) => (
                                <React.Fragment key={idx}>
                                    <tr style={{ borderBottom: i.designImage ? 'none' : '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '12px 16px', fontWeight: 700, color: '#334155' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                {i.image && <img src={i.image} style={{ width: '36px', height: '36px', borderRadius: '6px', objectFit: 'cover', border: '1px solid #e2e8f0' }} />}
                                                <span>{i.name}</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '12px', textAlign: 'center', fontWeight: 600, color: '#64748b' }}>{i.size}</td>
                                        <td style={{ padding: '12px', textAlign: 'center', fontWeight: 900 }}>{i.qty}</td>
                                        <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>{formatCurrency(i.sellPrice)}</td>
                                        <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 900, letterSpacing: '-0.5px' }}>{formatCurrency(safeParse(i.sellPrice) * safeParse(i.qty))}</td>
                                    </tr>
                                    {i.designImage && (
                                        <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td colSpan={5} style={{ padding: '4px 16px 12px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#6366f1', textTransform: 'uppercase' }}>ডিজাইন:</span>
                                                    <img
                                                        src={i.designImage}
                                                        style={{ width: '80px', height: '80px', borderRadius: '8px', objectFit: 'cover', border: '2px solid #6366f1', cursor: 'pointer' }}
                                                        title="বড় করে দেখতে ক্লিক করুন"
                                                        onClick={() => setPreviewImage(i.designImage)}
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>

                    {/* Summary */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <div style={{ width: '280px', background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontWeight: 700, fontSize: '13px', marginBottom: '8px' }}>
                                <span>সাব-টোটাল</span><span style={{ fontWeight: 900 }}>{formatCurrency(order.subTotal)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontWeight: 700, fontSize: '13px', paddingBottom: '12px', borderBottom: '1px solid #e2e8f0' }}>
                                <span>ডেলিভারি চার্জ</span><span style={{ fontWeight: 900 }}>{formatCurrency(order.deliveryCharge)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: '18px', color: '#1e293b', paddingTop: '12px', letterSpacing: '-0.5px' }}>
                                <span>মোট বিল</span><span>{formatCurrency(order.totalAmount)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '14px', color: '#10b981', marginTop: '8px' }}>
                                <span>পরিশোধিত</span><span>- {formatCurrency(order.paidAmount)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: '16px', color: '#f43f5e', paddingTop: '12px', borderTop: '1px solid #e2e8f0', marginTop: '8px', letterSpacing: '-0.5px' }}>
                                <span>বকেয়া</span><span>{formatCurrency(due)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Note */}
                    {order.note && (
                        <div style={{ marginTop: '24px', padding: '12px 16px', background: '#fffbeb', borderRadius: '12px', border: '1px solid #fef3c7' }}>
                            <p style={{ fontSize: '11px', fontWeight: 800, color: '#d97706', textTransform: 'uppercase', marginBottom: '4px' }}>নোট</p>
                            <p style={{ fontSize: '13px', color: '#92400e' }}>{order.note}</p>
                        </div>
                    )}

                    {/* Footer */}
                    <div style={{ marginTop: '48px', textAlign: 'center', borderTop: '2px dashed #e2e8f0', paddingTop: '24px', opacity: 0.5 }}>
                        <p style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '4px', color: '#94a3b8' }}>ব্যবসা করার জন্য ধন্যবাদ</p>
                    </div>
                </div>
            </div>

            {/* Full-screen Design Image Preview */}
            {previewImage && (
                <div onClick={() => setPreviewImage(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out' }}>
                    <img src={previewImage} style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: '12px', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }} />
                </div>
            )}
        </div>
    );
};

// ==============================
// EXPENSE VIEW (with Date)
// ==============================
const ExpenseView = ({ expenses, user }) => {
    const [form, setForm] = useState({ title: '', amount: '', category: 'Marketing', date: new Date().toISOString().split('T')[0] });
    const [editItem, setEditItem] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const data = { title: form.title, amount: safeParse(form.amount), category: form.category, date: form.date, createdAt: serverTimestamp() };
        await addDoc(collection(db, 'artifacts', DB_VERSION, 'users', user.uid, 'expenses'), data);
        setForm({ title: '', amount: '', category: 'Marketing', date: new Date().toISOString().split('T')[0] });
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        await updateDoc(doc(db, 'artifacts', DB_VERSION, 'users', user.uid, 'expenses', editItem.id), { 
            title: editItem.title, amount: safeParse(editItem.amount), category: editItem.category, date: editItem.date || ''
        });
        setEditItem(null);
    };

    const handleDelete = async (id) => {
        if(window.confirm('ডিলেট করবেন?')) await deleteDoc(doc(db, 'artifacts', DB_VERSION, 'users', user.uid, 'expenses', id));
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in">
            <Card><h3 className="font-bold mb-6 flex items-center gap-2 text-xl"><CreditCard size={24} className="text-rose-500"/> খরচ এন্ট্রি</h3>
                <form onSubmit={handleSubmit} className="space-y-5">
                    <Input label="বিবরণ" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} required placeholder="কিসের খরচ?"/>
                    <Input label="টাকা" type="number" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} required placeholder="0"/>
                    {/* NEW: Date */}
                    <Input label="তারিখ" type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/>
                    <Select label="খাত" value={form.category} options={EXPENSE_CATEGORIES.map(c=>({label:c,value:c}))} onChange={e=>setForm({...form,category:e.target.value})} />
                    <Button type="submit" className="w-full py-4 mt-2 text-lg shadow-lg" icon={<Save size={20}/>}>খরচ সেভ করুন</Button>
                </form>
            </Card>
            <div className="space-y-4">
                <h3 className="font-bold text-xl text-slate-800">খরচের তালিকা</h3>
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                    {expenses.map(ex => (
                        <div key={ex.id} className="bg-white p-5 rounded-2xl border border-slate-100 flex justify-between items-center shadow-sm hover:shadow-md transition group">
                            <div>
                                <p className="font-bold text-slate-800 text-lg">{ex.title}</p>
                                <div className="flex gap-2 items-center">
                                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{ex.category}</p>
                                    {ex.date && <p className="text-[10px] text-slate-400">• {ex.date}</p>}
                                </div>
                            </div>
                            <div className="flex items-center gap-5"><span className="text-rose-500 font-black text-xl">-{formatCurrency(ex.amount)}</span>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                                <button onClick={()=>setEditItem(ex)} className="p-2 hover:bg-indigo-50 rounded-lg text-indigo-500"><Edit2 size={18}/></button>
                                <button onClick={()=>handleDelete(ex.id)} className="p-2 hover:bg-rose-50 rounded-lg text-rose-500"><Trash2 size={18}/></button>
                            </div></div>
                        </div>
                    ))}
                </div>
            </div>
             {editItem && <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm"><Card className="w-full max-w-sm animate-in zoom-in"><div className="flex justify-between mb-6"><h3 className="font-bold text-lg">এডিট খরচ</h3><button onClick={()=>setEditItem(null)}><X size={20}/></button></div><form onSubmit={handleUpdate} className="space-y-5"><Input label="বিবরণ" value={editItem.title} onChange={e => setEditItem({...editItem, title: e.target.value})} /><Input label="টাকা" type="number" value={String(editItem.amount)} onChange={e => setEditItem({...editItem, amount: e.target.value})} /><Input label="তারিখ" type="date" value={editItem.date || ''} onChange={e => setEditItem({...editItem, date: e.target.value})} /><Select label="খাত" value={editItem.category} options={EXPENSE_CATEGORIES.map(c=>({label:c,value:c}))} onChange={e => setEditItem({...editItem, category: e.target.value})} /><Button type="submit" className="w-full py-3">আপডেট করুন</Button></form></Card></div>}
        </div>
    );
};

// ==============================
// SUPPLIER VIEW
// ==============================
const SupplierView = ({ products, supplierPayments, user, orders }) => {
    const [form, setForm] = useState({ amount: '', date: '', notes: '' });

    const totalSoldCost = useMemo(() => (orders || []).reduce((sum, o) => sum + (o.items?.reduce((s, i) => s + (safeParse(i.buyPrice)*safeParse(i.qty)), 0) || 0), 0), [orders]);
    const totalPaid = useMemo(() => (supplierPayments || []).reduce((sum, p) => sum + safeParse(p.amount), 0), [supplierPayments]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        await addDoc(collection(db, 'artifacts', DB_VERSION, 'users', user.uid, 'supplier_payments'), {
            amount: parseFloat(form.amount), date: form.date, notes: form.notes, createdAt: serverTimestamp()
        });
        setForm({ amount: '', date: '', notes: '' });
    };

    const handleDelete = async (id) => {
        if(window.confirm("ডিলেট করবেন?")) await deleteDoc(doc(db, 'artifacts', DB_VERSION, 'users', user.uid, 'supplier_payments', id));
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in">
             <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <Card className="bg-slate-900 text-white"><p className="text-slate-400 text-xs font-bold uppercase mb-1">মোট বিক্রিত পণ্যের কেনা দাম</p><h3 className="text-2xl font-black">{formatCurrency(totalSoldCost)}</h3></Card>
                    <Card className="bg-orange-50 border-orange-100"><p className="text-orange-400 text-xs font-bold uppercase mb-1">সাপ্লায়ার বকেয়া</p><h3 className="text-2xl font-black text-orange-600">{formatCurrency(totalSoldCost - totalPaid)}</h3></Card>
                </div>
                <Card>
                    <h3 className="font-bold text-xl mb-6 flex items-center gap-2"><Truck size={24} className="text-indigo-600"/> সাপ্লায়ার পেমেন্ট এন্ট্রি</h3>
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <Input label="টাকার পরিমাণ" type="number" value={form.amount} onChange={e=>setForm({...form, amount: e.target.value})} required placeholder="0.00"/>
                        <Input label="পরিশোধের তারিখ" type="date" value={form.date} onChange={e=>setForm({...form, date: e.target.value})} required/>
                        <TextArea label="নোট / মন্তব্য" value={form.notes} onChange={e=>setForm({...form, notes: e.target.value})} placeholder="বিবরণ..."/>
                        <Button type="submit" className="w-full py-4 shadow-lg text-lg">পেমেন্ট সেভ করুন</Button>
                    </form>
                </Card>
            </div>
            <div className="space-y-4">
                <h3 className="font-bold text-xl">পেমেন্ট হিস্ট্রি</h3>
                <div className="space-y-3 h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                    {supplierPayments.map(p => (
                        <div key={p.id} className="bg-white p-5 rounded-2xl border border-slate-100 flex justify-between items-center shadow-sm">
                            <div><p className="font-bold text-slate-800">{p.date}</p><p className="text-xs text-slate-500">{p.notes || 'No notes'}</p></div>
                            <div className="flex items-center gap-4"><span className="text-emerald-600 font-black text-xl">{formatCurrency(p.amount)}</span><button onClick={()=>handleDelete(p.id)} className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100"><Trash2 size={16}/></button></div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// ==============================
// CUSTOMER VIEW
// ==============================
const CustomerView = ({ orders, user }) => {
    const [editingCustomer, setEditingCustomer] = useState(null);
    const [formData, setFormData] = useState({ name: '', phone: '', address: '' });

    const customers = useMemo(() => {
        const map = {};
        orders.forEach(o => {
            if(!map[o.phone]) map[o.phone] = { name: o.customerName, phone: o.phone, address: o.address, totalOrders: 0, totalSpent: 0 };
            map[o.phone].totalOrders += 1;
            map[o.phone].totalSpent += safeParse(o.totalAmount);
        });
        return Object.values(map);
    }, [orders]);

    const handleEditStart = (c) => {
        setEditingCustomer(c.phone);
        setFormData({ name: c.name, phone: c.phone, address: c.address });
    };

    const handleUpdateCustomer = async () => {
        const batch = writeBatch(db);
        const q = query(collection(db, 'artifacts', DB_VERSION, 'users', user.uid, 'orders'), where("phone", "==", editingCustomer));
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((d) => {
            batch.update(d.ref, { customerName: formData.name, phone: formData.phone, address: formData.address });
        });
        await batch.commit();
        setEditingCustomer(null);
        alert("কাস্টমার তথ্য আপডেট হয়েছে!");
    };

    const handleDeleteCustomer = async (phone) => {
       if(window.confirm("সাবধান! এই কাস্টমারের সব অর্ডার ডিলিট হয়ে যাবে। আপনি কি নিশ্চিত?")) {
           const customerOrders = orders.filter(o => o.phone === phone);
           for(let o of customerOrders) {
               await deleteDoc(doc(db, 'artifacts', DB_VERSION, 'users', user.uid, 'orders', o.id));
           }
       }
    };

    return (
        <div className="space-y-8 animate-in fade-in">
            <h2 className="text-2xl font-bold text-slate-800">কাস্টমার ডাটাবেজ</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {customers.map((c, i) => (
                    <Card key={i} className="hover:shadow-xl transition border border-slate-100 group relative">
                        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition">
                            <button onClick={() => handleEditStart(c)} className="text-indigo-400 hover:text-indigo-600"><Edit2 size={16}/></button>
                            <button onClick={() => handleDeleteCustomer(c.phone)} className="text-slate-300 hover:text-red-500"><Trash2 size={16}/></button>
                        </div>
                        <div className="flex items-start justify-between mb-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-xl">{c.name.charAt(0)}</div>
                            <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-xs font-black">{c.totalOrders} Orders</span>
                        </div>
                        <h3 className="font-bold text-lg text-slate-800">{c.name}</h3>
                        <p className="text-sm text-slate-500 flex items-center gap-1 mb-1"><Phone size={14}/> {c.phone}</p>
                        <p className="text-xs text-slate-400 truncate mb-4">{c.address}</p>
                        <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-400 uppercase">Total Spent</span>
                            <span className="text-lg font-black text-slate-800">{formatCurrency(c.totalSpent)}</span>
                        </div>
                    </Card>
                ))}
            </div>
            {editingCustomer && (
                <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
                    <Card className="w-full max-w-md animate-in zoom-in">
                        <div className="flex justify-between mb-4"><h3 className="font-bold text-lg">এডিট কাস্টমার</h3><button onClick={()=>setEditingCustomer(null)}><X/></button></div>
                        <div className="space-y-4">
                            <Input label="নাম" value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})}/>
                            <Input label="ফোন" value={formData.phone} onChange={e=>setFormData({...formData, phone: e.target.value})}/>
                            <TextArea label="ঠিকানা" value={formData.address} onChange={e=>setFormData({...formData, address: e.target.value})}/>
                            <Button onClick={handleUpdateCustomer} className="w-full">আপডেট করুন</Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};

// ==============================
// SETTINGS VIEW (with Logo)
// ==============================
const SettingsView = ({ profile, user }) => {
    const [data, setData] = useState(profile);
    const handleSave = async (e) => { e.preventDefault(); await setDoc(doc(db, 'artifacts', DB_VERSION, 'users', user.uid, 'settings', 'profile'), data, {merge: true}); alert("আপনার তথ্য আপডেট হয়েছে!"); };
    
    const handleLogoUpload = (e) => {
        const file = e.target.files[0];
        if(file) {
            resizeImage(file).then(resizedImage => {
                setData({...data, logo: resizedImage});
            });
        }
    }

    return (
        <div className="max-w-2xl mx-auto animate-in fade-in">
            <Card className="border-t-4 border-indigo-600 shadow-2xl"><div className="flex items-center gap-5 mb-10 border-b pb-8"><div className="w-16 h-16 bg-indigo-50 rounded-3xl flex items-center justify-center text-indigo-600 border border-indigo-100 shadow-sm"><Settings size={32}/></div><div><h2 className="text-3xl font-black text-slate-800">ব্যবসায়িক প্রোফাইল</h2><p className="text-sm text-slate-500 font-medium">ইনভয়েসে এই তথ্যগুলো ব্যবহার হবে</p></div></div><form onSubmit={handleSave} className="space-y-6">
                <div>
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider ml-1 block mb-2">দোকানের লোগো</label>
                    <div className="flex items-center gap-4">
                        {data.logo && <img src={data.logo} className="w-20 h-20 rounded-xl object-cover border"/>}
                        <input type="file" accept="image/*" onChange={handleLogoUpload} className="text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"/>
                    </div>
                </div>
                <Input label="দোকানের নাম" value={data.shopName} onChange={e=>setData({...data,shopName:e.target.value})} required/><Input label="মোবাইল নাম্বার" value={data.phone} onChange={e=>setData({...data,phone:e.target.value})} required/><TextArea label="দোকানের ঠিকানা" value={data.address} onChange={e=>setData({...data,address:e.target.value})} required/><Button type="submit" className="w-full py-4 text-lg shadow-xl" icon={<Save size={20}/>}>তথ্য আপডেট করুন</Button></form></Card></div>
    );
};
