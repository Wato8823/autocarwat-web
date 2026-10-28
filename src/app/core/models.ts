export interface Vehicle {
  id: number;
  make: string;
  model: string;
  year: number;
}

export interface Part {
  id: number;
  name: string;
  reference: string;
  oem_number: string | null;
  description: string | null;
  price: number;
  stock: number;
  image_url: string | null;
  category?: string;
  brand?: string;
  vehicles?: Vehicle[];
}

export interface Paginated<T> {
  data: T[];
  meta: { current_page: number; last_page: number; total: number; per_page: number };
}

export type PartSort = 'newest' | 'price_asc' | 'price_desc' | 'name_asc';

export interface PartFilters {
  search?: string;
  vehicle_id?: number | null;
  category?: string;
  brand?: string;
  in_stock?: boolean;
  sort?: PartSort;
  page?: number;
  per_page?: number;
}

export interface CartItem {
  part: Part;
  quantity: number;
}

export type OrderStatus =
  | 'pending_payment'
  | 'payment_submitted'
  | 'paid'
  | 'preparing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export type PaymentOperator = 'orange_money' | 'mtn_momo';
export type PaymentStatus = 'pending' | 'approved' | 'rejected';

export interface OrderItem {
  id: number;
  part_id: number;
  part_name: string;
  part_reference: string;
  unit_price: number;
  quantity: number;
  subtotal: number;
  image_url?: string | null;
}

export interface Payment {
  id: number;
  order_id: number;
  order_number?: string;
  customer_name?: string;
  customer_email?: string;
  operator: PaymentOperator;
  sender_phone: string;
  transaction_ref: string;
  amount: number;
  proof_url?: string | null;
  proof_name?: string | null;
  notes?: string | null;
  status: PaymentStatus;
  rejection_reason?: string | null;
  reviewed_at?: string | null;
  created_at: string;
}

export interface Order {
  id: number;
  order_number: string;
  user_id: number;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  shipping_city: string;
  shipping_address: string;
  notes?: string | null;
  subtotal: number;
  shipping_fee: number;
  total: number;
  status: OrderStatus;
  items: OrderItem[];
  payment?: Payment | null;
  created_at: string;
  updated_at?: string;
}

export interface CreateOrderPayload {
  customer_name: string;
  customer_phone: string;
  shipping_city: string;
  shipping_address: string;
  notes?: string;
  items: { part_id: number; quantity: number }[];
  payment?: {
    operator: PaymentOperator;
    sender_phone: string;
    transaction_ref: string;
    proof_url?: string | null;
    proof_name?: string | null;
    notes?: string;
  };
}

export interface SubmitPaymentPayload {
  operator: PaymentOperator;
  sender_phone: string;
  transaction_ref: string;
  proof_url?: string | null;
  proof_name?: string | null;
  notes?: string;
}

export interface PartUpsertPayload {
  name: string;
  reference: string;
  oem_number: string | null;
  brand: string;
  category: string;
  description: string | null;
  price: number;
  stock: number;
  image_url: string | null;
  vehicle_ids: number[];
}

export interface AdminStats {
  total_revenue: number;
  orders_count: number;
  pending_payments_count: number;
  low_stock_count: number;
  parts_count: number;
  vehicles_count: number;
  recent_orders: Order[];
  pending_payments: Payment[];
  low_stock_parts: Part[];
}

export const PART_CATEGORIES = [
  'Freinage',
  'Filtration',
  'Suspension & Direction',
  'Allumage & Électricité',
  'Moteur & Distribution',
  'Refroidissement',
  'Éclairage & Carrosserie',
] as const;

export const CAMEROON_CITIES: { name: string; fee: number; delay: string }[] = [
  { name: 'Douala', fee: 2000, delay: 'Livraison sous 24h' },
  { name: 'Yaoundé', fee: 3000, delay: 'Livraison 24h – 48h' },
  { name: 'Bafoussam', fee: 3500, delay: 'Expédition agence 24h – 48h' },
  { name: 'Kribi', fee: 3500, delay: 'Expédition agence 24h – 48h' },
  { name: 'Limbe / Buea', fee: 3000, delay: 'Expédition agence 24h – 48h' },
  { name: 'Bamenda', fee: 4000, delay: 'Expédition agence 48h – 72h' },
  { name: 'Bertoua', fee: 4500, delay: 'Expédition agence 48h – 72h' },
  { name: 'Ngaoundéré', fee: 5000, delay: 'Expédition agence 48h – 72h' },
  { name: 'Garoua', fee: 5000, delay: 'Expédition agence 48h – 72h' },
  { name: 'Maroua', fee: 5500, delay: 'Expédition agence 72h' },
];

export const FREE_SHIPPING_THRESHOLD = 100000;

export function calculateShippingFee(subtotal: number, city: string): number {
  if (subtotal <= 0) return 0;
  if (subtotal >= FREE_SHIPPING_THRESHOLD) return 0;
  const found = CAMEROON_CITIES.find(c => c.name.toLowerCase() === city.toLowerCase());
  return found ? found.fee : 4000;
}

export const ORDER_STATUS_META: Record<OrderStatus, { label: string; cls: string }> = {
  pending_payment: {
    label: 'En attente de paiement',
    cls: 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200',
  },
  payment_submitted: {
    label: 'Paiement en vérification',
    cls: 'bg-blue-100 text-blue-900 dark:bg-blue-950/60 dark:text-blue-200',
  },
  paid: {
    label: 'Payée',
    cls: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200',
  },
  preparing: {
    label: 'En préparation',
    cls: 'bg-indigo-100 text-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-200',
  },
  shipped: {
    label: 'Expédiée',
    cls: 'bg-purple-100 text-purple-900 dark:bg-purple-950/60 dark:text-purple-200',
  },
  delivered: {
    label: 'Livrée',
    cls: 'bg-green-100 text-green-900 dark:bg-green-950/60 dark:text-green-200',
  },
  cancelled: {
    label: 'Annulée',
    cls: 'bg-red-100 text-red-900 dark:bg-red-950/60 dark:text-red-200',
  },
};

export const PAYMENT_STATUS_META: Record<PaymentStatus, { label: string; cls: string }> = {
  pending: {
    label: 'À vérifier',
    cls: 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200',
  },
  approved: {
    label: 'Validé',
    cls: 'bg-green-100 text-green-900 dark:bg-green-950/60 dark:text-green-200',
  },
  rejected: {
    label: 'Rejeté',
    cls: 'bg-red-100 text-red-900 dark:bg-red-950/60 dark:text-red-200',
  },
};

export const OPERATOR_META: Record<PaymentOperator, { label: string; short: string; cls: string }> = {
  orange_money: {
    label: 'Orange Money',
    short: 'OM',
    cls: 'bg-orange-100 text-orange-900 dark:bg-orange-950/60 dark:text-orange-200',
  },
  mtn_momo: {
    label: 'MTN Mobile Money',
    short: 'MoMo',
    cls: 'bg-yellow-100 text-yellow-900 dark:bg-yellow-950/60 dark:text-yellow-200',
  },
};
