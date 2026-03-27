import React, { useState } from 'react';
import { Plus, Edit2, Trash2, X, Package, Search } from 'lucide-react';
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db, DB_VERSION } from '@/lib/firebase';
import { FABRIC_TYPES, NECK_TYPES } from '@/lib/constants';
import { safeParse, formatCurrency, resizeImage } from '@/lib/helpers';
import type { Product } from '@/lib/types';
import type { User } from 'firebase/auth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props { products: Product[]; user: User; }

const InventoryView: React.FC<Props> = ({ products, user }) => {
  const [showModal, setShowModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [docId, setDocId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', buyPrice: '', sellPrice: '', stock: '', fabric: FABRIC_TYPES[0], neck: NECK_TYPES[0], image: '' });
  const [searchTerm, setSearchTerm] = useState('');

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const resized = await resizeImage(file);
      setForm({ ...form, image: resized });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      name: form.name, buyPrice: safeParse(form.buyPrice), sellPrice: safeParse(form.sellPrice),
      stock: safeParse(form.stock), fabric: form.fabric, neck: form.neck, image: form.image || ''
    };
    if (isEdit && docId) await updateDoc(doc(db, 'artifacts', DB_VERSION, 'users', user.uid, 'products', docId), data);
    else await addDoc(collection(db, 'artifacts', DB_VERSION, 'users', user.uid, 'products'), { ...data, createdAt: serverTimestamp() });
    setShowModal(false); setIsEdit(false);
    setForm({ name: '', buyPrice: '', sellPrice: '', stock: '', fabric: FABRIC_TYPES[0], neck: NECK_TYPES[0], image: '' });
  };

  const handleEdit = (p: Product) => {
    setForm({ name: p.name, buyPrice: String(p.buyPrice), sellPrice: String(p.sellPrice), stock: String(p.stock), fabric: p.fabric, neck: p.neck, image: p.image || '' });
    setDocId(p.id); setIsEdit(true); setShowModal(true);
  };

  const filteredProducts = (products || []).filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h2 className="text-xl font-extrabold text-foreground">ইনভেন্টরি</h2>
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-52">
            <Search className="absolute left-3 top-2.5 text-muted-foreground" size={16} />
            <Input placeholder="পণ্য খুঁজুন..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 h-9 text-xs" />
          </div>
          <Button size="sm" onClick={() => { setShowModal(true); setIsEdit(false); setForm({ name: '', buyPrice: '', sellPrice: '', stock: '', fabric: FABRIC_TYPES[0], neck: NECK_TYPES[0], image: '' }); }} className="gradient-primary border-0 shadow-md shadow-primary/20 h-9 text-xs font-bold">
            <Plus size={15} /> নতুন পণ্য
          </Button>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block">
        <Card className="overflow-hidden shadow-sm border border-border">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/60">
                <th className="px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">পণ্যের বিবরণ</th>
                <th className="px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">বৈশিষ্ট্য</th>
                <th className="px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-right">দাম (৳)</th>
                <th className="px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-center">স্টক</th>
                <th className="px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-right">একশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filteredProducts.map(p => (
                <tr key={p.id} className="hover:bg-secondary/30 transition group">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {p.image ? <img src={p.image} className="w-10 h-10 rounded-xl object-cover border border-border" /> : <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center"><Package size={18} className="text-muted-foreground" /></div>}
                      <p className="font-semibold text-foreground text-[13px]">{p.name}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5 flex-wrap">
                      <span className="px-2 py-0.5 bg-primary/8 text-primary rounded-md text-[10px] font-bold">{p.fabric}</span>
                      <span className="px-2 py-0.5 bg-secondary text-muted-foreground rounded-md text-[10px] font-bold">{p.neck}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <p className="text-[11px] text-muted-foreground">কেনা: {formatCurrency(p.buyPrice)}</p>
                    <p className="font-extrabold text-primary text-[13px]">{formatCurrency(p.sellPrice)}</p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex px-3 py-0.5 rounded-full font-bold text-[11px] ${parseInt(String(p.stock)) < 5 ? 'bg-destructive/10 text-destructive' : 'bg-emerald-500/10 text-emerald-600'}`}>{p.stock}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1 opacity-60 group-hover:opacity-100 transition">
                      <button onClick={() => handleEdit(p)} className="p-1.5 hover:bg-secondary rounded-lg text-muted-foreground hover:text-primary transition"><Edit2 size={15} /></button>
                      <button onClick={() => deleteDoc(doc(db, 'artifacts', DB_VERSION, 'users', user.uid, 'products', p.id))} className="p-1.5 hover:bg-destructive/10 rounded-lg text-muted-foreground hover:text-destructive transition"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {filteredProducts.map(p => (
          <Card key={p.id} className="shadow-sm border border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                {p.image ? <img src={p.image} className="w-12 h-12 rounded-xl object-cover border border-border" /> : <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center"><Package size={20} className="text-muted-foreground" /></div>}
                <div className="flex-1">
                  <p className="font-bold text-foreground">{p.name}</p>
                  <div className="flex gap-1.5 mt-1">
                    <span className="px-2 py-0.5 bg-primary/8 text-primary rounded-md text-[10px] font-bold">{p.fabric}</span>
                    <span className="px-2 py-0.5 bg-secondary text-muted-foreground rounded-md text-[10px] font-bold">{p.neck}</span>
                  </div>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] ${parseInt(String(p.stock)) < 5 ? 'bg-destructive/10 text-destructive' : 'bg-emerald-500/10 text-emerald-600'}`}>{p.stock}</span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-border">
                <div>
                  <p className="text-[10px] text-muted-foreground">কেনা: {formatCurrency(p.buyPrice)}</p>
                  <p className="font-extrabold text-primary">{formatCurrency(p.sellPrice)}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleEdit(p)} className="p-2 hover:bg-secondary rounded-lg text-muted-foreground"><Edit2 size={16} /></button>
                  <button onClick={() => deleteDoc(doc(db, 'artifacts', DB_VERSION, 'users', user.uid, 'products', p.id))} className="p-2 hover:bg-destructive/10 rounded-lg text-destructive"><Trash2 size={16} /></button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-16">
          <div className="w-14 h-14 bg-secondary rounded-2xl flex items-center justify-center mx-auto mb-4"><Package size={24} className="text-muted-foreground" /></div>
          <p className="text-muted-foreground font-medium">কোনো পণ্য পাওয়া যায়নি</p>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-foreground/60 glass z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg shadow-2xl border border-border">
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-5">
                <h3 className="font-extrabold text-lg text-foreground">{isEdit ? 'পণ্য আপডেট' : 'নতুন পণ্য'}</h3>
                <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-secondary rounded-lg"><X size={18} /></button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5"><Label className="text-xs font-semibold text-muted-foreground">নাম</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required className="h-10" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label className="text-xs font-semibold text-muted-foreground">কাপড়</Label><select value={form.fabric} onChange={e => setForm({ ...form, fabric: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-sm">{FABRIC_TYPES.map(f => <option key={f} value={f}>{f}</option>)}</select></div>
                  <div className="space-y-1.5"><Label className="text-xs font-semibold text-muted-foreground">গলা</Label><select value={form.neck} onChange={e => setForm({ ...form, neck: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-sm">{NECK_TYPES.map(n => <option key={n} value={n}>{n}</option>)}</select></div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5"><Label className="text-xs font-semibold text-muted-foreground">কেনা</Label><Input type="number" value={form.buyPrice} onChange={e => setForm({ ...form, buyPrice: e.target.value })} className="h-10" /></div>
                  <div className="space-y-1.5"><Label className="text-xs font-semibold text-muted-foreground">বেচা</Label><Input type="number" value={form.sellPrice} onChange={e => setForm({ ...form, sellPrice: e.target.value })} className="h-10" /></div>
                  <div className="space-y-1.5"><Label className="text-xs font-semibold text-muted-foreground">স্টক</Label><Input type="number" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} className="h-10" /></div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">পণ্যের ছবি</Label>
                  <div className="flex items-center gap-3">
                    {form.image && <img src={form.image} className="w-14 h-14 rounded-xl object-cover border border-border" />}
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="text-xs text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20" />
                  </div>
                </div>
                <Button type="submit" className="w-full h-11 font-bold gradient-primary border-0 shadow-lg shadow-primary/20 mt-2">সংরক্ষণ করুন</Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default InventoryView;
