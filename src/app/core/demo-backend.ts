import { HttpErrorResponse, HttpRequest, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, delay, of, throwError } from 'rxjs';
import { DEMO_DB_KEY } from './demo-mode';
import type { User } from './auth';
import {
  Order,
  OrderStatus,
  PART_CATEGORIES,
  Part,
  Payment,
  PaymentOperator,
  Vehicle,
  normalizeCameroonPhone,
} from './models';

interface DemoUserRecord extends User {
  password: string;
}
interface DemoPartRecord extends Omit<Part, 'vehicles'> {
  vehicle_ids: number[];
}
interface DemoOrderRecord extends Order {
  user_id: number;
  stock_reserved: boolean;
}
interface DemoDb {
  users: DemoUserRecord[];
  tokens: Record<string, number>;
  vehicles: Vehicle[];
  parts: DemoPartRecord[];
  orders: DemoOrderRecord[];
  payments: Payment[];
}

function partSvg(label: string, accent: string, bg1 = '#0F2A43', bg2 = '#1B3E5E'): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${bg1}"/>
        <stop offset="100%" stop-color="${bg2}"/>
      </linearGradient>
    </defs>
    <rect width="400" height="300" fill="url(#g)"/>
    <circle cx="330" cy="60" r="95" fill="${accent}" opacity="0.14"/>
    <circle cx="70" cy="250" r="80" fill="#FFB703" opacity="0.1"/>
    <g transform="translate(200,130)" fill="none" stroke="${accent}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="0" cy="0" r="46" stroke="#EAF0F6" stroke-opacity="0.85"/>
      <circle cx="0" cy="0" r="20" fill="${accent}" fill-opacity="0.25"/>
      <path d="M0 -56 L0 -46 M0 46 L0 56 M-56 0 L-46 0 M46 0 L56 0 M-39 -39 L-32 -32 M32 32 L39 39 M39 -39 L32 -32 M-32 32 L-39 39"/>
    </g>
    <rect x="24" y="232" width="352" height="44" rx="10" fill="#091521" fill-opacity="0.68"/>
    <text x="200" y="260" text-anchor="middle" fill="#FFFFFF" font-family="system-ui,sans-serif" font-size="16" font-weight="700" letter-spacing="0.8">${label}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function createInitialDb(): DemoDb {
  const vehicles: Vehicle[] = [
    { id: 1, make: 'Toyota', model: 'Corolla', year: 2015 },
    { id: 2, make: 'Toyota', model: 'Corolla', year: 2018 },
    { id: 3, make: 'Toyota', model: 'Corolla', year: 2021 },
    { id: 4, make: 'Toyota', model: 'Hilux', year: 2018 },
    { id: 5, make: 'Toyota', model: 'Hilux', year: 2022 },
    { id: 6, make: 'Toyota', model: 'RAV4', year: 2019 },
    { id: 7, make: 'Toyota', model: 'Yaris', year: 2017 },
    { id: 8, make: 'Hyundai', model: 'Tucson', year: 2018 },
    { id: 9, make: 'Hyundai', model: 'Tucson', year: 2021 },
    { id: 10, make: 'Hyundai', model: 'Santa Fe', year: 2019 },
    { id: 11, make: 'Kia', model: 'Sportage', year: 2019 },
    { id: 12, make: 'Mercedes-Benz', model: 'Classe C (W204)', year: 2013 },
    { id: 13, make: 'Mercedes-Benz', model: 'Classe E (W212)', year: 2015 },
    { id: 14, make: 'Peugeot', model: '3008', year: 2019 },
    { id: 15, make: 'Nissan', model: 'Qashqai', year: 2018 },
  ];

  const parts: DemoPartRecord[] = [
    {
      id: 1,
      name: 'Jeu de 4 plaquettes de frein avant céramique',
      reference: 'BRK-TY-0987',
      oem_number: '04465-02220',
      brand: 'Brembo',
      category: 'Freinage',
      description:
        'Plaquettes avant haute endurance adaptées à la conduite urbaine et routière. Faible poussière, témoin sonore d’usure intégré et garniture anti-bruit.',
      price: 24500,
      stock: 16,
      image_url: partSvg('PLAQUETTES DE FREIN BREMBO', '#FF7A1F'),
      vehicle_ids: [1, 2, 3, 7],
    },
    {
      id: 2,
      name: 'Paire de disques de frein avant ventilés (275 mm)',
      reference: 'DSC-TY-275V',
      oem_number: '43512-02180',
      brand: 'TRW',
      category: 'Freinage',
      description:
        'Disques ventilés traités anticorrosion pour un freinage stable sous forte chaleur et route humide. Vendus par paire pour l’essieu avant.',
      price: 58000,
      stock: 7,
      image_url: partSvg('DISQUES VENTILÉS TRW', '#FF7A1F'),
      vehicle_ids: [1, 2, 6],
    },
    {
      id: 3,
      name: 'Filtre à huile moteur longue durée',
      reference: 'FLT-MN-W68',
      oem_number: '90915-YZZD2',
      brand: 'Mann-Filter',
      category: 'Filtration',
      description:
        'Clapet anti-retour en silicone et média filtrant haute capacité protégeant le moteur dès le démarrage à froid.',
      price: 6500,
      stock: 34,
      image_url: partSvg('FILTRE À HUILE MANN', '#FFB703'),
      vehicle_ids: [1, 2, 3, 4, 5, 6, 7],
    },
    {
      id: 4,
      name: 'Filtre à air moteur renforcé anti-poussière',
      reference: 'FLT-BS-A412',
      oem_number: '17801-21050',
      brand: 'Bosch',
      category: 'Filtration',
      description:
        'Conçu pour les environnements poussiéreux et tropicaux. Préserve le débitmètre et optimise la consommation de carburant.',
      price: 11000,
      stock: 19,
      image_url: partSvg('FILTRE À AIR BOSCH', '#FFB703'),
      vehicle_ids: [1, 2, 3, 6, 8, 11],
    },
    {
      id: 5,
      name: 'Filtre à gasoil avec séparateur d’eau Hilux',
      reference: 'FLT-DN-HD04',
      oem_number: '23390-0L070',
      brand: 'Denso',
      category: 'Filtration',
      description:
        'Filtration fine 5 microns protégeant la pompe haute pression et les injecteurs Common Rail D-4D contre l’eau et les impuretés.',
      price: 15500,
      stock: 4,
      image_url: partSvg('FILTRE GASOIL DENSO', '#FFB703'),
      vehicle_ids: [4, 5],
    },
    {
      id: 6,
      name: 'Kit 2 amortisseurs avant à gaz Excel-G',
      reference: 'SUS-KYB-3391',
      oem_number: '48510-8Z085',
      brand: 'KYB',
      category: 'Suspension & Direction',
      description:
        'Amortisseurs bi-tube gaz basse pression offrant une tenue de cap ferme et une absorption optimale sur chaussées dégradées.',
      price: 92000,
      stock: 5,
      image_url: partSvg('AMORTISSEURS AVANT KYB', '#38BDF8'),
      vehicle_ids: [1, 2, 6, 8, 9, 11],
    },
    {
      id: 7,
      name: 'Biellette de barre stabilisatrice renforcée',
      reference: 'SUS-TRW-JTS4',
      oem_number: '48820-42030',
      brand: 'TRW',
      category: 'Suspension & Direction',
      description:
        'Rotule acier forgé avec soufflet néoprène étanche, supprime les claquements du train avant dans les virages et ralentisseurs.',
      price: 14500,
      stock: 12,
      image_url: partSvg('BIELLETTE STABILISATRICE', '#38BDF8'),
      vehicle_ids: [1, 2, 6, 8, 10, 11, 15],
    },
    {
      id: 8,
      name: 'Batterie démarrage 12V 70Ah 640A Sans Entretien',
      reference: 'ELC-BS-S4007',
      oem_number: '28800-0T050',
      brand: 'Bosch',
      category: 'Allumage & Électricité',
      description:
        'Grille PowerFrame résistante aux fortes températures ambiantes. Démarrage franc et réserve d’énergie élevée pour véhicules climatisés.',
      price: 78000,
      stock: 9,
      image_url: partSvg('BATTERIE 12V 70AH BOSCH', '#22C55E'),
      vehicle_ids: [1, 2, 3, 6, 8, 9, 10, 11, 12, 14, 15],
    },
    {
      id: 9,
      name: 'Coffret 4 bougies d’allumage Iridium IX',
      reference: 'ELC-NGK-6619',
      oem_number: '90919-01253',
      brand: 'NGK',
      category: 'Allumage & Électricité',
      description:
        'Électrode centrale en iridium soudée au laser pour une combustion complète, des reprises souples et une longévité jusqu’à 80 000 km.',
      price: 32000,
      stock: 11,
      image_url: partSvg('4 BOUGIES IRIDIUM NGK', '#22C55E'),
      vehicle_ids: [1, 2, 3, 6, 7, 8, 11, 15],
    },
    {
      id: 10,
      name: 'Alternateur neuf 12V 120A poulie débrayable',
      reference: 'ELC-VAL-4396',
      oem_number: '27060-0T130',
      brand: 'Valeo',
      category: 'Allumage & Électricité',
      description:
        'Alternateur complet prêt à monter, testé sur banc d’essai, régulateur électronique intégré.',
      price: 135000,
      stock: 0,
      image_url: partSvg('ALTERNATEUR 120A VALEO', '#22C55E'),
      vehicle_ids: [1, 2, 6, 12, 13],
    },
    {
      id: 11,
      name: 'Kit courroie de distribution + pompe à eau',
      reference: 'MOT-GT-KP156',
      oem_number: '13568-09131',
      brand: 'Gates',
      category: 'Moteur & Distribution',
      description:
        'Kit PowerGrip complet comprenant courroie synchrone, galet tendeur, galet enrouleur, joints et pompe à eau haute débit.',
      price: 84000,
      stock: 3,
      image_url: partSvg('KIT DISTRIBUTION GATES', '#A78BFA'),
      vehicle_ids: [4, 5, 10, 14],
    },
    {
      id: 12,
      name: 'Radiateur de refroidissement moteur aluminium',
      reference: 'CLM-DN-DRM50',
      oem_number: '16400-0T030',
      brand: 'Denso',
      category: 'Refroidissement',
      description:
        'Faisceau aluminium brasé haute dissipation thermique pour circulation dense sous climat chaud.',
      price: 74000,
      stock: 6,
      image_url: partSvg('RADIATEUR ALU DENSO', '#38BDF8'),
      vehicle_ids: [1, 2, 3, 7, 8],
    },
    {
      id: 13,
      name: 'Pompe à eau renforcée avec joint métallique',
      reference: 'CLM-VAL-5068',
      oem_number: '16100-39466',
      brand: 'Valeo',
      category: 'Refroidissement',
      description:
        'Turbine équilibrée et garniture mécanique carbure de silicium assurant une étanchéité durable du circuit de refroidissement.',
      price: 29500,
      stock: 8,
      image_url: partSvg('POMPE À EAU VALEO', '#38BDF8'),
      vehicle_ids: [1, 2, 6, 12, 13],
    },
    {
      id: 14,
      name: 'Paire d’ampoules LED H7 6000K Vision Plus',
      reference: 'ECL-PH-H7LED',
      oem_number: '90981-13058',
      brand: 'Bosch',
      category: 'Éclairage & Carrosserie',
      description:
        'Faisceau blanc pur anti-éblouissement offrant +180 % de visibilité nocturne sous la pluie. Montage Plug & Play.',
      price: 22000,
      stock: 15,
      image_url: partSvg('AMPOULES H7 LED VISION', '#FBBF24'),
      vehicle_ids: [2, 3, 8, 9, 11, 12, 13, 14, 15],
    },
  ];

  const users: DemoUserRecord[] = [
    {
      id: 1,
      name: 'Administrateur démo',
      email: 'admin@autocarwat.cm',
      is_admin: true,
      password: 'Admin123456',
    },
    {
      id: 2,
      name: 'Client démo',
      email: 'client@autocarwat.cm',
      is_admin: false,
      password: 'Client123456',
    },
  ];
  const orders: DemoOrderRecord[] = [
    {
      id: 1,
      user_id: 2,
      stock_reserved: true,
      status: 'shipped',
      total: 116500,
      created_at: '2026-10-25T09:30:00.000Z',
      items: [
        { part: parts[5].name, reference: parts[5].reference, unit_price: 92000, quantity: 1 },
        { part: parts[0].name, reference: parts[0].reference, unit_price: 24500, quantity: 1 },
      ],
    },
    {
      id: 2,
      user_id: 2,
      stock_reserved: true,
      status: 'awaiting_payment',
      total: 31000,
      created_at: '2026-10-28T08:05:00.000Z',
      items: [
        { part: parts[0].name, reference: parts[0].reference, unit_price: 24500, quantity: 1 },
        { part: parts[2].name, reference: parts[2].reference, unit_price: 6500, quantity: 1 },
      ],
    },
  ];
  const payments: Payment[] = [
    {
      id: 1,
      order_id: 1,
      provider: 'mtn',
      payer_phone: '600000001',
      transaction_reference: 'DEMO-001',
      amount: 116500,
      status: 'confirmed',
      confirmed_by: 1,
      confirmed_at: '2026-10-25T10:15:00.000Z',
      created_at: '2026-10-25T09:42:00.000Z',
    },
    {
      id: 2,
      order_id: 2,
      provider: 'orange',
      payer_phone: '600000002',
      transaction_reference: 'DEMO-002',
      amount: 31000,
      status: 'initiated',
      confirmed_by: null,
      confirmed_at: null,
      created_at: '2026-10-28T08:15:00.000Z',
    },
  ];
  return { users, tokens: {}, vehicles, parts, orders, payments };
}

