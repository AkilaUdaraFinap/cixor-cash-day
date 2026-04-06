import { Routes } from '@angular/router';

export const INVOICES_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./invoice-list.component').then(m => m.InvoiceListComponent) },
  { path: 'new', loadComponent: () => import('./invoice-form.component').then(m => m.InvoiceFormComponent) },
  { path: 'proforma', loadComponent: () => import('./proforma-list.component').then(m => m.ProformaListComponent) },
  { path: 'proforma/new', loadComponent: () => import('./proforma-form.component').then(m => m.ProformaFormComponent) },
  { path: 'proforma/:id', loadComponent: () => import('./proforma-form.component').then(m => m.ProformaFormComponent) },
  { path: ':id/edit', loadComponent: () => import('./invoice-form.component').then(m => m.InvoiceFormComponent) },
  { path: ':id', loadComponent: () => import('./invoice-detail.component').then(m => m.InvoiceDetailComponent) },
];
