import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { MockDataService } from '../../core/services/mock-data.service';
import { AppUser } from '../models/models';

interface NavItem { icon: string; label: string; route: string; }

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
          <span class="nav-icon" [innerHTML]="item.icon"></span>
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
    .nav-icon { width: 20px; flex-shrink: 0; display: flex; }
    .nav-icon ::ng-deep svg { width: 18px; height: 18px; }
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
      .nav-icon ::ng-deep svg { width: 22px; height: 22px; }
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
    { label: 'Dashboard', route: '/dashboard', icon: `<svg viewBox="0 0 20 20" fill="currentColor"><path d="M3 4a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 8a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H4a1 1 0 01-1-1v-4zm8-8a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V4zm0 8a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"/></svg>` },
    { label: 'Invoices',  route: '/invoices',  icon: `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd"/></svg>` },
    { label: 'Customers', route: '/customers', icon: `<svg viewBox="0 0 20 20" fill="currentColor"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v1h8v-1zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-1a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v1h-3zM4.75 14.094A5.973 5.973 0 004 17v1H1v-1a3 3 0 013.75-2.906z"/></svg>` },
    { label: 'Users',     route: '/users',     icon: `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd"/></svg>` },
    { label: 'Settings',  route: '/settings',  icon: `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd"/></svg>` },
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
