import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, catchError, debounceTime, map, of, switchMap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AdminApi } from '../../../core/admin';
import { CatalogApi, VehicleStore } from '../../../core/catalog';
import { Paginated, Part, PartUpsertPayload } from '../../../core/models';
import { ToastStore } from '../../../core/toast';
import { FcfaPipe } from '../../../shared/fcfa-pipe';

@Component({
  selector: 'app-admin-catalog',
  imports: [FormsModule, FcfaPipe],
  template: `
    <div class="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="font-display text-3xl font-bold text-primary sm:text-4xl">Catalogue</h1>
        <p class="mt-1 text-sm text-muted">Gérez les pièces et leurs véhicules compatibles.</p>
      </div>
      <button
        type="button"
        (click)="openCreate()"
        class="h-10 rounded-lg bg-action px-4 text-sm font-semibold text-on-action"
      >
        + Ajouter une pièce
      </button>
    </div>
    <div class="mb-5 rounded-2xl border border-line bg-surface p-4">
      <label for="part-search" class="mb-1 block text-xs font-semibold uppercase text-muted"
        >Rechercher une pièce</label
      ><input
        id="part-search"
        type="search"
        [ngModel]="search()"
        (ngModelChange)="onSearch($event)"
        placeholder="Nom, référence ou numéro OEM"
        class="h-10 w-full rounded-lg border border-line bg-bg px-3 text-sm"
      />
    </div>
    @if (loading()) {
      <div class="space-y-3" aria-busy="true">
        @for (i of [1, 2, 3]; track i) {
          <div class="h-20 animate-pulse rounded-2xl border border-line bg-surface"></div>
        }
      </div>
    } @else if (error()) {
      <div role="alert" class="rounded-2xl border border-line bg-surface p-8 text-center">
        <p>{{ error() }}</p>
        <button
          type="button"
          (click)="load(page())"
          class="mt-3 font-semibold text-primary underline"
        >
          Réessayer
        </button>
      </div>
    } @else if (result(); as r) {
      @if (!r.data.length) {
        <div class="rounded-2xl border border-line bg-surface p-10 text-center text-muted">
          Aucune pièce trouvée.
        </div>
      } @else {
        <p class="mb-3 text-sm text-muted">{{ r.meta.total }} pièce(s)</p>
        <div class="overflow-x-auto rounded-2xl border border-line bg-surface">
          <table class="w-full min-w-[680px] text-left text-sm">
            <thead class="border-b border-line bg-bg text-xs uppercase text-muted">
              <tr>
                <th class="p-4">Pièce</th>
                <th class="p-4">Catégorie / marque</th>
                <th class="p-4">Prix</th>
                <th class="p-4">Stock</th>
                <th class="p-4"><span class="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-line">
              @for (part of r.data; track part.id) {
                <tr>
                  <td class="p-4">
                    <strong>{{ part.name }}</strong>
                    <p class="num text-xs text-muted">{{ part.reference }}</p>
                  </td>
                  <td class="p-4 text-muted">
                    {{ part.category || '—' }}<br />{{ part.brand || '—' }}
                  </td>
                  <td class="num p-4 font-semibold">{{ part.price | fcfa }}</td>
                  <td class="num p-4">{{ part.stock }}</td>
                  <td class="p-4 text-right">
                    <div class="flex justify-end gap-2">
                      <button
                        type="button"
                        (click)="openEdit(part)"
                        class="rounded-lg border border-line px-3 py-2 text-xs font-semibold hover:border-action"
                      >
                        Modifier</button
                      ><button
                        type="button"
                        (click)="remove(part)"
                        [disabled]="busy()"
                        class="rounded-lg border border-red-300 px-3 py-2 text-xs font-semibold text-red-700 disabled:opacity-50 dark:border-red-800 dark:text-red-300"
                      >
                        Supprimer
                      </button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
      @if (r.meta.last_page > 1) {
        <nav
          class="mt-6 flex items-center justify-center gap-4"
          aria-label="Pagination du catalogue"
        >
          <button
            type="button"
            (click)="load(page() - 1)"
            [disabled]="page() <= 1"
            class="h-10 rounded-lg border border-line bg-surface px-4 text-sm disabled:opacity-40"
          >
            ← Précédent</button
          ><span class="num text-sm">Page {{ r.meta.current_page }} / {{ r.meta.last_page }}</span
          ><button
            type="button"
            (click)="load(page() + 1)"
            [disabled]="page() >= r.meta.last_page"
            class="h-10 rounded-lg border border-line bg-surface px-4 text-sm disabled:opacity-40"
          >
            Suivant →
          </button>
        </nav>
      }
    }

    @if (formOpen()) {
      <div
        class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4"
        (click)="close()"
      >
        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby="part-form-title"
          class="my-auto w-full max-w-2xl rounded-2xl border border-line bg-surface p-5 shadow-xl sm:p-6"
          (click)="$event.stopPropagation()"
        >
          <div class="mb-4 flex justify-between gap-3">
            <h2 id="part-form-title" class="font-display text-2xl font-bold text-primary">
              {{ editing() ? 'Modifier la pièce' : 'Ajouter une pièce' }}
            </h2>
            <button
              type="button"
              (click)="close()"
              [disabled]="busy()"
              aria-label="Fermer"
              class="rounded-lg border border-line px-3 py-1"
            >
              ✕
            </button>
          </div>
          <form (ngSubmit)="save()" class="space-y-4">
            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label for="part-name" class="mb-1 block text-sm font-semibold">Nom *</label
                ><input
                  id="part-name"
                  name="name"
                  [(ngModel)]="form.name"
                  required
                  maxlength="255"
                  class="h-10 w-full rounded-lg border border-line bg-bg px-3 text-sm"
                />
              </div>
              <div>
                <label for="part-reference" class="mb-1 block text-sm font-semibold"
                  >Référence *</label
                ><input
                  id="part-reference"
                  name="reference"
                  [(ngModel)]="form.reference"
                  required
                  maxlength="255"
                  class="num h-10 w-full rounded-lg border border-line bg-bg px-3 text-sm"
                />
              </div>
              <div>
                <label for="part-category" class="mb-1 block text-sm font-semibold"
                  >ID de catégorie {{ editing() ? '(inchangé si vide)' : '*' }}</label
                ><input
                  id="part-category"
                  name="category"
                  type="number"
                  min="1"
                  step="1"
                  [(ngModel)]="form.categoryId"
                  class="num h-10 w-full rounded-lg border border-line bg-bg px-3 text-sm"
                />
              </div>
              <div>
                <label for="part-brand" class="mb-1 block text-sm font-semibold"
                  >ID de marque {{ editing() ? '(inchangé si vide)' : '*' }}</label
                ><input
                  id="part-brand"
                  name="brand"
                  type="number"
                  min="1"
                  step="1"
                  [(ngModel)]="form.brandId"
                  class="num h-10 w-full rounded-lg border border-line bg-bg px-3 text-sm"
                />
              </div>
              <div>
                <label for="part-price" class="mb-1 block text-sm font-semibold"
                  >Prix en FCFA *</label
                ><input
                  id="part-price"
                  name="price"
                  type="number"
                  min="0"
                  step="1"
                  [(ngModel)]="form.price"
                  required
                  class="num h-10 w-full rounded-lg border border-line bg-bg px-3 text-sm"
                />
              </div>
              <div>
                <label for="part-stock" class="mb-1 block text-sm font-semibold">Stock *</label
                ><input
                  id="part-stock"
                  name="stock"
                  type="number"
                  min="0"
                  step="1"
                  [(ngModel)]="form.stock"
                  required
                  class="num h-10 w-full rounded-lg border border-line bg-bg px-3 text-sm"
                />
              </div>
              <div>
                <label for="part-oem" class="mb-1 block text-sm font-semibold">Numéro OEM</label
                ><input
                  id="part-oem"
                  name="oem"
                  [(ngModel)]="form.oem"
                  maxlength="100"
                  class="num h-10 w-full rounded-lg border border-line bg-bg px-3 text-sm"
                />
              </div>
              <div>
                <label for="part-image" class="mb-1 block text-sm font-semibold"
                  >Image (JPG, PNG, WebP, max. 2 Mo)</label
                ><input
                  id="part-image"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  (change)="onImage($event)"
                  class="block w-full text-xs text-muted file:mr-2 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-2 file:text-white"
                />
              </div>
            </div>
            <p class="text-xs text-muted">
              Les identifiants de catégorie et de marque proviennent de la base de données de la
              boutique.
            </p>
            <div>
              <label for="part-description" class="mb-1 block text-sm font-semibold"
                >Description</label
              ><textarea
                id="part-description"
                name="description"
                [(ngModel)]="form.description"
                rows="3"
                class="w-full rounded-lg border border-line bg-bg p-3 text-sm"
              ></textarea>
            </div>
            <fieldset>
              <legend class="mb-2 text-sm font-semibold">Véhicules compatibles</legend>
              @if (vehicles.loading()) {
                <p class="text-xs text-muted">Chargement des véhicules…</p>
              } @else if (vehicles.error()) {
                <p class="text-xs text-red-600">
                  Impossible de charger les véhicules. Les compatibilités existantes ne seront pas
                  modifiées.
                </p>
              } @else if (!vehicles.all().length) {
                <p class="text-xs text-muted">Aucun véhicule disponible.</p>
              } @else {
                <div
                  class="grid max-h-40 gap-2 overflow-y-auto rounded-xl border border-line bg-bg p-3 text-xs sm:grid-cols-2"
                >
                  @for (v of vehicles.all(); track v.id) {
                    <label class="flex items-center gap-2"
                      ><input
                        type="checkbox"
                        [checked]="selectedVehicles().includes(v.id)"
                        (change)="toggleVehicle(v.id, $event)"
                        class="accent-[#F26A0F]"
                      />{{ v.make }} {{ v.model }} {{ v.year }}</label
                    >
                  }
                </div>
              }
            </fieldset>
            @if (formError()) {
              <p
                role="alert"
                class="rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-200"
              >
                {{ formError() }}
              </p>
            }
            <div class="flex justify-end gap-2">
              <button
                type="button"
                (click)="close()"
                [disabled]="busy()"
                class="h-10 rounded-lg border border-line px-4 text-sm"
              >
                Annuler</button
              ><button
                type="submit"
                [disabled]="busy()"
                class="h-10 rounded-lg bg-action px-4 text-sm font-semibold text-on-action disabled:opacity-50"
              >
                {{ busy() ? 'Enregistrement…' : 'Enregistrer' }}
              </button>
            </div>
          </form>
        </section>
      </div>
    }
  `,
})
export class AdminCatalog {
  private api = inject(AdminApi);
  private catalog = inject(CatalogApi);
  private toast = inject(ToastStore);
  vehicles = inject(VehicleStore);
  result = signal<Paginated<Part> | null>(null);
  page = signal(1);
  search = signal('');
  loading = signal(true);
  error = signal('');
  formOpen = signal(false);
  editing = signal<Part | null>(null);
  busy = signal(false);
  formError = signal('');
  selectedVehicles = signal<number[]>([]);
  private originalVehicles: number[] = [];
  private image: File | null = null;
  private searchChanges = new Subject<string>();
  private reload = new Subject<number>();
  form = this.emptyForm();

