import React, { useState, useEffect, useMemo } from 'react';
import { ShoppingBag, CreditCard, Eye, EyeOff, FileText, TrendingUp, Truck, CheckCircle, CalendarDays, AlertCircle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent } from '@/components/ui/card';
import { safeParse, formatCurrency, getDateString } from '@/lib/helpers';
import type { Order, Expense, SupplierPayment } from '@/lib/types';

interface Props {
  orders: Order[];
  expenses: Expense[];
  supplierPayments: SupplierPayment[];
}

const StatCard = ({ title, value, icon, gradient, onClick }: { title: string; value: string | number; icon: React.ReactNode; gradient: string; onClick?: () => void }) => (
  <div onClick={onClick} className={`relative overflow-hidden rounded-2xl p-5 text-white shadow-lg transition-all hover:shadow-xl hover:-translate-y-0.5 ${gradient} ${onClick ? 'cursor-pointer' : ''}`}>
    <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-white/10 -translate-y-6 translate-x-6" />
    <div className="relative z-10">
      <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mb-3">{icon}</div>
      <p className="text-white/70 text-[10px] font-bold uppercase tracking-wider mb-1">{title}</p>
      <h4 className="text-2xl font-extrabold leading-none tracking-tight">{value}</h4>
    </div>
  </div>
);

