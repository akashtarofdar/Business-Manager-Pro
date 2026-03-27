export interface PathaoCredentials {
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
  storeId?: string;
}

export interface ShopProfile {
  shopName: string;
  address: string;
  phone: string;
  email?: string;
  logo?: string;
  pathaoCredentials?: PathaoCredentials;
}

export interface Product {
  id: string;
  name: string;
  buyPrice: number;
  sellPrice: number;
  stock: number;
  fabric: string;
  neck: string;
  image?: string;
  createdAt?: any;
}

export interface CartItem extends Product {
  qty: number;
  size: string;
  designImage?: string;
}

export interface OrderItem {
  id: string;
  name: string;
  sellPrice: number;
  buyPrice: number;
  qty: number;
  size: string;
  image?: string;
  designImage?: string;
}

export interface Order {
  id: string;
  customerName: string;
  phone: string;
  address: string;
  items: OrderItem[];
  subTotal: number;
  deliveryCharge: number;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  status: 'Paid' | 'Due';
  lastPaymentMethod: string;
  note?: string;
  orderDate?: string;
  createdAt?: any;
  courierStatus?: string;
  trackingId?: string;
  consignmentId?: string;
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  category: string;
  date?: string;
  createdAt?: any;
}

export interface SupplierPayment {
  id: string;
  amount: number;
  date: string;
  notes: string;
  createdAt?: any;
}