  constructor() {
    this.vehicles.load();
    this.searchChanges.pipe(debounceTime(300), takeUntilDestroyed()).subscribe(() => this.load(1));
    this.reload
      .pipe(
        switchMap((page) =>
          this.catalog.parts({ search: this.search(), page }).pipe(
            map((result) => ({ result, failed: false })),
            catchError(() => of({ result: null, failed: true })),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe(({ result, failed }) => {
        if (result && result.meta.current_page > Math.max(1, result.meta.last_page)) {
          this.load(Math.max(1, result.meta.last_page));
          return;
        }
        if (result) {
          this.result.set(result);
          this.page.set(result.meta.current_page);
        }
        if (failed) this.error.set('Impossible de charger le catalogue.');
        this.loading.set(false);
      });
    this.load(1);
  }
  private emptyForm() {
    return {
      name: '',
      reference: '',
      categoryId: null as number | null,
      brandId: null as number | null,
      price: null as number | null,
      stock: null as number | null,
      oem: '',
      description: '',
    };
  }
  onSearch(value: string) {
    this.search.set(value);
    this.searchChanges.next(value);
  }
  load(page: number) {
    if (page < 1) return;
    this.loading.set(true);
    this.error.set('');
    this.reload.next(page);
  }
  openCreate() {
    this.editing.set(null);
    this.form = this.emptyForm();
    this.image = null;
    this.originalVehicles = [];
    this.selectedVehicles.set([]);
    this.formError.set('');
    this.formOpen.set(true);
  }
  openEdit(part: Part) {
    this.editing.set(part);
    this.form = {
      name: part.name,
      reference: part.reference,
      categoryId: null,
      brandId: null,
      price: part.price,
      stock: part.stock,
      oem: part.oem_number ?? '',
      description: part.description ?? '',
    };
    this.image = null;
    this.originalVehicles = (part.vehicles ?? []).map((v) => v.id);
    this.selectedVehicles.set([...this.originalVehicles]);
    this.formError.set('');
    this.formOpen.set(true);
  }
  close() {
    if (!this.busy()) this.formOpen.set(false);
  }
  onImage(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    this.image = null;
    if (!file) return;
    if (
      !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
      file.size > 2 * 1024 * 1024
    ) {
      this.formError.set('Choisissez une image JPG, PNG ou WebP de 2 Mo maximum.');
      input.value = '';
      return;
    }
    this.formError.set('');
    this.image = file;
  }
  toggleVehicle(id: number, event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    this.selectedVehicles.update((ids) =>
      checked ? [...new Set([...ids, id])] : ids.filter((value) => value !== id),
    );
  }
  save() {
    if (this.busy()) return;
    const f = this.form;
    const validId = (id: number | null) => id == null || (Number.isInteger(id) && id > 0);
    if (
      !f.name.trim() ||
      !f.reference.trim() ||
      !Number.isInteger(f.price) ||
      (f.price ?? -1) < 0 ||
      !Number.isInteger(f.stock) ||
      (f.stock ?? -1) < 0 ||
      !validId(f.categoryId) ||
      !validId(f.brandId) ||
      (!this.editing() && (!f.categoryId || !f.brandId))
    ) {
      this.formError.set(
        'Vérifiez les champs obligatoires, les identifiants, le prix et le stock.',
      );
      return;
    }
    const payload: PartUpsertPayload = {
      name: f.name.trim(),
      reference: f.reference.trim(),
      price: f.price!,
      stock: f.stock!,
      oem_number: f.oem.trim() || null,
      description: f.description.trim() || null,
      ...(f.categoryId ? { category_id: f.categoryId } : {}),
      ...(f.brandId ? { brand_id: f.brandId } : {}),
      ...(this.image ? { image: this.image } : {}),
    };
    const editing = this.editing();
    const changed =
      [...this.originalVehicles].sort((a, b) => a - b).join(',') !==
      [...this.selectedVehicles()].sort((a, b) => a - b).join(',');
    this.busy.set(true);
    this.formError.set('');
    const request = editing
      ? this.api.updatePart(editing.id, payload)
      : this.api.createPart(payload);
    request
      .pipe(
        switchMap((part) =>
          changed
            ? this.api.syncPartVehicles(part.id, this.selectedVehicles()).pipe(
                map(() => ({ part, syncFailed: false })),
                catchError(() => of({ part, syncFailed: true })),
              )
            : of({ part, syncFailed: false }),
        ),
      )
      .subscribe({
        next: ({ syncFailed }) => {
          this.busy.set(false);
          this.formOpen.set(false);
          if (syncFailed)
            this.toast.error(
              'Pièce enregistrée, mais les compatibilités n’ont pas pu être mises à jour. Modifiez-la pour réessayer.',
            );
          else this.toast.success('Pièce enregistrée.');
          this.load(editing ? this.page() : 1);
        },
        error: (e: HttpErrorResponse) => {
          this.busy.set(false);
          this.formError.set(e.error?.message ?? 'Impossible d’enregistrer la pièce.');
        },
      });
  }
  remove(part: Part) {
    if (this.busy() || !confirm(`Supprimer « ${part.name} » ?`)) return;
    this.busy.set(true);
    this.api.deletePart(part.id).subscribe({
      next: () => {
        this.busy.set(false);
        this.toast.info('Pièce supprimée.');
        this.load(this.page());
      },
      error: (e: HttpErrorResponse) => {
        this.busy.set(false);
        this.toast.error(
          e.status === 409
            ? 'Cette pièce est déjà liée à une commande et ne peut pas être supprimée.'
            : (e.error?.message ?? 'Suppression impossible.'),
        );
      },
    });
  }
}