@Injectable({ providedIn: 'root' })
export class DemoBackendService {
  private readDb(): DemoDb {
    try {
      const raw = localStorage.getItem(DEMO_DB_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as DemoDb;
        if (
          Array.isArray(parsed.parts) &&
          Array.isArray(parsed.users) &&
          Array.isArray(parsed.orders)
        )
          return parsed;
      }
    } catch {}
    const db = createInitialDb();
    this.writeDb(db);
    return db;
  }
  private writeDb(db: DemoDb) {
    try {
      localStorage.setItem(DEMO_DB_KEY, JSON.stringify(db));
    } catch {}
  }
  private part(p: DemoPartRecord, vehicles: Vehicle[]): Part {
    const { vehicle_ids, ...rest } = p;
    return { ...rest, vehicles: vehicles.filter((v) => vehicle_ids.includes(v.id)) };
  }
  private order(o: DemoOrderRecord): Order {
    const { user_id: _, stock_reserved: __, ...resource } = o;
    return resource;
  }
  private currentUser(req: HttpRequest<unknown>, db: DemoDb): DemoUserRecord | null {
    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
    return db.users.find((user) => user.id === db.tokens[token]) ?? null;
  }
  private ok<T>(body: T, status = 200): Observable<HttpResponse<T>> {
    return of(new HttpResponse({ status, body })).pipe(delay(80));
  }
  private err(
    status: number,
    message: string,
    errors?: Record<string, string[]>,
  ): Observable<never> {
    return throwError(
      () => new HttpErrorResponse({ status, error: errors ? { message, errors } : { message } }),
    );
  }
  private page<T>(items: T[], req: HttpRequest<unknown>, size: number) {
    const requested = Math.max(1, Number(req.params.get('page')) || 1);
    const last = Math.max(1, Math.ceil(items.length / size));
    const page = Math.min(requested, last);
    return {
      data: items.slice((page - 1) * size, page * size),
      current_page: page,
      last_page: last,
      per_page: size,
      total: items.length,
    };
  }
  private paymentWithOrder(p: Payment, db: DemoDb): Payment {
    const order = db.orders.find((o) => o.id === p.order_id);
    const user = db.users.find((u) => u.id === order?.user_id);
    return {
      ...p,
      order: order
        ? { id: order.id, user: user ? { id: user.id, name: user.name, email: user.email } : null }
        : null,
    };
  }

