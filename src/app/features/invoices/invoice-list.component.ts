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

    <div class="tabs mb-4">
      <a routerLink="/invoices" routerLinkActive="tab-active" [routerLinkActiveOptions]="{exact: true}" class="tab">
        Tax Invoices
      </a>
      <a routerLink="/invoices/proforma" routerLinkActive="tab-active" class="tab">
        Proforma Invoices
      </a>
    </div>

    <div class="card mb-4">
      <div class="filter-bar">
        <input class="form-control invoice-search" placeholder="Search customer, invoice number, officer..." [(ngModel)]="searchTerm" (ngModelChange)="onFiltersChanged()"/>
        <select class="form-control" [(ngModel)]="statusFilter" (ngModelChange)="onFiltersChanged()">
          <option value="">All statuses</option>
          <option>Draft</option>
          <option>Sent</option>
          <option>Viewed</option>
          <option>Accepted</option>
          <option>Rejected</option>
          <option>Settled</option>
        </select>
        <input class="form-control" type="date" [(ngModel)]="fromDate" (ngModelChange)="onFiltersChanged()" title="From date"/>
        <input class="form-control" type="date" [(ngModel)]="toDate" (ngModelChange)="onFiltersChanged()" title="To date"/>
        <button *ngIf="hasActiveFilters()" class="btn btn-secondary btn-sm" type="button" (click)="clearFilters()">Clear Filters</button>
        <div class="text-muted text-sm invoice-count">{{ filtered().length }} invoice(s)</div>
      </div>
    </div>

    <div class="card card-flush">
      <div class="desktop-table-only">
        <div class="table-wrap" *ngIf="filtered().length">
          <table class="data-table">
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
            <tr *ngFor="let invoice of pagedInvoices()">
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
                <button *ngIf="invoice.isVerified && invoice.status !== 'Settled'" class="btn btn-outline-accent btn-sm" type="button" (click)="requestLiquidate(invoice)">Liquidate Now</button>
              </td>
            </tr>
          </tbody>
          </table>
        </div>
      </div>

      <div class="mobile-cards-only p-4" *ngIf="filtered().length">
        <div class="mobile-data-list">
          <div class="mobile-data-card" *ngFor="let invoice of pagedInvoices()">
            <div class="mobile-data-card-header">
              <div>
                <div class="mobile-data-card-title text-accent">{{ invoice.serialNumber }}</div>
                <div class="mobile-data-card-subtitle">{{ invoice.customerName }}</div>
                <div class="mobile-data-card-subtitle">{{ invoice.debtorOfficerName || 'No debtor officer' }}</div>
              </div>
              <span class="badge" [ngClass]="statusBadge(invoice.status)">{{ invoice.status === 'Accepted' ? 'Verified' : invoice.status }}</span>
            </div>

            <div class="mobile-data-grid">
              <div class="mobile-data-row">
                <span class="mobile-data-label">Invoice Date</span>
                <span class="mobile-data-value">{{ invoice.invoiceDate }}</span>
              </div>
              <div class="mobile-data-row">
                <span class="mobile-data-label">Due Date</span>
                <span class="mobile-data-value">{{ invoice.dueDate }}</span>
              </div>
              <div class="mobile-data-row">
                <span class="mobile-data-label">Net (LKR)</span>
                <span class="mobile-data-value lkr-mono">{{ invoice.netAmount | lkr }}</span>
              </div>
              <div class="mobile-data-row">
                <span class="mobile-data-label">VAT (LKR)</span>
                <span class="mobile-data-value lkr-mono">{{ invoice.vatAmount | lkr }}</span>
              </div>
              <div class="mobile-data-row">
                <span class="mobile-data-label">Gross (LKR)</span>
                <span class="mobile-data-value lkr-mono">{{ invoice.grossAmount | lkr }}</span>
              </div>
            </div>

            <div class="mobile-data-actions">
              <a [routerLink]="['/invoices', invoice.id]" class="btn btn-ghost btn-sm">View</a>
              <a *ngIf="invoice.status === 'Draft'" [routerLink]="['/invoices', invoice.id, 'edit']" class="btn btn-ghost btn-sm">Edit</a>
              <button *ngIf="invoice.status === 'Draft'" class="btn btn-ghost btn-sm text-accent" type="button" (click)="sendInvoice(invoice)">Send</button>
              <button class="btn btn-ghost btn-sm" type="button" (click)="downloadPdf(invoice.id)">PDF</button>
              <button *ngIf="invoice.isVerified && invoice.status !== 'Settled'" class="btn btn-outline-accent btn-sm" type="button" (click)="requestLiquidate(invoice)">Liquidate Now</button>
            </div>
          </div>
        </div>
      </div>

      <div *ngIf="!filtered().length" class="empty-state p-12 text-center">
        <div class="font-medium">No invoices found</div>
        <div class="text-muted text-sm mt-2">{{ hasActiveFilters() ? 'Try clearing one or more filters.' : 'Create your first invoice to get started.' }}</div>
        <a *ngIf="!hasActiveFilters()" routerLink="/invoices/new" class="btn btn-primary mt-4">Create Invoice</a>
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

    <ng-container *ngIf="pendingLiquidation() as invoice">
      <div class="overlay" (click.self)="closeLiquidationDialog()" (keydown.escape)="closeLiquidationDialog()" tabindex="-1">
        <div class="modal" style="max-width:560px" role="dialog" aria-modal="true" aria-labelledby="invoice-liquidate-title">
          <div class="modal-header">
            <h3 id="invoice-liquidate-title">Confirm Liquidity</h3>
            <button class="btn btn-ghost btn-sm" type="button" (click)="closeLiquidationDialog()" aria-label="Close dialog">✕</button>
          </div>
          <div class="modal-body">
            <div class="text-sm mb-4">
              Liquidate invoice <strong>{{ invoice.serialNumber }}</strong> for <strong>{{ invoice.customerName }}</strong>
            </div>
            
            <!-- Liquidation Amount -->
            <div class="form-group mb-4">
              <label class="form-label">Amount to Liquidate (LKR) <span class="required">*</span></label>
              <input class="form-control" type="number" [value]="liquidationAmount()" (input)="liquidationAmount.set(+($any($event.target).value))" [max]="invoice.grossAmount" min="1" placeholder="Enter amount"/>
              <div class="text-muted text-sm mt-1">Maximum: {{ invoice.grossAmount | lkr }} • Fee (2%): {{ (liquidationAmount() * 0.02) | lkr }} • Net: {{ (liquidationAmount() - (liquidationAmount() * 0.02)) | lkr }}</div>
            </div>
            
            <!-- Notification Message -->
            <div class="form-group mb-3">
              <label class="form-label">Notification Message for Debtor</label>
              <textarea class="form-control" rows="3" [value]="liquidationMessage()" (input)="liquidationMessage.set($any($event.target).value)" placeholder="Message to send to debtor"></textarea>
              <div class="text-muted text-sm mt-1">Debtor will receive this message along with the due date.</div>
            </div>
            
            <div class="info-box info text-sm mt-3">
              This settles the invoice through CIXOR PayDay. The debtor will be notified automatically.
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" type="button" (click)="closeLiquidationDialog()">Cancel</button>
            <button class="btn btn-primary" type="button" (click)="confirmLiquidation()">Confirm Liquidity</button>
          </div>
        </div>
      </div>
    </ng-container>
  `,
  styles: [`
    .tabs {
      display: flex;
      gap: 8px;
      border-bottom: 2px solid var(--border);
    }
    .tab {
      padding: 12px 24px;
      color: var(--text-secondary);
      text-decoration: none;
      border-bottom: 2px solid transparent;
      margin-bottom: -2px;
      font-weight: 500;
      transition: all 0.2s;
    }
    .tab:hover {
      color: var(--brand);
      background: var(--hover-bg);
    }
    .tab-active {
      color: var(--brand);
      border-bottom-color: var(--brand);
    }
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
  pendingLiquidation = signal<Invoice | null>(null);
  liquidationAmount = signal<number>(0);
  liquidationMessage = signal<string>('');
  readonly pageSize = 8;
  page = signal(1);

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

  totalPages = computed(() => Math.max(1, Math.ceil(this.filtered().length / this.pageSize)));
  currentPage = computed(() => Math.min(this.page(), this.totalPages()));
  pagedInvoices = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filtered().slice(start, start + this.pageSize);
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
    this.page.set(1);
  }

  onFiltersChanged(): void {
    this.page.set(1);
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

  requestLiquidate(invoice: Invoice): void {
    this.liquidationAmount.set(invoice.grossAmount); // Default to full amount
    this.liquidationMessage.set(`Your payment for invoice ${invoice.serialNumber} has been processed through CIXOR PayDay. Due date: ${invoice.dueDate}. Please contact us if you have any questions.`);
    this.pendingLiquidation.set(invoice);
  }

  closeLiquidationDialog(): void {
    this.pendingLiquidation.set(null);
  }

  confirmLiquidation(): void {
    const invoice = this.pendingLiquidation();
    if (!invoice) return;
    
    const amount = this.liquidationAmount();
    const message = this.liquidationMessage().trim();
    
    // Validate amount
    if (amount <= 0 || amount > invoice.grossAmount) {
      this.toast.error(`Liquidation amount must be between 1 and ${invoice.grossAmount.toLocaleString('en-LK')}`);
      return;
    }
    
    this.svc.confirmLiquidity(invoice.id, amount, message).subscribe(() => {
      this.toast.success(`Liquidity confirmed for ${invoice.serialNumber}. Debtor will be notified.`);
      this.pendingLiquidation.set(null);
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
