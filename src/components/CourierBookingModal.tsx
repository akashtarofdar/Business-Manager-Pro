import React, { useState, useEffect } from 'react';
import { X, Truck, MapPin, Package, Loader2, CheckCircle2 } from 'lucide-react';
import { updateDoc, doc } from 'firebase/firestore';
import { db, DB_VERSION } from '@/lib/firebase';
import { getPathaoToken, getPathaoCities, getPathaoZones, getPathaoAreas, createPathaoOrder } from '@/lib/pathaoApi';
import { safeParse, formatCurrency } from '@/lib/helpers';
import type { Order, PathaoCredentials } from '@/lib/types';
import type { User } from 'firebase/auth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  order: Order;
  user: User;
  credentials: PathaoCredentials;
  onClose: () => void;
  onSuccess: () => void;
}

interface Location { [key: string]: any; }

const CourierBookingModal: React.FC<Props> = ({ order, user, credentials, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [trackingId, setTrackingId] = useState('');
  const [consignmentId, setConsignmentId] = useState('');

  // Location data
  const [cities, setCities] = useState<Location[]>([]);
  const [zones, setZones] = useState<Location[]>([]);
  const [areas, setAreas] = useState<Location[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);

  // Form
  const [cityId, setCityId] = useState<number>(0);
  const [zoneId, setZoneId] = useState<number>(0);
  const [areaId, setAreaId] = useState<number>(0);
  const [weight, setWeight] = useState('0.5');
  const [codAmount, setCodAmount] = useState(String(order.dueAmount > 0 ? order.dueAmount : 0));
  const [instruction, setInstruction] = useState(order.note || '');
  const [deliveryType, setDeliveryType] = useState(48); // 48=Normal

  // Load cities on mount
  useEffect(() => {
    const loadCities = async () => {
      try {
        setLoadingLocations(true);
        const token = await getPathaoToken(credentials);
        const data = await getPathaoCities(token);
        setCities(data.data?.data || data.data || []);
      } catch (e: any) {
        alert('পাঠাও সংযোগ ব্যর্থ: ' + e.message);
      } finally {
        setLoadingLocations(false);
      }
    };
    loadCities();
  }, [credentials]);

  // Load zones when city changes
  useEffect(() => {
    if (!cityId) { setZones([]); setAreas([]); return; }
    const load = async () => {
      try {
        setLoadingLocations(true);
        const token = await getPathaoToken(credentials);
        const data = await getPathaoZones(token, cityId);
        setZones(data.data?.data || data.data || []);
        setZoneId(0);
        setAreas([]);
        setAreaId(0);
      } catch (e: any) {
        console.error(e);
      } finally {
        setLoadingLocations(false);
      }
    };
    load();
  }, [cityId]);

  // Load areas when zone changes
  useEffect(() => {
    if (!zoneId) { setAreas([]); return; }
    const load = async () => {
      try {
        setLoadingLocations(true);
        const token = await getPathaoToken(credentials);
        const data = await getPathaoAreas(token, zoneId);
        setAreas(data.data?.data || data.data || []);
        setAreaId(0);
      } catch (e: any) {
        console.error(e);
      } finally {
        setLoadingLocations(false);
      }
    };
    load();
  }, [zoneId]);

  const handleBookCourier = async () => {
    if (!cityId || !zoneId) return alert('সিটি ও জোন সিলেক্ট করুন');
    setLoading(true);
    try {
      const token = await getPathaoToken(credentials);
      const totalQty = order.items.reduce((s, i) => s + i.qty, 0);
      const itemNames = order.items.map(i => `${i.name} (${i.size}) x${i.qty}`).join(', ');

      const payload = {
        store_id: parseInt(credentials.storeId || '0'),
        merchant_order_id: order.id.slice(-8).toUpperCase(),
        recipient_name: order.customerName,
        recipient_phone: order.phone,
        recipient_address: order.address,
        recipient_city: cityId,
        recipient_zone: zoneId,
        ...(areaId ? { recipient_area: areaId } : {}),
        delivery_type: deliveryType,
        item_type: 2, // Parcel
        special_instruction: instruction,
        item_quantity: totalQty,
        item_weight: parseFloat(weight),
        amount_to_collect: safeParse(codAmount),
        item_description: itemNames,
      };

      const result = await createPathaoOrder(token, payload);
      const tId = result.data?.tracking_id || result.tracking_id || '';
      const cId = result.data?.consignment_id || result.consignment_id || '';

      // Save tracking to Firebase
      await updateDoc(doc(db, 'artifacts', DB_VERSION, 'users', user.uid, 'orders', order.id), {
        courierStatus: 'Booked',
        trackingId: tId,
        consignmentId: String(cId),
      });

      setTrackingId(tId);
      setConsignmentId(String(cId));
      setStep('success');
      onSuccess();
    } catch (e: any) {
      alert('বুকিং ব্যর্থ: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-foreground/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
      <Card className="w-full max-w-lg shadow-2xl my-8">
        <CardContent className="p-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-xl flex items-center gap-2 text-foreground">
              <Truck size={22} className="text-primary" /> পাঠাও কুরিয়ার বুকিং
            </h3>
            <button onClick={onClose} className="p-2 hover:bg-secondary rounded-full"><X size={20} /></button>
          </div>

          {step === 'success' ? (
            <div className="text-center space-y-6 py-8">
              <CheckCircle2 size={64} className="mx-auto text-emerald-500" />
              <h3 className="text-2xl font-black text-foreground">বুকিং সফল! 🎉</h3>
              <div className="bg-secondary p-6 rounded-xl border border-border space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground font-bold uppercase">Tracking ID</p>
                  <p className="text-lg font-black text-primary">{trackingId}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-bold uppercase">Consignment ID</p>
                  <p className="text-lg font-black text-foreground">{consignmentId}</p>
                </div>
              </div>
              <Button onClick={onClose} className="w-full py-4">বন্ধ করুন</Button>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Order Summary */}
              <div className="bg-secondary p-4 rounded-xl border border-border">
                <div className="flex justify-between text-sm">
                  <span className="font-bold text-foreground">{order.customerName}</span>
                  <span className="font-black text-primary">{formatCurrency(order.totalAmount)}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">📞 {order.phone}</p>
                <p className="text-xs text-muted-foreground">📍 {order.address}</p>
              </div>

              {/* City */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1"><MapPin size={14} /> সিটি</Label>
                <select
                  value={cityId}
                  onChange={e => setCityId(Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm"
                >
                  <option value={0}>সিটি সিলেক্ট করুন</option>
                  {cities.map((c: any) => (
                    <option key={c.city_id} value={c.city_id}>{c.city_name}</option>
                  ))}
                </select>
              </div>

              {/* Zone */}
              <div className="space-y-2">
                <Label>জোন</Label>
                <select
                  value={zoneId}
                  onChange={e => setZoneId(Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm"
                  disabled={!zones.length}
                >
                  <option value={0}>জোন সিলেক্ট করুন</option>
                  {zones.map((z: any) => (
                    <option key={z.zone_id} value={z.zone_id}>{z.zone_name}</option>
                  ))}
                </select>
              </div>

              {/* Area */}
              <div className="space-y-2">
                <Label>এরিয়া (ঐচ্ছিক)</Label>
                <select
                  value={areaId}
                  onChange={e => setAreaId(Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm"
                  disabled={!areas.length}
                >
                  <option value={0}>এরিয়া সিলেক্ট করুন</option>
                  {areas.map((a: any) => (
                    <option key={a.area_id} value={a.area_id}>{a.area_name}</option>
                  ))}
                </select>
              </div>

              {/* Delivery Type */}
              <div className="space-y-2">
                <Label>ডেলিভারি টাইপ</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setDeliveryType(48)}
                    className={`p-3 rounded-xl border text-sm font-bold transition ${deliveryType === 48 ? 'bg-primary text-primary-foreground border-primary' : 'border-input hover:bg-secondary'}`}
                  >
                    🚚 Normal (48hr)
                  </button>
                  <button
                    onClick={() => setDeliveryType(12)}
                    className={`p-3 rounded-xl border text-sm font-bold transition ${deliveryType === 12 ? 'bg-primary text-primary-foreground border-primary' : 'border-input hover:bg-secondary'}`}
                  >
                    ⚡ On Demand (12hr)
                  </button>
                </div>
              </div>

              {/* Weight & COD */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label><Package size={14} className="inline mr-1" />ওজন (kg)</Label>
                  <Input type="number" step="0.1" value={weight} onChange={e => setWeight(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>COD পরিমাণ (৳)</Label>
                  <Input type="number" value={codAmount} onChange={e => setCodAmount(e.target.value)} />
                </div>
              </div>

              {/* Instructions */}
              <div className="space-y-2">
                <Label>বিশেষ নির্দেশনা</Label>
                <textarea
                  value={instruction}
                  onChange={e => setInstruction(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm resize-none"
                  rows={2}
                  placeholder="ফ্র্যাজাইল, কল করে যাবেন..."
                />
              </div>

              {loadingLocations && (
                <div className="flex items-center gap-2 text-xs text-primary">
                  <Loader2 size={14} className="animate-spin" /> লোকেশন লোড হচ্ছে...
                </div>
              )}

              <Button
                onClick={handleBookCourier}
                disabled={loading || !cityId || !zoneId}
                className="w-full py-4 text-lg shadow-xl"
              >
                {loading ? <><Loader2 size={20} className="animate-spin mr-2" /> বুকিং হচ্ছে...</> : '📦 কুরিয়ার বুক করুন'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CourierBookingModal;
