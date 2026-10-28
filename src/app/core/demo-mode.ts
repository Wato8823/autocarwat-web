import { Injectable, signal } from '@angular/core';
import { environment } from '../../environments/environment';

export const DEMO_DB_KEY = 'autocarwat_demo_db_v3';
const SESSION_KEY = 'autocarwat_demo_active';

function activeInSession(): boolean {
  try {
    return environment.demoEnabled && sessionStorage.getItem(SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

/** Mode isolé et explicite, disponible uniquement dans le build de développement. */
@Injectable({ providedIn: 'root' })
export class DemoModeService {
  readonly isActive = signal(activeInSession());
  readonly available = environment.demoEnabled;

  activate() {
    if (!this.available) return;
    try {
      sessionStorage.setItem(SESSION_KEY, '1');
    } catch {}
    this.isActive.set(true);
  }

  reconnectApi() {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {}
    this.isActive.set(false);
  }

  resetDb() {
    try {
      localStorage.removeItem(DEMO_DB_KEY);
    } catch {}
  }
}
