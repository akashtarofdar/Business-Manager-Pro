import React, { useState, useEffect } from 'react';
import { Printer, Trash2, X, Edit2, Truck, Search } from 'lucide-react';
import { updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db, DB_VERSION } from '@/lib/firebase';
import { safeParse, formatCurrency } from '@/lib/helpers';
import { SIZES, PAYMENT_METHODS } from '@/lib/constants';
import type { Order, ShopProfile } from '@/lib/types';
import type { User } from 'firebase/auth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import InvoiceModal from '@/components/InvoiceModal';
import CourierBookingModal from '@/components/CourierBookingModal';

interface Props { orders: Order[]; user: User; shopProfile: ShopProfile; }

const OrderListView: React.FC<Props> = ({ orders, user, shopProfile }) => {
  const [invoice, setInvoice] = useState<Order | null>(null);
  const [editPayment, setEditPayment] = useState<Order | null>(null);
  const [paymentAmt, setPaymentAmt] = useState('');
  const [updatedDelivery, setUpdatedDelivery] = useState('');
  const [editOrder, setEditOrder] = useState<Order | null>(null);
  const [editItems, setEditItems] = useState<any[]>([]);
  const [editCustomer, setEditCustomer] = useState({ name: '', phone: '', address: '', note: '' });
  const [courierOrder, setCourierOrder] = useState<Order | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => { if (editPayment) setUpdatedDelivery(String(editPayment.deliveryCharge)); }, [editPayment]);

  useEffect(() => {
    if (editOrder) {
      setEditItems(editOrder.items?.map(i => ({ ...i })) || []);
      setEditCustomer({ name: editOrder.customerName, phone: editOrder.phone, address: editOrder.address, note: editOrder.note || '' });
    }
  }, [editOrder]);

  const handleUpdatePayment = async () => {
    if (!editPayment) return;
    const amt = safeParse(paymentAmt);
    const del = safeParse(updatedDelivery);
    const newTotal = safeParse(editPayment.subTotal) + del;
    const newPaid = safeParse(editPayment.paidAmount) + amt;
    const newDue = newTotal - newPaid;
    await updateDoc(doc(db, 'artifacts', DB_VERSION, 'users', user.uid, 'orders', editPayment.id), {
      deliveryCharge: del, totalAmount: newTotal, paidAmount: newPaid, dueAmount: newDue, status: newDue <= 0 ? 'Paid' : 'Due'
    });
    setEditPayment(null); setPaymentAmt('');
  };

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

  const handleDeleteOrder = async (id: string) => {
    if (window.confirm("আপনি কি নিশ্চিত এই অর্ডারটি ডিলিট করতে চান?")) {
      await deleteDoc(doc(db, 'artifacts', DB_VERSION, 'users', user.uid, 'orders', id));
    }
  };

  const hasPathaoCredentials = !!(shopProfile.pathaoCredentials?.clientId && shopProfile.pathaoCredentials?.clientSecret);

  const filteredOrders = orders.filter(o =>
    o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.phone.includes(searchTerm) ||
    o.id.includes(searchTerm)
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h2 className="text-xl font-extrabold text-foreground">অর্ডার রেকর্ড</h2>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 text-muted-foreground" size={16} />
          <Input placeholder="নাম, ফোন বা মেমো খুঁজুন..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 h-9 text-xs" />
        </div>
      </div>

      {/* Orders as Cards on mobile, Table on desktop */}
      <div className="hidden md:block">
        <Card className="overflow-hidden shadow-sm border border-border">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/60">
                  <th className="px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">মেমো</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">কাস্টমার</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-right">বিল</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-right">বকেয়া</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-center">স্ট্যাটাস</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-center">কুরিয়ার</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-right">একশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filteredOrders.map(o => (
                  <tr key={o.id} className="hover:bg-secondary/30 transition group">
                    <td className="px-4 py-3">
                      <span className="bg-secondary text-muted-foreground px-2 py-0.5 rounded-md text-[10px] font-bold font-mono">#{o.id.slice(-6).toUpperCase()}</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-foreground text-[13px]">{o.customerName}</p>
                      <p className="text-[11px] text-muted-foreground">{o.phone}</p>
                    </td>
                    <td className="px-4 py-3 text-right font-extrabold text-foreground text-[13px]">{formatCurrency(o.totalAmount)}</td>
                    <td className="px-4 py-3 text-right font-extrabold text-destructive text-[13px]">{formatCurrency(o.dueAmount)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold ${o.status === 'Paid' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-orange-500/10 text-orange-600'}`}>
                        {o.status === 'Paid' ? '✓ Paid' : '⏳ Due'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {o.trackingId ? (
                        <div>
                          <span className="bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full font-bold text-[10px]">✅ Booked</span>
                          <p className="text-[10px] text-primary font-bold mt-0.5 font-mono">{o.trackingId}</p>
                        </div>
                      ) : hasPathaoCredentials ? (
                        <button onClick={() => setCourierOrder(o)} className="text-primary hover:bg-primary/10 p-1.5 rounded-lg transition" title="কুরিয়ার বুক">
                          <Truck size={16} />
                        </button>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-1 justify-end items-center opacity-60 group-hover:opacity-100 transition">
                        <button onClick={() => setInvoice(o)} className="text-primary hover:bg-primary/10 p-1.5 rounded-lg transition" title="ইনভয়েস"><Printer size={15} /></button>
                        <button onClick={() => setEditOrder(o)} className="text-amber-600 hover:bg-amber-500/10 p-1.5 rounded-lg transition" title="এডিট"><Edit2 size={15} /></button>
                        <button onClick={() => setEditPayment(o)} className="gradient-primary text-white px-2.5 py-1 rounded-lg text-[11px] font-bold shadow-sm">আপডেট</button>
                        <button onClick={() => handleDeleteOrder(o.id)} className="text-destructive hover:bg-destructive/10 p-1.5 rounded-lg transition" title="ডিলিট"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {filteredOrders.map(o => (
          <Card key={o.id} className="shadow-sm border border-border">
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="font-bold text-foreground">{o.customerName}</p>
                  <p className="text-[11px] text-muted-foreground">{o.phone} • <span className="font-mono">#{o.id.slice(-6).toUpperCase()}</span></p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${o.status === 'Paid' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-orange-500/10 text-orange-600'}`}>
                  {o.status}
                </span>
              </div>
              <div className="flex justify-between items-center mb-3">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">বিল</p>
                  <p className="font-extrabold text-foreground">{formatCurrency(o.totalAmount)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-muted-foreground uppercase">বকেয়া</p>
                  <p className="font-extrabold text-destructive">{formatCurrency(o.dueAmount)}</p>
                </div>
              </div>
              <div className="flex gap-1.5 pt-3 border-t border-border">
                <button onClick={() => setInvoice(o)} className="text-primary hover:bg-primary/10 p-1.5 rounded-lg"><Printer size={16} /></button>
                <button onClick={() => setEditOrder(o)} className="text-amber-600 hover:bg-amber-500/10 p-1.5 rounded-lg"><Edit2 size={16} /></button>
                {hasPathaoCredentials && !o.trackingId && <button onClick={() => setCourierOrder(o)} className="text-primary hover:bg-primary/10 p-1.5 rounded-lg"><Truck size={16} /></button>}
                <button onClick={() => setEditPayment(o)} className="gradient-primary text-white px-3 py-1 rounded-lg text-[11px] font-bold ml-auto">আপডেট</button>
                <button onClick={() => handleDeleteOrder(o.id)} className="text-destructive hover:bg-destructive/10 p-1.5 rounded-lg"><Trash2 size={16} /></button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredOrders.length === 0 && (
        <div className="text-center py-16">
          <div className="w-14 h-14 bg-secondary rounded-2xl flex items-center justify-center mx-auto mb-4"><Printer size={24} className="text-muted-foreground" /></div>
          <p className="text-muted-foreground font-medium">কোনো অর্ডার পাওয়া যায়নি</p>
        </div>
      )}

      {invoice && <InvoiceModal order={invoice} shopProfile={shopProfile} onClose={() => setInvoice(null)} />}

      {courierOrder && hasPathaoCredentials && (
        <CourierBookingModal order={courierOrder} user={user} credentials={shopProfile.pathaoCredentials!} onClose={() => setCourierOrder(null)} onSuccess={() => setCourierOrder(null)} />
      )}

      {/* Payment Update Modal */}
      {editPayment && (
        <div className="fixed inset-0 bg-foreground/60 glass z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-sm shadow-2xl border border-border">
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-5">
                <h3 className="font-bold text-base">পেমেন্ট আপডেট</h3>
                <button onClick={() => setEditPayment(null)} className="p-1.5 hover:bg-secondary rounded-lg"><X size={18} /></button>
              </div>
              <div className="space-y-4">
                <div className="p-3.5 gradient-primary rounded-xl text-white">
                  <p className="text-[10px] font-bold uppercase opacity-70 mb-0.5">বর্তমান বকেয়া</p>
                  <p className="text-2xl font-extrabold">{formatCurrency(editPayment.dueAmount)}</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">ডেলিভারি চার্জ</Label>
                  <Input type="number" value={updatedDelivery} onChange={e => setUpdatedDelivery(e.target.value)} className="h-10" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">জমা পরিমাণ</Label>
                  <Input type="number" value={paymentAmt} onChange={e => setPaymentAmt(e.target.value)} autoFocus placeholder="টাকা লিখুন" className="h-10" />
                </div>
                <Button onClick={handleUpdatePayment} className="w-full h-11 font-bold gradient-primary border-0 shadow-lg shadow-primary/20">জমা নিশ্চিত করুন</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Order Modal */}
      {editOrder && (
        <div className="fixed inset-0 bg-foreground/60 glass z-50 flex items-center justify-center p-4 overflow-y-auto">
          <Card className="w-full max-w-2xl shadow-2xl my-8 border border-border">
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-5">
                <h3 className="font-bold text-base">অর্ডার এডিট — <span className="font-mono text-primary">#{editOrder.id.slice(-6).toUpperCase()}</span></h3>
                <button onClick={() => setEditOrder(null)} className="p-1.5 hover:bg-secondary rounded-lg"><X size={18} /></button>
              </div>
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label className="text-xs font-semibold text-muted-foreground">কাস্টমার নাম</Label><Input value={editCustomer.name} onChange={e => setEditCustomer({ ...editCustomer, name: e.target.value })} className="h-10" /></div>
                  <div className="space-y-1.5"><Label className="text-xs font-semibold text-muted-foreground">ফোন</Label><Input value={editCustomer.phone} onChange={e => setEditCustomer({ ...editCustomer, phone: e.target.value })} className="h-10" /></div>
                </div>
                <div className="space-y-1.5"><Label className="text-xs font-semibold text-muted-foreground">ঠিকানা</Label><Input value={editCustomer.address} onChange={e => setEditCustomer({ ...editCustomer, address: e.target.value })} className="h-10" /></div>
                <div className="space-y-1.5"><Label className="text-xs font-semibold text-muted-foreground">নোট</Label><textarea value={editCustomer.note} onChange={e => setEditCustomer({ ...editCustomer, note: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring" rows={2} /></div>
                <div>
                  <Label className="mb-2.5 block text-xs font-semibold text-muted-foreground">আইটেম সমূহ</Label>
                  <div className="space-y-2">
                    {editItems.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-3 bg-secondary/50 rounded-xl border border-border">
                        <div className="flex-1"><p className="text-sm font-bold text-foreground">{item.name}</p></div>
                        <select value={item.size} onChange={e => { const n = [...editItems]; n[idx].size = e.target.value; setEditItems(n); }} className="text-[11px] border border-input px-2 py-1 rounded-lg bg-background font-medium">
                          {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <Input type="number" value={item.qty} onChange={e => { const n = [...editItems]; n[idx].qty = parseInt(e.target.value) || 1; setEditItems(n); }} className="w-14 text-center h-8 text-xs" />
                        <Input type="number" value={item.sellPrice} onChange={e => { const n = [...editItems]; n[idx].sellPrice = safeParse(e.target.value); setEditItems(n); }} className="w-20 text-right h-8 text-xs" />
                        <button onClick={() => setEditItems(editItems.filter((_, i) => i !== idx))} className="p-1 text-destructive hover:bg-destructive/10 rounded-lg"><X size={14} /></button>
                      </div>
                    ))}
                  </div>
                </div>
                <Button onClick={handleSaveEditOrder} className="w-full h-11 font-bold gradient-primary border-0 shadow-lg shadow-primary/20">পরিবর্তন সেভ করুন</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default OrderListView;
