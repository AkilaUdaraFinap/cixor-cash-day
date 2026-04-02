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
      <input class="form-control customer-search" placeholder="Search by name, TIN, email…" [(ngModel)]="search"/>
    </div>

    <div class="card card-flush">
      <div class="table-wrap">
        <table class="data-table" *ngIf="filtered().length > 0; else empty">
          <thead>
            <tr>
              <th>Customer</th><th>TIN</th><th>Email</th><th>Phone</th>
              <th>Officers</th><th>Invoices</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let c of filtered()">
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
        <ng-template #empty>
          <div class="p-12 text-center">
            <div style="font-size:40px">👥</div>
            <div class="font-medium mt-3">No customers found</div>
            <a routerLink="/customers/new" class="btn btn-primary mt-4">Add Customer</a>
          </div>
        </ng-template>
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

  filtered() {
    if (!this.search) return this.customers();
    const q = this.search.toLowerCase();
    return this.customers().filter(c =>
      c.name.toLowerCase().includes(q) || (c.tin || '').toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q)
    );
  }

  ngOnInit() { this.svc.getCustomers().subscribe(list => this.customers.set(list)); }
}
