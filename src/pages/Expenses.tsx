import React, { useState } from 'react';
import { CreditCard, Edit2, Trash2, X, Save } from 'lucide-react';
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db, DB_VERSION } from '@/lib/firebase';
import { safeParse, formatCurrency } from '@/lib/helpers';
import { EXPENSE_CATEGORIES } from '@/lib/constants';
import type { Expense } from '@/lib/types';
import type { User } from 'firebase/auth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props { expenses: Expense[]; user: User; }

const ExpenseView: React.FC<Props> = ({ expenses, user }) => {
  const [form, setForm] = useState({ title: '', amount: '', category: 'Marketing', date: new Date().toISOString().split('T')[0] });
  const [editItem, setEditItem] = useState<Expense | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await addDoc(collection(db, 'artifacts', DB_VERSION, 'users', user.uid, 'expenses'), {
      title: form.title, amount: safeParse(form.amount), category: form.category, date: form.date, createdAt: serverTimestamp()
    });
    setForm({ title: '', amount: '', category: 'Marketing', date: new Date().toISOString().split('T')[0] });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem) return;
    await updateDoc(doc(db, 'artifacts', DB_VERSION, 'users', user.uid, 'expenses', editItem.id), {
      title: editItem.title, amount: safeParse(editItem.amount), category: editItem.category, date: (editItem as any).date || ''
    });
    setEditItem(null);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('ডিলেট করবেন?')) await deleteDoc(doc(db, 'artifacts', DB_VERSION, 'users', user.uid, 'expenses', id));
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card className="shadow-sm border border-border">
        <CardContent className="p-5">
          <h3 className="font-extrabold mb-5 flex items-center gap-2 text-base">
            <div className="w-8 h-8 gradient-danger rounded-lg flex items-center justify-center"><CreditCard size={16} className="text-white" /></div>
            খরচ এন্ট্রি
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5"><Label className="text-xs font-semibold text-muted-foreground">বিবরণ</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required placeholder="কিসের খরচ?" className="h-10" /></div>
            <div className="space-y-1.5"><Label className="text-xs font-semibold text-muted-foreground">টাকা</Label><Input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required placeholder="0" className="h-10" /></div>
            <div className="space-y-1.5"><Label className="text-xs font-semibold text-muted-foreground">তারিখ</Label><Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="h-10" /></div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">খাত</Label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-sm">
                {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <Button type="submit" className="w-full h-11 font-bold gradient-danger border-0 text-white shadow-lg mt-1"><Save size={16} /> খরচ সেভ করুন</Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h3 className="font-extrabold text-base text-foreground">খরচের তালিকা</h3>
        <div className="space-y-2 max-h-[550px] overflow-y-auto pr-1 custom-scrollbar">
          {expenses.map(ex => (
            <div key={ex.id} className="bg-card p-4 rounded-xl border border-border flex justify-between items-center shadow-sm hover:border-primary/20 transition group">
              <div>
                <p className="font-bold text-foreground text-sm">{ex.title}</p>
                <div className="flex gap-2 items-center mt-0.5">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">{ex.category}</span>
                  {(ex as any).date && <span className="text-[10px] text-muted-foreground">• {(ex as any).date}</span>}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-destructive font-extrabold text-base">-{formatCurrency(ex.amount)}</span>
                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition">
                  <button onClick={() => setEditItem(ex)} className="p-1.5 hover:bg-primary/10 rounded-lg text-primary"><Edit2 size={14} /></button>
                  <button onClick={() => handleDelete(ex.id)} className="p-1.5 hover:bg-destructive/10 rounded-lg text-destructive"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {editItem && (
        <div className="fixed inset-0 bg-foreground/60 glass z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-sm shadow-2xl border border-border">
            <CardContent className="p-6">
              <div className="flex justify-between mb-5"><h3 className="font-bold text-base">এডিট খরচ</h3><button onClick={() => setEditItem(null)} className="p-1.5 hover:bg-secondary rounded-lg"><X size={18} /></button></div>
              <form onSubmit={handleUpdate} className="space-y-4">
                <div className="space-y-1.5"><Label className="text-xs font-semibold text-muted-foreground">বিবরণ</Label><Input value={editItem.title} onChange={e => setEditItem({ ...editItem, title: e.target.value })} className="h-10" /></div>
                <div className="space-y-1.5"><Label className="text-xs font-semibold text-muted-foreground">টাকা</Label><Input type="number" value={String(editItem.amount)} onChange={e => setEditItem({ ...editItem, amount: safeParse(e.target.value) })} className="h-10" /></div>
                <div className="space-y-1.5"><Label className="text-xs font-semibold text-muted-foreground">তারিখ</Label><Input type="date" value={(editItem as any).date || ''} onChange={e => setEditItem({ ...editItem, date: e.target.value } as any)} className="h-10" /></div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">খাত</Label>
                  <select value={editItem.category} onChange={e => setEditItem({ ...editItem, category: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-sm">
                    {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <Button type="submit" className="w-full h-10 font-bold gradient-primary border-0 shadow-lg shadow-primary/20">আপডেট করুন</Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ExpenseView;
