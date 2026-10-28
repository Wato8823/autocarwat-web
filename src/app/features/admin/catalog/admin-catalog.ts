import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApi } from '../../../core/admin';
import { VehicleStore } from '../../../core/catalog';
import { PART_CATEGORIES, Part, PartUpsertPayload, Vehicle } from '../../../core/models';
import { ToastStore } from '../../../core/toast';
import { FcfaPipe } from '../../../shared/fcfa-pipe';

@Component({
  selector: 'app-admin-catalog',
  imports: [FormsModule, FcfaPipe],
  template: `
    <div class="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="font-display text-3xl font-bold text-primary sm:text-4xl">
          Gestion du catalogue
        </h1>
        <p class="text-sm text-muted">
          Ajoutez et mettez à jour vos pièces détachées, stocks, prix FCFA et véhicules compatibles.
        </p>
      </div>

      @if (tab() === 'parts') {
        <button
          type="button"
          (click)="openCreateModal()"
          class="h-11 rounded-lg bg-action px-5 text-sm font-semibold text-on-action"
        >
          + Nouvelle pièce
        </button>
      }
    </div>

    <!-- Onglets -->
    <div class="mb-6 flex gap-2 border-b border-line">
      <button
        type="button"
        (click)="tab.set('parts')"
        class="border-b-2 px-4 py-2.5 text-sm font-semibold transition"
        [class]="
          tab() === 'parts'
            ? 'border-action text-primary'
            : 'border-transparent text-muted hover:text-text'
        "
      >
        ⚙️ Pièces détachées ({{ parts().length }})
      </button>
      <button
        type="button"
        (click)="tab.set('vehicles')"
        class="border-b-2 px-4 py-2.5 text-sm font-semibold transition"
        [class]="
          tab() === 'vehicles'
            ? 'border-action text-primary'
            : 'border-transparent text-muted hover:text-text'
        "
      >
        🚗 Véhicules compatibles ({{ vehiclesStore.all().length }})
      </button>
    </div>

    <!-- ONGLET PIÈCES -->
    @if (tab() === 'parts') {
      <div class="mb-5 grid gap-3 rounded-2xl border border-line bg-surface p-4 sm:grid-cols-3">
        <div>
          <label class="mb-1 block text-xs font-semibold uppercase text-muted" for="csearch">
            Recherche
          </label>
          <input
            id="csearch"
            type="search"
            [ngModel]="partSearch()"
            (ngModelChange)="partSearch.set($event); loadParts()"
            placeholder="Nom, référence, OEM, marque…"
            class="h-10 w-full rounded-lg border border-line bg-bg px-3 text-sm"
          />
        </div>

        <div>
          <label class="mb-1 block text-xs font-semibold uppercase text-muted" for="ccat">
            Catégorie
          </label>
          <select
            id="ccat"
            [ngModel]="partCategory()"
            (ngModelChange)="partCategory.set($event); loadParts()"
            class="h-10 w-full rounded-lg border border-line bg-bg px-3 text-sm"
          >
            <option value="">Toutes les catégories</option>
            @for (c of categories; track c) {
              <option [value]="c">{{ c }}</option>
            }
          </select>
        </div>

        <div>
          <label class="mb-1 block text-xs font-semibold uppercase text-muted" for="cstock">
            Niveau de stock
          </label>
          <select
            id="cstock"
            [ngModel]="partStock()"
            (ngModelChange)="partStock.set($event); loadParts()"
            class="h-10 w-full rounded-lg border border-line bg-bg px-3 text-sm"
          >
            <option value="all">Tous les stocks</option>
            <option value="low">Stock faible (1 – 5)</option>
            <option value="out">Rupture de stock (0)</option>
          </select>
        </div>
      </div>

      @if (loadingParts()) {
        <div class="space-y-3">
          @for (i of [1, 2, 3, 4]; track i) {
            <div class="h-20 animate-pulse rounded-xl border border-line bg-surface"></div>
          }
        </div>
      } @else if (parts().length === 0) {
        <div class="rounded-2xl border border-line bg-surface p-8 text-center text-muted">
          Aucune pièce trouvée.
        </div>
      } @else {
        <div class="overflow-x-auto rounded-2xl border border-line bg-surface">
          <table class="w-full text-left text-sm">
            <thead class="border-b border-line bg-bg text-xs uppercase text-muted">
              <tr>
                <th class="px-4 py-3">Pièce</th>
                <th class="px-4 py-3">Réf. / OEM</th>
                <th class="px-4 py-3">Catégorie</th>
                <th class="px-4 py-3 text-right">Prix</th>
                <th class="px-4 py-3 text-center">Stock</th>
                <th class="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-line">
              @for (p of parts(); track p.id) {
                <tr class="hover:bg-bg/60">
                  <td class="px-4 py-3">
                    <p class="font-semibold">{{ p.name }}</p>
                    <p class="text-xs text-muted">
                      {{ p.brand }} · {{ p.vehicles?.length ?? 0 }} véhicule(s) compatible(s)
                    </p>
                  </td>
                  <td class="num px-4 py-3 text-xs">
                    <span class="block font-semibold">{{ p.reference }}</span>
                    @if (p.oem_number) {
                      <span class="text-muted">OEM {{ p.oem_number }}</span>
                    }
                  </td>
                  <td class="px-4 py-3 text-xs">{{ p.category }}</td>
                  <td class="num px-4 py-3 text-right font-bold text-primary">
                    {{ p.price | fcfa }}
                  </td>
                  <td class="num px-4 py-3 text-center">
                    <span
                      class="rounded-full px-2.5 py-0.5 text-xs font-bold"
                      [class]="
                        p.stock <= 0
                          ? 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-200'
                          : p.stock <= 5
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200'
                            : 'bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-200'
                      "
                    >
                      {{ p.stock }}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-right">
                    <div class="inline-flex gap-2">
                      <button
                        type="button"
                        (click)="openEditModal(p)"
                        class="rounded-lg border border-line px-2.5 py-1 text-xs font-semibold hover:border-action"
                      >
                        Modifier
                      </button>
                      <button
                        type="button"
                        (click)="removePart(p)"
                        class="rounded-lg border border-red-300 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400"
                      >
                        Suppr.
                      </button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    }

    <!-- ONGLET VÉHICULES -->
    @if (tab() === 'vehicles') {
      <div class="grid gap-6 lg:grid-cols-12">
        <form
          (ngSubmit)="addVehicle()"
          class="h-fit rounded-2xl border border-line bg-surface p-5 lg:col-span-4"
        >
          <h2 class="mb-4 font-display text-xl font-bold text-primary">Ajouter un véhicule</h2>

          <label class="mb-1 block text-xs font-semibold uppercase text-muted" for="vmake">
            Marque *
          </label>
          <input
            id="vmake"
            name="vmake"
            [ngModel]="vMake()"
            (ngModelChange)="vMake.set($event)"
            required
            placeholder="Ex. Toyota"
            class="mb-3 h-10 w-full rounded-lg border border-line bg-bg px-3 text-sm"
          />

          <label class="mb-1 block text-xs font-semibold uppercase text-muted" for="vmodel">
            Modèle *
          </label>
          <input
            id="vmodel"
            name="vmodel"
            [ngModel]="vModel()"
            (ngModelChange)="vModel.set($event)"
            required
            placeholder="Ex. Land Cruiser Prado"
            class="mb-3 h-10 w-full rounded-lg border border-line bg-bg px-3 text-sm"
          />

          <label class="mb-1 block text-xs font-semibold uppercase text-muted" for="vyear">
            Année *
          </label>
          <input
            id="vyear"
            name="vyear"
            type="number"
            min="1980"
            max="2030"
            [ngModel]="vYear()"
            (ngModelChange)="vYear.set($event)"
            required
            class="num mb-4 h-10 w-full rounded-lg border border-line bg-bg px-3 text-sm"
          />

          <button
            type="submit"
            [disabled]="!vMake().trim() || !vModel().trim() || !vYear()"
            class="h-11 w-full rounded-lg bg-action font-semibold text-on-action disabled:opacity-50"
          >
            + Enregistrer le véhicule
          </button>
        </form>

        <div class="rounded-2xl border border-line bg-surface p-5 lg:col-span-8">
          <div class="mb-4 flex items-center justify-between gap-2">
            <h2 class="font-display text-xl font-bold text-primary">
              Base de véhicules ({{ filteredVehicles().length }})
            </h2>
            <input
              type="search"
              [ngModel]="vehicleFilter()"
              (ngModelChange)="vehicleFilter.set($event)"
              placeholder="Filtrer marque / modèle…"
              class="h-9 rounded-lg border border-line bg-bg px-3 text-xs"
            />
          </div>

          <div class="grid gap-2.5 sm:grid-cols-2 md:grid-cols-3">
            @for (v of filteredVehicles(); track v.id) {
              <div class="flex items-center justify-between rounded-xl border border-line bg-bg px-3 py-2 text-sm">
                <span class="num font-medium">{{ v.make }} {{ v.model }} {{ v.year }}</span>
                <button
                  type="button"
                  (click)="removeVehicle(v)"
                  class="text-xs text-red-600 hover:underline dark:text-red-400"
                  title="Supprimer ce véhicule"
                >
                  ✕
                </button>
              </div>
            }
          </div>
        </div>
      </div>
    }

    <!-- MODALE CRÉATION / ÉDITION DE PIÈCE -->
    @if (modalOpen()) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4"
        (click)="modalOpen.set(false)"
      >
        <form
          (ngSubmit)="savePart()"
          (click)="$event.stopPropagation()"
          class="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-line bg-surface p-6 shadow-xl"
        >
          <div class="mb-4 flex items-center justify-between">
            <h2 class="font-display text-2xl font-bold text-primary">
              {{ editingPartId() ? 'Modifier la pièce' : 'Nouvelle pièce détachée' }}
            </h2>
            <button
              type="button"
              (click)="modalOpen.set(false)"
              class="rounded-lg border border-line px-2.5 py-1 text-sm"
            >
              ✕
            </button>
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <div class="sm:col-span-2">
              <label class="mb-1 block text-xs font-semibold uppercase text-muted" for="fname">
                Désignation complète *
              </label>
              <input
                id="fname"
                name="fname"
                [ngModel]="formName()"
                (ngModelChange)="formName.set($event)"
                required
                class="h-10 w-full rounded-lg border border-line bg-bg px-3 text-sm"
              />
            </div>

            <div>
              <label class="mb-1 block text-xs font-semibold uppercase text-muted" for="fref">
                Référence interne *
              </label>
              <input
                id="fref"
                name="fref"
                [ngModel]="formReference()"
                (ngModelChange)="formReference.set($event)"
                required
                placeholder="Ex. BRK-TY-0987"
                class="num h-10 w-full rounded-lg border border-line bg-bg px-3 text-sm uppercase"
              />
            </div>

            <div>
              <label class="mb-1 block text-xs font-semibold uppercase text-muted" for="foem">
                Numéro constructeur (OEM)
              </label>
              <input
                id="foem"
                name="foem"
                [ngModel]="formOem()"
                (ngModelChange)="formOem.set($event)"
                placeholder="Ex. 04465-02220"
                class="num h-10 w-full rounded-lg border border-line bg-bg px-3 text-sm"
              />
            </div>

            <div>
              <label class="mb-1 block text-xs font-semibold uppercase text-muted" for="fbrand">
                Marque équipementier *
              </label>
              <input
                id="fbrand"
                name="fbrand"
                [ngModel]="formBrand()"
                (ngModelChange)="formBrand.set($event)"
                required
                placeholder="Ex. Bosch, Brembo, KYB…"
                class="h-10 w-full rounded-lg border border-line bg-bg px-3 text-sm"
              />
            </div>

            <div>
              <label class="mb-1 block text-xs font-semibold uppercase text-muted" for="fcat">
                Catégorie *
              </label>
              <select
                id="fcat"
                name="fcat"
                [ngModel]="formCategory()"
                (ngModelChange)="formCategory.set($event)"
                class="h-10 w-full rounded-lg border border-line bg-bg px-3 text-sm"
              >
                @for (c of categories; track c) {
                  <option [value]="c">{{ c }}</option>
                }
              </select>
            </div>

            <div>
              <label class="mb-1 block text-xs font-semibold uppercase text-muted" for="fprice">
                Prix de vente (FCFA) *
              </label>
              <input
                id="fprice"
                name="fprice"
                type="number"
                min="0"
                step="500"
                [ngModel]="formPrice()"
                (ngModelChange)="formPrice.set($event)"
                required
                class="num h-10 w-full rounded-lg border border-line bg-bg px-3 text-sm"
              />
            </div>

            <div>
              <label class="mb-1 block text-xs font-semibold uppercase text-muted" for="fstock">
                Quantité en stock *
              </label>
              <input
                id="fstock"
                name="fstock"
                type="number"
                min="0"
                [ngModel]="formStock()"
                (ngModelChange)="formStock.set($event)"
                required
                class="num h-10 w-full rounded-lg border border-line bg-bg px-3 text-sm"
              />
            </div>

            <div class="sm:col-span-2">
              <label class="mb-1 block text-xs font-semibold uppercase text-muted" for="fimg">
                URL de l’image (laisser vide pour illustration automatique)
              </label>
              <input
                id="fimg"
                name="fimg"
                [ngModel]="formImageUrl()"
                (ngModelChange)="formImageUrl.set($event)"
                placeholder="https://..."
                class="h-10 w-full rounded-lg border border-line bg-bg px-3 text-sm"
              />
            </div>

            <div class="sm:col-span-2">
              <label class="mb-1 block text-xs font-semibold uppercase text-muted" for="fdesc">
                Description technique
              </label>
              <textarea
                id="fdesc"
                name="fdesc"
                rows="3"
                [ngModel]="formDescription()"
                (ngModelChange)="formDescription.set($event)"
                class="w-full rounded-lg border border-line bg-bg p-3 text-sm"
              ></textarea>
            </div>

            <div class="sm:col-span-2">
              <p class="mb-1.5 text-xs font-semibold uppercase text-muted">
                Véhicules compatibles ({{ formVehicleIds().length }} sélectionné(s))
              </p>
              <div class="grid max-h-40 grid-cols-2 gap-2 overflow-y-auto rounded-xl border border-line bg-bg p-3 text-xs sm:grid-cols-3">
                @for (v of vehiclesStore.all(); track v.id) {
                  <label class="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      [checked]="formVehicleIds().includes(v.id)"
                      (change)="toggleVehicleId(v.id)"
                      class="accent-[#F26A0F]"
                    />
                    <span class="num">{{ v.make }} {{ v.model }} {{ v.year }}</span>
                  </label>
                }
              </div>
            </div>
          </div>

          <div class="mt-6 flex justify-end gap-3">
            <button
              type="button"
              (click)="modalOpen.set(false)"
              class="h-11 rounded-lg border border-line px-4 text-sm font-medium"
            >
              Annuler
            </button>
            <button
              type="submit"
              [disabled]="savingPart() || !formName().trim() || !formReference().trim()"
              class="h-11 rounded-lg bg-action px-6 text-sm font-semibold text-on-action disabled:opacity-50"
            >
              {{ savingPart() ? 'Enregistrement…' : 'Enregistrer la pièce' }}
            </button>
          </div>
        </form>
      </div>
    }
  `,
})
export class AdminCatalog {
  private adminApi = inject(AdminApi);
  vehiclesStore = inject(VehicleStore);
  private toast = inject(ToastStore);

