import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  LayoutDashboard, ShoppingBag, CreditCard, Users, Menu, X, Plus, Search, 
  Trash2, Save, Printer, AlertCircle, Package, Phone, CheckCircle, FileText, 
  Settings, List, DollarSign, Eye, EyeOff, Banknote, Smartphone, Landmark, 
  Edit2, Info, MapPin, TrendingUp, Minus, Check, LogOut, Store, ArrowRight, Lock, Filter, ChevronRight, UserPlus, LogIn
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, signInAnonymously, signInWithCustomToken
} from 'firebase/auth';
import { 
  getFirestore, collection, addDoc, query, onSnapshot, doc, 
  deleteDoc, updateDoc, serverTimestamp, setDoc, getDoc 
} from 'firebase/firestore';

// --- ফায়ারবেস কনফিগারেশন ---
let firebaseConfig;
try {
  firebaseConfig = JSON.parse(__firebase_config);
} catch (e) {
  // আপনার আসল কনফিগারেশন এখানে বসান
  firebaseConfig = {
    apiKey: "AIzaSyDlC-GAtKekX_SPjacRvzg7gKTGGQChpzA",
    authDomain: "business-manager-7d11a.firebaseapp.com",
    projectId: "business-manager-7d11a",
    storageBucket: "business-manager-7d11a.firebasestorage.app",
    messagingSenderId: "655200131586",
    appId: "1:655200131586:web:0b41af39a725542b8ae51b"
  };
}

const appId = typeof __app_id !== 'undefined' ? __app_id : 'business-manager-v7-multiuser';
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Constants ---
const NECK_TYPES = ['গোল গলা', 'ভি গলা', 'ক্রস ভি গলা', 'কলার', 'ভি কলার', 'পাঞ্জাবী কলার'];
const FABRIC_TYPES = ['PP (170-180 GSM)', 'Sugar Mesh (170-180 GSM)', 'Box Mesh (Premium)', 'Honeycomb (Premium)', 'Jacquard (Player Edition)', 'Brush Jacquard'];
const SIZES = ['M', 'L', 'XL', 'XXL', 'Free Size', 'Mixed'];
const PAYMENT_METHODS = [
    { id: 'Cash', label: 'Cash', color: 'bg-emerald-600', icon: <Banknote size={16}/> },
    { id: 'Bkash', label: 'bKash', color: 'bg-[#e2136e]', icon: <Smartphone size={16}/> },
    { id: 'Nagad', label: 'Nagad', color: 'bg-[#f7941d]', icon: <Smartphone size={16}/> },
];

