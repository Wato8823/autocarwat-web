import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { DemoModeService } from './demo-mode';
import { CartItem, Part } from './models';

@Injectable({ providedIn: 'root' })
export class CartStore {
  private demo = inject(DemoModeService);
  private storageKey = this.demo.isActive() ? 'autocarwat_demo_cart_v2' : 'autocarwat_cart';
  readonly items = signal<CartItem[]>(this.read());
  readonly totalItems = computed(() => this.items().reduce((sum, item) => sum + item.quantity, 0));
  readonly subtotal = computed(() =>
    this.items().reduce((sum, item) => sum + item.part.price * item.quantity, 0),
  );
  readonly isEmpty = computed(() => this.items().length === 0);

  constructor() {
    effect(() => {
      try {
        localStorage.setItem(this.storageKey, JSON.stringify(this.items()));
      } catch {}
    });
  }

  quantityOf(partId: number): number {
    return this.items().find((i) => i.part.id === partId)?.quantity ?? 0;
  }

  add(part: Part, qty = 1): boolean {
    if (part.stock <= 0 || !Number.isInteger(qty) || qty <= 0) return false;
    const current = this.quantityOf(part.id);
    const nextQty = Math.min(part.stock, current + qty);
    if (nextQty <= current) return false;
    this.items.update((list) => {
      const idx = list.findIndex((i) => i.part.id === part.id);
      if (idx === -1) return [...list, { part, quantity: nextQty }];
      return list.map((item, i) => (i === idx ? { part, quantity: nextQty } : item));
    });
    return true;
  }

  setQuantity(partId: number, qty: number) {
    if (!Number.isInteger(qty)) return;
    if (qty <= 0) return this.remove(partId);
    this.items.update((list) =>
      list.map((item) =>
        item.part.id === partId
          ? { ...item, quantity: Math.min(qty, Math.max(1, item.part.stock)) }
          : item,
      ),
    );
  }

  remove(partId: number) {
    this.items.update((list) => list.filter((i) => i.part.id !== partId));
  }
  clear() {
    this.items.set([]);
    try {
      localStorage.removeItem(this.storageKey);
    } catch {}
  }

  private read(): CartItem[] {
    try {
      const parsed = JSON.parse(localStorage.getItem(this.storageKey) ?? '[]');
      return Array.isArray(parsed)
        ? parsed.filter(
            (item) =>
              item?.part &&
              Number.isInteger(item.quantity) &&
              item.quantity > 0 &&
              Number.isFinite(item.part.price) &&
              Number.isFinite(item.part.stock),
          )
        : [];
    } catch {
      return [];
    }
  }
}
