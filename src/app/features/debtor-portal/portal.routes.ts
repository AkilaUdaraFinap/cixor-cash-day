import { Routes } from '@angular/router';
export const PORTAL_ROUTES: Routes = [
  { path: ':token', loadComponent: () => import('./debtor-portal.component').then(m => m.DebtorPortalComponent) },
  { path: '', redirectTo: 'demo', pathMatch: 'full' }
];