  handle(req: HttpRequest<unknown>): Observable<HttpResponse<unknown>> {
    const db = this.readDb();
    const path = new URL(req.url, 'http://localhost').pathname.replace(/^\/api/, '') || '/';
    const method = req.method.toUpperCase();
    const body = (req.body ?? {}) as Record<string, any>;

    if (method === 'POST' && path === '/login') {
      const user = db.users.find(
        (u) =>
          u.email.toLowerCase() ===
            String(body['email'] ?? '')
              .trim()
              .toLowerCase() && u.password === body['password'],
      );
      if (!user)
        return this.err(422, 'Identifiants invalides.', { email: ['Identifiants invalides.'] });
      for (const [token, id] of Object.entries(db.tokens))
        if (id === user.id) delete db.tokens[token];
      const token = `demo_${user.id}_${Date.now()}`;
      db.tokens[token] = user.id;
      this.writeDb(db);
      return this.ok({ token });
    }
    if (method === 'POST' && path === '/register') {
      const name = String(body['name'] ?? '').trim();
      const email = String(body['email'] ?? '')
        .trim()
        .toLowerCase();
      const password = String(body['password'] ?? '');
      const errors: Record<string, string[]> = {};
      if (!name) errors['name'] = ['Le nom est obligatoire.'];
      if (!email.includes('@') || db.users.some((u) => u.email.toLowerCase() === email))
        errors['email'] = ['Adresse e-mail invalide ou déjà utilisée.'];
      if (
        password.length < 10 ||
        !/[A-Za-z]/.test(password) ||
        !/\d/.test(password) ||
        password !== body['password_confirmation']
      )
        errors['password'] = ['Mot de passe ou confirmation invalide.'];
      if (Object.keys(errors).length) return this.err(422, 'Données invalides.', errors);
      const id = Math.max(0, ...db.users.map((u) => u.id)) + 1;
      db.users.push({ id, name, email, is_admin: false, password });
      const token = `demo_${id}_${Date.now()}`;
      db.tokens[token] = id;
      this.writeDb(db);
      return this.ok({ token }, 201);
    }
    if (method === 'GET' && (path === '/me' || path === '/user')) {
      const user = this.currentUser(req, db);
      if (!user) return this.err(401, 'Session expirée.');
      const { password: _, ...safe } = user;
      return this.ok(safe);
    }
    if (method === 'POST' && path === '/logout') {
      const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
      delete db.tokens[token];
      this.writeDb(db);
      return this.ok(null, 204);
    }

    if (method === 'GET' && path === '/vehicles') {
      const make = (req.params.get('make') ?? '').toLowerCase();
      return this.ok(
        this.page(
          db.vehicles.filter((v) => !make || v.make.toLowerCase() === make),
          req,
          15,
        ),
      );
    }
    if (method === 'GET' && path === '/parts') {
      const search = (req.params.get('search') ?? '').trim().toLowerCase().replace(/[\s-]/g, '');
      const vehicleId = Number(req.params.get('vehicle_id') ?? 0);
      const categoryId = Number(req.params.get('category_id') ?? 0);
      const make = (req.params.get('make') ?? '').trim().toLowerCase();
      const filtered = db.parts
        .filter((p) => {
          if (vehicleId && !p.vehicle_ids.includes(vehicleId)) return false;
          if (
            make &&
            !p.vehicle_ids.some((id) =>
              db.vehicles.some((v) => v.id === id && v.make.toLowerCase() === make),
            )
          )
            return false;
          if (categoryId && p.category !== PART_CATEGORIES[categoryId - 1]) return false;
          const hay = `${p.name} ${p.reference} ${p.oem_number ?? ''}`
            .toLowerCase()
            .replace(/[\s-]/g, '');
          return !search || hay.includes(search);
        })
        .sort((a, b) => b.id - a.id)
        .map((p) => this.part(p, db.vehicles));
      return this.ok(this.page(filtered, req, 15));
    }
    const partMatch = path.match(/^\/parts\/(\d+)$/);
    if (method === 'GET' && partMatch) {
      const part = db.parts.find((p) => p.id === Number(partMatch[1]));
      return part ? this.ok(this.part(part, db.vehicles)) : this.err(404, 'Pièce introuvable.');
    }

    if (path.startsWith('/orders')) {
      const user = this.currentUser(req, db);
      if (!user) return this.err(401, 'Authentification requise.');
      if (method === 'GET' && path === '/orders') {
        const orders = db.orders
          .filter((o) => o.user_id === user.id)
          .sort((a, b) => b.id - a.id)
          .map((o) => this.order(o));
        return this.ok(this.page(orders, req, 10));
      }
      if (method === 'POST' && path === '/orders') {
        const items = body['items'];
        if (!Array.isArray(items) || !items.length) return this.err(422, 'Votre panier est vide.');
        const quantities = new Map<number, number>();
        for (const item of items) {
          const id = Number(item.part_id);
          const quantity = Number(item.quantity);
          if (!Number.isInteger(id) || !Number.isInteger(quantity) || quantity < 1)
            return this.err(422, 'Quantité invalide.');
          quantities.set(id, (quantities.get(id) ?? 0) + quantity);
        }
        // Vérifier tout le stock avant de le modifier.
        for (const [id, quantity] of quantities) {
          const part = db.parts.find((p) => p.id === id);
          if (!part) return this.err(404, 'Pièce introuvable.');
          if (part.stock < quantity)
            return this.err(422, `Stock insuffisant pour « ${part.name} ».`);
        }
        const orderItems = [...quantities].map(([id, quantity]) => {
          const part = db.parts.find((p) => p.id === id)!;
          part.stock -= quantity;
          return { part: part.name, reference: part.reference, quantity, unit_price: part.price };
        });
        const order: DemoOrderRecord = {
          id: Math.max(0, ...db.orders.map((o) => o.id)) + 1,
          user_id: user.id,
          stock_reserved: true,
          status: 'pending',
          total: orderItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0),
          created_at: new Date().toISOString(),
          items: orderItems,
        };
        db.orders.push(order);
        this.writeDb(db);
        return this.ok(this.order(order), 201);
      }
      const match = path.match(/^\/orders\/(\d+)(?:\/(cancel|payment|payment\/reference))?$/);
      if (match) {
        const order = db.orders.find((o) => o.id === Number(match[1]));
        if (!order) return this.err(404, 'Commande introuvable.');
        if (order.user_id !== user.id)
          return this.err(403, 'Cette commande ne vous appartient pas.');
        if (method === 'GET' && !match[2]) return this.ok(this.order(order));
        if (method === 'POST' && match[2] === 'cancel') {
          if (!['pending', 'awaiting_payment'].includes(order.status))
            return this.err(422, 'Cette commande ne peut plus être annulée.');
          order.status = 'cancelled';
          if (order.stock_reserved) {
            for (const item of order.items) {
              const part = db.parts.find((p) => p.reference === item.reference);
              if (part) part.stock += item.quantity;
            }
            order.stock_reserved = false;
          }
          for (const p of db.payments.filter(
            (p) => p.order_id === order.id && p.status === 'initiated',
          ))
            p.status = 'rejected';
          this.writeDb(db);
          return this.ok(this.order(order));
        }
        if (method === 'POST' && match[2] === 'payment') {
          if (!['pending', 'awaiting_payment'].includes(order.status))
            return this.err(422, 'Cette commande ne peut plus être payée.');
          const provider = body['provider'] as PaymentOperator;
          const phone = normalizeCameroonPhone(String(body['phone'] ?? ''));
          if (!['orange', 'mtn'].includes(provider) || !phone)
            return this.err(422, 'Informations de paiement invalides.', {
              phone: ['Numéro de téléphone invalide.'],
            });
          const payment: Payment = {
            id: Math.max(0, ...db.payments.map((p) => p.id)) + 1,
            order_id: order.id,
            provider,
            payer_phone: phone,
            transaction_reference: null,
            amount: order.total,
            status: 'initiated',
            confirmed_by: null,
            confirmed_at: null,
            created_at: new Date().toISOString(),
          };
          db.payments.push(payment);
          order.status = 'awaiting_payment';
          this.writeDb(db);
          return this.ok(
            {
              payment_id: payment.id,
              order_status: order.status,
              provider,
              amount: order.total,
              cashier_number: 'Compte de démonstration',
              ussd_code: 'Simulation — aucun code à composer',
              dial_uri: '',
              instructions:
                'Simulation uniquement : aucun transfert réel ne doit être effectué. Saisissez une référence fictive pour continuer.',
            },
            201,
          );
        }
        if (method === 'POST' && match[2] === 'payment/reference') {
          const reference = String(body['transaction_reference'] ?? '').trim();
          const payment = [...db.payments]
            .reverse()
            .find((p) => p.order_id === order.id && p.status === 'initiated');
          if (!payment || order.status !== 'awaiting_payment')
            return this.err(422, 'Aucun paiement en cours pour cette commande.');
          if (!reference)
            return this.err(422, 'La référence est obligatoire.', {
              transaction_reference: ['La référence est obligatoire.'],
            });
          if (db.payments.some((p) => p.transaction_reference === reference && p.id !== payment.id))
            return this.err(422, 'Cette référence est déjà utilisée.');
          payment.transaction_reference = reference;
          this.writeDb(db);
          return this.ok({ message: 'Référence enregistrée. En attente de validation.' });
        }
      }
    }

