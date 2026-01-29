import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  LayoutDashboard, ShoppingBag, CreditCard, Users, Menu, X, Plus, Search, 
  Trash2, Save, Printer, AlertCircle, Package, Phone, CheckCircle, FileText, 
  Settings, List, DollarSign, Eye, EyeOff, Banknote, Smartphone, Landmark, 
  Edit2, Info, MapPin, TrendingUp, Minus, Check, LogOut, Store, ArrowRight, Lock 
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
  deleteDoc, updateDoc, serverTimestamp, orderBy, setDoc, getDoc 
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

const DB_VERSION = "business-manager-v5-final"; 

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Constants ---
const NECK_TYPES = ['গোল গলা', 'ভি গলা', 'ক্রস ভি গলা', 'কলার', 'ভি কলার', 'পাঞ্জাবী কলার'];
const FABRIC_TYPES = ['PP (170-180 GSM)', 'Sugar Mesh', 'Box Mesh', 'Honeycomb', 'Jacquard', 'Brush Jacquard'];
const SIZES = ['M', 'L', 'XL', 'XXL', 'Free Size', 'Mixed'];
const PAYMENT_METHODS = [
    { id: 'Cash', label: 'Cash (নগদ)', color: 'bg-emerald-600', icon: <Banknote size={16}/> },
    { id: 'Bkash', label: 'bKash', color: 'bg-[#e2136e]', icon: <Smartphone size={16}/> },
    { id: 'Nagad', label: 'Nagad', color: 'bg-[#f7941d]', icon: <Smartphone size={16}/> },
    { id: 'Rocket', label: 'Rocket', color: 'bg-[#8c3494]', icon: <Smartphone size={16}/> },
    { id: 'Bank', label: 'Bank', color: 'bg-indigo-600', icon: <Landmark size={16}/> },
];

