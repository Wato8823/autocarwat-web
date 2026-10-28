

import { Injectable, effect, signal } from '@angular/core';

type Theme = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly theme = signal<Theme>(this.read());

  constructor() {
    effect(() => {
      const t = this.theme();
      document.documentElement.setAttribute('data-theme', t);
      try { localStorage.setItem('theme', t); } catch {}
    });
  }

  toggle() {
    this.theme.update(t => (t === 'light' ? 'dark' : 'light'));
  }

  private read(): Theme {
    try {
      return localStorage.getItem('theme') === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  }
}
