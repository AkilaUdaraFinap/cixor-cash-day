import { Component, OnInit, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { InvoiceDataService } from '../../core/services/invoice-data.service';
import { ToastService } from '../../core/services/toast.service';
import { ProformaInvoice } from '../../shared/models/models';
import { LkrPipe } from '../../shared/pipes/lkr.pipe';

@Component({
  selector: 'app-proforma-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, RouterModule, LkrPipe],
  template: `
    <div class="page-header flex items-center justify-between mb-6">
      <div>
        <h2>Proforma Invoices</h2>
        <div class="text-muted text-sm mt-1">
          Preliminary quotations and estimates before issuing tax invoices
        </div>
      </div>
      <button class="btn btn-primary" routerLink="/invoices/proforma/new">+ Create Proforma</button>
    </div>

    <div class="tabs mb-4">
      <a routerLink="/invoices" routerLinkActive="tab-active" [routerLinkActiveOptions]="{exact: true}" class="tab">
        Tax Invoices
      </a>
      <a routerLink="/invoices/proforma" routerLinkActive="tab-active" class="tab">
        Proforma Invoices
      </a>
      <a routerLink="/invoices/external" routerLinkActive="tab-active" class="tab">
        External Receivables
      </a>
    </div>

    <div class="card">
      <div class="card-header flex items-center justify-between">
        <h3 class="card-title">All Proforma Invoices</h3>
        <div class="flex items-center gap-2">
          <select class="form-control form-control-sm" [(ngModel)]="statusFilter" (change)="applyFilter()" style="width:200px">
            <option value="">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Sent">Sent</option>
            <option value="Viewed">Viewed</option>
            <option value="Converted">Converted</option>
            <option value="Expired">Expired</option>
          </select>
        </div>
      </div>

      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Serial Number</th>
              <th>Customer</th>
              <th>Issue Date</th>
              <th>Valid Until</th>
              <th class="text-right">Net (LKR)</th>
              <th class="text-right">VAT (LKR)</th>
              <th class="text-right">Gross (LKR)</th>
              <th>Status</th>
              <th class="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let proforma of filteredProformas()">
              <td class="font-medium">{{ proforma.serialNumber }}</td>
              <td>{{ proforma.customerName }}</td>
              <td>{{ proforma.issueDate }}</td>
              <td>{{ proforma.validUntil }}</td>
              <td class="text-right lkr-mono">{{ proforma.netAmount | lkr }}</td>
              <td class="text-right lkr-mono">{{ proforma.vatAmount | lkr }}</td>
              <td class="text-right lkr-mono">{{ proforma.grossAmount | lkr }}</td>
              <td>
                <span class="badge" [class.badge-draft]="proforma.status === 'Draft'"
                      [class.badge-sent]="proforma.status === 'Sent'"
                      [class.badge-viewed]="proforma.status === 'Viewed'"
                      [class.badge-verified]="proforma.status === 'Converted'"
                      [class.badge-neutral]="proforma.status === 'Expired'">
                  {{ proforma.status }}
                </span>
              </td>
              <td class="text-right">
                <div class="flex items-center justify-end gap-2">
                  <button class="btn btn-ghost btn-sm" [routerLink]="['/invoices/proforma', proforma.id]">
                    Edit
                  </button>
                  <button class="btn btn-ghost btn-sm" 
                          *ngIf="proforma.status === 'Draft'" 
                          (click)="sendProforma(proforma.id)">
                    Send
                  </button>
                  <button class="btn btn-accent btn-sm" 
                          *ngIf="proforma.status !== 'Converted' && proforma.status !== 'Expired'" 
                          (click)="convertToInvoice(proforma.id)">
                    Convert
                  </button>
                  <button class="btn btn-ghost btn-sm text-muted" 
                          *ngIf="proforma.status === 'Converted' && proforma.convertedToInvoiceId"
                          [routerLink]="['/invoices', proforma.convertedToInvoiceId]">
                    View Invoice
                  </button>
                  <button class="btn btn-ghost btn-sm text-red" 
                          *ngIf="proforma.status === 'Draft'"
                          (click)="deleteProforma(proforma.id)">
                    Delete
                  </button>
                </div>
              </td>
            </tr>
            <tr *ngIf="!filteredProformas().length">
              <td colspan="9" class="text-center text-muted p-6">
                <div class="empty-state">
                  <div class="mb-3">📝</div>
                  <div class="font-medium mb-2">No proforma invoices found</div>
                  <div class="text-sm">Create your first proforma invoice to get started</div>
                  <button class="btn btn-secondary btn-sm mt-4" routerLink="/invoices/proforma/new">
                    + Create Proforma
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
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
    .card-header {
      padding: 20px 24px;
      border-bottom: 1px solid var(--border);
    }
    .card-title {
      font-size: 16px;
      font-weight: 600;
      margin: 0;
    }
    .empty-state {
      font-size: 32px;
      text-align: center;
    }
    .badge-draft { background: #E5E7EB; color: #374151; }
    .badge-sent { background: #DBEAFE; color: #1E40AF; }
    .badge-viewed { background: #E0E7FF; color: #4338CA; }
    .badge-verified { background: #D1FAE5; color: #065F46; }
    .badge-neutral { background: #F3F4F6; color: #6B7280; }
  `],
})
export class ProformaListComponent implements OnInit {
  private readonly svc = inject(InvoiceDataService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  proformas = signal<ProformaInvoice[]>([]);
  filteredProformas = signal<ProformaInvoice[]>([]);
  statusFilter = '';

  ngOnInit(): void {
    this.loadProformas();
  }

  loadProformas(): void {
    this.svc.getProformaInvoices().subscribe(items => {
      this.proformas.set(items);
      this.applyFilter();
    });
  }

  applyFilter(): void {
    if (!this.statusFilter) {
      this.filteredProformas.set(this.proformas());
    } else {
      this.filteredProformas.set(
        this.proformas().filter(p => p.status === this.statusFilter)
      );
    }
  }

  sendProforma(id: string): void {
    this.svc.sendProformaInvoice(id).subscribe(() => {
      this.toast.success('Proforma invoice sent to customer.');
      this.loadProformas();
    });
  }

  convertToInvoice(id: string): void {
    if (!confirm('Convert this proforma invoice to a tax invoice? This action cannot be undone.')) {
      return;
    }
    this.svc.convertProformaToInvoice(id).subscribe(invoice => {
      this.toast.success(`Converted to tax invoice ${invoice.serialNumber}.`);
      this.loadProformas();
      this.router.navigate(['/invoices', invoice.id]);
    });
  }

  deleteProforma(id: string): void {
    if (!confirm('Delete this draft proforma invoice? This action cannot be undone.')) {
      return;
    }
    this.svc.deleteProformaInvoice(id).subscribe(() => {
      this.toast.success('Proforma invoice deleted.');
      this.loadProformas();
    });
  }
}