// --- Shared UI Components ---
const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-xl shadow-md border border-slate-100 p-6 ${className}`}>{children}</div>
);

const Button = ({ children, onClick, variant = "primary", className = "", disabled = false, type="button", icon }) => {
  const baseStyle = "px-5 py-2.5 rounded-lg font-bold transition-all duration-200 flex items-center justify-center gap-2 text-sm shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-slate-900 text-white hover:bg-black shadow-lg shadow-slate-200",
    secondary: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50",
    danger: "bg-red-50 text-red-600 border border-red-100 hover:bg-red-100",
    outline: "border-2 border-dashed border-indigo-300 text-indigo-600 hover:bg-indigo-50"
  };
  return <button type={type} onClick={onClick} disabled={disabled} className={`${baseStyle} ${variants[variant]} ${className}`}>{icon}{children}</button>;
};

const Input = ({ label, type = "text", value, onChange, placeholder, required = false, readOnly = false }) => (
  <div className="flex flex-col gap-2 w-full">
    {label && <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">{label}</label>}
    <input type={type} value={value} onChange={onChange} placeholder={placeholder} required={required} readOnly={readOnly}
      className={`w-full px-4 py-3 rounded-lg border border-slate-200 outline-none transition-all text-slate-800 text-sm ${readOnly ? 'bg-slate-100' : 'bg-slate-50/50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10'}`} />
  </div>
);

const TextArea = ({ label, value, onChange, placeholder, required = false }) => (
  <div className="flex flex-col gap-2 w-full">
    {label && <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">{label}</label>}
    <textarea value={value} onChange={onChange} placeholder={placeholder} required={required} rows={3}
      className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-indigo-500 outline-none transition-all text-slate-800 text-sm bg-slate-50/50 focus:bg-white resize-none" />
  </div>
);

const Select = ({ label, value, onChange, options }) => (
  <div className="flex flex-col gap-2 w-full">
    {label && <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">{label}</label>}
    <select value={value} onChange={onChange} className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-indigo-500 outline-none transition-all text-slate-800 bg-slate-50/50 focus:bg-white text-sm cursor-pointer">
      {options.map((opt, idx) => <option key={idx} value={opt.value}>{opt.label}</option>)}
    </select>
  </div>
);

// --- Auth Components ---
const AuthScreen = ({ onLoginSuccess }) => {
  const [view, setView] = useState('login');
  const [formData, setFormData] = useState({ phone: '', password: '', shopName: '', address: '', otp: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedOTP, setGeneratedOTP] = useState('');

  const handleSignupInit = (e) => {
    e.preventDefault();
    if (formData.phone.length < 11) { setError("সঠিক ফোন নাম্বার দিন"); return; }
    const mockOTP = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOTP(mockOTP);
    setView('otp');
    setError('');
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    if (formData.otp !== generatedOTP) { setError("ভুল ওটিপি কোড!"); return; }
    setLoading(true);
    const email = `${formData.phone}@manager.local`;
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, formData.password);
        await setDoc(doc(db, 'artifacts', DB_VERSION, 'users', userCredential.user.uid, 'settings', 'profile'), {
            shopName: formData.shopName, address: formData.address, phone: formData.phone, createdAt: serverTimestamp()
        });
        onLoginSuccess();
    } catch (err) {
        setError("সমস্যা হয়েছে। অন্য নাম্বার দিয়ে চেষ্টা করুন।");
        setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const email = `${formData.phone}@manager.local`;
    try {
        await signInWithEmailAndPassword(auth, email, formData.password);
        onLoginSuccess();
    } catch (err) { setError("ফোন নাম্বার বা পাসওয়ার্ড ভুল।"); setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md !p-8 shadow-2xl border-t-4 border-indigo-600">
        <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white mx-auto mb-4 shadow-lg"><Store size={32} /></div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Business Manager</h1>
            <p className="text-slate-500 text-sm mt-1 font-medium">আপনার ব্যবসার ডিজিটাল পার্টনার</p>
        </div>
        {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6 flex items-center gap-2 border border-red-100 animate-pulse"><AlertCircle size={16}/> {error}</div>}
        
        {view === 'login' && (
            <form onSubmit={handleLogin} className="space-y-5 animate-in fade-in">
                <Input label="ফোন নাম্বার" placeholder="017xxxxxxxx" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} required />
                <Input label="পাসওয়ার্ড" type="password" placeholder="******" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} required />
                <Button type="submit" className="w-full py-3.5 bg-indigo-600 text-white hover:bg-indigo-700" disabled={loading}>{loading ? 'লগিন হচ্ছে...' : 'লগিন করুন'} <ArrowRight size={18}/></Button>
                <div className="text-center mt-6"><button type="button" onClick={() => setView('signup')} className="text-indigo-600 font-bold text-sm hover:underline">নতুন একাউন্ট খুলুন</button></div>
            </form>
        )}
        {view === 'signup' && (
            <form onSubmit={handleSignupInit} className="space-y-4 animate-in fade-in">
                <Input label="দোকানের নাম" placeholder="My Shop" value={formData.shopName} onChange={e => setFormData({...formData, shopName: e.target.value})} required />
                <Input label="ফোন নাম্বার" placeholder="017xxxxxxxx" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} required />
                <Input label="ঠিকানা" placeholder="Dhaka" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} required />
                <Input label="পাসওয়ার্ড" type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} required />
                <Button type="submit" className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white">ওটিপি পাঠান</Button>
                <div className="text-center mt-4"><button type="button" onClick={() => setView('login')} className="text-slate-500 text-sm">লগিন করুন</button></div>
            </form>
        )}
        {view === 'otp' && (
            <div className="space-y-6 text-center animate-in zoom-in">
                <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100">
                    <p className="text-xs font-bold text-indigo-400 uppercase mb-2">ভেরিফিকেশন কোড</p>
                    <p className="text-3xl font-mono font-bold text-indigo-700 tracking-[0.3em]">{generatedOTP}</p>
                </div>
                <form onSubmit={handleCreateAccount} className="space-y-4 text-left">
                    <Input label="কোডটি লিখুন" value={formData.otp} onChange={e => setFormData({...formData, otp: e.target.value})} required />
                    <Button type="submit" className="w-full" disabled={loading}>একাউন্ট তৈরি করুন</Button>
                </form>
            </div>
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Auto-fix for profile if missing to prevent white screen
        const docRef = doc(db, 'artifacts', DB_VERSION, 'users', currentUser.uid, 'settings', 'profile');
        try {
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                setShopProfile(docSnap.data());
            } else {
                const defaultProfile = { shopName: 'My Business', address: '', phone: currentUser.email?.split('@')[0] || '' };
                await setDoc(docRef, defaultProfile);
                setShopProfile(defaultProfile);
            }
        } catch (e) {
            console.error("Profile Error", e);
            setShopProfile({ shopName: 'My Business', address: '', phone: '' });
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const getColl = (c) => collection(db, 'artifacts', DB_VERSION, 'users', user.uid, c);
    const unsubProfile = onSnapshot(doc(db, 'artifacts', DB_VERSION, 'users', user.uid, 'settings', 'profile'), (d) => d.exists() && setShopProfile(d.data()));
    const unsubProducts = onSnapshot(query(getColl('products'), orderBy('createdAt', 'desc')), (s) => setProducts(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubOrders = onSnapshot(query(getColl('orders'), orderBy('createdAt', 'desc')), (s) => setOrders(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubExpenses = onSnapshot(query(getColl('expenses'), orderBy('createdAt', 'desc')), (s) => setExpenses(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => { unsubProfile(); unsubProducts(); unsubOrders(); unsubExpenses(); };
  }, [user]);

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50 font-bold text-indigo-600 animate-pulse">লোড হচ্ছে...</div>;
  if (!user || !shopProfile) return <AuthScreen onLoginSuccess={() => {}} />;

  return (
    <div className="flex h-screen bg-slate-100 font-sans text-slate-800 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-72 bg-slate-900 text-white flex flex-col hidden md:flex">
        <div className="p-6 border-b border-white/10 flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center font-bold text-white shadow-lg">BM</div>
            <div>
                <h1 className="font-bold text-lg leading-tight">Business Manager</h1>
                <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">SaaS Edition</p>
            </div>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
          <NavItem active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard size={20} />} label="ড্যাশবোর্ড" />
          <NavItem active={activeTab === 'inventory'} onClick={() => setActiveTab('inventory')} icon={<Package size={20} />} label="ইনভেন্টরি" />
          <NavItem active={activeTab === 'pos'} onClick={() => setActiveTab('pos')} icon={<ShoppingBag size={20} />} label="POS (অর্ডার)" />
          <NavItem active={activeTab === 'orders'} onClick={() => setActiveTab('orders')} icon={<List size={20} />} label="অর্ডার লিস্ট" />
          <NavItem active={activeTab === 'customers'} onClick={() => setActiveTab('customers')} icon={<Users size={20} />} label="কাস্টমার ডাটা" />
          <NavItem active={activeTab === 'expenses'} onClick={() => setActiveTab('expenses')} icon={<CreditCard size={20} />} label="খরচপাতি" />
          <NavItem active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<Settings size={20} />} label="সেটিংস" />
        </nav>
        <div className="p-4 border-t border-white/10 bg-black/20">
           <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl backdrop-blur-sm mb-3">
             <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center font-bold">{shopProfile.shopName?.charAt(0)}</div>
             <div className="overflow-hidden">
                <p className="text-sm font-bold truncate">{shopProfile.shopName}</p>
                <p className="text-[10px] text-slate-400 truncate">{shopProfile.phone}</p>
             </div>
           </div>
           <button onClick={() => signOut(auth)} className="w-full flex items-center justify-center gap-2 text-red-400 text-xs font-bold py-2 rounded-lg hover:bg-white/5 transition"><LogOut size={14}/> লগ আউট</button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden bg-[#F8FAFC]">
        <header className="h-16 bg-white border-b flex items-center justify-between px-8 shadow-sm">
          <h2 className="font-bold text-slate-800 uppercase tracking-wider">{activeTab.replace('_', ' ')}</h2>
          <div className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full border flex items-center gap-2 shadow-inner"><MapPin size={12} className="text-indigo-500"/> {shopProfile.address || 'ঠিকানা সেট করুন'}</div>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-8">
            {activeTab === 'dashboard' && <DashboardView products={products} orders={orders} expenses={expenses} />}
            {activeTab === 'inventory' && <InventoryView products={products} user={user} />}
            {activeTab === 'pos' && <POSView products={products} user={user} shopProfile={shopProfile} />}
            {activeTab === 'orders' && <OrderListView orders={orders} user={user} shopProfile={shopProfile} />}
            {activeTab === 'customers' && <CustomerView orders={orders} />}
            {activeTab === 'expenses' && <ExpenseView expenses={expenses} user={user} />}
            {activeTab === 'settings' && <SettingsView profile={shopProfile} user={user} />}
        </div>
      </main>
    </div>
  );
}

const NavItem = ({ active, onClick, icon, label }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 font-bold' : 'text-slate-500 hover:bg-slate-100 font-medium'}`}>
    {icon} <span className="text-sm">{label}</span>
  </button>
);

