import React, { useState } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, DB_VERSION } from '@/lib/firebase';
import { Store, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const AuthScreen = () => {
  const [view, setView] = useState<'login' | 'signup'>('login');
  const [formData, setFormData] = useState({ email: '', password: '', shopName: '', address: '', phone: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      await setDoc(doc(db, 'artifacts', DB_VERSION, 'users', userCredential.user.uid, 'settings', 'profile'), {
        shopName: formData.shopName, address: formData.address, phone: formData.phone, email: formData.email, createdAt: serverTimestamp()
      });
    } catch {
      setError("ইমেইলটি ইতিমধ্যে ব্যবহৃত হয়েছে বা পাসওয়ার্ড দুর্বল।");
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signInWithEmailAndPassword(auth, formData.email, formData.password);
    } catch {
      setError("ইমেইল বা পাসওয়ার্ড ভুল।");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full gradient-primary opacity-[0.06] blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full gradient-primary opacity-[0.04] blur-3xl" />
      </div>

      <div className="w-full max-w-[420px] relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 gradient-primary rounded-2xl flex items-center justify-center text-white mx-auto mb-5 shadow-xl shadow-primary/25">
            <Store size={32} />
          </div>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight">Business Manager</h1>
          <p className="text-muted-foreground text-sm font-medium mt-1">প্রফেশনাল ডিজিটাল পার্টনার</p>
        </div>

        {/* Card */}
        <div className="bg-card rounded-2xl shadow-xl shadow-foreground/5 border border-border p-8">
          {error && (
            <div className="bg-destructive/8 text-destructive p-3.5 rounded-xl text-sm mb-6 flex items-center gap-2.5 border border-destructive/15">
              <AlertCircle size={16} className="shrink-0" /> <span className="text-[13px] font-medium">{error}</span>
            </div>
          )}

          {view === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">ইমেইল</Label>
                <Input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required placeholder="example@gmail.com" className="h-11" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">পাসওয়ার্ড</Label>
                <Input type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} required className="h-11" />
              </div>
              <Button type="submit" className="w-full h-12 text-sm font-bold gradient-primary border-0 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all" disabled={loading}>
                {loading ? <Loader2 size={18} className="animate-spin" /> : <>লগিন করুন <ArrowRight size={16} /></>}
              </Button>
              <div className="text-center pt-2">
                <button type="button" onClick={() => setView('signup')} className="text-primary font-semibold text-sm hover:underline underline-offset-4">
                  নতুন একাউন্ট খুলুন
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleCreateAccount} className="space-y-4">
              <div className="space-y-1.5"><Label className="text-xs font-semibold text-muted-foreground">দোকানের নাম</Label><Input value={formData.shopName} onChange={e => setFormData({ ...formData, shopName: e.target.value })} required className="h-11" /></div>
              <div className="space-y-1.5"><Label className="text-xs font-semibold text-muted-foreground">মোবাইল</Label><Input value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} required className="h-11" /></div>
              <div className="space-y-1.5"><Label className="text-xs font-semibold text-muted-foreground">ঠিকানা</Label><Input value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} required className="h-11" /></div>
              <div className="space-y-1.5"><Label className="text-xs font-semibold text-muted-foreground">ইমেইল</Label><Input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required className="h-11" /></div>
              <div className="space-y-1.5"><Label className="text-xs font-semibold text-muted-foreground">পাসওয়ার্ড</Label><Input type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} required placeholder="কমপক্ষে ৬ অক্ষর" className="h-11" /></div>
              <Button type="submit" className="w-full h-12 text-sm font-bold gradient-primary border-0 shadow-lg shadow-primary/25" disabled={loading}>
                {loading ? <Loader2 size={18} className="animate-spin" /> : 'রেজিস্ট্রেশন করুন'}
              </Button>
              <div className="text-center pt-1">
                <button type="button" onClick={() => setView('login')} className="text-muted-foreground font-semibold text-sm hover:text-foreground transition">লগিন করুন</button>
              </div>
            </form>
          )}
        </div>

        <p className="text-center text-[11px] text-muted-foreground/60 mt-6 font-medium">© {new Date().getFullYear()} Business Manager Pro</p>
      </div>
    </div>
  );
};

export default AuthScreen;