  categories = PART_CATEGORIES;
  tab = signal<'parts' | 'vehicles'>('parts');

  parts = signal<Part[]>([]);
  loadingParts = signal(true);
  partSearch = signal('');
  partCategory = signal('');
  partStock = signal<'all' | 'low' | 'out'>('all');

  modalOpen = signal(false);
  savingPart = signal(false);
  editingPartId = signal<number | null>(null);
  formName = signal('');
  formReference = signal('');
  formOem = signal('');
  formBrand = signal('Bosch');
  formCategory = signal<string>(PART_CATEGORIES[0]);
  formPrice = signal(15000);
  formStock = signal(10);
  formImageUrl = signal('');
  formDescription = signal('');
  formVehicleIds = signal<number[]>([]);

  vMake = signal('');
  vModel = signal('');
  vYear = signal(2020);
  vehicleFilter = signal('');

  filteredVehicles = computed(() => {
    const q = this.vehicleFilter().trim().toLowerCase();
    const all = this.vehiclesStore.all();
    if (!q) return all;
    return all.filter(v => `${v.make} ${v.model} ${v.year}`.toLowerCase().includes(q));
  });

  constructor() {
    this.vehiclesStore.load(true);
    this.loadParts();
  }

  loadParts() {
    this.loadingParts.set(true);
    this.adminApi
      .parts({
        search: this.partSearch(),
        category: this.partCategory(),
        stock: this.partStock(),
      })
      .subscribe({
        next: list => {
          this.parts.set(list);
          this.loadingParts.set(false);
        },
        error: () => this.loadingParts.set(false),
      });
  }

