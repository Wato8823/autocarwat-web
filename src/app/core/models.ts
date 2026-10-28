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
  category?: string | null;
  brand?: string | null;
  vehicles?: Vehicle[];
}

/** Forme utilisée par l'interface, indépendamment du format de pagination Laravel. */
export interface Paginated<T> {
  data: T[];
  meta: { current_page: number; last_page: number; total: number; per_page: number };
}

export interface LaravelPage<T> {
  data: T[];
  current_page?: number;
  last_page?: number;
  total?: number;
  per_page?: number;
  meta?: Partial<Paginated<T>['meta']>;
}

export function normalizePage<T>(response: LaravelPage<T> | T[]): Paginated<T> {
  if (Array.isArray(response)) {
    return {
      data: response,
      meta: { current_page: 1, last_page: 1, total: response.length, per_page: response.length },
    };
  }
  const data = response.data ?? [];
  return {
    data,
    meta: {
      current_page: Number(response.meta?.current_page ?? response.current_page ?? 1),
      last_page: Number(response.meta?.last_page ?? response.last_page ?? 1),
      total: Number(response.meta?.total ?? response.total ?? data.length),
      per_page: Number(response.meta?.per_page ?? response.per_page ?? data.length),
    },
  };
}

export interface PartFilters {
  search?: string;
  vehicle_id?: number | null;
  category_id?: number | null;
  brand_id?: number | null;
  make?: string;
  page?: number;
}

export interface CartItem {
  part: Part;
  quantity: number;
}

// Ces valeurs correspondent aux enums de l'API Laravel.
export type OrderStatus =
  'pending' | 'awaiting_payment' | 'paid' | 'shipped' | 'delivered' | 'cancelled';
export type PaymentOperator = 'orange' | 'mtn';
export type PaymentStatus = 'initiated' | 'confirmed' | 'rejected';

export interface OrderItem {
  part: string;
  reference: string;
  unit_price: number;
  quantity: number;
}

export interface Order {
  id: number;
  status: OrderStatus;
  total: number;
  created_at: string;
  items: OrderItem[];
}

export interface CreateOrderPayload {
  items: { part_id: number; quantity: number }[];
}

export interface InitiatePaymentPayload {
  provider: PaymentOperator;
  phone: string;
}

export interface PaymentInstructions {
  payment_id: number;
  order_status: OrderStatus;
  provider: PaymentOperator;
  amount: number;
  cashier_number: string;
  // Certains déploiements peuvent également renvoyer le nom du compte.
  cashier_name?: string | null;
  ussd_code: string;
  dial_uri: string;
  instructions: string;
}

export interface Payment {
  id: number;
  order_id: number;
  provider: PaymentOperator;
  payer_phone: string;
  amount: number;
  transaction_reference: string | null;
  status: PaymentStatus;
  confirmed_by: number | null;
  confirmed_at: string | null;
  created_at: string;
  order?: { id: number; user?: { id: number; name: string; email: string } | null } | null;
}

export interface PartUpsertPayload {
  name?: string;
  reference?: string;
  category_id?: number;
  brand_id?: number;
  oem_number?: string | null;
  description?: string | null;
  price?: number;
  stock?: number;
  image?: File | null;
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

export const ORDER_STATUS_META: Record<OrderStatus, { label: string; cls: string }> = {
  pending: {
    label: 'À payer',
    cls: 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200',
  },
  awaiting_payment: {
    label: 'Paiement en attente',
    cls: 'bg-blue-100 text-blue-900 dark:bg-blue-950/60 dark:text-blue-200',
  },
  paid: {
    label: 'Payée',
    cls: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200',
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
  initiated: {
    label: 'Initié',
    cls: 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200',
  },
  confirmed: {
    label: 'Validé',
    cls: 'bg-green-100 text-green-900 dark:bg-green-950/60 dark:text-green-200',
  },
  rejected: {
    label: 'Rejeté',
    cls: 'bg-red-100 text-red-900 dark:bg-red-950/60 dark:text-red-200',
  },
};

export const OPERATOR_META: Record<PaymentOperator, { label: string; short: string; cls: string }> =
  {
    orange: {
      label: 'Orange Money',
      short: 'OM',
      cls: 'bg-orange-100 text-orange-900 dark:bg-orange-950/60 dark:text-orange-200',
    },
    mtn: {
      label: 'MTN Mobile Money',
      short: 'MoMo',
      cls: 'bg-yellow-100 text-yellow-900 dark:bg-yellow-950/60 dark:text-yellow-200',
    },
  };

/** Accepte les deux formats documentés, avec des séparateurs usuels. */
export function normalizeCameroonPhone(value: string): string | null {
  const compact = value.trim().replace(/[\s().-]/g, '');
  if (!/^(?:\+237)?6\d{8}$/.test(compact)) return null;
  return compact.replace(/^\+237/, '');
}

/** Seuls les liens USSD téléphoniques retournés par l'API peuvent être ouverts. */
export function safeDialUri(uri: string | null | undefined): string | null {
  return uri && /^tel:[\d*+#%]+$/i.test(uri) ? uri : null;
}