// --- VIEWS ---

const DashboardView = ({ products, orders, expenses }) => {
    const [showProfit, setShowProfit] = useState(false);
    
    useEffect(() => {
        let timer;
        if (showProfit) { timer = setTimeout(() => setShowProfit(false), 5000); }
        return () => clearTimeout(timer);
    }, [showProfit]);

    const stats = useMemo(() => {
        const totalSales = orders.reduce((s, o) => s + parseFloat(o.totalAmount || 0), 0);
        const totalPaid = orders.reduce((s, o) => s + parseFloat(o.paidAmount || 0), 0);
        const totalDue = orders.reduce((s, o) => s + parseFloat(o.dueAmount || 0), 0);
        const totalExpense = expenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0);
        
        // Accurate Net Profit Calculation
        // Profit = Sales - Cost of Goods Sold (Sum of buyPrice of all sold items) - Expenses
        let totalCOGS = 0;
        orders.forEach(order => {
            order.items?.forEach(item => {
                totalCOGS += (parseFloat(item.buyPrice || 0) * parseFloat(item.qty || 0));
            });
        });
        
        const netProfit = totalSales - totalCOGS - totalExpense;
        return { totalSales, totalPaid, totalDue, totalExpense, netProfit };
    }, [orders, expenses]);

    const chartData = useMemo(() => orders.slice(-7).map(o => ({ name: o.customerName?.slice(0, 5), sales: o.totalAmount })), [orders]);

    return (
        <div className="space-y-8 animate-in fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="মোট বিক্রয়" value={`৳${stats.totalSales.toLocaleString()}`} icon={<ShoppingBag className="text-blue-600"/>} color="bg-blue-50" />
                <StatCard title="মোট খরচ" value={`৳${stats.totalExpense.toLocaleString()}`} icon={<CreditCard className="text-rose-600"/>} color="bg-rose-50" />
                <StatCard 
                    title={showProfit ? "নিট মুনাফা (Profit)" : "নিট মুনাফা (Hidden)"}
                    value={showProfit ? `৳${stats.netProfit.toLocaleString()}` : "****"} 
                    icon={showProfit ? <EyeOff className="text-emerald-600"/> : <Eye className="text-emerald-600"/>} 
                    color="bg-emerald-50" 
                    onClick={() => setShowProfit(!showProfit)}
                    cursor="cursor-pointer"
                />
                <StatCard title="মোট পণ্য" value={products.length} icon={<Package className="text-indigo-600"/>} color="bg-indigo-50" />
            </div>
            <Card className="h-80 shadow-md">
                <h3 className="font-bold text-slate-700 mb-6 flex items-center gap-2"><TrendingUp size={18} className="text-indigo-600"/> বিক্রয় গ্রাফ (সাম্প্রতিক)</h3>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="name"/><YAxis/><Tooltip/><Area type="monotone" dataKey="sales" stroke="#6366f1" fill="#6366f120" strokeWidth={3}/></AreaChart>
                </ResponsiveContainer>
            </Card>
        </div>
    );
};

