import React, { useState, useMemo, useRef } from 'react';
import { ShoppingBag, Search, Plus, X, Banknote, Smartphone, Landmark, Package, ImagePlus } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, DB_VERSION } from '@/lib/firebase';
import { SIZES, PAYMENT_METHODS } from '@/lib/constants';
import { safeParse, formatCurrency } from '@/lib/helpers';
import type { Product, CartItem, ShopProfile } from '@/lib/types';
import type { User } from 'firebase/auth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import InvoiceModal from '@/components/InvoiceModal';

const paymentIcons: Record<string, React.ReactNode> = {
  Cash: <Banknote size={14} />, Bkash: <Smartphone size={14} />, Nagad: <Smartphone size={14} />,
  Rocket: <Smartphone size={14} />, Bank: <Landmark size={14} />
};

interface Props { products: Product[]; user: User; shopProfile: ShopProfile; }

const POSView: React.FC<Props> = ({ products, user, shopProfile }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customer, setCustomer] = useState({ name: '', phone: '', address: '', deliveryCharge: '0', advance: '0' });
  const [filter, setFilter] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [invoiceOrder, setInvoiceOrder] = useState<any>(null);
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [orderNote, setOrderNote] = useState('');

  const addToCart = (p: Product) => {
    const exist = cart.find(i => i.id === p.id);
    if (exist) setCart(cart.map(i => i.id === p.id ? { ...i, qty: i.qty + 1 } : i));
    else setCart([...cart, { ...p, qty: 1, size: 'Mixed' }]);
  };

  const addCustomItem = () => {
    const name = prompt("পণ্যের নাম:");
    const price = prompt("দাম:");
    if (name && price) setCart([...cart, { id: String(Date.now()), name, sellPrice: safeParse(price), buyPrice: 0, qty: 1, size: 'Mixed', stock: 0, fabric: '', neck: '' }]);
  };

  const removeFromCart = (id: string) => setCart(cart.filter(i => i.id !== id));
  const updateQty = (id: string, val: string) => setCart(cart.map(i => i.id === id ? { ...i, qty: Math.max(1, parseInt(val) || 0) } : i));
  const incrementQty = (id: string, d: number) => setCart(cart.map(i => i.id === id ? { ...i, qty: Math.max(1, i.qty + d) } : i));
  const updateSize = (id: string, s: string) => setCart(cart.map(i => i.id === id ? { ...i, size: s } : i));
  const updatePrice = (id: string, p: string) => setCart(cart.map(i => i.id === id ? { ...i, sellPrice: safeParse(p) } : i));

  const handleDesignImage = (id: string, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const max = 300;
        let w = img.width, h = img.height;
        if (w > max || h > max) { const r = Math.min(max / w, max / h); w *= r; h *= r; }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d')?.drawImage(img, 0, 0, w, h);
        const base64 = canvas.toDataURL('image/jpeg', 0.7);
        setCart(prev => prev.map(i => i.id === id ? { ...i, designImage: base64 } : i));
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const financials = useMemo(() => {
    const subTotal = cart.reduce((s, i) => s + (safeParse(i.sellPrice) * i.qty), 0);
    const total = subTotal + safeParse(customer.deliveryCharge);
    const due = total - safeParse(customer.advance);
    return { subTotal, total, due };
  }, [cart, customer]);

  const handleOrder = async () => {
    if (!cart.length || !customer.name || !customer.phone) return alert("কাস্টমার তথ্য দিন");
    const subTotal = cart.reduce((s, i) => s + (safeParse(i.sellPrice) * i.qty), 0);
    const total = subTotal + safeParse(customer.deliveryCharge);
    const due = total - safeParse(customer.advance);
    const orderData = {
      customerName: customer.name, phone: customer.phone, address: customer.address,
      items: cart.map(i => ({ id: i.id, name: i.name, sellPrice: i.sellPrice, buyPrice: i.buyPrice, qty: i.qty, size: i.size, image: i.image || '', designImage: i.designImage || '' })),
      subTotal, deliveryCharge: safeParse(customer.deliveryCharge), totalAmount: total,
      paidAmount: safeParse(customer.advance), dueAmount: due,
      status: due > 0 ? 'Due' : 'Paid', lastPaymentMethod: paymentMethod,
      note: orderNote, orderDate, createdAt: serverTimestamp()
    };
    const ref = await addDoc(collection(db, 'artifacts', DB_VERSION, 'users', user.uid, 'orders'), orderData);
    setInvoiceOrder({ ...orderData, id: ref.id, createdAt: new Date() });
    setCart([]); setCustomer({ name: '', phone: '', address: '', deliveryCharge: '0', advance: '0' });
    setOrderNote('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* Product Grid */}
      <div className="lg:col-span-2 space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 text-muted-foreground" size={16} />
            <Input placeholder="পণ্য খুঁজুন..." className="pl-9 h-9 text-xs bg-card" value={filter} onChange={e => setFilter(e.target.value)} />
          </div>
          <Button size="sm" variant="outline" onClick={addCustomItem} className="h-9 text-xs font-bold"><Plus size={15} /> কাস্টম</Button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 overflow-y-auto custom-scrollbar" style={{ maxHeight: 'calc(100vh - 180px)' }}>
          {products.filter(p => p.name.toLowerCase().includes(filter.toLowerCase())).map(p => (
            <div key={p.id} onClick={() => addToCart(p)} className="bg-card p-3.5 rounded-xl border border-border cursor-pointer hover:shadow-lg hover:border-primary/30 transition-all group relative overflow-hidden">
              {p.image && <img src={p.image} className="w-full h-20 object-cover rounded-lg mb-2.5" />}
              <h4 className="font-bold text-[13px] mb-1.5 text-foreground leading-tight">{p.name}</h4>
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">{p.fabric}</p>
                  <p className="text-[9px] text-muted-foreground font-bold">Stock: {p.stock}</p>
                </div>
                <p className="text-primary font-extrabold text-base">{formatCurrency(p.sellPrice)}</p>
              </div>
              <div className="absolute top-0 right-0 p-1.5 gradient-primary rounded-bl-xl opacity-0 group-hover:opacity-100 transition"><Plus size={14} className="text-white" /></div>
            </div>
          ))}
        </div>
      </div>

      {/* Order Panel */}
      <Card className="flex flex-col shadow-lg border border-border h-fit sticky top-4">
        <CardContent className="p-4 space-y-4">
          <h3 className="font-extrabold text-sm border-b border-border pb-3 flex items-center gap-2 text-foreground">
            <div className="w-7 h-7 gradient-primary rounded-lg flex items-center justify-center"><ShoppingBag size={14} className="text-white" /></div>
            অর্ডার ({cart.length})
          </h3>

          {/* Cart Items */}
          <div className="space-y-2 flex-1 overflow-y-auto custom-scrollbar max-h-[300px]">
            {cart.map(i => (
              <div key={i.id} className="bg-secondary/50 p-2.5 rounded-xl border border-border relative group hover:border-primary/20 transition">
                <div className="flex justify-between text-xs mb-1.5">
                  <div className="flex items-center gap-2">
                    {i.image && <img src={i.image} className="w-7 h-7 rounded object-cover" />}
                    <strong className="text-[12px]">{i.name}</strong>
                  </div>
                  <button onClick={() => removeFromCart(i.id)} className="text-destructive/50 hover:text-destructive"><X size={13} /></button>
                </div>
                {/* Design Image Upload */}
                <div className="flex items-center gap-2 mb-1.5">
                  {i.designImage ? (
                    <div className="relative">
                      <img src={i.designImage} className="w-10 h-10 rounded-lg object-cover border border-border" />
                      <button onClick={() => setCart(cart.map(c => c.id === i.id ? { ...c, designImage: undefined } : c))} className="absolute -top-1 -right-1 bg-destructive text-white rounded-full w-3.5 h-3.5 flex items-center justify-center text-[7px]">✕</button>
                    </div>
                  ) : (
                    <label className="flex items-center gap-1 text-[9px] text-primary cursor-pointer border border-dashed border-primary/30 rounded-lg px-1.5 py-0.5 hover:bg-primary/5 transition">
                      <ImagePlus size={12} /> ডিজাইন
                      <input type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) handleDesignImage(i.id, e.target.files[0]); }} />
                    </label>
                  )}
                </div>
                <div className="flex justify-between items-center gap-1.5">
                  <select value={i.size} onChange={e => updateSize(i.id, e.target.value)} className="text-[9px] border border-input px-1.5 py-0.5 rounded-md font-bold bg-background">{SIZES.map(s => <option key={s} value={s}>{s}</option>)}</select>
                  <div className="flex items-center bg-card border border-input rounded-lg px-0.5 gap-0.5 h-6">
                    <button onClick={() => incrementQty(i.id, -1)} className="px-1.5 text-primary font-bold hover:bg-secondary h-full rounded-l text-xs">-</button>
                    <input type="number" value={i.qty} onChange={e => updateQty(i.id, e.target.value)} className="w-8 text-center text-[11px] font-bold outline-none border-x border-input h-full bg-background" />
                    <button onClick={() => incrementQty(i.id, 1)} className="px-1.5 text-primary font-bold hover:bg-secondary h-full rounded-r text-xs">+</button>
                  </div>
                  <input type="number" value={i.sellPrice} onChange={e => updatePrice(i.id, e.target.value)} className="w-14 text-right font-extrabold text-[11px] bg-transparent outline-none border-b border-dashed border-muted-foreground/30 focus:border-primary" />
                </div>
              </div>
            ))}
          </div>

          {/* Customer Info */}
          <div className="space-y-3 border-t border-border pt-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1"><Label className="text-[9px] font-bold text-muted-foreground uppercase">নাম</Label><Input placeholder="নাম" value={customer.name} onChange={e => setCustomer({ ...customer, name: e.target.value })} className="h-8 text-xs" /></div>
              <div className="space-y-1"><Label className="text-[9px] font-bold text-muted-foreground uppercase">মোবাইল</Label><Input placeholder="01XXXXXXXXX" value={customer.phone} onChange={e => setCustomer({ ...customer, phone: e.target.value })} className="h-8 text-xs" /></div>
            </div>
            <div className="space-y-1"><Label className="text-[9px] font-bold text-muted-foreground uppercase">ঠিকানা</Label><textarea placeholder="ঠিকানা" value={customer.address} onChange={e => setCustomer({ ...customer, address: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-input bg-background text-xs resize-none focus:outline-none focus:ring-2 focus:ring-ring" rows={2} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1"><Label className="text-[9px] font-bold text-muted-foreground uppercase">তারিখ</Label><Input type="date" value={orderDate} onChange={e => setOrderDate(e.target.value)} className="h-8 text-xs" /></div>
              <div className="space-y-1"><Label className="text-[9px] font-bold text-muted-foreground uppercase">নোট</Label><Input placeholder="নোট..." value={orderNote} onChange={e => setOrderNote(e.target.value)} className="h-8 text-xs" /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1"><Label className="text-[9px] font-bold text-muted-foreground uppercase">ডেলিভারি</Label><Input type="number" value={customer.deliveryCharge} onChange={e => setCustomer({ ...customer, deliveryCharge: e.target.value })} className="h-8 text-xs" /></div>
              <div className="space-y-1"><Label className="text-[9px] font-bold text-muted-foreground uppercase">অ্যাডভান্স</Label><Input type="number" value={customer.advance} onChange={e => setCustomer({ ...customer, advance: e.target.value })} className="h-8 text-xs" /></div>
            </div>

            {/* Payment Methods */}
            <div className="grid grid-cols-5 gap-1.5">
              {PAYMENT_METHODS.map(m => (
                <button key={m.id} onClick={() => setPaymentMethod(m.id)}
                  className={`p-1.5 text-[9px] font-bold border rounded-lg flex flex-col items-center gap-0.5 transition ${paymentMethod === m.id ? 'gradient-primary text-white border-transparent shadow-md' : 'border-input hover:bg-secondary text-muted-foreground'}`}>
                  {paymentIcons[m.id]}{m.label}
                </button>
              ))}
            </div>

            {/* Total & Confirm */}
            <div className="gradient-primary rounded-xl p-3.5 text-white">
              <div className="flex justify-between text-[11px] opacity-70 mb-0.5"><span>সাব-টোটাল</span><span>{formatCurrency(financials.subTotal)}</span></div>
              <div className="flex justify-between font-extrabold text-lg"><span>মোট বিল</span><span>{formatCurrency(financials.total)}</span></div>
              {financials.due > 0 && <div className="flex justify-between text-[11px] opacity-70 mt-0.5"><span>বকেয়া</span><span>{formatCurrency(financials.due)}</span></div>}
            </div>
            <Button onClick={handleOrder} className="w-full h-10 shadow-lg shadow-primary/20 font-bold gradient-primary border-0 text-sm">অর্ডার কনফার্ম</Button>
          </div>
        </CardContent>
      </Card>
      {invoiceOrder && <InvoiceModal order={invoiceOrder} shopProfile={shopProfile} onClose={() => setInvoiceOrder(null)} />}
    </div>
  );
};

export default POSView;
