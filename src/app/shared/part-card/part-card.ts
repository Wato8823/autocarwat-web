import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Part } from '../../core/models';
import { FcfaPipe } from '../fcfa-pipe';

@Component({
  selector: 'app-part-card',
  imports: [RouterLink, FcfaPipe],
  template: `
    <article class="themed flex h-full flex-col overflow-hidden rounded-xl border border-line bg-surface
                    transition hover:-translate-y-0.5 hover:border-action hover:shadow-md">
      <a [routerLink]="['/pieces', part().id]" class="block aspect-[4/3] bg-bg">
        @if (part().image_url) {
          <img [src]="part().image_url" [alt]="part().name" loading="lazy"
               class="h-full w-full object-cover" />
        } @else {
          <div class="flex h-full items-center justify-center text-4xl" aria-hidden="true">⚙️</div>
        }
      </a>

      <div class="flex flex-1 flex-col gap-2 p-4">
        <p class="text-xs uppercase tracking-wide text-muted">{{ part().brand }} · {{ part().category }}</p>
        <h3 class="font-semibold leading-snug">
          <a [routerLink]="['/pieces', part().id]" class="hover:underline">{{ part().name }}</a>
        </h3>
        <p class="num text-sm text-muted">Réf. {{ part().reference }}</p>

        <span class="inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold"
              [class]="badge().cls">
          <span aria-hidden="true">●</span> {{ badge().label }}
        </span>

        <p class="num mt-auto pt-2 text-xl font-bold text-primary">{{ part().price | fcfa }}</p>

        <a [routerLink]="['/pieces', part().id]"
           class="flex h-11 items-center justify-center rounded-lg bg-action font-semibold text-on-action">
          Voir la pièce
        </a>
      </div>
    </article>
  `,
})
export class PartCard {
  part = input.required<Part>();

  badge = computed(() => {
    const s = this.part().stock;
    if (s <= 0) return { label: 'Rupture de stock', cls: 'bg-red-100 text-red-800' };
    if (s <= 5) return { label: `Plus que ${s} en stock`, cls: 'bg-amber-100 text-amber-800' };
    return { label: 'En stock', cls: 'bg-green-100 text-green-800' };
  });
}
