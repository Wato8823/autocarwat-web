import { Component, inject } from '@angular/core';
import { ToastStore } from '../../core/toast';

@Component({
  selector: 'app-toast-container',
  template: `
    <div
      class="pointer-events-none fixed bottom-4 right-4 z-50 flex max-w-sm flex-col gap-2 px-4 sm:px-0"
      aria-live="polite"
    >
      @for (m of toast.messages(); track m.id) {
        <div
          class="pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg"
          [class]="
            m.kind === 'error'
              ? 'border-red-300 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100'
              : m.kind === 'info'
                ? 'border-blue-300 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-100'
                : 'border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100'
          "
        >
          <span aria-hidden="true">{{ m.kind === 'error' ? '⚠️' : m.kind === 'info' ? 'ℹ️' : '✓' }}</span>
          <span class="flex-1">{{ m.text }}</span>
          <button
            type="button"
            (click)="toast.dismiss(m.id)"
            class="opacity-70 hover:opacity-100"
            aria-label="Fermer la notification"
          >
            ✕
          </button>
        </div>
      }
    </div>
  `,
})
export class ToastContainer {
  toast = inject(ToastStore);
}
