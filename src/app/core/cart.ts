import { Injectable, computed, effect, signal } from '@angular/core';
import { CartItem, FREE_SHIPPING_THRESHOLD, Part, calculateShippingFee } from './models';

const STORAGE_KEY = 'autocarwat_cart';

@Injectable({ providedIn: 'root' })
export class CartStore {
  readonly items = signal<CartItem[]>(this.read());

  readonly totalItems = computed(() =>
    this.items().reduce((sum, item) => sum + item.quantity, 0),
  );

  readonly subtotal = computed(() =>
    this.items().reduce((sum, item) => sum + item.part.price * item.quantity, 0),
  );

  readonly isEmpty = computed(() => this.items().length === 0);

  readonly amountUntilFreeShipping = computed(() =>
    Math.max(0, FREE_SHIPPING_THRESHOLD - this.subtotal()),
  );

  constructor() {
    effect(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.items()));
      } catch {}
    });
  }

  quantityOf(partId: number): number {
    return this.items().find(i => i.part.id === partId)?.quantity ?? 0;
  }

  add(part: Part, qty = 1): boolean {
    if (part.stock <= 0 || qty <= 0) return false;
    const current = this.quantityOf(part.id);
    const nextQty = Math.min(part.stock, current + qty);
    if (nextQty <= current && current >= part.stock) return false;

    this.items.update(list => {
      const idx = list.findIndex(i => i.part.id === part.id);
      if (idx === -1) return [...list, { part, quantity: nextQty }];
      return list.map((item, i) => (i === idx ? { part, quantity: nextQty } : item));
    });
    return true;
  }

  setQuantity(partId: number, qty: number) {
    if (qty <= 0) {
      this.remove(partId);
      return;
    }
    this.items.update(list =>
      list.map(item =>
        item.part.id === partId
          ? { ...item, quantity: Math.min(Math.max(1, qty), Math.max(1, item.part.stock)) }
          : item,
      ),
    );
  }

  remove(partId: number) {
    this.items.update(list => list.filter(i => i.part.id !== partId));
  }

  clear() {
    this.items.set([]);
  }

  shippingFor(city: string): number {
    return calculateShippingFee(this.subtotal(), city);
  }

  private read(): CartItem[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
}
