import { Component, inject } from '@angular/core';
import { ThemeStore } from '../../core/theme';

@Component({
  selector: 'app-theme-toggle',
  template: `
    <button type="button" (click)="store.toggle()"
      class="themed h-11 w-11 rounded-full border border-line bg-surface text-lg
             hover:border-action focus-visible:outline-2 focus-visible:outline-action"
      [attr.aria-label]="store.theme() === 'light' ? 'Passer en mode sombre' : 'Passer en mode clair'"
      [title]="store.theme() === 'light' ? 'Mode sombre' : 'Mode clair'">
      {{ store.theme() === 'light' ? '🌙' : '☀️' }}
    </button>
  `,
})
export class ThemeToggle {
  store = inject(ThemeStore);
}
