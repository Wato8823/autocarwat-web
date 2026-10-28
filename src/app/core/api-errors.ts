import { HttpErrorResponse } from '@angular/common/http';

/** Transforme les erreurs de validation Laravel en messages par champ. */
export function fieldErrors(e: HttpErrorResponse): Record<string, string> {
  const out: Record<string, string> = {};
  const errors = e.error?.errors;
  if (errors && typeof errors === 'object') {
    for (const key of Object.keys(errors)) {
      const value = errors[key];
      if (Array.isArray(value) && typeof value[0] === 'string') out[key] = value[0];
    }
  }
  return out;
}

export function globalError(e: HttpErrorResponse): string {
  if (e.status === 0) return 'Impossible de joindre le serveur.';
  if (e.status === 429) return 'Trop de tentatives. Réessayez dans une minute.';
  if (e.status === 422 && Object.keys(fieldErrors(e)).length) return '';
  return e.error?.message ?? 'Une erreur est survenue.';
}
