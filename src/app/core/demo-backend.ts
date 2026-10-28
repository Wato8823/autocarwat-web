import {
  HttpErrorResponse,
  HttpInterceptorFn,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, delay, of, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { User } from './auth';
import {
  AdminStats,
  CreateOrderPayload,
  Order,
  OrderStatus,
  Paginated,
  Part,
  PartUpsertPayload,
  Payment,
  SubmitPaymentPayload,
  Vehicle,
  calculateShippingFee,
} from './models';

interface DemoUserRecord extends User {
  password: string;
}

interface DemoPartRecord extends Omit<Part, 'vehicles'> {
  vehicle_ids: number[];
}

interface DemoDb {
  users: DemoUserRecord[];
  tokens: Record<string, number>;
  vehicles: Vehicle[];
  parts: DemoPartRecord[];
  orders: Order[];
  payments: Payment[];
}

const DB_KEY = 'autocarwat_demo_db_v1';

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
      name: 'Cabrel Wokam (Admin)',
      email: 'admin@autocarwat.cm',
      phone: '699 45 12 80',
      is_admin: true,
      password: 'Admin123456',
    },
    {
      id: 2,
      name: 'Jean-Marc Tchoumi',
      email: 'client@autocarwat.cm',
      phone: '694 12 34 56',
      is_admin: false,
      password: 'Client123456',
    },
  ];

  const payments: Payment[] = [
    {
      id: 1,
      order_id: 1,
      order_number: 'CMD-2026-0041',
      customer_name: 'Jean-Marc Tchoumi',
      customer_email: 'client@autocarwat.cm',
      operator: 'mtn_momo',
      sender_phone: '677 51 20 89',
      transaction_ref: 'MOMO-261024-883412',
      amount: 116500,
      notes: 'Paiement effectué depuis le compte MTN MoMo personnel.',
      status: 'approved',
      reviewed_at: '2026-10-25T10:15:00.000Z',
      created_at: '2026-10-25T09:42:00.000Z',
    },
    {
      id: 2,
      order_id: 2,
      order_number: 'CMD-2026-0042',
      customer_name: 'Jean-Marc Tchoumi',
      customer_email: 'client@autocarwat.cm',
      operator: 'orange_money',
      sender_phone: '694 12 34 56',
      transaction_ref: 'MP261028.0915.C48291',
      amount: 33000,
      notes: 'Transfert Orange Money effectué ce matin.',
      status: 'pending',
      created_at: '2026-10-28T08:15:00.000Z',
    },
  ];

  const orders: Order[] = [
    {
      id: 1,
      order_number: 'CMD-2026-0041',
      user_id: 2,
      customer_name: 'Jean-Marc Tchoumi',
      customer_phone: '694 12 34 56',
      customer_email: 'client@autocarwat.cm',
      shipping_city: 'Douala',
      shipping_address: 'Akwa, Rue Castelnau près Pharmacie du Centre',
      notes: 'Appeler 15 min avant livraison.',
      subtotal: 116500,
      shipping_fee: 0,
      total: 116500,
      status: 'shipped',
      items: [
        {
          id: 1,
          part_id: 6,
          part_name: 'Kit 2 amortisseurs avant à gaz Excel-G',
          part_reference: 'SUS-KYB-3391',
          unit_price: 92000,
          quantity: 1,
          subtotal: 92000,
          image_url: parts[5].image_url,
        },
        {
          id: 2,
          part_id: 1,
          part_name: 'Jeu de 4 plaquettes de frein avant céramique',
          part_reference: 'BRK-TY-0987',
          unit_price: 24500,
          quantity: 1,
          subtotal: 24500,
          image_url: parts[0].image_url,
        },
      ],
      payment: payments[0],
      created_at: '2026-10-25T09:30:00.000Z',
      updated_at: '2026-10-26T14:20:00.000Z',
    },
    {
      id: 2,
      order_number: 'CMD-2026-0042',
      user_id: 2,
      customer_name: 'Jean-Marc Tchoumi',
      customer_phone: '694 12 34 56',
      customer_email: 'client@autocarwat.cm',
      shipping_city: 'Douala',
      shipping_address: 'Bonamoussadi, Carrefour Maetur',
      subtotal: 31000,
      shipping_fee: 2000,
      total: 33000,
      status: 'payment_submitted',
      items: [
        {
          id: 3,
          part_id: 1,
          part_name: 'Jeu de 4 plaquettes de frein avant céramique',
          part_reference: 'BRK-TY-0987',
          unit_price: 24500,
          quantity: 1,
          subtotal: 24500,
          image_url: parts[0].image_url,
        },
        {
          id: 4,
          part_id: 3,
          part_name: 'Filtre à huile moteur longue durée',
          part_reference: 'FLT-MN-W68',
          unit_price: 6500,
          quantity: 1,
          subtotal: 6500,
          image_url: parts[2].image_url,
        },
      ],
      payment: payments[1],
      created_at: '2026-10-28T08:05:00.000Z',
      updated_at: '2026-10-28T08:15:00.000Z',
    },
  ];

  return {
    users,
    tokens: {},
    vehicles,
    parts,
    orders,
    payments,
  };
}

