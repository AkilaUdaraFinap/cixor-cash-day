import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { MockDataService } from '../../core/services/mock-data.service';
import { AppUser } from '../models/models';

interface NavItem { iconPath: string; label: string; route: string; }

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <aside class="sidebar" [class.collapsed]="collapsed()">
      <div class="sidebar-brand">
        <div class="brand-logo">
          <img src="/cashday-logo.png" alt="CashDay logo" class="brand-logo-img"/>
        </div>
        <span class="brand-name" *ngIf="!collapsed()">CashDay</span>
        <button class="collapse-btn" (click)="collapsed.set(!collapsed())" title="Toggle sidebar">
          <span>{{ collapsed() ? '›' : '‹' }}</span>
        </button>
      </div>

      <nav class="sidebar-nav">
        <a *ngFor="let item of navItems"
           [routerLink]="item.route"
           class="nav-item"
           [class.active]="isActive(item.route)"
           [title]="collapsed() ? item.label : ''">
          <span class="nav-icon" aria-hidden="true">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path [attr.d]="item.iconPath"></path>
            </svg>
          </span>
          <span class="nav-label">{{ item.label }}</span>
        </a>
      </nav>

      <div class="sidebar-footer" *ngIf="!collapsed()">
        <div class="sidebar-user" *ngIf="currentUser() as user">
          <div class="avatar avatar-sm">{{ initials(user.name) }}</div>
          <div class="user-info">
            <div class="font-medium truncate" style="font-size:13px">{{ user.name }}</div>
            <div class="text-sm text-muted">{{ user.role }}</div>
          </div>
        </div>
      </div>
    </aside>
  `,
  styles: [`
    .sidebar {
      width: 220px; min-height: 100vh;
      background: var(--sidebar-bg);
      display: flex; flex-direction: column;
      transition: width .2s ease;
      flex-shrink: 0;
      position: sticky; top: 0; height: 100vh;
      box-shadow: inset -1px 0 0 color-mix(in srgb, var(--sidebar-text) 12%, transparent);
    }
    .sidebar.collapsed { width: 64px; }
    .sidebar-brand {
      display: flex; align-items: center; gap: 10px;
      padding: 18px 16px;
      border-bottom: 1px solid color-mix(in srgb, var(--sidebar-text) 12%, transparent);
      min-height: 64px;
    }
    .brand-name { color: var(--sidebar-text); font-weight: 700; font-size: 18px; flex: 1; }
    .brand-logo { flex-shrink: 0; display: flex; }
    .brand-logo-img {
      width: 30px;
      height: 30px;
      border-radius: 8px;
      object-fit: cover;
      filter: saturate(1.15) brightness(1.08);
      clip-path: inset(3px round 6px);
      transform: scale(1.12);
      transform-origin: center;
      box-shadow:
        0 0 0 1px color-mix(in srgb, #f0cf86 55%, transparent),
        0 0 12px color-mix(in srgb, #f0cf86 30%, transparent);
    }
    .sidebar.collapsed .brand-logo-img {
      width: 24px;
      height: 24px;
      border-radius: 6px;
    }
    .collapse-btn {
      background: none; border: none; color: var(--sidebar-muted);
      cursor: pointer; font-size: 18px; padding: 2px 4px;
      margin-left: auto;
      &:hover { color: var(--sidebar-text); }
    }
    .sidebar-nav { flex: 1; padding: 12px 8px; display: flex; flex-direction: column; gap: 2px; }
    .nav-item {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 12px; border-radius: 6px;
      color: var(--sidebar-muted); text-decoration: none;
      font-size: 14px; font-weight: 500;
      transition: all .15s;
      border-left: 3px solid transparent;
      &:hover { background: var(--sidebar-hover); color: var(--sidebar-text); text-decoration: none; }
      &.active { background: var(--sidebar-active-bg); color: var(--sidebar-text); border-left-color: var(--sidebar-active-border); }
    }
    .nav-icon { width: 20px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
    .nav-icon svg { width: 18px; height: 18px; display: block; overflow: visible; }
    .nav-label { }
    .sidebar.collapsed .nav-label { display: none; }
    .sidebar-footer {
      padding: 12px 12px 16px;
      border-top: 1px solid color-mix(in srgb, var(--sidebar-text) 12%, transparent);
    }
    .sidebar-user { display: flex; align-items: center; gap: 8px; }
    .avatar {
      background: color-mix(in srgb, var(--sidebar-text) 18%, transparent); color: var(--sidebar-text);
      border-radius: 50%; display: flex; align-items: center; justify-content: center;
      font-weight: 600; flex-shrink: 0;
    }
    .avatar-sm { width: 32px; height: 32px; font-size: 12px; }
    .user-info { min-width: 0; }
    .user-info .font-medium, .user-info .text-sm { color: var(--sidebar-text); }
    .user-info .text-muted { color: var(--sidebar-muted); }

    @media (max-width: 768px) {
      .sidebar {
        position: fixed;
        top: auto;
        left: 0;
        right: 0;
        bottom: 0;
        width: 100vw;
        min-height: calc(64px + env(safe-area-inset-bottom));
        height: auto;
        padding-bottom: env(safe-area-inset-bottom);
        z-index: 250;
        box-shadow: 0 -4px 20px rgba(0, 0, 0, .22);
        border-top: 1px solid color-mix(in srgb, var(--sidebar-text) 10%, transparent);
      }
      .sidebar.collapsed { width: 100vw; }
      .sidebar-brand,
      .sidebar-footer,
      .collapse-btn { display: none; }
      .sidebar-nav {
        flex-direction: row;
        align-items: stretch;
        justify-content: space-around;
        gap: 0;
        padding: 6px 4px 4px;
      }
      .nav-item {
        flex: 1;
        border-left: none;
        border-radius: 8px;
        padding: 6px 2px 4px;
        gap: 3px;
        min-width: 0;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        background: transparent;
        color: var(--sidebar-muted);
        transition: color .15s ease;
      }
      .nav-item:hover {
        background: transparent;
        color: var(--sidebar-text);
      }
      .nav-item.active {
        border-left-color: transparent;
        background: transparent;
        color: var(--sidebar-active-border);
        box-shadow: none;
      }
      .nav-label {
        display: block !important;
        font-size: 10px;
        font-weight: 500;
        line-height: 1.15;
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        letter-spacing: 0.01em;
      }
      .nav-icon {
        width: auto;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .nav-icon svg { width: 22px; height: 22px; }
    }
  `]
})
export class SidebarComponent implements OnInit {
  private router = inject(Router);
  private dataSvc = inject(MockDataService);
  collapsed = signal(false);
  currentUser = signal<AppUser | null>(null);
  currentRoute = signal('');

  navItems: NavItem[] = [
    { label: 'Dashboard', route: '/dashboard', iconPath: 'M3.5 4.5h5v5h-5zm8 0h5v5h-5zm-8 8h5v5h-5zm8 0h5v5h-5z' },
    { label: 'Invoices', route: '/invoices', iconPath: 'M6.5 2.5h4l4 4V16a1.5 1.5 0 0 1-1.5 1.5h-6A1.5 1.5 0 0 1 5.5 16V4A1.5 1.5 0 0 1 6.5 2.5zm3.5 1v3.5H13.5M7.5 10h5m-5 3h5' },
    { label: 'Customers', route: '/customers', iconPath: 'M6.5 8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zm7 1a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM3.5 16a4 4 0 0 1 6-3.465A4 4 0 0 1 15.5 16m-4.5-1a3.5 3.5 0 0 1 5-2.2A3.3 3.3 0 0 1 17 15.5' },
    { label: 'Users', route: '/users', iconPath: 'M10 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm-5.5 7a5.5 5.5 0 0 1 11 0' },
    { label: 'Settings', route: '/settings', iconPath: 'M10 3.5v2m0 9v2m6.5-6.5h-2m-9 0h-2m11.1-4.6-1.4 1.4m-6.2 6.2-1.4 1.4m0-9 1.4 1.4m6.2 6.2 1.4 1.4M10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z' },
  ];

  ngOnInit() {
    this.dataSvc.getUsers().subscribe(users => { this.currentUser.set(users[0] ?? null); });
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe((e: any) => {
      this.currentRoute.set(e.urlAfterRedirects);
    });
    this.currentRoute.set(this.router.url);
  }

  isActive(route: string): boolean { return this.router.url.startsWith(route); }
  initials(name: string = ''): string { return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2); }
}
