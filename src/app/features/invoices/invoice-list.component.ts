import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Router } from '@angular/router';
import { MockDataService } from '../../core/services/mock-data.service';
import { ToastService } from '../../core/services/toast.service';
import { Invoice } from '../../shared/models/models';
import { LkrPipe } from '../../shared/pipes/lkr.pipe';

@Component({
  selector: 'app-invoice-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LkrPipe],
  template: `
    <div class="page-header flex items-center justify-between mb-6">
      <div>
        <h2>Invoices</h2>
        <div class="text-muted text-sm mt-1">Track invoice lifecycle, customer acceptance, and settlement readiness.</div>
      </div>
      <a routerLink="/invoices/new" class="btn btn-primary">Create Invoice</a>
    </div>

    <div class="card mb-4">
      <div class="filter-bar">
        <input class="form-control invoice-search" placeholder="Search customer, invoice number, officer..." [(ngModel)]="searchTerm"/>
        <select class="form-control" [(ngModel)]="statusFilter">
          <option value="">All statuses</option>
          <option>Draft</option>
          <option>Sent</option>
          <option>Viewed</option>
          <option>Accepted</option>
          <option>Rejected</option>
          <option>Settled</option>
        </select>
        <input class="form-control" type="date" [(ngModel)]="fromDate" title="From date"/>
        <input class="form-control" type="date" [(ngModel)]="toDate" title="To date"/>
        <button *ngIf="hasActiveFilters()" class="btn btn-secondary btn-sm" type="button" (click)="clearFilters()">Clear Filters</button>
        <div class="text-muted text-sm invoice-count">{{ filtered().length }} invoice(s)</div>
      </div>
    </div>

    <div class="card card-flush">
      <div class="table-wrap">
        <table class="data-table" *ngIf="filtered().length; else emptyState">
          <thead>
            <tr>
              <th>CashDay Invoice ID</th>
              <th>Customer</th>
              <th>Invoice Date</th>
              <th>Due Date</th>
              <th class="text-right">Net (LKR)</th>
              <th class="text-right">VAT (LKR)</th>
              <th class="text-right">Gross (LKR)</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let invoice of filtered()">
              <td class="font-medium text-accent">{{ invoice.serialNumber }}</td>
              <td>
                <div class="font-medium">{{ invoice.customerName }}</div>
                <div class="text-muted text-sm">{{ invoice.debtorOfficerName || 'No debtor officer' }}</div>
              </td>
              <td>{{ invoice.invoiceDate }}</td>
              <td>{{ invoice.dueDate }}</td>
              <td class="text-right lkr-mono">{{ invoice.netAmount | lkr }}</td>
              <td class="text-right lkr-mono">{{ invoice.vatAmount | lkr }}</td>
              <td class="text-right lkr-mono font-medium">{{ invoice.grossAmount | lkr }}</td>
              <td><span class="badge" [ngClass]="statusBadge(invoice.status)">{{ invoice.status === 'Accepted' ? 'Verified' : invoice.status }}</span></td>
              <td class="row-actions">
                <a [routerLink]="['/invoices', invoice.id]" class="btn btn-ghost btn-sm">View</a>
                <a *ngIf="invoice.status === 'Draft'" [routerLink]="['/invoices', invoice.id, 'edit']" class="btn btn-ghost btn-sm">Edit</a>
                <button *ngIf="invoice.status === 'Draft'" class="btn btn-ghost btn-sm text-accent" type="button" (click)="sendInvoice(invoice)">Send</button>
                <button class="btn btn-ghost btn-sm" type="button" (click)="downloadPdf(invoice.id)">PDF</button>
                <button *ngIf="invoice.isVerified && invoice.status !== 'Settled'" class="btn btn-outline-accent btn-sm" type="button" (click)="liquidate(invoice)">Liquidate Now</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <ng-template #emptyState>
        <div class="empty-state p-12 text-center">
          <div class="font-medium">No invoices found</div>
          <div class="text-muted text-sm mt-2">{{ hasActiveFilters() ? 'Try clearing one or more filters.' : 'Create your first invoice to get started.' }}</div>
          <a *ngIf="!hasActiveFilters()" routerLink="/invoices/new" class="btn btn-primary mt-4">Create Invoice</a>
        </div>
      </ng-template>
    </div>
  `,
  styles: [`
    .invoice-search { flex: 1; min-width: 220px; }
    .invoice-count { margin-left: auto; }

    @media (max-width: 768px) {
      .invoice-search { min-width: 0; }
      .invoice-count { margin-left: 0; width: 100%; text-align: right; }
    }
  `],
})
export class InvoiceListComponent implements OnInit {
  private readonly svc = inject(MockDataService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  invoices = signal<Invoice[]>([]);
  searchTerm = '';
  statusFilter = '';
  fromDate = '';
  toDate = '';

  filtered = computed(() => {
    const search = this.searchTerm.toLowerCase().trim();
    return this.invoices()
      .filter(invoice => !this.statusFilter || invoice.status === this.statusFilter)
      .filter(invoice => {
        if (!search) return true;
        return [invoice.serialNumber, invoice.customerName, invoice.debtorOfficerName || ''].some(value => value.toLowerCase().includes(search));
      })
      .filter(invoice => this.matchesDate(invoice.invoiceDate, this.fromDate, this.toDate))
      .sort((left, right) => new Date(this.toSortableDate(left.dueDate)).getTime() - new Date(this.toSortableDate(right.dueDate)).getTime());
  });

  ngOnInit(): void {
    this.load();
  }

  hasActiveFilters(): boolean {
    return !!(this.searchTerm || this.statusFilter || this.fromDate || this.toDate);
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.statusFilter = '';
    this.fromDate = '';
    this.toDate = '';
  }

  statusBadge(status: string): string {
    return {
      Draft: 'badge-draft',
      Sent: 'badge-sent',
      Viewed: 'badge-viewed',
      Accepted: 'badge-accepted',
      Rejected: 'badge-rejected',
      Settled: 'badge-settled',
    }[status] || 'badge-draft';
  }

  sendInvoice(invoice: Invoice): void {
    this.svc.sendInvoice(invoice.id).subscribe(() => {
      this.toast.success(`Invoice ${invoice.serialNumber} sent successfully.`);
      this.load();
    });
  }

  liquidate(invoice: Invoice): void {
    this.svc.confirmLiquidity(invoice.id).subscribe(() => {
      this.toast.success(`Liquidity confirmed for ${invoice.serialNumber}.`);
      this.load();
    });
  }

  downloadPdf(invoiceId: string): void {
    this.router.navigate(['/invoices', invoiceId], { queryParams: { print: '1' } });
  }

  private load(): void {
    this.svc.getInvoices().subscribe(invoices => this.invoices.set(invoices));
  }

  private matchesDate(usDate: string, fromDate: string, toDate: string): boolean {
    const invoiceDate = new Date(this.toSortableDate(usDate)).getTime();
    const from = fromDate ? new Date(`${fromDate}T00:00:00`).getTime() : Number.NEGATIVE_INFINITY;
    const to = toDate ? new Date(`${toDate}T23:59:59`).getTime() : Number.POSITIVE_INFINITY;
    return invoiceDate >= from && invoiceDate <= to;
  }

  private toSortableDate(usDate: string): string {
    const [month, day, year] = usDate.split('/');
    return `${year}-${month}-${day}`;
  }
}