@Injectable({ providedIn: 'root' })
export class DemoBackendService {
  readonly isActive = signal(false);

  activate() {
    if (!this.isActive()) {
      this.isActive.set(true);
    }
  }

  reconnectApi() {
    this.isActive.set(false);
  }

  resetDb() {
    const fresh = createInitialDb();
    this.writeDb(fresh);
  }

  private readDb(): DemoDb {
    try {
      const raw = localStorage.getItem(DB_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as DemoDb;
        if (parsed && Array.isArray(parsed.parts) && Array.isArray(parsed.users)) {
          return parsed;
        }
      }
    } catch {}
    const initial = createInitialDb();
    this.writeDb(initial);
    return initial;
  }

  private writeDb(db: DemoDb) {
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(db));
    } catch {}
  }

  private hydratePart(p: DemoPartRecord, vehicles: Vehicle[]): Part {
    const { vehicle_ids, ...rest } = p;
    return {
      ...rest,
      vehicles: vehicles.filter(v => vehicle_ids.includes(v.id)),
    };
  }

  private currentUser(req: HttpRequest<unknown>, db: DemoDb): DemoUserRecord | null {
    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!token) return null;
    const uid = db.tokens[token];
    if (!uid) return null;
    return db.users.find(u => u.id === uid) ?? null;
  }

  private ok<T>(body: T, status = 200): Observable<HttpResponse<T>> {
    return of(new HttpResponse({ status, body })).pipe(delay(80));
  }

  private err(status: number, message: string, errors?: Record<string, string[]>): Observable<never> {
    return throwError(
      () =>
        new HttpErrorResponse({
          status,
          error: errors ? { message, errors } : { message },
        }),
    );
  }

  handle(req: HttpRequest<unknown>): Observable<HttpResponse<unknown>> {
    this.activate();
    const db = this.readDb();
    const urlObj = new URL(req.url, 'http://localhost');
    const path = urlObj.pathname.replace(/^\/api/, '') || '/';
    const method = req.method.toUpperCase();
    const body = (req.body ?? {}) as Record<string, any>;

    // --- AUTH ---
    if (method === 'POST' && path === '/login') {
      const email = String(body['email'] ?? '').trim().toLowerCase();
      const password = String(body['password'] ?? '');
      const user = db.users.find(u => u.email.toLowerCase() === email && u.password === password);
      if (!user) {
        return this.err(401, 'Identifiants incorrects. Vérifiez votre e-mail et votre mot de passe.');
      }
      const token = `demo_${user.id}_${Date.now()}`;
      db.tokens[token] = user.id;
      this.writeDb(db);
      return this.ok({ token });
    }

    if (method === 'POST' && path === '/register') {
      const name = String(body['name'] ?? '').trim();
      const email = String(body['email'] ?? '').trim().toLowerCase();
      const phone = String(body['phone'] ?? '').trim();
      const password = String(body['password'] ?? '');
      const confirm = String(body['password_confirmation'] ?? '');
      const errors: Record<string, string[]> = {};
      if (!name) errors['name'] = ['Le nom complet est obligatoire.'];
      if (!email || !email.includes('@')) errors['email'] = ['Adresse e-mail invalide.'];
      if (db.users.some(u => u.email.toLowerCase() === email)) {
        errors['email'] = ['Cette adresse e-mail est déjà utilisée.'];
      }
      if (password.length < 10) {
        errors['password'] = ['Le mot de passe doit contenir au moins 10 caractères.'];
      } else if (password !== confirm) {
        errors['password'] = ['La confirmation du mot de passe ne correspond pas.'];
      }
      if (Object.keys(errors).length) {
        return this.err(422, 'Données invalides.', errors);
      }
      const id = Math.max(0, ...db.users.map(u => u.id)) + 1;
      const newUser: DemoUserRecord = {
        id,
        name,
        email,
        phone: phone || null,
        is_admin: false,
        password,
      };
      db.users.push(newUser);
      const token = `demo_${id}_${Date.now()}`;
      db.tokens[token] = id;
      this.writeDb(db);
      return this.ok({ token }, 201);
    }

    if (method === 'GET' && path === '/me') {
      const user = this.currentUser(req, db);
      if (!user) return this.err(401, 'Session expirée.');
      const { password: _, ...safeUser } = user;
      return this.ok(safeUser);
    }

    if (method === 'POST' && path === '/logout') {
      const authHeader = req.headers.get('Authorization') ?? '';
      const token = authHeader.replace(/^Bearer\s+/i, '').trim();
      if (token) {
        delete db.tokens[token];
        this.writeDb(db);
      }
      return this.ok({ message: 'Déconnecté' });
    }

    // --- PUBLIC CATALOG ---
    if (method === 'GET' && path === '/vehicles') {
      return this.ok([...db.vehicles]);
    }

    if (method === 'GET' && path === '/parts') {
      const search = (req.params.get('search') ?? '').trim().toLowerCase();
      const vehicleId = Number(req.params.get('vehicle_id') ?? 0);
      const category = (req.params.get('category') ?? '').trim();
      const brand = (req.params.get('brand') ?? '').trim();
      const inStock = req.params.get('in_stock') === '1';
      const sort = req.params.get('sort') ?? 'newest';
      const page = Math.max(1, Number(req.params.get('page') ?? 1));
      const perPage = Math.max(1, Number(req.params.get('per_page') ?? 8));

      let filtered = db.parts.filter(p => {
        if (vehicleId && !p.vehicle_ids.includes(vehicleId)) return false;
        if (category && p.category !== category) return false;
        if (brand && p.brand !== brand) return false;
        if (inStock && p.stock <= 0) return false;
        if (search) {
          const hay = `${p.name} ${p.reference} ${p.oem_number ?? ''} ${p.brand ?? ''} ${p.category ?? ''}`.toLowerCase();
          if (!hay.includes(search)) return false;
        }
        return true;
      });

      if (sort === 'price_asc') filtered = [...filtered].sort((a, b) => a.price - b.price);
      else if (sort === 'price_desc') filtered = [...filtered].sort((a, b) => b.price - a.price);
      else if (sort === 'name_asc') filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
      else filtered = [...filtered].sort((a, b) => b.id - a.id);

      const total = filtered.length;
      const lastPage = Math.max(1, Math.ceil(total / perPage));
      const safePage = Math.min(page, lastPage);
      const slice = filtered
        .slice((safePage - 1) * perPage, safePage * perPage)
        .map(p => this.hydratePart(p, db.vehicles));

      const response: Paginated<Part> = {
        data: slice,
        meta: { current_page: safePage, last_page: lastPage, total, per_page: perPage },
      };
      return this.ok(response);
    }

    const partDetailMatch = path.match(/^\/parts\/(\d+)$/);
    if (method === 'GET' && partDetailMatch) {
      const id = Number(partDetailMatch[1]);
      const found = db.parts.find(p => p.id === id);
      if (!found) return this.err(404, 'Pièce introuvable.');
      return this.ok({ data: this.hydratePart(found, db.vehicles) });
    }

    // --- CUSTOMER ORDERS & PAYMENTS ---
    if (path.startsWith('/orders')) {
      const user = this.currentUser(req, db);
      if (!user) return this.err(401, 'Veuillez vous connecter pour accéder à vos commandes.');

      if (method === 'GET' && path === '/orders') {
        const list = db.orders
          .filter(o => o.user_id === user.id || user.is_admin)
          .sort((a, b) => b.id - a.id);
        return this.ok({ data: list });
      }

      if (method === 'POST' && path === '/orders') {
        const payload = body as CreateOrderPayload;
        if (!payload.items?.length) {
          return this.err(422, 'Votre panier est vide.');
        }
        const errors: Record<string, string[]> = {};
        if (!payload.customer_name?.trim()) errors['customer_name'] = ['Le nom du destinataire est requis.'];
        if (!payload.customer_phone?.trim()) errors['customer_phone'] = ['Le numéro de téléphone est requis.'];
        if (!payload.shipping_city?.trim()) errors['shipping_city'] = ['La ville est requise.'];
        if (!payload.shipping_address?.trim()) errors['shipping_address'] = ['L’adresse de livraison est requise.'];
        if (Object.keys(errors).length) return this.err(422, 'Veuillez vérifier les champs.', errors);

        const orderItems = [];
        let subtotal = 0;
        let nextItemId =
          Math.max(0, ...db.orders.flatMap(o => o.items.map(i => i.id))) + 1;

        for (const reqItem of payload.items) {
          const part = db.parts.find(p => p.id === reqItem.part_id);
          if (!part) return this.err(422, `Pièce #${reqItem.part_id} introuvable.`);
          if (part.stock < reqItem.quantity) {
            return this.err(422, `Stock insuffisant pour "${part.name}" (${part.stock} restant).`);
          }
          part.stock -= reqItem.quantity;
          const lineSub = part.price * reqItem.quantity;
          subtotal += lineSub;
          orderItems.push({
            id: nextItemId++,
            part_id: part.id,
            part_name: part.name,
            part_reference: part.reference,
            unit_price: part.price,
            quantity: reqItem.quantity,
            subtotal: lineSub,
            image_url: part.image_url,
          });
        }

        const shippingFee = calculateShippingFee(subtotal, payload.shipping_city);
        const total = subtotal + shippingFee;
        const orderId = Math.max(40, ...db.orders.map(o => o.id)) + 1;
        const orderNumber = `CMD-2026-${String(orderId).padStart(4, '0')}`;
        const now = new Date().toISOString();

        let payment: Payment | null = null;
        let status: OrderStatus = 'pending_payment';

        if (payload.payment?.transaction_ref?.trim()) {
          const payId = Math.max(0, ...db.payments.map(p => p.id)) + 1;
          payment = {
            id: payId,
            order_id: orderId,
            order_number: orderNumber,
            customer_name: payload.customer_name.trim(),
            customer_email: user.email,
            operator: payload.payment.operator,
            sender_phone: payload.payment.sender_phone.trim(),
            transaction_ref: payload.payment.transaction_ref.trim().toUpperCase(),
            amount: total,
            proof_url: payload.payment.proof_url ?? null,
            proof_name: payload.payment.proof_name ?? null,
            notes: payload.payment.notes?.trim() || null,
            status: 'pending',
            created_at: now,
          };
          db.payments.push(payment);
          status = 'payment_submitted';
        }

        const order: Order = {
          id: orderId,
          order_number: orderNumber,
          user_id: user.id,
          customer_name: payload.customer_name.trim(),
          customer_phone: payload.customer_phone.trim(),
          customer_email: user.email,
          shipping_city: payload.shipping_city.trim(),
          shipping_address: payload.shipping_address.trim(),
          notes: payload.notes?.trim() || null,
          subtotal,
          shipping_fee: shippingFee,
          total,
          status,
          items: orderItems,
          payment,
          created_at: now,
          updated_at: now,
        };

        db.orders.push(order);
        this.writeDb(db);
        return this.ok({ data: order }, 201);
      }

      const orderDetailMatch = path.match(/^\/orders\/(\d+)$/);
      if (method === 'GET' && orderDetailMatch) {
        const id = Number(orderDetailMatch[1]);
        const order = db.orders.find(o => o.id === id);
        if (!order || (order.user_id !== user.id && !user.is_admin)) {
          return this.err(404, 'Commande introuvable.');
        }
        return this.ok({ data: order });
      }

      const orderCancelMatch = path.match(/^\/orders\/(\d+)\/cancel$/);
      if (method === 'POST' && orderCancelMatch) {
        const id = Number(orderCancelMatch[1]);
        const order = db.orders.find(o => o.id === id);
        if (!order || (order.user_id !== user.id && !user.is_admin)) {
          return this.err(404, 'Commande introuvable.');
        }
        if (!['pending_payment', 'payment_submitted'].includes(order.status)) {
          return this.err(422, 'Cette commande ne peut plus être annulée.');
        }
        order.status = 'cancelled';
        order.updated_at = new Date().toISOString();
        for (const item of order.items) {
          const part = db.parts.find(p => p.id === item.part_id);
          if (part) part.stock += item.quantity;
        }
        if (order.payment && order.payment.status === 'pending') {
          order.payment.status = 'rejected';
          order.payment.rejection_reason = 'Commande annulée par le client.';
          const pRec = db.payments.find(p => p.id === order.payment?.id);
          if (pRec) {
            pRec.status = 'rejected';
            pRec.rejection_reason = 'Commande annulée par le client.';
          }
        }
        this.writeDb(db);
        return this.ok({ data: order });
      }

      const orderPaymentMatch = path.match(/^\/orders\/(\d+)\/payment$/);
      if (method === 'POST' && orderPaymentMatch) {
        const id = Number(orderPaymentMatch[1]);
        const order = db.orders.find(o => o.id === id);
        if (!order || (order.user_id !== user.id && !user.is_admin)) {
          return this.err(404, 'Commande introuvable.');
        }
        const payload = body as SubmitPaymentPayload;
        const errors: Record<string, string[]> = {};
        if (!payload.sender_phone?.trim()) errors['sender_phone'] = ['Le numéro émetteur est obligatoire.'];
        if (!payload.transaction_ref?.trim()) errors['transaction_ref'] = ['La référence de transaction est obligatoire.'];
        if (Object.keys(errors).length) return this.err(422, 'Informations manquantes.', errors);

        const now = new Date().toISOString();
        const payId = Math.max(0, ...db.payments.map(p => p.id)) + 1;
        const payment: Payment = {
          id: payId,
          order_id: order.id,
          order_number: order.order_number,
          customer_name: order.customer_name,
          customer_email: order.customer_email ?? user.email,
          operator: payload.operator,
          sender_phone: payload.sender_phone.trim(),
          transaction_ref: payload.transaction_ref.trim().toUpperCase(),
          amount: order.total,
          proof_url: payload.proof_url ?? null,
          proof_name: payload.proof_name ?? null,
          notes: payload.notes?.trim() || null,
          status: 'pending',
          created_at: now,
        };
        db.payments.push(payment);
        order.payment = payment;
        order.status = 'payment_submitted';
        order.updated_at = now;
        this.writeDb(db);
        return this.ok({ data: payment }, 201);
      }
    }

    // --- ADMIN ROUTES ---
    if (path.startsWith('/admin')) {
      const user = this.currentUser(req, db);
      if (!user) return this.err(401, 'Authentification requise.');
      if (!user.is_admin) return this.err(403, 'Accès réservé aux administrateurs.');

      if (method === 'GET' && path === '/admin/stats') {
        const paidStatuses: OrderStatus[] = ['paid', 'preparing', 'shipped', 'delivered'];
        const totalRevenue = db.orders
          .filter(o => paidStatuses.includes(o.status))
          .reduce((s, o) => s + o.total, 0);
        const pendingPayments = db.payments
          .filter(p => p.status === 'pending')
          .sort((a, b) => b.id - a.id);
        const lowStockParts = db.parts
          .filter(p => p.stock <= 5)
          .sort((a, b) => a.stock - b.stock)
          .map(p => this.hydratePart(p, db.vehicles));

        const stats: AdminStats = {
          total_revenue: totalRevenue,
          orders_count: db.orders.length,
          pending_payments_count: pendingPayments.length,
          low_stock_count: lowStockParts.length,
          parts_count: db.parts.length,
          vehicles_count: db.vehicles.length,
          recent_orders: [...db.orders].sort((a, b) => b.id - a.id).slice(0, 5),
          pending_payments: pendingPayments.slice(0, 5),
          low_stock_parts: lowStockParts.slice(0, 6),
        };
        return this.ok({ data: stats });
      }

      if (method === 'GET' && path === '/admin/payments') {
        const status = req.params.get('status') ?? '';
        const operator = req.params.get('operator') ?? '';
        const search = (req.params.get('search') ?? '').trim().toLowerCase();
        const list = db.payments
          .filter(p => {
            if (status && p.status !== status) return false;
            if (operator && p.operator !== operator) return false;
            if (search) {
              const hay = `${p.transaction_ref} ${p.order_number ?? ''} ${p.sender_phone} ${p.customer_name ?? ''}`.toLowerCase();
              if (!hay.includes(search)) return false;
            }
            return true;
          })
          .sort((a, b) => b.id - a.id);
        return this.ok({ data: list });
      }

      const approveMatch = path.match(/^\/admin\/payments\/(\d+)\/approve$/);
      if (method === 'POST' && approveMatch) {
        const id = Number(approveMatch[1]);
        const payment = db.payments.find(p => p.id === id);
        if (!payment) return this.err(404, 'Paiement introuvable.');
        const now = new Date().toISOString();
        payment.status = 'approved';
        payment.rejection_reason = null;
        payment.reviewed_at = now;

        const order = db.orders.find(o => o.id === payment.order_id);
        if (order) {
          if (['pending_payment', 'payment_submitted'].includes(order.status)) {
            order.status = 'paid';
          }
          order.payment = { ...payment };
          order.updated_at = now;
        }
        this.writeDb(db);
        return this.ok({ data: payment });
      }

      const rejectMatch = path.match(/^\/admin\/payments\/(\d+)\/reject$/);
      if (method === 'POST' && rejectMatch) {
        const id = Number(rejectMatch[1]);
        const payment = db.payments.find(p => p.id === id);
        if (!payment) return this.err(404, 'Paiement introuvable.');
        const reason = String(body['rejection_reason'] ?? body['reason'] ?? '').trim();
        if (!reason) {
          return this.err(422, 'Veuillez indiquer le motif du rejet.');
        }
        const now = new Date().toISOString();
        payment.status = 'rejected';
        payment.rejection_reason = reason;
        payment.reviewed_at = now;

        const order = db.orders.find(o => o.id === payment.order_id);
        if (order) {
          if (order.status === 'payment_submitted') {
            order.status = 'pending_payment';
          }
          order.payment = { ...payment };
          order.updated_at = now;
        }
        this.writeDb(db);
        return this.ok({ data: payment });
      }

      if (method === 'GET' && path === '/admin/orders') {
        const status = req.params.get('status') ?? '';
        const search = (req.params.get('search') ?? '').trim().toLowerCase();
        const list = db.orders
          .filter(o => {
            if (status && o.status !== status) return false;
            if (search) {
              const hay = `${o.order_number} ${o.customer_name} ${o.customer_phone} ${o.shipping_city}`.toLowerCase();
              if (!hay.includes(search)) return false;
            }
            return true;
          })
          .sort((a, b) => b.id - a.id);
        return this.ok({ data: list });
      }

      const orderStatusMatch = path.match(/^\/admin\/orders\/(\d+)\/status$/);
      if (method === 'PATCH' && orderStatusMatch) {
        const id = Number(orderStatusMatch[1]);
        const order = db.orders.find(o => o.id === id);
        if (!order) return this.err(404, 'Commande introuvable.');
        const nextStatus = body['status'] as OrderStatus;
        if (nextStatus === 'cancelled' && order.status !== 'cancelled') {
          for (const item of order.items) {
            const p = db.parts.find(part => part.id === item.part_id);
            if (p) p.stock += item.quantity;
          }
        }
        order.status = nextStatus;
        order.updated_at = new Date().toISOString();
        this.writeDb(db);
        return this.ok({ data: order });
      }

      if (method === 'GET' && path === '/admin/parts') {
        const search = (req.params.get('search') ?? '').trim().toLowerCase();
        const category = (req.params.get('category') ?? '').trim();
        const stock = req.params.get('stock') ?? 'all';
        const list = db.parts
          .filter(p => {
            if (category && p.category !== category) return false;
            if (stock === 'low' && (p.stock <= 0 || p.stock > 5)) return false;
            if (stock === 'out' && p.stock > 0) return false;
            if (search) {
              const hay = `${p.name} ${p.reference} ${p.oem_number ?? ''} ${p.brand ?? ''}`.toLowerCase();
              if (!hay.includes(search)) return false;
            }
            return true;
          })
          .sort((a, b) => b.id - a.id)
          .map(p => this.hydratePart(p, db.vehicles));
        return this.ok({ data: list });
      }

      if (method === 'POST' && path === '/admin/parts') {
        const payload = body as PartUpsertPayload;
        if (!payload.name?.trim() || !payload.reference?.trim()) {
          return this.err(422, 'Le nom et la référence sont obligatoires.');
        }
        const id = Math.max(0, ...db.parts.map(p => p.id)) + 1;
        const created: DemoPartRecord = {
          id,
          name: payload.name.trim(),
          reference: payload.reference.trim().toUpperCase(),
          oem_number: payload.oem_number?.trim() || null,
          brand: payload.brand?.trim() || 'Générique',
          category: payload.category?.trim() || 'Freinage',
          description: payload.description?.trim() || null,
          price: Math.max(0, Number(payload.price) || 0),
          stock: Math.max(0, Number(payload.stock) || 0),
          image_url:
            payload.image_url?.trim() ||
            partSvg(payload.name.trim().slice(0, 24).toUpperCase(), '#FF7A1F'),
          vehicle_ids: Array.isArray(payload.vehicle_ids) ? payload.vehicle_ids : [],
        };
        db.parts.push(created);
        this.writeDb(db);
        return this.ok({ data: this.hydratePart(created, db.vehicles) }, 201);
      }

      const partIdMatch = path.match(/^\/admin\/parts\/(\d+)$/);
      if (partIdMatch && method === 'PUT') {
        const id = Number(partIdMatch[1]);
        const idx = db.parts.findIndex(p => p.id === id);
        if (idx === -1) return this.err(404, 'Pièce introuvable.');
        const payload = body as PartUpsertPayload;
        const updated: DemoPartRecord = {
          ...db.parts[idx],
          name: payload.name.trim(),
          reference: payload.reference.trim().toUpperCase(),
          oem_number: payload.oem_number?.trim() || null,
          brand: payload.brand?.trim() || 'Générique',
          category: payload.category?.trim() || 'Freinage',
          description: payload.description?.trim() || null,
          price: Math.max(0, Number(payload.price) || 0),
          stock: Math.max(0, Number(payload.stock) || 0),
          image_url:
            payload.image_url?.trim() ||
            db.parts[idx].image_url ||
            partSvg(payload.name.trim().slice(0, 24).toUpperCase(), '#FF7A1F'),
          vehicle_ids: Array.isArray(payload.vehicle_ids) ? payload.vehicle_ids : [],
        };
        db.parts[idx] = updated;
        this.writeDb(db);
        return this.ok({ data: this.hydratePart(updated, db.vehicles) });
      }

      if (partIdMatch && method === 'DELETE') {
        const id = Number(partIdMatch[1]);
        db.parts = db.parts.filter(p => p.id !== id);
        this.writeDb(db);
        return this.ok({ message: 'Pièce supprimée.' });
      }

      if (method === 'POST' && path === '/admin/vehicles') {
        const make = String(body['make'] ?? '').trim();
        const model = String(body['model'] ?? '').trim();
        const year = Number(body['year'] ?? 0);
        if (!make || !model || year < 1980 || year > 2030) {
          return this.err(422, 'Veuillez saisir une marque, un modèle et une année valide.');
        }
        const duplicate = db.vehicles.find(
          v => v.make.toLowerCase() === make.toLowerCase() && v.model.toLowerCase() === model.toLowerCase() && v.year === year,
        );
        if (duplicate) return this.err(422, 'Ce véhicule existe déjà dans la base.');
        const id = Math.max(0, ...db.vehicles.map(v => v.id)) + 1;
        const v: Vehicle = { id, make, model, year };
        db.vehicles.push(v);
        this.writeDb(db);
        return this.ok({ data: v }, 201);
      }

      const vehicleIdMatch = path.match(/^\/admin\/vehicles\/(\d+)$/);
      if (vehicleIdMatch && method === 'DELETE') {
        const id = Number(vehicleIdMatch[1]);
        db.vehicles = db.vehicles.filter(v => v.id !== id);
        for (const p of db.parts) {
          p.vehicle_ids = p.vehicle_ids.filter(vid => vid !== id);
        }
        this.writeDb(db);
        return this.ok({ message: 'Véhicule supprimé.' });
      }
    }

    return this.err(404, `Endpoint non pris en charge en mode démo (${method} ${path}).`);
  }
}

function isBackendUnreachable(err: HttpErrorResponse): boolean {
  if (err.status === 0 || err.status === 502 || err.status === 503 || err.status === 504) {
    return true;
  }
  // Dev-server proxy returns HTTP 500 plain-text/HTML when http://127.0.0.1:8000 refuses TCP connection
  if (err.status === 500 && (!err.error || typeof err.error === 'string')) {
    return true;
  }
  return false;
}

export const demoFallbackInterceptor: HttpInterceptorFn = (req, next) => {
  if (!environment.demoFallback || !req.url.startsWith(environment.apiUrl)) {
    return next(req);
  }
  const demo = inject(DemoBackendService);
  if (demo.isActive()) {
    return demo.handle(req);
  }
  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      if (isBackendUnreachable(err)) {
        return demo.handle(req);
      }
      return throwError(() => err);
    }),
  );
};