const DashboardView: React.FC<Props> = ({ orders, expenses, supplierPayments }) => {
  const [showProfit, setShowProfit] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [customRange, setCustomRange] = useState({ start: '', end: '' });

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showProfit) { timer = setTimeout(() => setShowProfit(false), 5000); }
    return () => clearTimeout(timer);
  }, [showProfit]);

  const filteredData = useMemo(() => {
    const now = new Date();
    let startDate: Date | null = null;
    let endDate: Date | null = null;

    if (filterType === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    } else if (filterType === 'week') {
      startDate = new Date(now); startDate.setDate(now.getDate() - 7);
    } else if (filterType === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (filterType === 'year') {
      startDate = new Date(now.getFullYear(), 0, 1);
    } else if (filterType === 'custom' && customRange.start && customRange.end) {
      startDate = new Date(customRange.start);
      endDate = new Date(customRange.end);
      endDate.setHours(23, 59, 59);
    }

    const filterFn = (item: any) => {
      if (filterType === 'all') return true;
      if (!item.createdAt && !item.date) return false;
      const itemDate = getDateString(item.createdAt || item.date);
      if (startDate && endDate) return itemDate >= startDate && itemDate <= endDate;
      return startDate ? itemDate >= startDate : true;
    };

    return {
      orders: (orders || []).filter(filterFn),
      expenses: (expenses || []).filter(filterFn),
      supplierPayments: (supplierPayments || []).filter(p => {
        const d = p.date ? new Date(p.date) : getDateString(p.createdAt);
        if (filterType === 'all') return true;
        if (startDate && endDate) return d >= startDate && d <= endDate;
        return startDate ? d >= startDate : true;
      })
    };
  }, [orders, expenses, supplierPayments, filterType, customRange]);

  const stats = useMemo(() => {
    const totalSales = filteredData.orders.reduce((s, o) => s + safeParse(o.totalAmount), 0);
    const totalExpense = filteredData.expenses.reduce((s, e) => s + safeParse(e.amount), 0);
    let totalCOGS = 0;
    filteredData.orders.forEach(order => {
      order.items?.forEach(item => { totalCOGS += (safeParse(item.buyPrice) * safeParse(item.qty)); });
    });
    const totalSoldCostLifetime = (orders || []).reduce((sum, o) => sum + (o.items?.reduce((s, i) => s + (safeParse(i.buyPrice) * safeParse(i.qty)), 0) || 0), 0);
    const totalSupplierPaidLifetime = (supplierPayments || []).reduce((sum, p) => sum + safeParse(p.amount), 0);
    const supplierDueLifetime = totalSoldCostLifetime - totalSupplierPaidLifetime;
    const periodSupplierPaid = filteredData.supplierPayments.reduce((sum, p) => sum + safeParse(p.amount), 0);
    const netProfit = totalSales - totalCOGS - totalExpense;
    return { totalSales, totalExpense, netProfit, periodSupplierPaid, supplierDueLifetime };
  }, [filteredData, orders, supplierPayments]);

  const chartData = useMemo(() => filteredData.orders.slice(-7).map(o => ({
    name: o.customerName?.slice(0, 5) || 'Guest',
    sales: safeParse(o.totalAmount)
  })), [filteredData.orders]);

  const dueOrders = useMemo(() => {
    return (orders || []).filter(o => safeParse(o.dueAmount) > 0).sort((a, b) => safeParse(b.dueAmount) - safeParse(a.dueAmount));
  }, [orders]);

  const filters = [
    { key: 'all', label: 'সব' },
    { key: 'today', label: 'আজ' },
    { key: 'week', label: 'সপ্তাহ' },
    { key: 'month', label: 'মাস' },
    { key: 'year', label: 'বছর' },
  ];

  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex gap-1.5 flex-wrap bg-card rounded-xl p-1.5 border border-border shadow-sm">
          {filters.map(f => (
            <button key={f.key} onClick={() => setFilterType(f.key)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${filterType === f.key ? 'gradient-primary text-white shadow-md' : 'text-muted-foreground hover:bg-secondary'}`}>
              {f.label}
            </button>
          ))}
          <button onClick={() => setFilterType('custom')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${filterType === 'custom' ? 'gradient-primary text-white shadow-md' : 'text-muted-foreground hover:bg-secondary'}`}>
            <CalendarDays size={13} /> কাস্টম
          </button>
        </div>
        {filterType === 'custom' && (
          <div className="flex gap-2 items-center">
            <input type="date" value={customRange.start} onChange={e => setCustomRange({ ...customRange, start: e.target.value })} className="border border-input p-1.5 rounded-lg text-xs outline-none focus:border-primary bg-card" />
            <span className="text-muted-foreground text-xs">→</span>
            <input type="date" value={customRange.end} onChange={e => setCustomRange({ ...customRange, end: e.target.value })} className="border border-input p-1.5 rounded-lg text-xs outline-none focus:border-primary bg-card" />
          </div>
        )}
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="মোট বিক্রয়" value={formatCurrency(stats.totalSales)} icon={<ShoppingBag size={20} />} gradient="gradient-primary" />
        <StatCard title="মোট খরচ" value={formatCurrency(stats.totalExpense)} icon={<CreditCard size={20} />} gradient="gradient-danger" />
        <StatCard title="নিট মুনাফা" value={showProfit ? formatCurrency(stats.netProfit) : "****"} icon={showProfit ? <EyeOff size={20} /> : <Eye size={20} />} gradient="gradient-success" onClick={() => setShowProfit(!showProfit)} />
        <StatCard title="মোট অর্ডার" value={filteredData.orders.length} icon={<FileText size={20} />} gradient="bg-gradient-to-br from-slate-700 to-slate-900" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatCard title="সাপ্লায়ার পরিশোধ" value={formatCurrency(stats.periodSupplierPaid)} icon={<CheckCircle size={20} />} gradient="bg-gradient-to-br from-teal-500 to-teal-700" />
        <StatCard title="সাপ্লায়ার বকেয়া (লাইফটাইম)" value={formatCurrency(stats.supplierDueLifetime)} icon={<Truck size={20} />} gradient="gradient-warning" />
      </div>

      {/* Chart */}
      <Card className="shadow-sm border border-border">
        <CardContent className="h-80 pt-5">
          <h3 className="font-bold text-foreground mb-6 flex items-center gap-2 text-sm"><TrendingUp size={18} className="text-primary" /> বিক্রয় গ্রাফ</h3>
          <ResponsiveContainer width="100%" height="85%">
            <AreaChart data={chartData} margin={{ bottom: 20, left: 10 }}>
              <defs>
                <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(245, 58%, 51%)" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="hsl(245, 58%, 51%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(220, 13%, 91%)" />
              <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid hsl(220, 13%, 91%)', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
              <Area type="monotone" dataKey="sales" stroke="hsl(245, 58%, 51%)" fill="url(#salesGradient)" strokeWidth={2.5} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Due List */}
      {dueOrders.length > 0 && (
        <Card className="shadow-sm border border-border">
          <CardContent className="pt-5">
            <h3 className="font-bold text-foreground mb-4 flex items-center gap-2 text-sm">
              <AlertCircle size={18} className="text-warning" /> বকেয়া তালিকা ({dueOrders.length} জন)
            </h3>
            <div className="space-y-2 max-h-[350px] overflow-y-auto custom-scrollbar">
              {dueOrders.map(o => (
                <div key={o.id} className="flex items-center justify-between p-3.5 bg-secondary/50 rounded-xl border border-border hover:border-primary/20 transition">
                  <div>
                    <p className="font-bold text-foreground text-sm">{o.customerName}</p>
                    <p className="text-[11px] text-muted-foreground">{o.phone} • #{o.id?.slice(-6).toUpperCase()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] text-muted-foreground">মোট: {formatCurrency(o.totalAmount)}</p>
                    <p className="text-base font-extrabold text-destructive">{formatCurrency(o.dueAmount)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DashboardView;
