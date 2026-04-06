import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { UserRole } from '../../shared/models/models';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="login-shell">
      <div class="login-card">
        <div class="login-brand">CashDay</div>
        <h1 class="login-title">Sign in to continue</h1>
        <p class="login-copy">Frontend demo mode — choose a role to enter the app.</p>

        <div class="role-list">
          <button class="role-card" type="button" (click)="signIn('Admin')">
            <strong>Admin</strong>
            <span>Full access to settings, users, and operations.</span>
          </button>
          <button class="role-card" type="button" (click)="signIn('Finance')">
            <strong>Finance</strong>
            <span>Cash visibility, invoices, and settlement workflows.</span>
          </button>
          <button class="role-card" type="button" (click)="signIn('Sales')">
            <strong>Sales</strong>
            <span>Customer management and invoice drafting.</span>
          </button>
        </div>

        <div class="login-note">The debtor portal remains publicly accessible and does not require this login flow.</div>
      </div>
    </div>
  `,
  styles: [`
    .login-shell {
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 24px;
      background: linear-gradient(180deg, var(--bg) 0%, color-mix(in srgb, var(--accent) 8%, var(--bg)) 100%);
    }
    .login-card {
      width: min(100%, 560px);
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 16px;
      box-shadow: 0 16px 40px rgba(15, 23, 42, 0.12);
      padding: 28px;
    }
    .login-brand { font-size: 13px; font-weight: 700; color: var(--accent); text-transform: uppercase; letter-spacing: .08em; }
    .login-title { margin: 10px 0 6px; font-size: 28px; }
    .login-copy, .login-note { color: var(--text-secondary); }
    .role-list { display: grid; gap: 12px; margin-top: 18px; }
    .role-card {
      display: grid;
      gap: 4px;
      text-align: left;
      padding: 14px 16px;
      border-radius: 12px;
      border: 1px solid var(--border);
      background: var(--surface);
      color: var(--text);
      cursor: pointer;
    }
    .role-card:hover { border-color: color-mix(in srgb, var(--accent) 45%, var(--border)); background: var(--accent-light); }
    .role-card span { color: var(--text-secondary); font-size: 13px; }
    .login-note { margin-top: 14px; font-size: 13px; }
  `]
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  signIn(role: UserRole): void {
    this.auth.signInAsDemo(role);
    const redirect = this.route.snapshot.queryParamMap.get('redirect') || '/dashboard';
    this.router.navigateByUrl(redirect);
  }
}
