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

// --- ফায়ারবেস কনফিগারেশন ---
const firebaseConfig = {
  apiKey: "AIzaSyDlC-GAtKekX_SPjacRvzg7gKTGGQChpzA",
  authDomain: "business-manager-7d11a.firebaseapp.com",
  projectId: "business-manager-7d11a",
  storageBucket: "business-manager-7d11a.firebasestorage.app",
  messagingSenderId: "655200131586",
  appId: "1:655200131586:web:0b41af39a725542b8ae51b",
  measurementId: "G-785LXLP9X2"
};

const customAppId = "business-manager-7d11a-prod-v1";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Constants ---
const NECK_TYPES = ['গোল গলা', 'ভি গলা', 'ক্রস ভি গলা', 'কলার', 'ভি কলার', 'পাঞ্জাবী কলার'];
const FABRIC_TYPES = ['PP (170-180 GSM)', 'Sugar Mesh', 'Box Mesh', 'Honeycomb', 'Jacquard', 'Brush Jacquard'];
const SIZES = ['M', 'L', 'XL', 'XXL', 'Free Size', 'Mixed'];

// --- UI Components ---
const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-2xl shadow-sm border border-slate-100 p-6 ${className}`}>{children}</div>
);

const Button = ({ children, onClick, variant = "primary", className = "", disabled = false, type="button", icon }) => {
  const baseStyle = "px-5 py-2.5 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 text-sm shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200",
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

const AuthScreen = ({ onLoginSuccess }) => {
  const [view, setView] = useState('signup');
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
    if (formData.otp !== generatedOTP) { setError("ভুল ওটিপি!"); return; }
    setLoading(true);
    const email = `${formData.phone}@manager.local`;
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, formData.password);
        await setDoc(doc(db, 'artifacts', customAppId, 'users', userCredential.user.uid, 'settings', 'profile'), {
            shopName: formData.shopName, address: formData.address, phone: formData.phone, createdAt: serverTimestamp()
        });
        onLoginSuccess();
    } catch (err) { setError("একাউন্ট তৈরিতে সমস্যা হয়েছে।"); setLoading(false); }
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
            <h1 className="text-2xl font-extrabold text-slate-800">বিজনেস ম্যানেজার</h1>
            <p className="text-slate-500 text-sm mt-1">দোকানের ডিজিটাল হিসাব সহকারী</p>
        </div>
        {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6 border border-red-100">{error}</div>}
        {view === 'login' && (
            <form onSubmit={handleLogin} className="space-y-5 animate-in fade-in">
                <Input label="ফোন নাম্বার" placeholder="017xxxxxxxx" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} required />
                <Input label="পাসওয়ার্ড" type="password" placeholder="******" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} required />
                <Button type="submit" className="w-full py-3.5" disabled={loading}>{loading ? 'অপেক্ষা করুন...' : 'লগিন করুন'}</Button>
                <button type="button" onClick={() => setView('signup')} className="w-full text-center text-indigo-600 font-bold text-sm hover:underline mt-4">নতুন একাউন্ট খুলুন</button>
            </form>
        )}
        {view === 'signup' && (
            <form onSubmit={handleSignupInit} className="space-y-4 animate-in fade-in">
                <Input label="দোকানের নাম" placeholder="দোকানের নাম লিখুন" value={formData.shopName} onChange={e => setFormData({...formData, shopName: e.target.value})} required />
                <Input label="ফোন নাম্বার" placeholder="017xxxxxxxx" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} required />
                <Input label="ঠিকানা" placeholder="আপনার ঠিকানা" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} required />
                <Input label="পাসওয়ার্ড" type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} required />
                <Button type="submit" className="w-full py-3.5">রেজিস্ট্রেশন করুন</Button>
                <button type="button" onClick={() => setView('login')} className="w-full text-center text-slate-500 text-sm mt-4">লগিন করুন</button>
            </form>
        )}
        {view === 'otp' && (
            <form onSubmit={handleCreateAccount} className="space-y-6 animate-in zoom-in text-center">
                <div className="bg-indigo-50 p-4 rounded-xl">
                    <p className="text-sm text-slate-600">ভেরিফিকেশন কোড: <span className="font-bold text-indigo-700 text-lg">{generatedOTP}</span></p>
                </div>
                <Input label="ওটিপি কোডটি নিচে লিখুন" value={formData.otp} onChange={e => setFormData({...formData, otp: e.target.value})} required />
                <Button type="submit" className="w-full" disabled={loading}>যাচাই সম্পন্ন করুন</Button>
            </form>
        )}
      </Card>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [shopProfile, setShopProfile] = useState(null);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [expenses, setExpenses] = useState([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const docSnap = await getDoc(doc(db, 'artifacts', customAppId, 'users', u.uid, 'settings', 'profile'));
        if (docSnap.exists()) setShopProfile(docSnap.data());
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const getColl = (c) => collection(db, 'artifacts', customAppId, 'users', user.uid, c);
    const unsubProfile = onSnapshot(doc(db, 'artifacts', customAppId, 'users', user.uid, 'settings', 'profile'), (d) => d.exists() && setShopProfile(d.data()));
    const unsubProducts = onSnapshot(query(getColl('products'), orderBy('createdAt', 'desc')), (s) => setProducts(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubOrders = onSnapshot(query(getColl('orders'), orderBy('createdAt', 'desc')), (s) => setOrders(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubExpenses = onSnapshot(query(getColl('expenses'), orderBy('createdAt', 'desc')), (s) => setExpenses(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => { unsubProfile(); unsubProducts(); unsubOrders(); unsubExpenses(); };
  }, [user]);

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50 font-bold text-indigo-600">সিস্টেম লোড হচ্ছে...</div>;
  if (!user || !shopProfile) return <AuthScreen onLoginSuccess={() => {}} />;

  return (
    <div className="flex h-screen bg-slate-100 font-sans text-slate-800">
      <aside className="w-64 bg-slate-900 text-white flex flex-col hidden md:flex">
        <div className="p-6 border-b border-white/10 flex items-center gap-3"><div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center font-bold">BM</div><h1 className="font-bold">ম্যানেজার</h1></div>
        <nav className="flex-1 p-4 space-y-1">
          <NavItem active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard size={20}/>} label="ড্যাশবোর্ড" />
          <NavItem active={activeTab === 'pos'} onClick={() => setActiveTab('pos')} icon={<ShoppingBag size={20}/>} label="অর্ডার (POS)" />
          <NavItem active={activeTab === 'inventory'} onClick={() => setActiveTab('inventory')} icon={<Package size={20}/>} label="স্টক/পণ্য" />
          <NavItem active={activeTab === 'expenses'} onClick={() => setActiveTab('expenses')} icon={<CreditCard size={20}/>} label="খরচ" />
          <NavItem active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<Settings size={20}/>} label="সেটিংস" />
        </nav>
        <div className="p-4 border-t border-white/10 bg-black/20">
            <p className="text-xs text-slate-400 mb-2 truncate">{shopProfile.shopName}</p>
            <button onClick={() => signOut(auth)} className="text-red-400 text-xs font-bold flex items-center gap-2 hover:text-red-300 transition"><LogOut size={14}/> লগ আউট</button>
        </div>
      </aside>
      <main className="flex-1 flex flex-col overflow-hidden bg-[#F8FAFC]">
        <header className="h-16 bg-white border-b flex items-center justify-between px-8 shadow-sm">
          <h2 className="font-bold text-slate-800 text-lg uppercase">{activeTab}</h2>
          <div className="text-xs font-bold text-slate-500 flex items-center gap-2"> {shopProfile.address}</div>
        </header>
        <div className="flex-1 overflow-auto p-8">
            {activeTab === 'dashboard' && <DashboardView products={products} orders={orders} expenses={expenses} />}
            {activeTab === 'pos' && <POSView products={products} user={user} />}
            {activeTab === 'inventory' && <InventoryView products={products} user={user} />}
            {activeTab === 'expenses' && <ExpenseView expenses={expenses} user={user} />}
            {activeTab === 'settings' && <SettingsView profile={shopProfile} user={user} />}
        </div>
      </main>
    </div>
  );
}

const NavItem = ({ active, onClick, icon, label }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${active ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>{icon} <span className="text-sm font-medium">{label}</span></button>
);

const DashboardView = ({ products, orders, expenses }) => {
    const totalSales = orders.reduce((s, o) => s + parseFloat(o.totalAmount || 0), 0);
    const totalExpense = expenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0);
    const totalDue = orders.reduce((s, o) => s + parseFloat(o.dueAmount || 0), 0);
    return (
        <div className="space-y-8 animate-in fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="মোট বিক্রয়" value={`৳${totalSales.toLocaleString()}`} icon={<ShoppingBag className="text-blue-600"/>} color="bg-blue-50" />
                <StatCard title="মোট খরচ" value={`৳${totalExpense.toLocaleString()}`} icon={<CreditCard className="text-rose-600"/>} color="bg-rose-50" />
                <StatCard title="মোট বকেয়া" value={`৳${totalDue.toLocaleString()}`} icon={<AlertCircle className="text-orange-600"/>} color="bg-orange-50" />
                <StatCard title="মোট পণ্য" value={products.length} icon={<Package className="text-indigo-600"/>} color="bg-indigo-50" />
            </div>
            <Card className="h-80"><h3 className="font-bold text-slate-700 mb-6 flex items-center gap-2"> বিক্রয় চার্ট</h3>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={orders.slice(-10).map(o => ({name: o.customerName?.slice(0,5), sales: o.totalAmount}))}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="name"/><YAxis/><Tooltip/><Area type="monotone" dataKey="sales" stroke="#4f46e5" fill="#4f46e520" strokeWidth={3}/></AreaChart>
                </ResponsiveContainer>
            </Card>
        </div>
    );
};

const StatCard = ({ title, value, icon, color }) => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 transition hover:shadow-md"><div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>{icon}</div><div><p className="text-slate-400 text-xs font-bold uppercase tracking-wider">{title}</p><h4 className="text-xl font-extrabold">{value}</h4></div></div>
);

const InventoryView = ({ products, user }) => {
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({ name: '', buyPrice: '', sellPrice: '', stock: '' });
    const handleSubmit = async (e) => {
        e.preventDefault();
        await addDoc(collection(db, 'artifacts', customAppId, 'users', user.uid, 'products'), { ...formData, createdAt: serverTimestamp() });
        setShowModal(false); setFormData({ name: '', buyPrice: '', sellPrice: '', stock: '' });
    };
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center"><h2 className="text-xl font-bold">পণ্যের তালিকা</h2><Button onClick={() => setShowModal(true)} icon={<Plus size={18}/>}>নতুন পণ্য</Button></div>
            <Card className="p-0 overflow-hidden shadow-md">
                <table className="w-full text-left"><thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase border-b"><tr><th className="p-5">নাম</th><th className="p-5 text-right">কেনা</th><th className="p-5 text-right">বেচা</th><th className="p-5 text-center">স্টক</th><th className="p-5 text-right">একশন</th></tr></thead>
                    <tbody className="divide-y">{products.map(p => (
                        <tr key={p.id} className="hover:bg-slate-50 text-sm"><td className="p-5 font-bold">{p.name}</td><td className="p-5 text-right">৳{p.buyPrice}</td><td className="p-5 text-right font-bold text-indigo-600">৳{p.sellPrice}</td><td className="p-5 text-center"><span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full font-bold text-xs">{p.stock}</span></td><td className="p-5 text-right"><button onClick={() => deleteDoc(doc(db, 'artifacts', customAppId, 'users', user.uid, 'products', p.id))} className="text-red-400 p-2"><Trash2 size={16}/></button></td></tr>
                    ))}</tbody>
                </table>
            </Card>
            {showModal && <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4"><Card className="w-full max-w-md animate-in zoom-in"><div className="flex justify-between items-center mb-6"><h3 className="font-bold text-lg">নতুন পণ্য</h3><button onClick={() => setShowModal(false)}><X size={20}/></button></div><form onSubmit={handleSubmit} className="space-y-4"><Input label="নাম" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required /><div className="grid grid-cols-2 gap-4"><Input label="কেনা দাম" type="number" value={formData.buyPrice} onChange={e => setFormData({...formData, buyPrice: e.target.value})} required /><Input label="বিক্রয় দাম" type="number" value={formData.sellPrice} onChange={e => setFormData({...formData, sellPrice: e.target.value})} required /></div><Input label="স্টক" type="number" value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} required /><Button type="submit" className="w-full mt-4">সেভ করুন</Button></form></Card></div>}
        </div>
    );
};

const POSView = ({ products, user }) => {
    const [cart, setCart] = useState([]);
    const [customer, setCustomer] = useState({ name: '', phone: '' });
    const addToCart = (p) => {
        const exist = cart.find(i => i.id === p.id);
        if(exist) setCart(cart.map(i => i.id === p.id ? {...i, qty: i.qty + 1} : i));
        else setCart([...cart, { ...p, qty: 1 }]);
    };
    const handleOrder = async () => {
        if(!cart.length || !customer.name) return alert("তথ্য পূরণ করুন");
        const total = cart.reduce((s, i) => s + (i.sellPrice * i.qty), 0);
        await addDoc(collection(db, 'artifacts', customAppId, 'users', user.uid, 'orders'), {
            customerName: customer.name, phone: customer.phone, items: cart, totalAmount: total, dueAmount: total, paidAmount: 0, status: 'Due', createdAt: serverTimestamp()
        });
        setCart([]); setCustomer({name: '', phone: ''}); alert("অর্ডার সফল হয়েছে!");
    };
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4"><div className="grid grid-cols-2 md:grid-cols-3 gap-4">{products.map(p => (
                    <div key={p.id} onClick={() => addToCart(p)} className="bg-white p-4 rounded-xl border border-slate-100 cursor-pointer hover:shadow-lg transition"><h4 className="font-bold text-sm mb-1">{p.name}</h4><p className="text-indigo-600 font-bold">৳{p.sellPrice}</p></div>
                ))}</div></div>
            <Card className="flex flex-col h-[calc(100vh-180px)]"><h3 className="font-bold border-b pb-3 mb-4">অর্ডার লিস্ট</h3>
                <div className="flex-1 overflow-y-auto space-y-3 mb-6">{cart.map(i => <div key={i.id} className="flex justify-between text-sm bg-slate-50 p-2 rounded"><span>{i.name} (x{i.qty})</span><span className="font-bold">৳{i.sellPrice * i.qty}</span></div>)}</div>
                <div className="space-y-4 pt-4 border-t"><Input placeholder="কাস্টমার নাম" value={customer.name} onChange={e => setCustomer({...customer, name: e.target.value})} /><Input placeholder="ফোন" value={customer.phone} onChange={e => setCustomer({...customer, phone: e.target.value})} /><div className="flex justify-between font-bold text-lg border-y py-3 my-2"><span>মোট:</span><span>৳{cart.reduce((s, i) => s + (i.sellPrice * i.qty), 0)}</span></div><Button onClick={handleOrder} className="w-full bg-slate-800">অর্ডার কনফার্ম</Button></div>
            </Card>
        </div>
    );
};

const ExpenseView = ({ expenses, user }) => {
    const [form, setForm] = useState({ title: '', amount: '', category: 'Others' });
    const handleAdd = async (e) => {
        e.preventDefault();
        await addDoc(collection(db, 'artifacts', customAppId, 'users', user.uid, 'expenses'), { ...form, createdAt: serverTimestamp() });
        setForm({ title: '', amount: '', category: 'Others' });
    };
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card><h3 className="font-bold mb-6">খরচ যুক্ত করুন</h3>
                <form onSubmit={handleAdd} className="space-y-4"><Input label="বিবরণ" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required /><Input label="টাকা" type="number" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} required /><Button type="submit" className="w-full">সেভ করুন</Button></form>
            </Card>
            <div className="space-y-4 overflow-y-auto max-h-[500px]">{expenses.map(ex => (
                    <div key={ex.id} className="flex justify-between items-center p-4 bg-white border rounded-xl shadow-sm"><div><p className="font-bold text-sm">{ex.title}</p></div><div className="flex items-center gap-4"><span className="font-bold text-red-500">-৳{ex.amount}</span><button onClick={() => deleteDoc(doc(db, 'artifacts', customAppId, 'users', user.uid, 'expenses', ex.id))}><Trash2 size={14} className="text-slate-300 hover:text-red-500"/></button></div></div>
                ))}</div>
        </div>
    );
};

const SettingsView = ({ profile, user }) => {
    const [data, setData] = useState(profile);
    const handleSave = async (e) => {
        e.preventDefault();
        await setDoc(doc(db, 'artifacts', customAppId, 'users', user.uid, 'settings', 'profile'), data, {merge: true});
        alert("তথ্য আপডেট হয়েছে!");
    };
    return (
        <Card className="max-w-md mx-auto">
            <h3 className="font-bold mb-6">দোকানের তথ্য</h3>
            <form onSubmit={handleSave} className="space-y-4">
                <Input label="দোকানের নাম" value={data.shopName} onChange={e => setData({...data, shopName: e.target.value})} />
                <Input label="ঠিকানা" value={data.address} onChange={e => setData({...data, address: e.target.value})} />
                <Button type="submit" className="w-full">আপডেট করুন</Button>
            </form>
        </Card>
    );
};