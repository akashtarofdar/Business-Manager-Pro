import React, { useState } from 'react';
import { Settings, Save, Truck } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { db, DB_VERSION } from '@/lib/firebase';
import { resizeImage } from '@/lib/helpers';
import type { ShopProfile } from '@/lib/types';
import type { User } from 'firebase/auth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props { profile: ShopProfile; user: User; }

const SettingsView: React.FC<Props> = ({ profile, user }) => {
  const [data, setData] = useState<ShopProfile>(profile);
  const [pathao, setPathao] = useState(profile.pathaoCredentials || { clientId: '', clientSecret: '', username: '', password: '', storeId: '' });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const saveData = { ...data, pathaoCredentials: pathao };
    await setDoc(doc(db, 'artifacts', DB_VERSION, 'users', user.uid, 'settings', 'profile'), saveData, { merge: true });
    alert("আপনার তথ্য আপডেট হয়েছে!");
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const resized = await resizeImage(file);
      setData({ ...data, logo: resized });
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <Card className="border-t-4 border-primary shadow-2xl">
        <CardContent className="p-10">
          <div className="flex items-center gap-5 mb-10 border-b border-border pb-8">
            <div className="w-16 h-16 bg-primary/10 rounded-3xl flex items-center justify-center text-primary border border-primary/20 shadow-sm"><Settings size={32} /></div>
            <div><h2 className="text-3xl font-black text-foreground">ব্যবসায়িক প্রোফাইল</h2><p className="text-sm text-muted-foreground font-medium">ইনভয়েসে এই তথ্যগুলো ব্যবহার হবে</p></div>
          </div>
          <form onSubmit={handleSave} className="space-y-6">
            <div className="space-y-2">
              <Label>দোকানের লোগো</Label>
              <div className="flex items-center gap-4">
                {data.logo && <img src={data.logo} className="w-20 h-20 rounded-xl object-cover border border-border" />}
                <input type="file" accept="image/*" onChange={handleLogoUpload} className="text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20" />
              </div>
            </div>
            <div className="space-y-2"><Label>দোকানের নাম</Label><Input value={data.shopName} onChange={e => setData({ ...data, shopName: e.target.value })} required /></div>
            <div className="space-y-2"><Label>মোবাইল নাম্বার</Label><Input value={data.phone} onChange={e => setData({ ...data, phone: e.target.value })} required /></div>
            <div className="space-y-2"><Label>দোকানের ঠিকানা</Label><textarea value={data.address} onChange={e => setData({ ...data, address: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm resize-none" rows={3} required /></div>

            {/* Pathao Courier Settings */}
            <div className="border-t border-border pt-6 mt-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center text-accent-foreground"><Truck size={22} /></div>
                <div>
                  <h3 className="text-lg font-black text-foreground">পাঠাও কুরিয়ার সেটআপ</h3>
                  <p className="text-xs text-muted-foreground">ওয়ান-ক্লিক কুরিয়ার বুকিংয়ের জন্য</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Client ID</Label><Input value={pathao.clientId} onChange={e => setPathao({ ...pathao, clientId: e.target.value })} placeholder="Pathao Client ID" /></div>
                  <div className="space-y-2"><Label>Client Secret</Label><Input value={pathao.clientSecret} onChange={e => setPathao({ ...pathao, clientSecret: e.target.value })} placeholder="Pathao Client Secret" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Username (Email)</Label><Input value={pathao.username} onChange={e => setPathao({ ...pathao, username: e.target.value })} placeholder="merchant@email.com" /></div>
                  <div className="space-y-2"><Label>Password</Label><Input type="password" value={pathao.password} onChange={e => setPathao({ ...pathao, password: e.target.value })} placeholder="••••••" /></div>
                </div>
                <div className="space-y-2"><Label>Store ID</Label><Input value={pathao.storeId || ''} onChange={e => setPathao({ ...pathao, storeId: e.target.value })} placeholder="পাঠাও থেকে প্রাপ্ত Store ID" /></div>
              </div>
            </div>

            <Button type="submit" className="w-full py-4 text-lg shadow-xl"><Save size={20} /> তথ্য আপডেট করুন</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsView;
