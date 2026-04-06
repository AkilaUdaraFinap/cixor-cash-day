import { Injectable, computed, signal } from '@angular/core';
import { UserRole } from '../../shared/models/models';

export interface AuthSession {
  userId: string;
  name: string;
  email: string;
  role: UserRole;
  companyId: string;
  token: string;
}

const STORAGE_KEY = 'cashday.auth.session';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly sessionState = signal<AuthSession | null>(null);

  readonly session = computed(() => this.sessionState());
  readonly isAuthenticated = computed(() => !!this.sessionState());

  constructor() {
    this.loadOrSeedSession();
  }

  signIn(session: Omit<AuthSession, 'token'> & { token?: string }): void {
    const next: AuthSession = {
      ...session,
      token: session.token || `mock-jwt-${session.role.toLowerCase()}`,
    };
    this.sessionState.set(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  signInAsDemo(role: UserRole): void {
    const demoUsers: Record<UserRole, Omit<AuthSession, 'token'>> = {
      Admin: {
        userId: 'u1',
        name: 'Amara Perera',
        email: 'amara@precisionmfg.lk',
        role: 'Admin',
        companyId: '1001',
      },
      Finance: {
        userId: 'u2',
        name: 'Nuwan Jayawardena',
        email: 'nuwan@precisionmfg.lk',
        role: 'Finance',
        companyId: '1001',
      },
      Sales: {
        userId: 'u3',
        name: 'Dilini Ranasinghe',
        email: 'dilini@precisionmfg.lk',
        role: 'Sales',
        companyId: '1001',
      },
    };

    this.signIn(demoUsers[role]);
  }

  signOut(): void {
    this.sessionState.set(null);
    localStorage.removeItem(STORAGE_KEY);
  }

  authToken(): string | null {
    return this.sessionState()?.token ?? null;
  }

  tenantCompanyId(): string | null {
    return this.sessionState()?.companyId ?? null;
  }

  private loadOrSeedSession(): void {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as AuthSession;
        if (parsed?.userId && parsed?.role) {
          this.sessionState.set(parsed);
          return;
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }

    this.signInAsDemo('Admin');
  }
}
