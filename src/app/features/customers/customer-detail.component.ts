import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MockDataService } from '../../core/services/mock-data.service';
import { LkrPipe } from '../../shared/pipes/lkr.pipe';
import { Customer, Invoice } from '../../shared/models/models';

@Component({
  selector: 'app-customer-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, LkrPipe],
  template: `
    <div class="page-header flex items-center gap-3 mb-6">
      <button class="btn btn-ghost btn-sm" routerLink="/customers">← Back</button>
      <div style="flex:1">
        <h2>{{ customer()?.name }}</h2>
        <div class="text-muted text-sm mt-1">{{ customer()?.address }}</div>
      </div>
      <a [routerLink]="['/customers', customer()?.id, 'edit']" class="btn btn-secondary">Edit Customer</a>
    </div>

    <div *ngIf="customer() as c" class="customer-layout">
      <!-- Left Panel -->
      <div>
        <div class="card mb-4">
          <h3 class="section-title">Customer Info</h3>
          <div class="flex flex-col gap-3 text-sm">
            <div><span class="text-muted">TIN</span><div class="font-medium">{{ c.tin || '—' }}</div></div>
            <div><span class="text-muted">VAT Reg.</span><div class="font-medium">{{ c.vatRegNo || '—' }}</div></div>
            <div><span class="text-muted">BRN</span><div class="font-medium">{{ c.brn || '—' }}</div></div>
            <div><span class="text-muted">Email</span><div class="font-medium">{{ c.email || '—' }}</div></div>
            <div><span class="text-muted">Phone</span><div class="font-medium">{{ c.phone || '—' }}</div></div>
          </div>
        </div>

        <div class="card">
          <h3 class="section-title">Authorized Officers</h3>
          <div *ngFor="let off of c.officers" class="officer-card">
            <div class="flex items-center justify-between">
              <div class="font-medium">{{ off.name }}</div>
              <span *ngIf="off.isPrimary" class="badge badge-accepted" style="font-size:10px">Primary</span>
            </div>
            <div class="text-muted text-xs mt-1">{{ off.designation }}</div>
            <div class="text-sm mt-2">{{ off.email }}</div>
            <div class="text-sm text-muted">{{ off.mobile }}</div>
            <div class="text-xs text-muted mt-1">NIC: {{ off.nic || '—' }}</div>
          </div>
          <div *ngIf="!c.officers || c.officers.length === 0" class="text-muted text-sm">No officers on record.</div>
        </div>
      </div>

      <!-- Right: Invoice History -->
      <div>
        <div class="card">
          <h3 class="section-title">Invoice History</h3>
          <div class="desktop-table-only" *ngIf="invoices().length > 0">
            <div class="table-wrap">
              <table class="data-table">
              <thead>
                <tr>
                  <th>Invoice No.</th><th>Date</th><th>Due</th>
                  <th class="text-right">Gross (LKR)</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let inv of invoices()">
                  <td><a [routerLink]="['/invoices', inv.id]" class="text-accent">{{ inv.serialNumber }}</a></td>
                  <td>{{ inv.invoiceDate }}</td>
                  <td>{{ inv.dueDate }}</td>
                  <td class="text-right lkr-mono">{{ inv.grossAmount | lkr }}</td>
                  <td><span class="badge" [ngClass]="statusBadge(inv.status)">{{ inv.status }}</span></td>
                </tr>
              </tbody>
              </table>
            </div>
          </div>

          <div class="mobile-cards-only" *ngIf="invoices().length > 0">
            <div class="mobile-data-list">
              <div class="mobile-data-card" *ngFor="let inv of invoices()">
                <div class="mobile-data-card-header">
                  <div>
                    <a [routerLink]="['/invoices', inv.id]" class="mobile-data-card-title text-accent">{{ inv.serialNumber }}</a>
                    <div class="mobile-data-card-subtitle">Due {{ inv.dueDate }}</div>
                  </div>
                  <span class="badge" [ngClass]="statusBadge(inv.status)">{{ inv.status }}</span>
                </div>
                <div class="mobile-data-grid">
                  <div class="mobile-data-row"><span class="mobile-data-label">Invoice Date</span><span class="mobile-data-value">{{ inv.invoiceDate }}</span></div>
                  <div class="mobile-data-row"><span class="mobile-data-label">Gross (LKR)</span><span class="mobile-data-value lkr-mono">{{ inv.grossAmount | lkr }}</span></div>
                </div>
              </div>
            </div>
          </div>

          <div *ngIf="!invoices().length" class="p-8 text-center text-muted text-sm">No invoices for this customer yet.</div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .section-title { font-size:13px; font-weight:600; color:var(--text-secondary); text-transform:uppercase; letter-spacing:.05em; margin-bottom:12px; }
    .officer-card { background:var(--bg); border:1px solid var(--border); border-radius:6px; padding:12px; margin-bottom:8px; }
    .customer-layout { display:grid; grid-template-columns:340px minmax(0, 1fr); gap:24px; align-items:start; }

    @media (max-width: 980px) {
      .customer-layout { grid-template-columns:1fr; }
    }
  `]
})
export class CustomerDetailComponent implements OnInit {
  private svc   = inject(MockDataService);
  private route  = inject(ActivatedRoute);

  customer = signal<Customer | null>(null);
  invoices = signal<Invoice[]>([]);

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.svc.getCustomer(id).subscribe(c => {
      this.customer.set(c);
      if (c) {
        this.svc.getInvoices().subscribe(all =>
          this.invoices.set(all.filter(i => i.customerId === id))
        );
      }
    });
  }

  statusBadge(status?: string) {
    return {
      'badge-draft':    status === 'Draft',
      'badge-sent':     status === 'Sent',
      'badge-accepted': status === 'Accepted',
      'badge-settled':  status === 'Settled',
    };
  }
}
