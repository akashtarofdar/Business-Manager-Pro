import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { collection, query, onSnapshot, orderBy, doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, DB_VERSION } from '@/lib/firebase';
import { LayoutDashboard, Package, ShoppingBag, List, Truck, Users, CreditCard, Settings, LogOut, MapPin, WifiOff, Menu, X, ChevronRight, Sun, Moon } from 'lucide-react';
import type { ShopProfile, Product, Order, Expense, SupplierPayment } from '@/lib/types';
import AuthScreen from '@/components/auth/AuthScreen';
import DashboardView from '@/pages/Dashboard';
import InventoryView from '@/pages/Inventory';
import POSView from '@/pages/POS';
import OrderListView from '@/pages/OrderList';
import SupplierView from '@/pages/Supplier';
import CustomerView from '@/pages/Customers';
import ExpenseView from '@/pages/Expenses';
import SettingsView from '@/pages/SettingsView';

const NAV_ITEMS = [
  { key: 'dashboard', label: 'ড্যাশবোর্ড', icon: LayoutDashboard },
  { key: 'inventory', label: 'ইনভেন্টরি', icon: Package },
  { key: 'pos', label: 'POS (অর্ডার)', icon: ShoppingBag },
  { key: 'orders', label: 'অর্ডার লিস্ট', icon: List },
  { key: 'supplier', label: 'সাপ্লায়ার', icon: Truck },
  { key: 'customers', label: 'কাস্টমার ডাটা', icon: Users },
  { key: 'expenses', label: 'খরচপাতি', icon: CreditCard },
  { key: 'settings', label: 'সেটিংস', icon: Settings },
];

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [shopProfile, setShopProfile] = useState<ShopProfile | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [supplierPayments, setSupplierPayments] = useState<SupplierPayment[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' || document.documentElement.classList.contains('dark');
    }
    return false;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  useEffect(() => {
    const onlineHandler = () => setIsOnline(true);
    const offlineHandler = () => setIsOnline(false);
    window.addEventListener('online', onlineHandler);
    window.addEventListener('offline', offlineHandler);

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const docRef = doc(db, 'artifacts', DB_VERSION, 'users', currentUser.uid, 'settings', 'profile');
        try {
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) setShopProfile(docSnap.data() as ShopProfile);
          else {
            const defaultProfile: ShopProfile = { shopName: 'My Business', address: '', phone: '', email: currentUser.email || '' };
            await setDoc(docRef, defaultProfile);
            setShopProfile(defaultProfile);
          }
        } catch {
          setShopProfile({ shopName: 'My Business', address: '', phone: '' });
        }
      }
      setLoading(false);
    });
    return () => { unsubscribe(); window.removeEventListener('online', onlineHandler); window.removeEventListener('offline', offlineHandler); };
  }, []);

  useEffect(() => {
    if (!user) return;
    const uid = user.uid;
    const unsubs = [
      onSnapshot(query(collection(db, 'artifacts', DB_VERSION, 'users', uid, 'products'), orderBy('createdAt', 'desc')), (s) => setProducts(s.docs.map(d => ({ id: d.id, ...d.data() } as Product)))),
      onSnapshot(query(collection(db, 'artifacts', DB_VERSION, 'users', uid, 'orders'), orderBy('createdAt', 'desc')), (s) => setOrders(s.docs.map(d => ({ id: d.id, ...d.data() } as Order)))),
      onSnapshot(query(collection(db, 'artifacts', DB_VERSION, 'users', uid, 'expenses'), orderBy('createdAt', 'desc')), (s) => setExpenses(s.docs.map(d => ({ id: d.id, ...d.data() } as Expense)))),
      onSnapshot(query(collection(db, 'artifacts', DB_VERSION, 'users', uid, 'supplier_payments'), orderBy('date', 'desc')), (s) => setSupplierPayments(s.docs.map(d => ({ id: d.id, ...d.data() } as SupplierPayment)))),
      onSnapshot(doc(db, 'artifacts', DB_VERSION, 'users', uid, 'settings', 'profile'), (d) => d.exists() && setShopProfile(d.data() as ShopProfile)),
    ];
    return () => unsubs.forEach(u => u());
  }, [user]);

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="w-14 h-14 gradient-primary rounded-2xl flex items-center justify-center text-white font-extrabold text-xl mx-auto mb-4 animate-pulse shadow-lg shadow-primary/30">BM</div>
        <p className="text-muted-foreground font-semibold text-sm">লোড হচ্ছে...</p>
      </div>
    </div>
  );
  if (!user || !shopProfile) return <AuthScreen />;

  const tabLabels: Record<string, string> = {
    dashboard: 'ড্যাশবোর্ড', inventory: 'ইনভেন্টরি', pos: 'POS (অর্ডার)', orders: 'অর্ডার লিস্ট',
    supplier: 'সাপ্লায়ার', customers: 'কাস্টমার ডাটা', expenses: 'খরচপাতি', settings: 'সেটিংস'
  };

  const handleNavClick = (key: string) => {
    setActiveTab(key);
    setMobileMenuOpen(false);
  };

  return (
    <div className="flex h-screen bg-background font-sans text-foreground overflow-hidden">
      {!isOnline && (
        <div className="absolute top-0 left-0 w-full bg-destructive text-destructive-foreground text-center text-[11px] py-1.5 z-[100] font-bold uppercase tracking-widest flex items-center justify-center gap-2">
          <WifiOff size={13} /> অফলাইন মোড
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="w-[272px] bg-sidebar-background text-sidebar-foreground flex-col hidden md:flex z-20 border-r border-sidebar-border shadow-2xl shadow-sidebar-background/30">
        {/* Logo */}
        <div className="p-5 flex items-center gap-3 border-b border-sidebar-border/80">
          <div className="w-11 h-11 gradient-primary rounded-2xl flex items-center justify-center font-extrabold text-primary-foreground text-sm shadow-lg shadow-primary/25">BM</div>
          <div>
            <h1 className="font-extrabold text-[15px] text-sidebar-foreground tracking-tight leading-none">Business</h1>
            <p className="text-[10px] text-sidebar-primary font-bold uppercase tracking-[3px] mt-0.5">Manager Pro</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-2 overflow-y-auto custom-scrollbar">
          <p className="px-3 text-[11px] font-bold uppercase tracking-[0.22em] text-sidebar-foreground/55">মেনু</p>
          {NAV_ITEMS.map(item => {
            const isActive = activeTab === item.key;

            return (
              <button
                key={item.key}
                onClick={() => setActiveTab(item.key)}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl border transition-all duration-200 text-[13px] font-semibold group ${
                  isActive
                    ? 'gradient-primary text-primary-foreground border-primary/30 shadow-lg shadow-primary/25'
                    : 'bg-sidebar-accent/85 text-sidebar-foreground border-sidebar-border hover:bg-sidebar-accent-foreground/10 hover:border-sidebar-primary/30'
                }`}
              >
                <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                  isActive
                    ? 'bg-primary-foreground/15 text-primary-foreground'
                    : 'bg-sidebar-background/90 text-sidebar-foreground'
                }`}>
                  <item.icon size={17} strokeWidth={isActive ? 2.4 : 2} />
                </span>
                <span className="flex-1 text-left">{item.label}</span>
                {isActive && <ChevronRight size={14} className="opacity-80" />}
              </button>
            );
          })}
        </nav>

        {/* User Section */}
        <div className="p-3 border-t border-sidebar-border bg-sidebar-background">
          <div className="flex items-center gap-3 p-3 bg-sidebar-accent rounded-2xl mb-2 border border-sidebar-border">
            {shopProfile.logo ? (
              <img src={shopProfile.logo} className="w-10 h-10 rounded-xl object-cover ring-2 ring-sidebar-border" />
            ) : (
              <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center font-bold text-primary-foreground text-sm">{shopProfile.shopName?.charAt(0)}</div>
            )}
            <div className="overflow-hidden flex-1">
              <p className="text-[13px] font-bold truncate text-sidebar-foreground">{shopProfile.shopName}</p>
              <p className="text-[11px] text-sidebar-foreground/70 truncate">{shopProfile.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setDarkMode(!darkMode)} className="flex-1 flex items-center justify-center gap-2 bg-sidebar-accent text-sidebar-foreground text-xs font-semibold py-2.5 hover:bg-sidebar-accent-foreground/10 rounded-xl border border-sidebar-border transition">
              {darkMode ? <Sun size={14} /> : <Moon size={14} />} {darkMode ? 'লাইট মোড' : 'ডার্ক মোড'}
            </button>
            <button onClick={() => signOut(auth)} className="flex-1 flex items-center justify-center gap-2 text-destructive text-xs font-semibold py-2.5 hover:bg-destructive/10 rounded-xl border border-sidebar-border transition">
              <LogOut size={14} /> লগ আউট
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-foreground/60" onClick={() => setMobileMenuOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-[300px] bg-sidebar-background text-sidebar-foreground flex flex-col shadow-2xl border-r border-sidebar-border">
            <div className="p-5 flex items-center justify-between border-b border-sidebar-border/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center font-extrabold text-primary-foreground text-sm">BM</div>
                <h1 className="font-extrabold text-sidebar-foreground">Business Manager</h1>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="p-2 hover:bg-sidebar-accent rounded-lg">
                <X size={20} className="text-sidebar-foreground" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-2 overflow-y-auto">
              <p className="px-3 text-[11px] font-bold uppercase tracking-[0.22em] text-sidebar-foreground/55">মেনু</p>
              {NAV_ITEMS.map(item => {
                const isActive = activeTab === item.key;

                return (
                  <button
                    key={item.key}
                    onClick={() => handleNavClick(item.key)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all text-sm font-semibold ${
                      isActive
                        ? 'gradient-primary text-primary-foreground border-primary/30 shadow-lg shadow-primary/25'
                        : 'bg-sidebar-accent/85 text-sidebar-foreground border-sidebar-border hover:bg-sidebar-accent-foreground/10 hover:border-sidebar-primary/30'
                    }`}
                  >
                    <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                      isActive
                        ? 'bg-primary-foreground/15 text-primary-foreground'
                        : 'bg-sidebar-background/90 text-sidebar-foreground'
                    }`}>
                      <item.icon size={18} strokeWidth={isActive ? 2.4 : 2} />
                    </span>
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
            <div className="p-4 border-t border-sidebar-border space-y-2 bg-sidebar-background">
              <button onClick={() => setDarkMode(!darkMode)} className="w-full flex items-center justify-center gap-2 bg-sidebar-accent text-sidebar-foreground text-sm font-semibold py-3 hover:bg-sidebar-accent-foreground/10 rounded-xl border border-sidebar-border transition">
                {darkMode ? <Sun size={16} /> : <Moon size={16} />} {darkMode ? 'লাইট মোড' : 'ডার্ক মোড'}
              </button>
              <button onClick={() => signOut(auth)} className="w-full flex items-center justify-center gap-2 text-destructive text-sm font-semibold py-3 hover:bg-destructive/10 rounded-xl border border-sidebar-border transition">
                <LogOut size={16} /> লগ আউট
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 bg-card/80 glass border-b border-border flex items-center justify-between px-4 md:px-6 z-10">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileMenuOpen(true)} className="md:hidden p-2 hover:bg-secondary rounded-lg">
              <Menu size={20} />
            </button>
            <h2 className="font-extrabold text-base text-foreground tracking-tight">{tabLabels[activeTab]}</h2>
          </div>
          <div className="text-[11px] font-medium text-muted-foreground bg-secondary/80 px-3 py-1.5 rounded-lg border border-border flex items-center gap-1.5 max-w-[200px] truncate">
            <MapPin size={12} className="text-primary shrink-0" /> <span className="truncate">{shopProfile.address || 'ঠিকানা সেট করুন'}</span>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-6 custom-scrollbar">
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

export default Index;
