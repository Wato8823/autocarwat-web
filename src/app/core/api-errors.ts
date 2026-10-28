import { HttpErrorResponse } from '@angular/common/http';

/** Transforme { errors: { email: ["..."] } } de Laravel en { email: "..." } */
export function fieldErrors(e: HttpErrorResponse): Record<string, string> {
  const out: Record<string, string> = {};
  const errs = e.error?.errors;
  if (errs && typeof errs === 'object') {
    for (const k of Object.keys(errs)) out[k] = errs[k][0];
  }
  return out;
}

export function globalError(e: HttpErrorResponse): string {
  if (e.status === 0) return 'Impossible de joindre le serveur.';
  if (e.status === 429) return 'Trop de tentatives. Réessayez dans une minute.';
  if (e.status === 422) return '';           // affiché champ par champ
  return e.error?.message ?? 'Une erreur est survenue.';
}