// --- Shared Components ---
const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-2xl shadow-sm border border-slate-200 p-6 ${className}`}>{children}</div>
);

const Button = ({ children, onClick, variant = "primary", className = "", disabled = false, type="button", icon }) => {
  const baseStyle = "px-5 py-2.5 rounded-xl font-bold transition-all duration-200 flex items-center justify-center gap-2 text-sm shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed tracking-wide";
  const variants = {
    primary: "bg-slate-900 text-white hover:bg-slate-800 shadow-slate-200",
    secondary: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300",
    danger: "bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100",
    success: "bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-200",
    outline: "border-2 border-dashed border-indigo-300 text-indigo-600 hover:bg-indigo-50"
  };
  return <button type={type} onClick={onClick} disabled={disabled} className={`${baseStyle} ${variants[variant]} ${className}`}>{icon}{children}</button>;
};

const Input = ({ label, type = "text", value, onChange, placeholder, required = false, readOnly = false, className="" }) => (
  <div className="flex flex-col gap-2 w-full">
    {label && <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">{label}</label>}
    <input type={type} value={value ?? ''} onChange={onChange} placeholder={placeholder} required={required} readOnly={readOnly}
      className={`w-full px-4 py-3 rounded-xl border border-slate-200 outline-none transition-all text-slate-800 text-sm ${readOnly ? 'bg-slate-100 cursor-not-allowed' : 'bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10'} ${className}`} />
  </div>
);

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 overflow-y-auto">
      <Card className="w-full max-w-lg animate-in zoom-in shadow-2xl relative">
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <h3 className="font-black text-xl text-slate-800">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition"><X size={20}/></button>
        </div>
        {children}
      </Card>
    </div>
  );
};

// --- Auth Component ---
const AuthScreen = ({ showToast }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [shopName, setShopName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        showToast("সফলভাবে লগইন হয়েছে!");
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        // প্রোফাইল ইনিশিয়ালাইজেশন
        await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'profile'), {
          shopName: shopName || "My Shop",
          phone: email.split('@')[0],
          address: "ঠিকানা সেট করুন",
          createdAt: serverTimestamp()
        });
        showToast("অ্যাকাউন্ট তৈরি সফল হয়েছে!");
      }
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md shadow-2xl border-t-8 border-indigo-600">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-600 text-white rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-indigo-100">
            <Store size={32} />
          </div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Manager Pro</h1>
          <p className="text-slate-400 font-bold text-xs uppercase mt-1 tracking-widest">Business Partner</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-5">
          {!isLogin && (
            <Input label="দোকানের নাম" placeholder="যেমন: আকাশ ফ্যাশন" value={shopName} onChange={e => setShopName(e.target.value)} required />
          )}
          <Input label="ইমেইল" type="email" placeholder="email@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
          <Input label="পাসওয়ার্ড" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
          
          <Button type="submit" className="w-full py-4 text-lg" disabled={loading} icon={isLogin ? <LogIn size={20}/> : <UserPlus size={20}/>}>
            {loading ? "অপেক্ষা করুন..." : (isLogin ? "লগইন করুন" : "অ্যাকাউন্ট খুলুন")}
          </Button>
        </form>

        <div className="mt-8 text-center pt-6 border-t border-slate-100">
          <button onClick={() => setIsLogin(!isLogin)} className="text-indigo-600 font-black text-sm hover:underline">
            {isLogin ? "নতুন অ্যাকাউন্ট খুলতে চান? রেজিস্টার করুন" : "আগে অ্যাকাউন্ট খুলেছেন? লগইন করুন"}
          </button>
        </div>
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
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Auth Logic
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        }
        // If not environment token, wait for user manual login
      } catch (err) {
        console.error("Auth error:", err);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Data Fetching (User Scoped)
  useEffect(() => {
    if (!user) return;

    // Rule 1: artifacts/{appId}/users/{userId}/...
    const profileRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'profile');
    const unsubProfile = onSnapshot(profileRef, (snap) => {
      if (snap.exists()) setShopProfile(snap.data());
      else setShopProfile({ shopName: 'My Shop', address: '', phone: '' });
    });

    const unsubProducts = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'products'), (s) => {
      const data = s.docs.map(d => ({ id: d.id, ...d.data() }));
      setProducts(data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
    });

    const unsubOrders = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'orders'), (s) => {
      const data = s.docs.map(d => ({ id: d.id, ...d.data() }));
      setOrders(data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
    });

    const unsubExpenses = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'expenses'), (s) => {
      const data = s.docs.map(d => ({ id: d.id, ...d.data() }));
      setExpenses(data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
    });

    return () => { unsubProfile(); unsubProducts(); unsubOrders(); unsubExpenses(); };
  }, [user]);

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
      <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="font-bold text-slate-600">লোড হচ্ছে...</p>
    </div>
  );

  if (!user) return <AuthScreen showToast={showToast} />;

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-800 overflow-hidden">
      {toast && (
        <div className={`fixed top-6 right-6 z-[200] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-right-full border ${toast.type === 'error' ? 'bg-rose-50 border-rose-100 text-rose-600' : 'bg-emerald-50 border-emerald-100 text-emerald-600'}`}>
          {toast.type === 'error' ? <AlertCircle size={20}/> : <CheckCircle size={20}/>}
          <span className="font-bold text-sm">{toast.message}</span>
        </div>
      )}

      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-slate-200 flex flex-col hidden md:flex z-20 shadow-xl">
        <div className="p-8 border-b border-slate-100 flex items-center gap-4">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center font-bold text-white shadow-lg">BM</div>
          <div><h1 className="font-black text-xl text-slate-800 tracking-tight leading-none">Business</h1><p className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest mt-1">Manager Pro</p></div>
        </div>
        <nav className="flex-1 p-6 space-y-2 overflow-y-auto">
          <NavItem active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard size={20}/>} label="ড্যাশবোর্ড" />
          <NavItem active={activeTab === 'inventory'} onClick={() => setActiveTab('inventory')} icon={<Package size={20}/>} label="ইনভেন্টরি" />
          <NavItem active={activeTab === 'pos'} onClick={() => setActiveTab('pos')} icon={<ShoppingBag size={20}/>} label="POS (অর্ডার)" />
          <NavItem active={activeTab === 'orders'} onClick={() => setActiveTab('orders')} icon={<List size={20}/>} label="অর্ডার লিস্ট" />
          <NavItem active={activeTab === 'customers'} onClick={() => setActiveTab('customers')} icon={<Users size={20}/>} label="কাস্টমার ডাটা" />
          <NavItem active={activeTab === 'expenses'} onClick={() => setActiveTab('expenses')} icon={<CreditCard size={20}/>} label="খরচপাতি" />
          <NavItem active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<Settings size={20}/>} label="সেটিংস" />
        </nav>
        <div className="p-6 border-t border-slate-100 bg-slate-50/50">
           <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200 shadow-sm mb-4">
             <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold">{shopProfile?.shopName?.charAt(0)}</div>
             <div className="overflow-hidden"><p className="text-xs font-bold truncate text-slate-800">{shopProfile?.shopName}</p><p className="text-[10px] text-slate-400 truncate">{user.email}</p></div>
           </div>
           <button onClick={() => {if(confirm("লগ আউট করবেন?")) signOut(auth)}} className="w-full flex items-center justify-center gap-2 text-rose-500 text-xs font-bold py-3 hover:bg-rose-50 rounded-xl transition border border-transparent hover:border-rose-100">
             <LogOut size={14}/> লগ আউট
           </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-8 shadow-sm z-10 shrink-0">
          <h2 className="font-black text-2xl text-slate-800 uppercase tracking-tight">{activeTab}</h2>
          <div className="text-xs font-bold text-slate-500 bg-slate-100 px-4 py-2 rounded-full border border-slate-200 flex items-center gap-2"><MapPin size={14} className="text-indigo-500"/> {shopProfile?.address || 'ঠিকানা সেট নেই'}</div>
        </header>
        <div className="flex-1 overflow-auto p-4 md:p-8">
            {activeTab === 'dashboard' && <DashboardView products={products} orders={orders} expenses={expenses} />}
            {activeTab === 'inventory' && <InventoryView products={products} user={user} showToast={showToast} />}
            {activeTab === 'pos' && <POSView products={products} user={user} shopProfile={shopProfile} showToast={showToast} />}
            {activeTab === 'orders' && <OrderListView orders={orders} user={user} shopProfile={shopProfile} showToast={showToast} />}
            {activeTab === 'customers' && <CustomerView orders={orders} user={user} showToast={showToast} />}
            {activeTab === 'expenses' && <ExpenseView expenses={expenses} user={user} showToast={showToast} />}
            {activeTab === 'settings' && <SettingsView profile={shopProfile} user={user} showToast={showToast} />}
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

// --- VIEW COMPONENTS ---
const DashboardView = ({ products, orders, expenses }) => {
    const [showProfit, setShowProfit] = useState(false);
    const stats = useMemo(() => {
        const totalSales = orders.reduce((s, o) => s + (Number(o.totalAmount) || 0), 0);
        const totalExpense = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
        let totalCOGS = 0;
        orders.forEach(order => order.items?.forEach(item => totalCOGS += (Number(item.buyPrice || 0) * Number(item.qty || 0))));
        const netProfit = totalSales - totalCOGS - totalExpense;
        return { totalSales, totalExpense, netProfit };
    }, [orders, expenses]);

    const chartData = useMemo(() => orders.slice(0, 7).reverse().map(o => ({ 
      name: o.customerName?.slice(0, 5) || 'Sale', 
      sales: Number(o.totalAmount) || 0 
    })), [orders]);

    return (
        <div className="space-y-8 animate-in fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="মোট বিক্রয়" value={`৳${stats.totalSales.toLocaleString()}`} icon={<ShoppingBag className="text-blue-600"/>} color="bg-blue-50" />
                <StatCard title="মোট খরচ" value={`৳${stats.totalExpense.toLocaleString()}`} icon={<CreditCard className="text-rose-600"/>} color="bg-rose-50" />
                <StatCard title="নিট মুনাফা" value={showProfit ? `৳${stats.netProfit.toLocaleString()}` : "****"} icon={showProfit ? <EyeOff className="text-emerald-600"/> : <Eye className="text-emerald-600"/>} color="bg-emerald-50" onClick={() => setShowProfit(!showProfit)} cursor="cursor-pointer" />
                <StatCard title="মোট পণ্য" value={products.length} icon={<Package className="text-indigo-600"/>} color="bg-indigo-50" />
            </div>
            <Card className="h-96 shadow-lg border-none">
                <h3 className="font-bold text-slate-700 mb-8 flex items-center gap-2 text-lg"><TrendingUp size={24} className="text-indigo-600"/> বিক্রয় গ্রাফ (সাম্প্রতিক)</h3>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{bottom: 20, left: 10}}>
                        <defs><linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/><stop offset="95%" stopColor="#6366f1" stopOpacity={0}/></linearGradient></defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                        <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'}} />
                        <Area type="monotone" dataKey="sales" stroke="#6366f1" fill="url(#colorSales)" strokeWidth={4} fillOpacity={1} />
                    </AreaChart>
                </ResponsiveContainer>
            </Card>
        </div>
    );
};

const StatCard = ({ title, value, icon, color, onClick, cursor }) => (
    <div onClick={onClick} className={`bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-5 transition-all hover:shadow-xl hover:-translate-y-1 ${cursor || ''}`}>
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${color} shadow-sm shrink-0`}>{icon}</div>
        <div><p className="text-slate-400 text-[11px] font-black uppercase tracking-widest mb-1">{title}</p><h4 className="text-2xl font-black text-slate-900 leading-none">{value}</h4></div>
    </div>
);