    if (path.startsWith('/admin')) {
      const user = this.currentUser(req, db);
      if (!user) return this.err(401, 'Authentification requise.');
      if (!user.is_admin) return this.err(403, 'Accès réservé aux administrateurs.');
      if (method === 'GET' && path === '/admin/payments') {
        const status = req.params.get('status') ?? 'initiated';
        const payments = db.payments
          .filter((p) => p.status === status)
          .sort((a, b) => b.id - a.id)
          .map((p) => this.paymentWithOrder(p, db));
        return this.ok(this.page(payments, req, 20));
      }
      const payMatch = path.match(/^\/admin\/payments\/(\d+)\/(confirm|reject)$/);
      if (method === 'POST' && payMatch) {
        const payment = db.payments.find((p) => p.id === Number(payMatch[1]));
        if (!payment) return this.err(404, 'Paiement introuvable.');
        if (payment.status !== 'initiated') return this.err(422, 'Ce paiement a déjà été traité.');
        const order = db.orders.find((o) => o.id === payment.order_id);
        if (!order || order.status !== 'awaiting_payment')
          return this.err(422, 'Commande non payable.');
        if (payMatch[2] === 'confirm') {
          if (!payment.transaction_reference)
            return this.err(422, 'La référence de transaction est requise.');
          payment.status = 'confirmed';
          payment.confirmed_by = user.id;
          payment.confirmed_at = new Date().toISOString();
          order.status = 'paid';
        } else {
          payment.status = 'rejected';
          order.status = 'pending';
          if (order.stock_reserved) {
            for (const item of order.items) {
              const part = db.parts.find((p) => p.reference === item.reference);
              if (part) part.stock += item.quantity;
            }
            order.stock_reserved = false;
          }
        }
        this.writeDb(db);
        return this.ok({ ...payment, order: this.order(order) });
      }
      if (method === 'GET' && path === '/admin/orders') {
        const status = req.params.get('status') ?? '';
        const orders = db.orders
          .filter((o) => !status || o.status === status)
          .sort((a, b) => b.id - a.id)
          .map((o) => this.order(o));
        return this.ok(this.page(orders, req, 20));
      }
      const statusMatch = path.match(/^\/admin\/orders\/(\d+)\/status$/);
      if (method === 'PATCH' && statusMatch) {
        const order = db.orders.find((o) => o.id === Number(statusMatch[1]));
        if (!order) return this.err(404, 'Commande introuvable.');
        const transitions: Record<OrderStatus, OrderStatus[]> = {
          pending: ['awaiting_payment', 'cancelled'],
          awaiting_payment: ['pending', 'cancelled'],
          paid: ['shipped', 'cancelled'],
          shipped: ['delivered'],
          delivered: [],
          cancelled: [],
        };
        const status = body['status'] as OrderStatus;
        if (!transitions[order.status].includes(status))
          return this.err(422, 'Transition interdite.');
        if (status === 'cancelled' && order.stock_reserved) {
          for (const item of order.items) {
            const part = db.parts.find((p) => p.reference === item.reference);
            if (part) part.stock += item.quantity;
          }
          order.stock_reserved = false;
        }
        order.status = status;
        this.writeDb(db);
        return this.ok(this.order(order));
      }
      const adminPartMatch = path.match(/^\/admin\/parts(?:\/(\d+))?(?:\/(vehicles))?$/);
      if (adminPartMatch) {
        const id = Number(adminPartMatch[1] ?? 0);
        const part = db.parts.find((p) => p.id === id);
        if (method === 'PUT' && id && adminPartMatch[2] === 'vehicles') {
          if (!part) return this.err(404, 'Pièce introuvable.');
          if (
            !Array.isArray(body['vehicle_ids']) ||
            body['vehicle_ids'].some(
              (v: number) => !db.vehicles.some((vehicle) => vehicle.id === v),
            )
          )
            return this.err(422, 'Véhicules invalides.');
          part.vehicle_ids = body['vehicle_ids'];
          this.writeDb(db);
          return this.ok({ message: 'Compatibilité mise à jour.' });
        }
        if (method === 'DELETE' && id) {
          if (!part) return this.err(404, 'Pièce introuvable.');
          if (db.orders.some((o) => o.items.some((item) => item.reference === part.reference)))
            return this.err(409, 'Pièce déjà référencée dans une commande.');
          db.parts = db.parts.filter((p) => p.id !== id);
          this.writeDb(db);
          return this.ok(null, 204);
        }
        if ((method === 'POST' && !id) || (method === 'PUT' && id)) {
          if (id && !part) return this.err(404, 'Pièce introuvable.');
          const value = (key: string): any =>
            req.body instanceof FormData ? req.body.get(key) : body[key];
          const name = String(value('name') ?? part?.name ?? '').trim();
          const reference = String(value('reference') ?? part?.reference ?? '').trim();
          const price = Number(value('price') ?? part?.price ?? -1);
          const stock = Number(value('stock') ?? part?.stock ?? -1);
          if (
            !name ||
            !reference ||
            price < 0 ||
            stock < 0 ||
            (!id && (!value('category_id') || !value('brand_id')))
          )
            return this.err(422, 'Vérifiez les champs de la pièce.');
          if (db.parts.some((p) => p.id !== id && p.reference === reference))
            return this.err(422, 'Référence déjà utilisée.');
          const categoryId = Number(value('category_id') ?? 0);
          const brandId = Number(value('brand_id') ?? 0);
          const updated: DemoPartRecord = {
            id: id || Math.max(0, ...db.parts.map((p) => p.id)) + 1,
            name,
            reference,
            oem_number: value('oem_number') || null,
            description: value('description') || null,
            price,
            stock,
            category: categoryId
              ? (PART_CATEGORIES[categoryId - 1] ?? `Catégorie ${categoryId}`)
              : (part?.category ?? null),
            brand: brandId ? `Marque ${brandId}` : (part?.brand ?? null),
            image_url: part?.image_url ?? partSvg(name.slice(0, 24).toUpperCase(), '#FF7A1F'),
            vehicle_ids: part?.vehicle_ids ?? [],
          };
          if (part) db.parts[db.parts.indexOf(part)] = updated;
          else db.parts.push(updated);
          this.writeDb(db);
          return this.ok(this.part(updated, db.vehicles), id ? 200 : 201);
        }
      }
    }
    return this.err(404, `Endpoint non pris en charge en mode démo (${method} ${path}).`);
  }
}
