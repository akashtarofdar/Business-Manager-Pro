import React, { useRef, useState, useCallback } from 'react';
import { Printer, X, Download, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import { safeParse, formatCurrency, getDateString } from '@/lib/helpers';
import type { Order, ShopProfile } from '@/lib/types';
import { Button } from '@/components/ui/button';

interface Props { order: Order; shopProfile: ShopProfile; onClose: () => void; }

const InvoiceModal: React.FC<Props> = ({ order, shopProfile, onClose }) => {
  const printRef = useRef<HTMLDivElement>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const handlePrint = () => {
    const content = printRef.current?.innerHTML;
    if (!content) return;
    const win = window.open('', '', 'height=1123,width=794');
    if (!win) return;
    win.document.write(`<html><head><title>Invoice</title><style>@media print { body { margin: 0; } @page { margin: 10mm; } } body { font-family: 'Segoe UI', sans-serif; } table { border-collapse: collapse; width: 100%; } th, td { padding: 10px 12px; text-align: left; } th { background: #312e81; color: white; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; } td { border-bottom: 1px solid #f1f5f9; font-size: 13px; } .text-right { text-align: right; } .text-center { text-align: center; }</style></head><body>${content}</body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 500);
  };

  const handleDownloadJPEG = useCallback(async () => {
    if (!printRef.current || downloading) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(printRef.current, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
      });
      const link = document.createElement('a');
      link.download = `Invoice-${order.id?.slice(-6).toUpperCase() || 'unknown'}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.95);
      link.click();
    } catch (err) {
      console.error('JPEG download error:', err);
      alert('ডাউনলোড ব্যর্থ হয়েছে!');
    } finally {
      setDownloading(false);
    }
  }, [order.id, downloading]);

  const dateStr = order.orderDate || (order.createdAt ? getDateString(order.createdAt).toLocaleDateString('bn-BD') : new Date().toLocaleDateString('bn-BD'));
  const due = safeParse(order.totalAmount) - safeParse(order.paidAmount);

  const paymentMethodLabels: Record<string, string> = {
    Cash: 'নগদ (Cash)', Bkash: 'বিকাশ (bKash)', Nagad: 'নগদ (Nagad)', Rocket: 'রকেট (Rocket)', Bank: 'ব্যাংক (Bank)'
  };

  return (
    <div className="fixed inset-0 bg-foreground/70 glass z-[100] flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl max-w-2xl w-full flex flex-col max-h-[90vh] shadow-2xl border border-border">
        {/* Toolbar */}
        <div className="px-5 py-3.5 border-b border-border flex justify-between items-center bg-secondary/40 rounded-t-2xl">
          <span className="font-extrabold text-foreground text-sm">ইনভয়েস প্রিভিউ</span>
          <div className="flex gap-2 items-center">
            <Button size="sm" variant="outline" onClick={handlePrint} className="gap-1.5 h-8 text-xs font-bold">
              <Printer size={14} /> প্রিন্ট
            </Button>
            <Button size="sm" onClick={handleDownloadJPEG} disabled={downloading} className="gap-1.5 h-8 text-xs font-bold gradient-success border-0 text-white shadow-md">
              {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              {downloading ? 'ডাউনলোড...' : 'JPEG'}
            </Button>
            <button onClick={onClose} className="p-1.5 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Invoice Content */}
        <div className="overflow-y-auto p-8 bg-white custom-scrollbar" ref={printRef}>
          {/* Header */}
          <div style={{ borderBottom: '2px solid #312e81', paddingBottom: '20px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              {shopProfile.logo && <img src={shopProfile.logo} style={{ width: '52px', height: '52px', borderRadius: '12px', objectFit: 'cover', border: '2px solid #e2e8f0' }} />}
              <div>
                <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#312e81', letterSpacing: '-0.5px', marginBottom: '2px' }}>{shopProfile.shopName}</h1>
                <p style={{ fontSize: '12px', fontWeight: 500, color: '#64748b' }}>{shopProfile.address}</p>
                <p style={{ fontSize: '12px', fontWeight: 500, color: '#64748b' }}>📞 {shopProfile.phone}</p>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#e2e8f0', letterSpacing: '3px' }}>INVOICE</h2>
              <p style={{ fontWeight: 700, color: '#312e81', fontSize: '14px', marginTop: '2px', fontFamily: 'monospace' }}>#INV-{order.id?.slice(-6).toUpperCase()}</p>
              <p style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>তারিখ: {dateStr}</p>
            </div>
          </div>

          {/* Customer Info */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '28px' }}>
            <div style={{ padding: '14px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <p style={{ fontSize: '9px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '6px' }}>বিল প্রাপক</p>
              <p style={{ fontSize: '16px', fontWeight: 800, color: '#1e293b' }}>{order.customerName}</p>
              <p style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>📞 {order.phone}</p>
              {order.address && <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '3px' }}>📍 {order.address}</p>}
            </div>
            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-end', gap: '6px' }}>
              <div>
                <p style={{ fontSize: '10px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>স্ট্যাটাস</p>
                <span style={{ fontSize: '16px', fontWeight: 800, color: order.status === 'Paid' ? '#059669' : '#dc2626' }}>{order.status === 'Paid' ? '✅ পরিশোধিত' : '⏳ বকেয়া'}</span>
              </div>
              {order.lastPaymentMethod && (
                <div>
                  <p style={{ fontSize: '10px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>পেমেন্ট</p>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#312e81' }}>{paymentMethodLabels[order.lastPaymentMethod] || order.lastPaymentMethod}</span>
                </div>
              )}
            </div>
          </div>

          {/* Items Table */}
          <table style={{ width: '100%', marginBottom: '24px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#312e81', color: 'white' }}>
                <th style={{ padding: '10px 14px', textAlign: 'left', borderRadius: '8px 0 0 0', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>পণ্য</th>
                <th style={{ padding: '10px', textAlign: 'center', fontSize: '10px', textTransform: 'uppercase' }}>সাইজ</th>
                <th style={{ padding: '10px', textAlign: 'center', fontSize: '10px', textTransform: 'uppercase' }}>পরিমাণ</th>
                <th style={{ padding: '10px 14px', textAlign: 'right', fontSize: '10px', textTransform: 'uppercase' }}>দর</th>
                <th style={{ padding: '10px 14px', textAlign: 'right', borderRadius: '0 8px 0 0', fontSize: '10px', textTransform: 'uppercase' }}>মোট</th>
              </tr>
            </thead>
            <tbody>
              {order.items?.map((i, idx) => (
                <React.Fragment key={idx}>
                  <tr style={{ borderBottom: i.designImage ? 'none' : '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 600, color: '#334155' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {i.image && <img src={i.image} style={{ width: '32px', height: '32px', borderRadius: '6px', objectFit: 'cover', border: '1px solid #e2e8f0' }} />}
                        <span style={{ fontSize: '13px' }}>{i.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '10px', textAlign: 'center', fontWeight: 500, color: '#64748b', fontSize: '12px' }}>{i.size}</td>
                    <td style={{ padding: '10px', textAlign: 'center', fontWeight: 800, fontSize: '13px' }}>{i.qty}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 500, fontSize: '12px' }}>{formatCurrency(i.sellPrice)}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 800, fontSize: '13px' }}>{formatCurrency(safeParse(i.sellPrice) * safeParse(i.qty))}</td>
                  </tr>
                  {i.designImage && (
                    <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td colSpan={5} style={{ padding: '4px 14px 10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '9px', fontWeight: 700, color: '#312e81', textTransform: 'uppercase' }}>ডিজাইন:</span>
                          <img
                            src={i.designImage}
                            style={{ width: '72px', height: '72px', borderRadius: '8px', objectFit: 'cover', border: '2px solid #312e81', cursor: 'pointer' }}
                            title="বড় করে দেখতে ক্লিক করুন"
                            onClick={() => setPreviewImage(i.designImage!)}
                          />
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>

          {/* Summary */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ width: '260px', background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontWeight: 600, fontSize: '12px', marginBottom: '6px' }}>
                <span>সাব-টোটাল</span><span style={{ fontWeight: 800 }}>{formatCurrency(order.subTotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontWeight: 600, fontSize: '12px', paddingBottom: '10px', borderBottom: '1px solid #e2e8f0' }}>
                <span>ডেলিভারি</span><span style={{ fontWeight: 800 }}>{formatCurrency(order.deliveryCharge)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '16px', color: '#312e81', paddingTop: '10px' }}>
                <span>মোট</span><span>{formatCurrency(order.totalAmount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, fontSize: '13px', color: '#059669', marginTop: '6px' }}>
                <span>পরিশোধিত</span><span>- {formatCurrency(order.paidAmount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '14px', color: '#dc2626', paddingTop: '10px', borderTop: '1px solid #e2e8f0', marginTop: '6px' }}>
                <span>বকেয়া</span><span>{formatCurrency(due)}</span>
              </div>
            </div>
          </div>

          {/* Note */}
          {order.note && (
            <div style={{ marginTop: '20px', padding: '10px 14px', background: '#fffbeb', borderRadius: '10px', border: '1px solid #fef3c7' }}>
              <p style={{ fontSize: '10px', fontWeight: 700, color: '#d97706', textTransform: 'uppercase', marginBottom: '3px' }}>নোট</p>
              <p style={{ fontSize: '12px', color: '#92400e' }}>{order.note}</p>
            </div>
          )}

          {/* Footer */}
          <div style={{ marginTop: '40px', textAlign: 'center', borderTop: '1px dashed #e2e8f0', paddingTop: '20px', opacity: 0.4 }}>
            <p style={{ fontSize: '8px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '4px', color: '#94a3b8' }}>ব্যবসা করার জন্য ধন্যবাদ</p>
          </div>
        </div>
      </div>

      {/* Full-screen Design Image Preview */}
      {previewImage && (
        <div onClick={() => setPreviewImage(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out' }}>
          <img src={previewImage} style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: '12px', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }} />
        </div>
      )}
    </div>
  );
};

export default InvoiceModal;