const InventoryView = ({ products, user, showToast }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [docId, setDocId] = useState(null);
    const [form, setForm] = useState({ name: '', buyPrice: '', sellPrice: '', stock: '', fabric: FABRIC_TYPES[0], neck: NECK_TYPES[0] });
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        const data = { ...form, buyPrice: Number(form.buyPrice), sellPrice: Number(form.sellPrice), stock: Number(form.stock), updatedAt: serverTimestamp() };
        try {
          if(isEdit) {
            await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'products', docId), data);
            showToast("আপডেট সফল!");
          } else {
            await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'products'), { ...data, createdAt: serverTimestamp() });
            showToast("পণ্য যুক্ত হয়েছে!");
          }
          setIsModalOpen(false);
          setForm({ name: '', buyPrice: '', sellPrice: '', stock: '', fabric: FABRIC_TYPES[0], neck: NECK_TYPES[0] });
        } catch (err) { showToast("ত্রুটি হয়েছে", "error"); }
    };
    const handleEdit = (p) => { setForm(p); setDocId(p.id); setIsEdit(true); setIsModalOpen(true); };

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-black text-slate-800">ইনভেন্টরি ম্যানেজমেন্ট</h2>
              <Button onClick={() => {setIsModalOpen(true); setIsEdit(false); setForm({ name: '', buyPrice: '', sellPrice: '', stock: '', fabric: FABRIC_TYPES[0], neck: NECK_TYPES[0] })}} icon={<Plus size={18}/>}>নতুন পণ্য</Button>
            </div>
            <Card className="p-0 overflow-hidden shadow-sm border-none">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse min-w-[700px]">
                  <thead className="bg-slate-50 border-b border-slate-100 uppercase text-[11px] font-black text-slate-400 tracking-wider">
                    <tr><th className="p-5">পণ্যের বিবরণ</th><th className="p-5">বৈশিষ্ট্য</th><th className="p-5 text-right">দাম (৳)</th><th className="p-5 text-center">স্টক</th><th className="p-5 text-right">একশন</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {products.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition group">
                        <td className="p-5"><p className="font-bold text-slate-800 text-base">{p.name}</p></td>
                        <td className="p-5"><div className="flex gap-2 flex-wrap"><span className="px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-bold border border-indigo-100">{p.fabric}</span><span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-bold border border-slate-200">{p.neck}</span></div></td>
                        <td className="p-5 text-right"><p className="text-[10px] text-slate-400 font-bold">In: {p.buyPrice}</p><p className="font-black text-indigo-600 text-base">Out: {p.sellPrice}</p></td>
                        <td className="p-5 text-center"><span className={`px-4 py-1.5 rounded-full font-black text-xs ${Number(p.stock) < 5 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>{p.stock}</span></td>
                        <td className="p-5 text-right"><div className="flex justify-end gap-2"><button onClick={()=>handleEdit(p)} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 transition"><Edit2 size={16}/></button><button onClick={async () => { if(confirm("নিশ্চিত তো?")) await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'products', p.id)); }} className="p-2 bg-red-50 hover:bg-red-100 rounded-lg text-red-500 transition"><Trash2 size={16}/></button></div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={isEdit ? 'পণ্য আপডেট' : 'নতুন পণ্য'}>
              <form onSubmit={handleSubmit} className="space-y-5">
                <Input label="নাম" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required/>
                <div className="grid grid-cols-2 gap-4">
                  <Select label="কাপড়" value={form.fabric} options={FABRIC_TYPES.map(f=>({label:f,value:f}))} onChange={e=>setForm({...form,fabric:e.target.value})}/>
                  <Select label="গলা" value={form.neck} options={NECK_TYPES.map(n=>({label:n,value:n}))} onChange={e=>setForm({...form,neck:e.target.value})}/>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <Input label="কেনা" type="number" value={form.buyPrice} onChange={e=>setForm({...form,buyPrice:e.target.value})} required/>
                  <Input label="বেচা" type="number" value={form.sellPrice} onChange={e=>setForm({...form,sellPrice:e.target.value})} required/>
                  <Input label="স্টক" type="number" value={form.stock} onChange={e=>setForm({...form,stock:e.target.value})} required/>
                </div>
                <Button type="submit" className="w-full mt-4 py-4 text-lg">সংরক্ষণ করুন</Button>
              </form>
            </Modal>
        </div>
    );
};

const POSView = ({ products, user, shopProfile, showToast }) => {
    const [cart, setCart] = useState([]);
    const [customer, setCustomer] = useState({ name: '', phone: '', address: '', deliveryCharge: '0', advance: '0' });
    const [filter, setFilter] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('Cash');
    const [invoiceOrder, setInvoiceOrder] = useState(null);

    const addToCart = (p) => {
        const exist = cart.find(i => i.id === p.id);
        if(exist) setCart(cart.map(i => i.id === p.id ? {...i, qty: i.qty + 1} : i));
        else setCart([...cart, { ...p, qty: 1, size: 'Mixed' }]);
    };
    const removeFromCart = (id) => setCart(cart.filter(i => i.id !== id));
    const updateQty = (id, val) => setCart(cart.map(i => i.id === id ? {...i, qty: Math.max(0, parseInt(val) || 0)} : i));

    const financials = useMemo(() => {
        const subTotal = cart.reduce((s, i) => s + (Number(i.sellPrice) * i.qty), 0);
        const total = subTotal + (Number(customer.deliveryCharge) || 0);
        const due = total - (Number(customer.advance) || 0);
        return { subTotal, total, due };
    }, [cart, customer]);

    const handleOrder = async () => {
        if(!cart.length || !customer.name || !customer.phone) return showToast("তথ্য অসম্পূর্ণ!", "error");
        const orderData = { customerName: customer.name, phone: customer.phone, address: customer.address, items: cart, ...financials, paidAmount: Number(customer.advance) || 0, dueAmount: financials.due, status: financials.due > 0 ? 'Due' : 'Paid', lastPaymentMethod: paymentMethod, createdAt: serverTimestamp() };
        try {
          const ref = await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'orders'), orderData);
          setInvoiceOrder({...orderData, id: ref.id, createdAt: { seconds: Math.floor(Date.now()/1000) } });
          setCart([]); setCustomer({name:'', phone:'', address:'', deliveryCharge:'0', advance:'0'});
          showToast("অর্ডার সফল!");
        } catch (err) { showToast("অর্ডার ফেইল!", "error"); }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4">
            <div className="lg:col-span-2 space-y-6">
                <div className="relative"><Search className="absolute left-4 top-3.5 text-slate-400" size={20}/><input type="text" placeholder="পণ্য খুঁজুন..." className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-200 outline-none focus:border-indigo-500 bg-white shadow-sm" value={filter} onChange={e=>setFilter(e.target.value)}/></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 overflow-y-auto pr-2 h-[calc(100vh-280px)] pb-10 scrollbar-hide">
                  {products.filter(p=>p.name.toLowerCase().includes(filter.toLowerCase())).map(p => (
                    <div key={p.id} onClick={()=>addToCart(p)} className="bg-white p-5 rounded-3xl border border-slate-100 cursor-pointer hover:shadow-xl hover:border-indigo-300 transition-all group relative overflow-hidden h-40 flex flex-col justify-between">
                        <div><h4 className="font-bold text-slate-800 line-clamp-2">{p.name}</h4><p className="text-[10px] text-slate-400 font-bold uppercase">{p.fabric}</p></div>
                        <div className="flex justify-between items-end"><p className="text-[10px] text-indigo-500 font-black">Stock: {p.stock}</p><p className="text-indigo-600 font-black text-2xl">৳{p.sellPrice}</p></div>
                        <div className="absolute top-0 right-0 p-3 bg-indigo-500 rounded-bl-3xl opacity-0 group-hover:opacity-100 transition"><Plus size={18} className="text-white"/></div>
                    </div>
                  ))}
                </div>
            </div>
            <Card className="flex flex-col gap-6 shadow-2xl h-fit sticky top-4">
                <h3 className="font-black text-lg border-b pb-4 flex items-center gap-2"><ShoppingBag size={20} className="text-indigo-600"/> কার্ট ({cart.length})</h3>
                <div className="space-y-3 flex-1 overflow-y-auto max-h-[300px]">
                  {cart.map(i => (
                    <div key={i.id} className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                        <div className="flex justify-between text-xs mb-2"><strong>{i.name}</strong><button onClick={()=>removeFromCart(i.id)} className="text-rose-400"><X size={14}/></button></div>
                        <div className="flex justify-between items-center gap-2">
                            <select value={i.size} onChange={e=>setCart(cart.map(item => item.id === i.id ? {...item, size: e.target.value} : item))} className="text-[10px] border p-1 rounded font-bold">{SIZES.map(s=><option key={s} value={s}>{s}</option>)}</select>
                            <div className="flex items-center bg-white border rounded-xl px-1 h-8">
                                <button onClick={()=>updateQty(i.id, i.qty - 1)} className="w-8 text-indigo-600 font-black">-</button>
                                <input type="number" value={i.qty} onChange={(e)=>updateQty(i.id, e.target.value)} className="w-8 text-center text-xs font-black outline-none border-none"/>
                                <button onClick={()=>updateQty(i.id, i.qty + 1)} className="w-8 text-indigo-600 font-black">+</button>
                            </div>
                            <p className="text-xs font-black">৳{i.sellPrice * i.qty}</p>
                        </div>
                    </div>
                  ))}
                </div>
                <div className="space-y-4 border-t pt-4">
                    <div className="grid grid-cols-2 gap-3"><Input placeholder="নাম" value={customer.name} onChange={e=>setCustomer({...customer,name:e.target.value})}/><Input placeholder="ফোন" value={customer.phone} onChange={e=>setCustomer({...customer,phone:e.target.value})}/></div>
                    <Input placeholder="ঠিকানা" value={customer.address} onChange={e=>setCustomer({...customer,address:e.target.value})}/>
                    <div className="grid grid-cols-2 gap-3"><Input label="ডেলিভারি" type="number" value={customer.deliveryCharge} onChange={e=>setCustomer({...customer,deliveryCharge:e.target.value})}/><Input label="অ্যাডভান্স" type="number" value={customer.advance} onChange={e=>setCustomer({...customer,advance:e.target.value})}/></div>
                    <div className="bg-slate-900 text-white p-4 rounded-2xl space-y-1">
                      <div className="flex justify-between text-xs opacity-60"><span>Total: ৳{financials.total}</span></div>
                      <div className="flex justify-between text-xl font-black"><span>বকেয়া:</span><span>৳{financials.due}</span></div>
                    </div>
                    <Button onClick={handleOrder} className="w-full py-4 text-lg bg-indigo-600">অর্ডার কনফার্ম</Button>
                </div>
            </Card>
            {invoiceOrder && <InvoiceModal order={invoiceOrder} shopProfile={shopProfile} onClose={()=>setInvoiceOrder(null)} />}
        </div>
    );
};

const OrderListView = ({ orders, user, shopProfile, showToast }) => {
    const [invoice, setInvoice] = useState(null);
    const [editPayment, setEditPayment] = useState(null);
    const [payData, setPayData] = useState({ amount: '', delivery: '' });

    const handleUpdatePayment = async () => {
        const amt = Number(payData.amount) || 0;
        const del = Number(payData.delivery);
        const newPaid = Number(editPayment.paidAmount) + amt;
        const newTotal = Number(editPayment.subTotal) + del;
        const newDue = newTotal - newPaid;
        try {
          await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'orders', editPayment.id), { deliveryCharge: del, totalAmount: newTotal, paidAmount: newPaid, dueAmount: newDue, status: newDue <= 0 ? 'Paid' : 'Due' });
          setEditPayment(null); showToast("আপডেট সফল!");
        } catch (err) { showToast("ভুল হয়েছে", "error"); }
    };

    return (
        <div className="space-y-8 animate-in fade-in">
            <h2 className="text-2xl font-black text-slate-800">অর্ডার রেকর্ড</h2>
            <Card className="p-0 overflow-hidden border-none shadow-md">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse min-w-[800px]">
                  <thead className="bg-slate-50 border-b uppercase text-[11px] font-black text-slate-400 tracking-wider">
                    <tr><th className="p-5">মেমো</th><th className="p-5">কাস্টমার</th><th className="p-5 text-right">বিল</th><th className="p-5 text-right">বকেয়া</th><th className="p-5 text-center">স্ট্যাটাস</th><th className="p-5 text-right">একশন</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {orders.map(o => (
                      <tr key={o.id} className="hover:bg-slate-50/80 transition">
                        <td className="p-5 font-mono text-xs text-slate-400">#{o.id.slice(-6).toUpperCase()}</td>
                        <td className="p-5"><p className="font-bold text-slate-800">{o.customerName}</p><p className="text-[10px] text-slate-400 font-bold">{o.phone}</p></td>
                        <td className="p-5 text-right font-black">৳{o.totalAmount}</td>
                        <td className="p-5 text-right font-black text-rose-500">৳{o.dueAmount}</td>
                        <td className="p-5 text-center"><span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${o.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>{o.status}</span></td>
                        <td className="p-5 text-right flex gap-3 justify-end items-center mt-2">
                          <button onClick={()=>setInvoice(o)} className="text-indigo-500 hover:bg-indigo-50 p-2 rounded-xl transition"><Printer size={18}/></button>
                          <button onClick={()=>{setEditPayment(o); setPayData({amount: '', delivery: o.deliveryCharge})}} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-black shadow-lg">পেমেন্ট</button>
                          <button onClick={async ()=>{ if(confirm("ডিলিট করবেন?")) await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'orders', o.id)); }} className="text-rose-400 hover:bg-rose-50 p-2 rounded-xl transition"><Trash2 size={18}/></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
            {invoice && <InvoiceModal order={invoice} shopProfile={shopProfile} onClose={()=>setInvoice(null)} />}
            <Modal isOpen={!!editPayment} onClose={()=>setEditPayment(null)} title="পেমেন্ট আপডেট">
              <div className="space-y-5">
                <Input label="ডেলিভারি চার্জ" type="number" value={payData.delivery} onChange={e=>setPayData({...payData, delivery: e.target.value})}/>
                <div className="p-4 bg-indigo-50 rounded-2xl flex justify-between items-center"><p className="text-2xl font-black text-indigo-700">৳{editPayment?.dueAmount}</p><ChevronRight size={32} className="text-indigo-200"/></div>
                <Input label="নতুন জমা" type="number" value={payData.amount} onChange={e=>setPayData({...payData, amount: e.target.value})} placeholder="টাকা লিখুন"/>
                <Button onClick={handleUpdatePayment} className="w-full py-4 bg-indigo-600">নিশ্চিত করুন</Button>
              </div>
            </Modal>
        </div>
    );
};

const InvoiceModal = ({ order, shopProfile, onClose }) => {
    const printRef = useRef();
    const dateStr = order.createdAt?.seconds ? new Date(order.createdAt.seconds * 1000).toLocaleDateString('bn-BD') : 'N/A';
    return (
        <div className="fixed inset-0 bg-slate-900/80 z-[200] flex items-center justify-center p-4 backdrop-blur-md overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-2xl w-full flex flex-col max-h-[90vh] shadow-2xl animate-in zoom-in">
                <div className="p-6 border-b flex justify-between items-center bg-slate-50 rounded-t-3xl">
                  <span className="font-black">Invoice Preview</span>
                  <div className="flex gap-3">
                    <Button onClick={() => window.print()} icon={<Printer size={18}/>}>প্রিন্ট</Button>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition"><X size={20}/></button>
                  </div>
                </div>
                <div className="overflow-y-auto p-12 bg-white" ref={printRef}>
                    <div className="border-b-4 border-slate-900 pb-8 mb-8 flex justify-between items-start">
                        <div><h1 className="text-4xl font-black uppercase text-indigo-700 mb-2">{shopProfile?.shopName}</h1><p className="text-sm font-bold text-slate-500">{shopProfile?.address}</p><p className="text-sm font-bold text-slate-500">{shopProfile?.phone}</p></div>
                        <div className="text-right"><h2 className="text-4xl font-black text-slate-200 uppercase">Invoice</h2><p className="font-black text-slate-800 text-xl">#INV-{order.id?.slice(-6).toUpperCase()}</p><p className="text-[10px] text-slate-400 font-black">{dateStr}</p></div>
                    </div>
                    <div className="mb-10 p-6 bg-slate-50 rounded-3xl grid grid-cols-2 gap-8">
                        <div><p className="text-[10px] font-black uppercase text-slate-400 mb-2">Bill To:</p><p className="text-xl font-black">{order.customerName}</p><p className="text-sm">{order.phone}</p></div>
                        <div className="text-right flex flex-col justify-center"><p className="text-[10px] font-black uppercase text-slate-400">Status</p><span className={`text-2xl font-black ${order.status === 'Paid' ? 'text-emerald-600' : 'text-rose-600'}`}>{order.status}</span></div>
                    </div>
                    <table className="w-full mb-8"><thead className="bg-slate-900 text-white text-[10px] uppercase font-black"><tr><th className="p-4 text-left rounded-l-2xl">Item</th><th className="p-4 text-center">Qty</th><th className="p-4 text-right">Price</th><th className="p-4 text-right rounded-r-2xl">Total</th></tr></thead>
                        <tbody>{order.items?.map((i,idx)=>(<tr key={idx} className="text-sm border-b"><td className="p-4 font-bold">{i.name} ({i.size})</td><td className="p-4 text-center font-black">{i.qty}</td><td className="p-4 text-right">৳{i.sellPrice}</td><td className="p-4 text-right font-black">৳{i.sellPrice * i.qty}</td></tr>))}</tbody>
                    </table>
                    <div className="flex justify-end"><div className="w-72 space-y-3 bg-slate-50 p-8 rounded-3xl text-sm">
                        <div className="flex justify-between font-bold"><span>Sub-total</span><span>৳{order.subTotal}</span></div>
                        <div className="flex justify-between font-bold pb-3 border-b"><span>Delivery</span><span>৳{order.deliveryCharge}</span></div>
                        <div className="flex justify-between text-2xl font-black pt-2"><span>Total</span><span>৳{order.totalAmount}</span></div>
                        <div className="flex justify-between font-bold text-emerald-600"><span>Paid</span><span>- ৳{order.paidAmount}</span></div>
                        <div className="flex justify-between text-lg font-black text-rose-600 pt-2 border-t"><span>Due</span><span>৳{order.dueAmount}</span></div>
                    </div></div>
                </div>
            </div>
        </div>
    );
};

const ExpenseView = ({ expenses, user, showToast }) => {
    const [form, setForm] = useState({ title: '', amount: '', category: 'Marketing' });
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
          await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'expenses'), { ...form, amount: Number(form.amount), createdAt: serverTimestamp() });
          setForm({ title: '', amount: '', category: 'Marketing' });
          showToast("খরচ সেভ হয়েছে");
        } catch (err) { showToast("ত্রুটি হয়েছে", "error"); }
    };
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in">
            <Card><h3 className="font-black mb-8 flex items-center gap-2 text-xl"><CreditCard size={24} className="text-rose-500"/> খরচ এন্ট্রি</h3>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <Input label="বিবরণ" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} required placeholder="কিসের খরচ?"/>
                    <Input label="টাকার পরিমাণ" type="number" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} required placeholder="0"/>
                    <Select label="ক্যাটাগরি" value={form.category} options={['Rent', 'Electricity', 'Transport', 'Salary', 'Marketing', 'Tea/Snacks', 'Other'].map(c=>({label:c,value:c}))} onChange={e=>setForm({...form,category:e.target.value})} />
                    <Button type="submit" className="w-full py-4 mt-4 text-lg bg-rose-500 hover:bg-rose-600 text-white shadow-xl shadow-rose-100" icon={<Save size={20}/>}>খরচ সেভ করুন</Button>
                </form>
            </Card>
            <div className="space-y-4">
                <h3 className="font-black text-xl text-slate-800">খরচের তালিকা</h3>
                <div className="space-y-3 max-h-[calc(100vh-250px)] overflow-y-auto pr-2 scrollbar-hide">
                    {expenses.map(ex => (
                        <div key={ex.id} className="bg-white p-6 rounded-3xl border flex justify-between items-center shadow-sm hover:shadow-xl transition group">
                            <div className="flex gap-4 items-center"><div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center font-bold text-xl">-</div><div><p className="font-bold text-slate-800 text-lg">{ex.title}</p><p className="text-[10px] text-slate-400 font-black tracking-widest mt-1">{ex.category}</p></div></div>
                            <div className="flex items-center gap-5"><span className="text-rose-500 font-black text-2xl">৳{ex.amount}</span><button onClick={async ()=>{ if(confirm("মুছবেন?")) await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'expenses', ex.id)); }} className="p-2 opacity-0 group-hover:opacity-100 text-rose-400 transition"><Trash2 size={18}/></button></div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const CustomerView = ({ orders, user }) => {
    const customers = useMemo(() => {
        const map = {};
        orders.forEach(o => {
            if(!map[o.phone]) map[o.phone] = { name: o.customerName, phone: o.phone, address: o.address, totalOrders: 0, totalSpent: 0 };
            map[o.phone].totalOrders += 1; map[o.phone].totalSpent += (Number(o.totalAmount) || 0);
        });
        return Object.values(map);
    }, [orders]);
    return (
        <div className="space-y-8 animate-in fade-in">
            <h2 className="text-2xl font-black text-slate-800">কাস্টমার ডাটাবেজ</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {customers.map((c, i) => (
                    <Card key={i} className="hover:shadow-2xl transition border group relative">
                        <div className="flex items-start justify-between mb-4"><div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg">{c.name.charAt(0)}</div><span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-[10px] font-black uppercase">{c.totalOrders} Orders</span></div>
                        <h3 className="font-black text-xl text-slate-800">{c.name}</h3><p className="text-sm text-slate-500 font-bold flex items-center gap-1.5 mt-1"><Phone size={14} className="text-indigo-400"/> {c.phone}</p>
                        <div className="pt-6 mt-6 border-t border-slate-50 flex justify-between items-center"><span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Lifetime Value</span><span className="text-xl font-black text-slate-800">৳{c.totalSpent.toLocaleString()}</span></div>
                    </Card>
                ))}
            </div>
        </div>
    );
};

const SettingsView = ({ profile, user, showToast }) => {
    const [data, setData] = useState(profile);
    useEffect(() => { if(profile) setData(profile); }, [profile]);
    const handleSave = async (e) => { 
        e.preventDefault(); 
        try { await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'profile'), data, {merge: true}); showToast("আপডেট সফল!"); } 
        catch (err) { showToast("ত্রুটি হয়েছে", "error"); }
    };
    return (
        <div className="max-w-2xl mx-auto animate-in fade-in">
            <Card className="border-t-8 border-indigo-600 shadow-2xl relative">
                <div className="flex items-center gap-6 mb-12 border-b pb-8"><div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center text-indigo-600 border shadow-sm"><Store size={40}/></div><div><h2 className="text-3xl font-black text-slate-800 tracking-tight">ব্যবসায়িক প্রোফাইল</h2><p className="text-sm text-slate-500 font-bold mt-1">এই তথ্যগুলো ইনভয়েসে ব্যবহার হবে</p></div></div>
                <form onSubmit={handleSave} className="space-y-6">
                    <Input label="দোকানের নাম" value={data?.shopName} onChange={e=>setData({...data,shopName:e.target.value})} required/>
                    <Input label="মোাবাইল নাম্বার" value={data?.phone} onChange={e=>setData({...data,phone:e.target.value})} required/>
                    <Input label="দোকানের ঠিকানা" value={data?.address} onChange={e=>setData({...data,address:e.target.value})} required/>
                    <Button type="submit" className="w-full py-4 text-lg shadow-xl shadow-indigo-100 mt-4" icon={<Save size={20}/>}>তথ্য আপডেট করুন</Button>
                </form>
            </Card>
        </div>
    );
};

const Select = ({ label, value, onChange, options }) => (
  <div className="flex flex-col gap-2 w-full">
    {label && <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">{label}</label>}
    <select value={value ?? ''} onChange={onChange} className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none transition-all text-slate-800 bg-white text-sm cursor-pointer font-bold">
      {options.map((opt, idx) => <option key={idx} value={opt.value}>{opt.label}</option>)}
    </select>
  </div>
);

// CSS for hiding scrollbar
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.innerText = `.scrollbar-hide::-webkit-scrollbar { display: none; } .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }`;
  document.head.appendChild(styleSheet);
}