import type { PathaoCredentials } from './types';

// Auto-detect API base: use Vercel serverless in production, or direct in dev
const getProxyUrl = () => {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/api/pathao`;
  }
  return '/api/pathao';
};

async function proxyCall(endpoint: string, token?: string, body?: any, method = 'POST') {
  const res = await fetch(getProxyUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint, method, body, token }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.error || `API Error ${res.status}`);
  }
  return res.json();
}

export async function getPathaoToken(credentials: PathaoCredentials): Promise<string> {
  const data = await proxyCall('/aladdin/api/v1/issue-token', undefined, {
    client_id: credentials.clientId,
    client_secret: credentials.clientSecret,
    username: credentials.username,
    password: credentials.password,
    grant_type: 'password',
  });
  return data.access_token;
}

export async function getPathaoStores(token: string) {
  return proxyCall('/aladdin/api/v1/stores', token, undefined, 'GET');
}

export async function getPathaoCities(token: string) {
  return proxyCall('/aladdin/api/v1/city-list', token, undefined, 'GET');
}

export async function getPathaoZones(token: string, cityId: number) {
  return proxyCall(`/aladdin/api/v1/cities/${cityId}/zone-list`, token, undefined, 'GET');
}

export async function getPathaoAreas(token: string, zoneId: number) {
  return proxyCall(`/aladdin/api/v1/zones/${zoneId}/area-list`, token, undefined, 'GET');
}

export interface PathaoOrderPayload {
  store_id: number;
  merchant_order_id: string;
  recipient_name: string;
  recipient_phone: string;
  recipient_address: string;
  recipient_city: number;
  recipient_zone: number;
  recipient_area?: number;
  delivery_type: number; // 48 = Normal, 12 = On Demand
  item_type: number; // 1 = Document, 2 = Parcel
  special_instruction?: string;
  item_quantity: number;
  item_weight: number;
  amount_to_collect: number; // COD amount
  item_description?: string;
}

export async function createPathaoOrder(token: string, payload: PathaoOrderPayload) {
  return proxyCall('/aladdin/api/v1/orders', token, payload);
}
