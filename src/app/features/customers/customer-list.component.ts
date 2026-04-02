import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MockDataService } from '../../core/services/mock-data.service';
import { Customer } from '../../shared/models/models';

@Component({
  selector: 'app-customer-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="page-header flex items-center justify-between mb-6">
      <div>
        <h2>Customers</h2>
        <div class="text-muted text-sm mt-1">Manage debtors and their authorized officers</div>
      </div>
      <a routerLink="/customers/new" class="btn btn-primary">+ Add Customer</a>
    </div>

    <div class="card mb-4">
      <input class="form-control customer-search" placeholder="Search by name, TIN, email…" [(ngModel)]="search" (ngModelChange)="onSearchChanged()"/>
    </div>

    <div class="card card-flush">
      <div class="desktop-table-only" *ngIf="filtered().length > 0">
        <div class="table-wrap">
          <table class="data-table">
          <thead>
            <tr>
              <th>Customer</th><th>TIN</th><th>Email</th><th>Phone</th>
              <th>Officers</th><th>Invoices</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let c of pagedCustomers()">
              <td>
                <div class="font-medium">{{ c.name }}</div>
                <div class="text-muted text-xs">{{ c.address }}</div>
              </td>
              <td>{{ c.tin || '—' }}</td>
              <td>{{ c.email }}</td>
              <td>{{ c.phone }}</td>
              <td>
                <span class="badge badge-draft">{{ c.officers.length || 0 }} officer(s)</span>
              </td>
              <td>—</td>
              <td class="row-actions">
                <a [routerLink]="['/customers', c.id]" class="btn btn-ghost btn-sm">View</a>
                <a [routerLink]="['/customers', c.id, 'edit']" class="btn btn-ghost btn-sm">Edit</a>
              </td>
            </tr>
          </tbody>
          </table>
        </div>
      </div>

      <div class="mobile-cards-only p-4" *ngIf="filtered().length > 0">
        <div class="mobile-data-list">
          <div class="mobile-data-card" *ngFor="let c of pagedCustomers()">
            <div class="mobile-data-card-header">
              <div>
                <div class="mobile-data-card-title">{{ c.name }}</div>
                <div class="mobile-data-card-subtitle">{{ c.address }}</div>
              </div>
              <span class="badge badge-draft">{{ c.officers.length || 0 }} officer(s)</span>
            </div>
            <div class="mobile-data-grid">
              <div class="mobile-data-row"><span class="mobile-data-label">TIN</span><span class="mobile-data-value">{{ c.tin || '—' }}</span></div>
              <div class="mobile-data-row"><span class="mobile-data-label">Email</span><span class="mobile-data-value">{{ c.email || '—' }}</span></div>
              <div class="mobile-data-row"><span class="mobile-data-label">Phone</span><span class="mobile-data-value">{{ c.phone || '—' }}</span></div>
              <div class="mobile-data-row"><span class="mobile-data-label">Invoices</span><span class="mobile-data-value">—</span></div>
            </div>
            <div class="mobile-data-actions">
              <a [routerLink]="['/customers', c.id]" class="btn btn-ghost btn-sm">View</a>
              <a [routerLink]="['/customers', c.id, 'edit']" class="btn btn-ghost btn-sm">Edit</a>
            </div>
          </div>
        </div>
      </div>

      <div *ngIf="filtered().length === 0" class="p-12 text-center">
        <div style="font-size:40px">👥</div>
        <div class="font-medium mt-3">No customers found</div>
        <a routerLink="/customers/new" class="btn btn-primary mt-4">Add Customer</a>
      </div>

      <div class="pagination-bar" *ngIf="filtered().length > 0 && totalPages() > 1">
        <div class="pagination-info">Showing {{ pageStart() }}-{{ pageEnd() }} of {{ filtered().length }}</div>
        <div class="pagination-controls">
          <button class="btn btn-secondary btn-sm" type="button" [disabled]="currentPage() === 1" (click)="setPage(currentPage() - 1)">Previous</button>
          <span class="pagination-page">Page {{ currentPage() }} / {{ totalPages() }}</span>
          <button class="btn btn-secondary btn-sm" type="button" [disabled]="currentPage() === totalPages()" (click)="setPage(currentPage() + 1)">Next</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .customer-search { max-width: 320px; }

    @media (max-width: 768px) {
      .customer-search { max-width: 100%; }
    }
  `]
})
export class CustomerListComponent implements OnInit {
  private svc = inject(MockDataService);
  customers = signal<Customer[]>([]);
  search = '';
  readonly pageSize = 8;
  page = signal(1);

  filtered() {
    if (!this.search) return this.customers();
    const q = this.search.toLowerCase();
    return this.customers().filter(c =>
      c.name.toLowerCase().includes(q) || (c.tin || '').toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q)
    );
  }

  totalPages(): number {
    return Math.max(1, Math.ceil(this.filtered().length / this.pageSize));
  }

  currentPage(): number {
    return Math.min(this.page(), this.totalPages());
  }

  pagedCustomers(): Customer[] {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filtered().slice(start, start + this.pageSize);
  }

  setPage(nextPage: number): void {
    this.page.set(Math.min(Math.max(1, nextPage), this.totalPages()));
  }

  pageStart(): number {
    return (this.currentPage() - 1) * this.pageSize + 1;
  }

  pageEnd(): number {
    return Math.min(this.currentPage() * this.pageSize, this.filtered().length);
  }

  onSearchChanged(): void {
    this.page.set(1);
  }

  ngOnInit() { this.svc.getCustomers().subscribe(list => this.customers.set(list)); }
}