const StatCard = ({ title, value, icon, color, onClick, cursor }) => (
    <div onClick={onClick} className={`bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 transition-all hover:shadow-xl hover:-translate-y-1 ${cursor || ''}`}>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>{icon}</div>
        <div><p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{title}</p><h4 className="text-xl font-black">{value}</h4></div>
    </div>
);

const InventoryView = ({ products, user }) => {
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ name: '', buyPrice: '', sellPrice: '', stock: '', fabric: FABRIC_TYPES[0], neck: NECK_TYPES[0] });
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        await addDoc(collection(db, 'artifacts', DB_VERSION, 'users', user.uid, 'products'), { ...form, createdAt: serverTimestamp() });
        setShowModal(false); setForm({ name: '', buyPrice: '', sellPrice: '', stock: '', fabric: FABRIC_TYPES[0], neck: NECK_TYPES[0] });
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex justify-between items-center"><h2 className="text-xl font-bold text-slate-800">ইনভেন্টরি ম্যানেজমেন্ট</h2><Button onClick={() => setShowModal(true)} icon={<Plus size={18}/>}>নতুন পণ্য যোগ করুন</Button></div>
            <Card className="p-0 overflow-hidden shadow-sm">
                <table className="w-full text-left text-sm border-collapse">
                    <thead className="bg-slate-50 border-b uppercase text-[10px] font-bold text-slate-500"><tr><th className="p-4">পণ্য</th><th className="p-4">কেনা/বেচা</th><th className="p-4 text-center">স্টক</th><th className="p-4 text-right">একশন</th></tr></thead>
                    <tbody className="divide-y">{products.map(p => (
                        <tr key={p.id} className="hover:bg-slate-50">
                            <td className="p-4"><p className="font-bold">{p.name}</p><p className="text-[10px] text-slate-400">{p.fabric} | {p.neck}</p></td>
                            <td className="p-4"><p className="text-slate-400">In: ৳{p.buyPrice}</p><p className="font-bold text-indigo-600">Out: ৳{p.sellPrice}</p></td>
                            <td className="p-4 text-center"><span className={`px-3 py-1 rounded-full font-bold text-xs ${parseInt(p.stock) < 5 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>{p.stock} pcs</span></td>
                            <td className="p-4 text-right flex gap-2 justify-end items-center mt-2">
                                <button onClick={()=>deleteDoc(doc(db,'artifacts',DB_VERSION,'users',user.uid,'products',p.id))} className="text-red-300 hover:text-red-500 transition"><Trash2 size={16}/></button>
                            </td>
                        </tr>
                    ))}</tbody>
                </table>
            </Card>
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
                    <Card className="w-full max-w-lg animate-in zoom-in shadow-2xl">
                        <div className="flex justify-between items-center mb-6"><h3>নতুন পণ্য যুক্ত করুন</h3><button onClick={()=>setShowModal(false)}><X/></button></div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <Input label="নাম" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required/>
                            <div className="grid grid-cols-2 gap-4">
                                <Select label="কাপড়" value={form.fabric} options={FABRIC_TYPES.map(f=>({label:f,value:f}))} onChange={e=>setForm({...form,fabric:e.target.value})}/>
                                <Select label="গলা" value={form.neck} options={NECK_TYPES.map(n=>({label:n,value:n}))} onChange={e=>setForm({...form,neck:e.target.value})}/>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <Input label="কেনা দাম" type="number" value={form.buyPrice} onChange={e=>setForm({...form,buyPrice:e.target.value})}/>
                                <Input label="বেচা দাম" type="number" value={form.sellPrice} onChange={e=>setForm({...form,sellPrice:e.target.value})}/>
                                <Input label="স্টক" type="number" value={form.stock} onChange={e=>setForm({...form,stock:e.target.value})}/>
                            </div>
                            <Button type="submit" className="w-full mt-4 py-3">সেভ করুন</Button>
                        </form>
                    </Card>
                </div>
            )}
        </div>
    );
};

const POSView = ({ products, user, shopProfile }) => {
    const [cart, setCart] = useState([]);
    const [customer, setCustomer] = useState({ name: '', phone: '', address: '', deliveryCharge: '0', advance: '0' });
    const [filter, setFilter] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('Cash');
    const [invoiceOrder, setInvoiceOrder] = useState(null);

    const addToCart = (p) => {
        const exist = cart.find(i => i.id === p.id);
        if(exist) setCart(cart.map(i => i.id === p.id ? {...i, qty: i.qty + 1} : i));
        // Important: storing buyPrice to calculate profit later
        else setCart([...cart, { ...p, qty: 1, size: 'Mixed', buyPrice: p.buyPrice }]);
    };
    
    const addCustomItem = () => {
        const name = prompt("পণ্যের নাম:");
        const price = prompt("দাম:");
        if(name && price) setCart([...cart, { id: Date.now(), name, sellPrice: price, buyPrice: 0, qty: 1, size: 'Mixed' }]);
    };

    const removeFromCart = (id) => setCart(cart.filter(i => i.id !== id));
    // Manual Quantity Update Fix
    const updateQty = (id, val) => setCart(cart.map(i => i.id === id ? {...i, qty: parseInt(val) || 1} : i));
    const incrementQty = (id, d) => setCart(cart.map(i => i.id === id ? {...i, qty: Math.max(1, i.qty + d)} : i));
    const updateSize = (id, s) => setCart(cart.map(i => i.id === id ? {...i, size: s} : i));

    const financials = useMemo(() => {
        const subTotal = cart.reduce((s, i) => s + (i.sellPrice * i.qty), 0);
        const total = subTotal + parseFloat(customer.deliveryCharge || 0);
        const due = total - parseFloat(customer.advance || 0);
        return { subTotal, total, due };
    }, [cart, customer]);

    const handleOrder = async () => {
        if(!cart.length || !customer.name || !customer.phone) return alert("কাস্টমার নাম ও মোবাইল নম্বর দিন");
        const orderData = {
            customerName: customer.name, phone: customer.phone, address: customer.address, items: cart,
            ...financials, paidAmount: customer.advance, status: financials.due > 0 ? 'Due' : 'Paid', lastPaymentMethod: paymentMethod, createdAt: serverTimestamp()
        };
        const ref = await addDoc(collection(db, 'artifacts', DB_VERSION, 'users', user.uid, 'orders'), orderData);
        setInvoiceOrder({...orderData, id: ref.id, createdAt: new Date() }); // Fix for immediate print
        setCart([]); setCustomer({name:'', phone:'', address:'', deliveryCharge:'0', advance:'0'});
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4">
            <div className="lg:col-span-2 space-y-4">
                <div className="relative flex gap-2"><div className="relative flex-1"><Search className="absolute left-3 top-3.5 text-slate-400" size={18}/><input type="text" placeholder="পণ্য খুঁজুন..." className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-indigo-500 bg-white" value={filter} onChange={e=>setFilter(e.target.value)}/></div><Button variant="outline" onClick={addCustomItem} icon={<Plus size={18}/>}>কাস্টম</Button></div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 overflow-y-auto pr-2 custom-scrollbar h-[500px]">
                    {products.filter(p=>p.name.toLowerCase().includes(filter.toLowerCase())).map(p => (
                        <div key={p.id} onClick={()=>addToCart(p)} className="bg-white p-4 rounded-xl border hover:shadow-md cursor-pointer transition relative group">
                            <p className="font-bold text-sm mb-1">{p.name}</p><p className="text-[10px] text-slate-400 mb-2 uppercase font-bold">{p.fabric}</p><p className="text-indigo-600 font-black text-lg">৳{p.sellPrice}</p>
                            <div className="absolute top-0 right-0 p-1.5 bg-indigo-500 rounded-bl-xl opacity-0 group-hover:opacity-100 transition"><Plus size={14} className="text-white"/></div>
                        </div>
                    ))}
                </div>
            </div>
            <Card className="flex flex-col gap-4 shadow-lg border-indigo-50 h-fit">
                <h3 className="font-bold border-b pb-2 flex items-center gap-2"><ShoppingBag size={18}/> অর্ডার লিস্ট</h3>
                <div className="space-y-2 flex-1 overflow-y-auto pr-2 custom-scrollbar max-h-[300px]">{cart.map(i => (
                    <div key={i.id} className="bg-slate-50 p-2 rounded relative group border border-slate-200">
                        <div className="flex justify-between text-xs mb-1"><strong>{i.name}</strong><button onClick={()=>removeFromCart(i.id)} className="text-red-400"><X size={12}/></button></div>
                        <div className="flex justify-between items-center gap-2">
                            <select value={i.size} onChange={e=>updateSize(i.id, e.target.value)} className="text-[10px] border p-0.5 rounded">{SIZES.map(s=><option key={s} value={s}>{s}</option>)}</select>
                            <div className="flex items-center bg-white border rounded px-1 gap-1">
                                <button onClick={()=>incrementQty(i.id,-1)} className="px-1 text-indigo-600 font-bold">-</button>
                                {/* Manual Input Fix */}
                                <input type="number" value={i.qty} onChange={(e)=>updateQty(i.id, e.target.value)} className="w-8 text-center text-xs font-bold outline-none"/>
                                <button onClick={()=>incrementQty(i.id,1)} className="px-1 text-indigo-600 font-bold">+</button>
                            </div>
                            <p className="text-xs font-black">৳{i.sellPrice * i.qty}</p>
                        </div>
                    </div>
                ))}</div>
                <div className="space-y-3 border-t pt-2 text-xs">
                    <div className="flex gap-2"><Input placeholder="নাম" value={customer.name} onChange={e=>setCustomer({...customer,name:e.target.value})}/><Input placeholder="মোবাইল" value={customer.phone} onChange={e=>setCustomer({...customer,phone:e.target.value})}/></div>
                    <TextArea placeholder="ঠিকানা" value={customer.address} onChange={e=>setCustomer({...customer,address:e.target.value})}/>
                    <div className="grid grid-cols-2 gap-2"><Input label="ডেলিভারি" type="number" value={customer.deliveryCharge} onChange={e=>setCustomer({...customer,deliveryCharge:e.target.value})}/><Input label="অ্যাডভান্স" type="number" value={customer.advance} onChange={e=>setCustomer({...customer,advance:e.target.value})}/></div>
                    <div className="grid grid-cols-3 gap-2">{PAYMENT_METHODS.slice(0,3).map(m => (<button key={m.id} onClick={() => setPaymentMethod(m.id)} className={`p-1 text-[9px] font-bold border rounded ${paymentMethod === m.id ? 'bg-indigo-600 text-white' : ''}`}>{m.label}</button>))}</div>
                    <div className="flex justify-between font-black text-lg border-t pt-2"><span>মোট বিল:</span><span>৳{financials.total}</span></div>
                    <Button onClick={handleOrder} className="w-full shadow-xl">অর্ডার কনফার্ম</Button>
                </div>
            </Card>
            {invoiceOrder && <InvoiceModal order={invoiceOrder} shopProfile={shopProfile} onClose={()=>setInvoiceOrder(null)} />}
        </div>
    );
};

const OrderListView = ({ orders, user, shopProfile }) => {
    const [invoice, setInvoice] = useState(null);
    const [editPayment, setEditPayment] = useState(null);
    const [paymentAmt, setPaymentAmt] = useState('');
    const [updatedDelivery, setUpdatedDelivery] = useState('');

    useEffect(() => { if(selectedOrder) setUpdatedDelivery(selectedOrder.deliveryCharge); }, [editPayment]);

    const handleUpdatePayment = async () => {
        if(!paymentAmt) return;
        const newTotal = parseFloat(editPayment.subTotal) + parseFloat(updatedDelivery);
        const newPaid = parseFloat(editPayment.paidAmount) + parseFloat(paymentAmt);
        const newDue = newTotal - newPaid;
        await updateDoc(doc(db, 'artifacts', DB_VERSION, 'users', user.uid, 'orders', editPayment.id), {
            deliveryCharge: updatedDelivery, totalAmount: newTotal, paidAmount: newPaid, dueAmount: newDue, status: newDue <= 0 ? 'Paid' : 'Due'
        });
        setEditPayment(null); setPaymentAmt(''); alert("আপডেট সফল!");
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            <h2 className="text-xl font-bold">অর্ডার রেকর্ড</h2>
            <Card className="p-0 overflow-hidden shadow-sm"><table className="w-full text-left text-sm border-collapse"><thead className="bg-slate-50 border-b uppercase text-[10px] font-bold text-slate-500"><tr><th className="p-4">মেমো</th><th className="p-4">কাস্টমার</th><th className="p-4">বিল</th><th className="p-4">বকেয়া</th><th className="p-4 text-center">স্ট্যাটাস</th><th className="p-4 text-right">একশন</th></tr></thead>
                <tbody className="divide-y">{orders.map(o => (<tr key={o.id} className="hover:bg-slate-50"><td className="p-4 text-slate-400">#{o.id.slice(-6).toUpperCase()}</td><td className="p-4 font-bold">{o.customerName}<br/><span className="text-[10px] font-normal text-slate-400">{o.phone}</span></td><td className="p-4">৳{o.totalAmount}</td><td className="p-4"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${o.dueAmount > 0 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>৳{o.dueAmount}</span></td><td className="p-4 text-right flex gap-3 justify-end items-center mt-2">
                    <button onClick={()=>setInvoice(o)} className="text-indigo-600 hover:scale-110 transition"><Printer size={18}/></button>
                    {o.dueAmount > 0 && <button onClick={()=>setEditPayment(o)} className="bg-indigo-600 text-white px-2 py-0.5 rounded text-[10px] font-bold">টাকা জমা</button>}
                </td></tr>))}</tbody>
            </table></Card>
            {invoice && <InvoiceModal order={invoice} shopProfile={shopProfile} onClose={()=>setInvoice(null)} />}
            {editPayment && <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4"><Card className="w-full max-w-sm animate-in zoom-in"><div className="flex justify-between items-center mb-4"><h3>পেমেন্ট আপডেট</h3><button onClick={()=>setEditPayment(null)}><X size={20}/></button></div><div className="space-y-4"><Input label="ডেলিভারি চার্জ (এডিট)" type="number" value={updatedDelivery} onChange={e => setUpdatedDelivery(e.target.value)} /><Input label="জমা পরিমাণ" type="number" value={paymentAmt} onChange={e => setPaymentAmt(e.target.value)} autoFocus /><Button onClick={handleUpdatePayment} className="w-full mt-4">আপডেট করুন</Button></div></Card></div>}
        </div>
    );
};

const InvoiceModal = ({ order, shopProfile, onClose }) => {
    const printRef = useRef();
    const handlePrint = () => {
        const content = printRef.current.innerHTML;
        const win = window.open('', '', 'height=1123,width=794');
        win.document.write(`<html><head><title>Invoice</title><script src="https://cdn.tailwindcss.com"></script></head><body class="bg-white print:p-0">${content}</body></html>`);
        win.document.close();
        setTimeout(() => win.print(), 500);
    };
    // Safe date fix to prevent crash
    const dateStr = order.createdAt?.toDate ? order.createdAt.toDate().toLocaleDateString() : new Date().toLocaleDateString();
    
    return (
        <div className="fixed inset-0 bg-slate-900/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-xl max-w-2xl w-full flex flex-col max-h-[90vh] shadow-2xl">
                <div className="p-4 border-b flex justify-between items-center bg-slate-50 font-bold"><span>ইনভয়েস প্রিভিউ</span><div className="flex gap-2"><Button onClick={handlePrint} icon={<Printer size={16}/>}>প্রিন্ট</Button><button onClick={onClose}><X size={20}/></button></div></div>
                <div className="overflow-y-auto p-10 bg-white" ref={printRef}>
                    <div className="border-b-2 border-slate-800 pb-6 mb-8 flex justify-between items-start">
                        <div><h1 className="text-3xl font-black uppercase text-indigo-700">{shopProfile.shopName}</h1><p className="text-sm font-bold text-slate-500">{shopProfile.address}</p><p className="text-sm font-bold text-slate-500">{shopProfile.phone}</p></div>
                        <div className="text-right uppercase"><h2 className="text-4xl font-black text-slate-200">Invoice</h2><p className="font-bold text-slate-800">#INV-{order.id?.slice(-6).toUpperCase()}</p><p className="text-xs text-slate-500">{dateStr}</p></div>
                    </div>
                    <div className="grid grid-cols-2 mb-8 gap-10"><div><p className="text-[10px] font-bold uppercase text-slate-400 mb-2">Bill To:</p><p className="text-lg font-black">{order.customerName}</p><p className="text-sm text-slate-600">{order.phone}</p><p className="text-sm text-slate-600">{order.address}</p></div></div>
                    <table className="w-full mb-8 border-collapse"><thead className="bg-slate-800 text-white text-xs uppercase"><tr><th className="p-3 text-left">Item</th><th className="p-3">Qty</th><th className="p-3 text-right">Price</th><th className="p-3 text-right">Total</th></tr></thead>
                        <tbody className="divide-y border-b">{order.items?.map((i,idx)=>(<tr key={idx} className="text-sm"><td className="p-3 font-bold">{i.name} ({i.size})</td><td className="p-3 text-center">{i.qty}</td><td className="p-3 text-right">৳{i.sellPrice}</td><td className="p-3 text-right font-black">৳{i.sellPrice * i.qty}</td></tr>))}</tbody>
                    </table>
                    <div className="flex justify-end"><div className="w-64 space-y-2 bg-slate-50 p-4 rounded-xl text-sm">
                        <div className="flex justify-between"><span>Sub-total:</span><span>৳{order.subTotal}</span></div>
                        <div className="flex justify-between"><span>Delivery:</span><span>৳{order.deliveryCharge}</span></div>
                        <div className="flex justify-between text-lg font-black border-t pt-2"><span>Total:</span><span>৳{order.totalAmount}</span></div>
                        <div className="flex justify-between text-sm font-bold text-emerald-600"><span>Paid:</span><span>৳{order.paidAmount}</span></div>
                        {/* Due Fix */}
                        <div className="flex justify-between text-sm font-bold text-red-600"><span>Due:</span><span>৳{order.dueAmount}</span></div>
                    </div></div>
                </div>
            </div>
        </div>
    );
};

const ExpenseView = ({ expenses, user }) => {
    const [form, setForm] = useState({ title: '', amount: '', category: 'Rent' });
    const [editItem, setEditItem] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        await addDoc(collection(db, 'artifacts', DB_VERSION, 'users', user.uid, 'expenses'), { ...form, createdAt: serverTimestamp() });
        setForm({ title: '', amount: '', category: 'Rent' });
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        await updateDoc(doc(db, 'artifacts', DB_VERSION, 'users', user.uid, 'expenses', editItem.id), { title: editItem.title, amount: editItem.amount, category: editItem.category });
        setEditItem(null);
    };

    const handleDelete = async (id) => {
        if(window.confirm('Sure delete?')) await deleteDoc(doc(db, 'artifacts', DB_VERSION, 'users', user.uid, 'expenses', id));
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in">
            <Card><h3 className="font-bold mb-4 flex items-center gap-2"><CreditCard size={18}/> খরচ এন্ট্রি</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input label="বিবরণ" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} required/>
                    <Input label="টাকা" type="number" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} required/>
                    <Select label="খাত" value={form.category} options={['Rent', 'Electricity', 'Transport', 'Salary', 'Tea/Snacks', 'Other'].map(c=>({label:c,value:c}))} onChange={e=>setForm({...form,category:e.target.value})} />
                    <Button type="submit" className="w-full py-4 mt-2" icon={<Save size={20}/>}>সেভ করুন</Button>
                </form>
            </Card>
            <div className="space-y-3">{expenses.map(ex => (
                <div key={ex.id} className="bg-white p-4 rounded-xl border flex justify-between items-center shadow-sm">
                    <div><p className="font-bold text-slate-800">{ex.title}</p><p className="text-[10px] text-slate-400 uppercase font-bold">{ex.category}</p></div>
                    <div className="flex items-center gap-4"><span className="text-red-500 font-black">-৳{ex.amount}</span>
                    <button onClick={()=>setEditItem(ex)}><Edit2 size={16} className="text-indigo-500"/></button>
                    <button onClick={()=>handleDelete(ex.id)}><Trash2 size={16} className="text-red-500"/></button></div>
                </div>
            ))}</div>
             {editItem && <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4"><Card className="w-full max-w-sm"><div className="flex justify-between mb-4"><h3>এডিট খরচ</h3><button onClick={()=>setEditItem(null)}><X size={20}/></button></div><form onSubmit={handleUpdate} className="space-y-4"><Input label="বিবরণ" value={editItem.title} onChange={e => setEditItem({...editItem, title: e.target.value})} /><Input label="টাকা" value={editItem.amount} onChange={e => setEditItem({...editItem, amount: e.target.value})} /><Button type="submit" className="w-full">আপডেট করুন</Button></form></Card></div>}
        </div>
    );
};

const CustomerView = ({ orders }) => {
    const customers = useMemo(() => {
        const map = {};
        orders.forEach(o => {
            if(!map[o.phone]) map[o.phone] = { name: o.customerName, phone: o.phone, address: o.address, totalOrders: 0, totalSpent: 0 };
            map[o.phone].totalOrders += 1;
            map[o.phone].totalSpent += parseFloat(o.totalAmount || 0);
        });
        return Object.values(map);
    }, [orders]);

    return (
        <div className="space-y-6 animate-in fade-in">
            <h2 className="text-xl font-bold">কাস্টমার ডাটাবেজ</h2>
            <Card className="p-0 overflow-hidden shadow-sm"><table className="w-full text-left text-sm border-collapse"><thead className="bg-slate-50 border-b uppercase text-[10px] font-bold text-slate-500"><tr><th className="p-4">নাম ও ফোন</th><th className="p-4">ঠিকানা</th><th className="p-4 text-center">অর্ডার সংখ্যা</th><th className="p-4 text-right">মোট বিক্রয়</th></tr></thead>
                <tbody className="divide-y">{customers.map((c, i) => (<tr key={i} className="hover:bg-slate-50"><td className="p-4 font-bold">{c.name}<br/><span className="text-[10px] font-normal text-slate-400">{c.phone}</span></td><td className="p-4 text-xs text-slate-500 max-w-xs truncate">{c.address}</td><td className="p-4 text-center"><span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full font-bold">{c.totalOrders} বার</span></td><td className="p-4 text-right font-black text-indigo-600">৳{c.totalSpent.toLocaleString()}</td></tr>))}</tbody>
            </table></Card>
        </div>
    );
};

const SettingsView = ({ profile, user }) => {
    const [data, setData] = useState(profile);
    const handleSave = async (e) => { e.preventDefault(); await setDoc(doc(db, 'artifacts', DB_VERSION, 'users', user.uid, 'settings', 'profile'), data, {merge: true}); alert("আপনার তথ্য আপডেট হয়েছে!"); };
    return (
        <div className="max-w-xl mx-auto"><Card className="border-t-4 border-indigo-600 shadow-xl"><div className="flex items-center gap-4 mb-8 border-b pb-6"><div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm"><Settings size={28}/></div><div><h2 className="text-2xl font-bold text-slate-800">ব্যবসায়িক প্রোফাইল</h2><p className="text-sm text-slate-500">ইনভয়েসে এই তথ্যগুলো ব্যবহার হবে</p></div></div><form onSubmit={handleSave} className="space-y-6"><Input label="দোকানের নাম" value={data.shopName} onChange={e=>setData({...data,shopName:e.target.value})} required/><Input label="মোবাইল নাম্বার" value={data.phone} onChange={e=>setData({...data,phone:e.target.value})} required/><TextArea label="দোকানের ঠিকানা" value={data.address} onChange={e=>setData({...data,address:e.target.value})} required/><Button type="submit" className="w-full py-4 shadow-indigo-100" icon={<Save size={20}/>}>তথ্য আপডেট করুন</Button></form></Card></div>
    );
};