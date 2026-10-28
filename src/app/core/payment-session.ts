import { Injectable } from '@angular/core';
import { PaymentInstructions } from './models';

interface PaymentSession {
  instructions: PaymentInstructions | null;
  referenceSubmitted: boolean;
}

/** Confort de reprise dans cet onglet uniquement ; le statut officiel reste celui de l'API. */
@Injectable({ providedIn: 'root' })
export class PaymentSessionStore {
  private key(userId: number, orderId: number): string {
    return `autocarwat_payment_${userId}_${orderId}`;
  }

  get(userId: number, orderId: number): PaymentSession | null {
    try {
      const value = sessionStorage.getItem(this.key(userId, orderId));
      return value ? (JSON.parse(value) as PaymentSession) : null;
    } catch {
      return null;
    }
  }

  saveInstructions(userId: number, orderId: number, instructions: PaymentInstructions) {
    this.save(userId, orderId, { instructions, referenceSubmitted: false });
  }

  markReferenceSubmitted(userId: number, orderId: number) {
    this.save(userId, orderId, {
      instructions: this.get(userId, orderId)?.instructions ?? null,
      referenceSubmitted: true,
    });
  }

  clear(userId: number, orderId: number) {
    try {
      sessionStorage.removeItem(this.key(userId, orderId));
    } catch {}
  }

  clearAll() {
    try {
      for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const key = sessionStorage.key(i);
        if (key?.startsWith('autocarwat_payment_')) sessionStorage.removeItem(key);
      }
    } catch {}
  }

  private save(userId: number, orderId: number, data: PaymentSession) {
    try {
      sessionStorage.setItem(this.key(userId, orderId), JSON.stringify(data));
    } catch {}
  }
}
