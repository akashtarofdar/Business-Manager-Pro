import React, { useState, useMemo } from 'react';
import { Phone, Edit2, Trash2, X, Search } from 'lucide-react';
import { collection, query, where, getDocs, writeBatch, deleteDoc, doc } from 'firebase/firestore';
import { db, DB_VERSION } from '@/lib/firebase';
import { safeParse, formatCurrency } from '@/lib/helpers';
import type { Order } from '@/lib/types';
import type { User } from 'firebase/auth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props { orders: Order[]; user: User; }

const CustomerView: React.FC<Props> = ({ orders, user }) => {
  const [editingCustomer, setEditingCustomer] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', phone: '', address: '' });
  const [searchTerm, setSearchTerm] = useState('');

  const customers = useMemo(() => {
    const map: Record<string, { name: string; phone: string; address: string; totalOrders: number; totalSpent: number }> = {};
    orders.forEach(o => {
      if (!map[o.phone]) map[o.phone] = { name: o.customerName, phone: o.phone, address: o.address, totalOrders: 0, totalSpent: 0 };
      map[o.phone].totalOrders += 1;
      map[o.phone].totalSpent += safeParse(o.totalAmount);
    });
    return Object.values(map);
  }, [orders]);

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.phone.includes(searchTerm)
  );

  const handleEditStart = (c: any) => { setEditingCustomer(c.phone); setFormData({ name: c.name, phone: c.phone, address: c.address }); };

  const handleUpdateCustomer = async () => {
    if (!editingCustomer) return;
    const batch = writeBatch(db);
    const q = query(collection(db, 'artifacts', DB_VERSION, 'users', user.uid, 'orders'), where("phone", "==", editingCustomer));
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((d) => { batch.update(d.ref, { customerName: formData.name, phone: formData.phone, address: formData.address }); });
    await batch.commit();
    setEditingCustomer(null);
  };

  const handleDeleteCustomer = async (phone: string) => {
    if (window.confirm("সাবধান! এই কাস্টমারের সব অর্ডার ডিলিট হয়ে যাবে।")) {
      const customerOrders = orders.filter(o => o.phone === phone);
      for (const o of customerOrders) {
        await deleteDoc(doc(db, 'artifacts', DB_VERSION, 'users', user.uid, 'orders', o.id));
      }
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h2 className="text-xl font-extrabold text-foreground">কাস্টমার ডাটাবেজ</h2>
        <div className="relative w-full sm:w-60">
          <Search className="absolute left-3 top-2.5 text-muted-foreground" size={16} />
          <Input placeholder="নাম বা ফোন খুঁজুন..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 h-9 text-xs" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCustomers.map((c, i) => (
          <Card key={i} className="shadow-sm border border-border hover:border-primary/20 transition group relative">
            <CardContent className="p-5">
              <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                <button onClick={() => handleEditStart(c)} className="p-1.5 hover:bg-primary/10 rounded-lg text-muted-foreground hover:text-primary"><Edit2 size={14} /></button>
                <button onClick={() => handleDeleteCustomer(c.phone)} className="p-1.5 hover:bg-destructive/10 rounded-lg text-muted-foreground hover:text-destructive"><Trash2 size={14} /></button>
              </div>
              <div className="flex items-start justify-between mb-3">
                <div className="w-11 h-11 gradient-primary rounded-xl flex items-center justify-center text-white font-bold text-lg">{c.name.charAt(0)}</div>
                <span className="bg-primary/8 text-primary px-2.5 py-0.5 rounded-full text-[10px] font-bold">{c.totalOrders} Orders</span>
              </div>
              <h3 className="font-bold text-sm text-foreground mb-0.5">{c.name}</h3>
              <p className="text-[12px] text-muted-foreground flex items-center gap-1 mb-0.5"><Phone size={12} /> {c.phone}</p>
              <p className="text-[11px] text-muted-foreground truncate mb-3">{c.address}</p>
              <div className="pt-3 border-t border-border flex justify-between items-center">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Total Spent</span>
                <span className="text-base font-extrabold text-foreground">{formatCurrency(c.totalSpent)}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredCustomers.length === 0 && (
        <div className="text-center py-16">
          <div className="w-14 h-14 bg-secondary rounded-2xl flex items-center justify-center mx-auto mb-4"><Phone size={24} className="text-muted-foreground" /></div>
          <p className="text-muted-foreground font-medium">কোনো কাস্টমার পাওয়া যায়নি</p>
        </div>
      )}

      {editingCustomer && (
        <div className="fixed inset-0 bg-foreground/60 glass z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-2xl border border-border">
            <CardContent className="p-6">
              <div className="flex justify-between mb-5"><h3 className="font-bold text-base">এডিট কাস্টমার</h3><button onClick={() => setEditingCustomer(null)} className="p-1.5 hover:bg-secondary rounded-lg"><X size={18} /></button></div>
              <div className="space-y-4">
                <div className="space-y-1.5"><Label className="text-xs font-semibold text-muted-foreground">নাম</Label><Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="h-10" /></div>
                <div className="space-y-1.5"><Label className="text-xs font-semibold text-muted-foreground">ফোন</Label><Input value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="h-10" /></div>
                <div className="space-y-1.5"><Label className="text-xs font-semibold text-muted-foreground">ঠিকানা</Label><textarea value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring" rows={3} /></div>
                <Button onClick={handleUpdateCustomer} className="w-full h-10 font-bold gradient-primary border-0 shadow-lg shadow-primary/20">আপডেট করুন</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default CustomerView;
