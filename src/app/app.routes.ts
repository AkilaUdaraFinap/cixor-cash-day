import { Routes } from "@angular/router";
import { authChildGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent) },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: '',
    canActivateChild: [authChildGuard],
    loadComponent: () => import('./app.shell').then(m => m.AppShellComponent),
    children: [
      { path: 'dashboard', loadChildren: () => import('./features/dashboard/dashboard.routes').then(m => m.DASHBOARD_ROUTES) },
      { path: 'invoices',  loadChildren: () => import('./features/invoices/invoices.routes').then(m => m.INVOICES_ROUTES) },
      { path: 'customers', loadChildren: () => import('./features/customers/customers.routes').then(m => m.CUSTOMERS_ROUTES) },
      { path: 'users',     loadChildren: () => import('./features/users/users.routes').then(m => m.USERS_ROUTES) },
      { path: 'settings',  loadChildren: () => import('./features/settings/settings.routes').then(m => m.SETTINGS_ROUTES) },
    ]
  },
  { path: 'acceptance/portal', loadChildren: () => import('./features/debtor-portal/portal.routes').then(m => m.PORTAL_ROUTES) },
  { path: '**', redirectTo: 'dashboard' }
];