  openCreateModal() {
    this.editingPartId.set(null);
    this.formName.set('');
    this.formReference.set('');
    this.formOem.set('');
    this.formBrand.set('Bosch');
    this.formCategory.set(PART_CATEGORIES[0]);
    this.formPrice.set(15000);
    this.formStock.set(10);
    this.formImageUrl.set('');
    this.formDescription.set('');
    this.formVehicleIds.set([]);
    this.modalOpen.set(true);
  }

  openEditModal(p: Part) {
    this.editingPartId.set(p.id);
    this.formName.set(p.name);
    this.formReference.set(p.reference);
    this.formOem.set(p.oem_number ?? '');
    this.formBrand.set(p.brand ?? '');
    this.formCategory.set(p.category ?? PART_CATEGORIES[0]);
    this.formPrice.set(p.price);
    this.formStock.set(p.stock);
    this.formImageUrl.set(p.image_url?.startsWith('data:') ? '' : (p.image_url ?? ''));
    this.formDescription.set(p.description ?? '');
    this.formVehicleIds.set((p.vehicles ?? []).map(v => v.id));
    this.modalOpen.set(true);
  }

  toggleVehicleId(id: number) {
    this.formVehicleIds.update(ids =>
      ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id],
    );
  }

  savePart() {
    const payload: PartUpsertPayload = {
      name: this.formName().trim(),
      reference: this.formReference().trim(),
      oem_number: this.formOem().trim() || null,
      brand: this.formBrand().trim(),
      category: this.formCategory(),
      description: this.formDescription().trim() || null,
      price: Number(this.formPrice()),
      stock: Number(this.formStock()),
      image_url: this.formImageUrl().trim() || null,
      vehicle_ids: this.formVehicleIds(),
    };

    this.savingPart.set(true);
    const editId = this.editingPartId();
    const obs = editId
      ? this.adminApi.updatePart(editId, payload)
      : this.adminApi.createPart(payload);

    obs.subscribe({
      next: () => {
        this.savingPart.set(false);
        this.modalOpen.set(false);
        this.toast.success(editId ? 'Pièce mise à jour.' : 'Nouvelle pièce ajoutée au catalogue.');
        this.loadParts();
      },
      error: (e: HttpErrorResponse) => {
        this.savingPart.set(false);
        this.toast.error(e.error?.message ?? 'Erreur lors de la sauvegarde.');
      },
    });
  }

  removePart(p: Part) {
    if (!confirm(`Supprimer la pièce « ${p.name} » du catalogue ?`)) return;
    this.adminApi.deletePart(p.id).subscribe({
      next: () => {
        this.toast.info('Pièce supprimée.');
        this.loadParts();
      },
      error: () => this.toast.error('Impossible de supprimer cette pièce.'),
    });
  }

  addVehicle() {
    if (!this.vMake().trim() || !this.vModel().trim()) return;
    this.adminApi
      .createVehicle({
        make: this.vMake().trim(),
        model: this.vModel().trim(),
        year: Number(this.vYear()),
      })
      .subscribe({
        next: v => {
          this.toast.success(`Véhicule ${v.make} ${v.model} ${v.year} ajouté.`);
          this.vModel.set('');
          this.vehiclesStore.load(true);
        },
        error: (e: HttpErrorResponse) => {
          this.toast.error(e.error?.message ?? 'Erreur lors de l’ajout du véhicule.');
        },
      });
  }

  removeVehicle(v: Vehicle) {
    if (!confirm(`Supprimer ${v.make} ${v.model} ${v.year} ?`)) return;
    this.adminApi.deleteVehicle(v.id).subscribe({
      next: () => {
        this.toast.info('Véhicule supprimé.');
        this.vehiclesStore.load(true);
      },
      error: () => this.toast.error('Impossible de supprimer ce véhicule.'),
    });
  }
}
