import { Injectable, signal } from '@angular/core';

export type ToastKind = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: number;
  kind: ToastKind;
  text: string;
}

@Injectable({ providedIn: 'root' })
export class ToastStore {
  private nextId = 1;
  readonly messages = signal<ToastMessage[]>([]);

  show(text: string, kind: ToastKind = 'success', durationMs = 3800) {
    const id = this.nextId++;
    this.messages.update(list => [...list, { id, kind, text }]);
    if (durationMs > 0) {
      setTimeout(() => this.dismiss(id), durationMs);
    }
  }

  success(text: string) {
    this.show(text, 'success');
  }

  error(text: string) {
    this.show(text, 'error', 5000);
  }

  info(text: string) {
    this.show(text, 'info');
  }

  dismiss(id: number) {
    this.messages.update(list => list.filter(m => m.id !== id));
  }
}
