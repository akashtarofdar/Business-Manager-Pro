import React, { useState, useMemo } from 'react';
import { Truck, Trash2, Save } from 'lucide-react';
import { collection, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db, DB_VERSION } from '@/lib/firebase';
import { safeParse, formatCurrency } from '@/lib/helpers';
import type { Order, SupplierPayment } from '@/lib/types';
import type { User } from 'firebase/auth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props { orders: Order[]; supplierPayments: SupplierPayment[]; user: User; }

const SupplierView: React.FC<Props> = ({ orders, supplierPayments, user }) => {
  const [form, setForm] = useState({ amount: '', date: '', notes: '' });

  const totalSoldCost = useMemo(() => (orders || []).reduce((sum, o) => sum + (o.items?.reduce((s, i) => s + (safeParse(i.buyPrice) * safeParse(i.qty)), 0) || 0), 0), [orders]);
  const totalPaid = useMemo(() => (supplierPayments || []).reduce((sum, p) => sum + safeParse(p.amount), 0), [supplierPayments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await addDoc(collection(db, 'artifacts', DB_VERSION, 'users', user.uid, 'supplier_payments'), {
      amount: parseFloat(form.amount), date: form.date, notes: form.notes, createdAt: serverTimestamp()
    });
    setForm({ amount: '', date: '', notes: '' });
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("ডিলেট করবেন?")) await deleteDoc(doc(db, 'artifacts', DB_VERSION, 'users', user.uid, 'supplier_payments', id));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <div className="gradient-primary rounded-2xl p-5 text-white shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 rounded-full bg-white/10 -translate-y-5 translate-x-5" />
            <p className="text-white/60 text-[10px] font-bold uppercase tracking-wider mb-1">কেনা দাম (মোট)</p>
            <h3 className="text-xl font-extrabold relative z-10">{formatCurrency(totalSoldCost)}</h3>
          </div>
          <div className="gradient-warning rounded-2xl p-5 text-white shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 rounded-full bg-white/10 -translate-y-5 translate-x-5" />
            <p className="text-white/60 text-[10px] font-bold uppercase tracking-wider mb-1">সাপ্লায়ার বকেয়া</p>
            <h3 className="text-xl font-extrabold relative z-10">{formatCurrency(totalSoldCost - totalPaid)}</h3>
          </div>
        </div>
        <Card className="shadow-sm border border-border">
          <CardContent className="p-5">
            <h3 className="font-extrabold text-base mb-5 flex items-center gap-2">
              <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center"><Truck size={16} className="text-white" /></div>
              সাপ্লায়ার পেমেন্ট
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5"><Label className="text-xs font-semibold text-muted-foreground">টাকার পরিমাণ</Label><Input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required placeholder="0.00" className="h-10" /></div>
              <div className="space-y-1.5"><Label className="text-xs font-semibold text-muted-foreground">পরিশোধের তারিখ</Label><Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required className="h-10" /></div>
              <div className="space-y-1.5"><Label className="text-xs font-semibold text-muted-foreground">নোট</Label><textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="বিবরণ..." className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring" rows={3} /></div>
              <Button type="submit" className="w-full h-11 font-bold gradient-primary border-0 shadow-lg shadow-primary/20"><Save size={16} /> পেমেন্ট সেভ</Button>
            </form>
          </CardContent>
        </Card>
      </div>
      <div className="space-y-3">
        <h3 className="font-extrabold text-base">পেমেন্ট হিস্ট্রি</h3>
        <div className="space-y-2 max-h-[550px] overflow-y-auto pr-1 custom-scrollbar">
          {supplierPayments.map(p => (
            <div key={p.id} className="bg-card p-4 rounded-xl border border-border flex justify-between items-center shadow-sm hover:border-primary/20 transition group">
              <div>
                <p className="font-bold text-foreground text-sm">{p.date}</p>
                <p className="text-[11px] text-muted-foreground">{p.notes || 'No notes'}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-emerald-600 font-extrabold text-base">{formatCurrency(p.amount)}</span>
                <button onClick={() => handleDelete(p.id)} className="p-1.5 hover:bg-destructive/10 rounded-lg text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SupplierView;
