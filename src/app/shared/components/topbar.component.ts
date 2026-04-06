import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AppUser } from '../models/models';
import { ThemeService, ThemePalette, ThemeMode } from '../../core/services/theme.service';
import { UserDataService } from '../../core/services/user-data.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationCenterService } from '../../core/services/notification-center.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="topbar">
      <div class="topbar-left">
        <img class="topbar-logo" src="/cashday-logo.png" alt="CashDay logo"/>
        <div class="company-name">{{ company() }}</div>
        <div class="company-sub">SME Financial Co-Pilot</div>
      </div>
      <div class="topbar-right">
        <button class="icon-btn" type="button" (click)="notificationsOpen.set(!notificationsOpen())" [attr.aria-expanded]="notificationsOpen()" aria-label="Open notifications">
          <span>🔔</span>
          <span class="notif-badge" *ngIf="notifications.unreadCount()">{{ notifications.unreadCount() }}</span>
        </button>
        <div class="dropdown notifications-dropdown" *ngIf="notificationsOpen()" (click)="onDropdownClick($event)">
          <div class="dropdown-section">
            <div class="dropdown-title">Recent Activity</div>
            <div class="notification-item" *ngFor="let item of notifications.items()">
              <div class="notification-title">{{ item.title }}</div>
              <div class="notification-detail">{{ item.detail }}</div>
              <div class="notification-time">{{ item.createdAt }}</div>
            </div>
            <div class="text-muted text-sm" *ngIf="!notifications.items().length">No recent updates.</div>
          </div>
        </div>
        <button class="user-menu" type="button" (click)="menuOpen.set(!menuOpen())" [attr.aria-expanded]="menuOpen()" aria-label="Open user menu">
          <ng-container *ngIf="user() as currentUser">
            <div class="avatar avatar-md">{{ initials(currentUser.name) }}</div>
            <div class="user-details">
              <div class="user-name">{{ currentUser.name }}</div>
              <div class="user-role">{{ currentUser.role }}</div>
            </div>
          </ng-container>
          <svg class="chevron" viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
            <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/>
          </svg>
        </button>
        <div class="dropdown" *ngIf="menuOpen()" (click)="onDropdownClick($event)">
          <div class="dropdown-section">
            <div class="dropdown-title">Theme Palette</div>
            <div class="palette-row">
              <button class="theme-chip" [class.active]="theme.palette() === 'finap-emerald'" (click)="changePalette($event, 'finap-emerald')" type="button" aria-label="Switch to FINAP Emerald" title="FINAP Emerald">
                <span class="dot" style="background:#1FAD4E"></span>
                <span class="dot" style="background:#41A5DA"></span>
                <span class="dot" style="background:#E8252A"></span>
              </button>
              <button class="theme-chip" [class.active]="theme.palette() === 'finap-royal'" (click)="changePalette($event, 'finap-royal')" type="button" aria-label="Switch to FINAP Royal" title="FINAP Royal">
                <span class="dot" style="background:#023260"></span>
                <span class="dot" style="background:#E8B547"></span>
                <span class="dot" style="background:#0DB4D7"></span>
              </button>
              <button class="theme-chip" [class.active]="theme.palette() === 'cashday-logo'" (click)="changePalette($event, 'cashday-logo')" type="button" aria-label="Switch to CashDay Signature" title="CashDay Signature">
                <span class="dot" style="background:#3B1E72"></span>
                <span class="dot" style="background:#E9C46A"></span>
                <span class="dot" style="background:#5A2DA8"></span>
              </button>
            </div>
            <div class="palette-name-row">
              <button class="palette-name-btn" [class.active]="theme.palette() === 'finap-emerald'" (click)="changePalette($event, 'finap-emerald')" type="button">Emerald</button>
              <button class="palette-name-btn" [class.active]="theme.palette() === 'finap-royal'" (click)="changePalette($event, 'finap-royal')" type="button">Royal</button>
              <button class="palette-name-btn" [class.active]="theme.palette() === 'cashday-logo'" (click)="changePalette($event, 'cashday-logo')" type="button">Signature</button>
            </div>
            <div class="mode-row">
              <button class="mode-btn" [class.active]="theme.mode() === 'light'" (click)="changeMode($event, 'light')" type="button">Light</button>
              <button class="mode-btn" [class.active]="theme.mode() === 'dark'" (click)="changeMode($event, 'dark')" type="button">Dark</button>
            </div>
          </div>
          <div class="dropdown-divider"></div>
          <button class="dropdown-item" type="button" (click)="closeMenu()">My Profile</button>
          <div class="dropdown-divider"></div>
          <button class="dropdown-item danger" type="button" (click)="signOut()">Sign Out</button>
        </div>
      </div>
    </header>
    <div class="overlay-dismiss" *ngIf="menuOpen() || notificationsOpen()" (click)="dismissOverlays()"></div>
  `,
  styles: [`
    .topbar {
      height: 64px; background: var(--surface);
      border-bottom: 1px solid var(--border);
      display: flex; align-items: center; justify-content: space-between;
      padding: 0 24px; position: sticky; top: 0; z-index: 100;
      box-shadow: 0 1px 3px rgba(0,0,0,.05);
    }
    .topbar-left { display: flex; align-items: center; gap: 10px; min-width: 0; }
    .topbar-logo {
      width: 30px;
      height: 30px;
      border-radius: 8px;
      object-fit: cover;
      flex-shrink: 0;
      filter: saturate(1.15) brightness(1.08);
      clip-path: inset(3px round 6px);
      transform: scale(1.12);
      transform-origin: center;
      box-shadow:
        0 0 0 1px color-mix(in srgb, #f0cf86 55%, transparent),
        0 0 10px color-mix(in srgb, #f0cf86 28%, transparent);
    }
    .company-name { font-weight: 600; font-size: 15px; color: var(--text); }
    .company-sub  { font-size: 12px; color: var(--text-secondary); }
    .topbar-right { display: flex; align-items: center; gap: 12px; position: relative; }
    .icon-btn {
      position: relative;
      width: 40px;
      height: 40px;
      border-radius: 999px;
      border: 1px solid var(--border);
      background: var(--surface);
      color: var(--text);
      cursor: pointer;
    }
    .notif-badge {
      position: absolute;
      top: -4px;
      right: -4px;
      min-width: 18px;
      height: 18px;
      border-radius: 999px;
      background: var(--red);
      color: #fff;
      font-size: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 4px;
    }
    .notifications-dropdown { min-width: 320px; right: 56px; }
    .notification-item { padding: 8px 0; border-bottom: 1px solid var(--border); }
    .notification-item:last-child { border-bottom: none; }
    .notification-title { font-size: 12px; font-weight: 600; color: var(--text); }
    .notification-detail { font-size: 12px; color: var(--text-secondary); margin-top: 2px; }
    .notification-time { font-size: 11px; color: var(--text-secondary); margin-top: 4px; }
    .user-menu {
      display: flex; align-items: center; gap: 8px;
      cursor: pointer; padding: 6px 8px; border-radius: 6px;
      transition: background .15s;
      border: 1px solid transparent;
      background: transparent;
      color: var(--text);
      &:hover { background: var(--bg); }
    }
    .user-menu:focus-visible { border-color: var(--accent); }
    .avatar { border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; flex-shrink: 0; }
    .avatar-md { width: 36px; height: 36px; font-size: 13px; background: var(--accent); color: #fff; }
    .user-name { font-size: 13px; font-weight: 500; }
    .user-role { font-size: 11px; color: var(--text-secondary); }
    .chevron { color: var(--text-secondary); }
    .dropdown {
      position: absolute; top: calc(100% + 8px); right: 0;
      background: var(--surface); border: 1px solid var(--border);
      border-radius: 8px; box-shadow: 0 14px 32px rgba(0,0,0,.18);
      min-width: 230px; z-index: 200; overflow: hidden;
    }
    .dropdown-section { padding: 12px 14px; }
    .dropdown-title { font-size: 11px; text-transform: uppercase; letter-spacing: .06em; color: var(--text-secondary); font-weight: 700; margin-bottom: 8px; }
    .palette-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 8px; }
    .theme-chip {
      display: flex;
      justify-content: center;
      gap: 4px;
      padding: 7px 8px;
      border: 1px solid var(--border);
      border-radius: 999px;
      background: var(--surface);
      cursor: pointer;
    }
    .theme-chip.active { border-color: var(--accent); box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 30%, transparent); }
    .dot { width: 10px; height: 10px; border-radius: 50%; display: inline-flex; }
    .palette-name-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-bottom: 8px; }
    .palette-name-btn {
      border: 1px solid var(--border);
      background: var(--surface);
      color: var(--text-secondary);
      border-radius: 6px;
      font-size: 11px;
      padding: 6px 4px;
      cursor: pointer;
    }
    .palette-name-btn.active {
      color: var(--accent);
      border-color: color-mix(in srgb, var(--accent) 55%, var(--border));
      background: var(--accent-light);
      font-weight: 600;
    }
    .mode-row { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
    .mode-btn {
      border: 1px solid var(--border); background: var(--surface); color: var(--text);
      border-radius: 6px; font-size: 12px; padding: 6px 8px; cursor: pointer;
    }
    .mode-btn.active { background: var(--accent-light); color: var(--accent); border-color: color-mix(in srgb, var(--accent) 55%, var(--border)); font-weight: 600; }
    .dropdown-item {
      width: 100%;
      text-align: left;
      border: none;
      background: transparent;
      color: var(--text);
      padding: 10px 16px; font-size: 14px; cursor: pointer;
      transition: background .1s;
      &:hover { background: var(--bg); }
      &.danger { color: var(--red); }
    }
    .dropdown-divider { border-top: 1px solid var(--border); }
    .overlay-dismiss { position: fixed; inset: 0; z-index: 90; }

    @media (max-width: 768px) {
      .topbar { padding: 0 14px; height: 60px; }
      .company-sub, .user-details { display: none; }
      .topbar-logo { width: 24px; height: 24px; border-radius: 6px; }
      .company-name { font-size: 14px; max-width: 43vw; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .dropdown { right: -2px; min-width: 214px; }
    }
  `]
})
export class TopbarComponent implements OnInit {
  private readonly userSvc = inject(UserDataService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  theme = inject(ThemeService);
  notifications = inject(NotificationCenterService);
  menuOpen = signal(false);
  notificationsOpen = signal(false);
  user = signal<AppUser | null>(null);
  company = signal('Precision Manufacturing (Pvt) Ltd');

  ngOnInit() {
    const session = this.auth.session();
    this.userSvc.getUsers().subscribe(users => {
      const activeUser = users.find(user => user.id === session?.userId) ?? users[0] ?? null;
      this.user.set(activeUser);
    });
    this.company.set(session?.companyId ? 'Precision Manufacturing (Pvt) Ltd' : 'CashDay Demo Tenant');
  }
  closeMenu() { this.menuOpen.set(false); }
  dismissOverlays() { this.menuOpen.set(false); this.notificationsOpen.set(false); }
  signOut() { this.menuOpen.set(false); this.auth.signOut(); this.router.navigate(['/login']); }
  initials(name: string = ''): string { return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2); }
  onDropdownClick(event: MouseEvent) {
    event.stopPropagation();
  }
  changePalette(event: MouseEvent, palette: ThemePalette) {
    event.stopPropagation();
    this.theme.setPalette(palette);
  }
  changeMode(event: MouseEvent, mode: ThemeMode) {
    event.stopPropagation();
    this.theme.setMode(mode);
  }
}
