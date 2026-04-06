import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { CustomerDataService } from '../../core/services/customer-data.service';
import { InvoiceDataService } from '../../core/services/invoice-data.service';
import { ToastService } from '../../core/services/toast.service';
import { Customer, Invoice } from '../../shared/models/models';
import { LkrPipe } from '../../shared/pipes/lkr.pipe';
import { ImportInvoicesModalComponent, ImportedInvoiceRow } from './components/import-invoices-modal.component';

@Component({
  selector: 'app-external-invoice-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, RouterModule, LkrPipe, ImportInvoicesModalComponent],
  template: `
    <div class="page-header flex items-center justify-between mb-6">
      <div>
        <h2>External Receivables</h2>
        <div class="text-muted text-sm mt-1">Track imported or manually registered invoices from outside CashDay.</div>
      </div>
      <div class="flex gap-2 flex-wrap">
        <button class="btn btn-secondary" type="button" (click)="downloadTemplate()">Download CSV Template</button>
        <button class="btn btn-secondary" type="button" (click)="importOpen.set(true)">Import CSV</button>
        <a routerLink="/invoices/external/new" class="btn btn-primary">+ Add External Invoice</a>
      </div>
    </div>

    <div class="tabs mb-4">
      <a routerLink="/invoices" routerLinkActive="tab-active" [routerLinkActiveOptions]="{exact: true}" class="tab">Tax Invoices</a>
      <a routerLink="/invoices/proforma" routerLinkActive="tab-active" class="tab">Proforma Invoices</a>
      <a routerLink="/invoices/external" routerLinkActive="tab-active" class="tab">External Receivables</a>
    </div>

    <div class="card mb-4">
      <div class="filter-bar">
        <input class="form-control" placeholder="Search customer, source, external number..." [(ngModel)]="searchTerm" />
        <select class="form-control" [(ngModel)]="sourceFilter">
          <option value="">All sources</option>
          <option value="external-manual">Manual</option>
          <option value="external-csv">CSV Import</option>
          <option value="external-api">API Import</option>
        </select>
        <select class="form-control" [(ngModel)]="verificationFilter">
          <option value="">All verification states</option>
          <option value="portal">Portal verification</option>
          <option value="visibility-only">Visibility only</option>
          <option value="verified">Verified</option>
        </select>
        <div class="text-muted text-sm invoice-count">{{ filtered().length }} receivable(s)</div>
      </div>
    </div>

    <div class="card card-flush">
      <div class="table-wrap" *ngIf="filtered().length; else emptyState">
        <table class="data-table">
          <thead>
            <tr>
              <th>External No.</th>
              <th>Customer</th>
              <th>Source</th>
              <th>Due Date</th>
              <th class="text-right">Gross (LKR)</th>
              <th>Verification</th>
              <th>Status</th>
              <th class="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let invoice of filtered()">
              <td>
                <div class="font-medium text-accent">{{ invoice.externalInvoiceNo || invoice.serialNumber }}</div>
                <div class="text-muted text-xs">Imported {{ invoice.importedAt || '—' }}</div>
              </td>
              <td>{{ invoice.customerName }}</td>
              <td>
                <span class="badge badge-draft">{{ invoice.sourceSystem || invoice.sourceType || 'External' }}</span>
              </td>
              <td>{{ invoice.dueDate }}</td>
              <td class="text-right lkr-mono">{{ invoice.grossAmount | lkr }}</td>
              <td>
                <span class="badge" [class.badge-verified]="invoice.isVerified" [class.badge-invited]="!invoice.isVerified && invoice.verificationMode === 'portal'" [class.badge-neutral]="invoice.verificationMode === 'visibility-only'">
                  {{ invoice.isVerified ? 'Verified' : (invoice.verificationMode === 'visibility-only' ? 'Visibility Only' : 'Pending Verification') }}
                </span>
              </td>
              <td><span class="badge" [ngClass]="statusBadge(invoice.status)">{{ invoice.status }}</span></td>
              <td class="text-right row-actions">
                <a [routerLink]="['/invoices', invoice.id]" class="btn btn-ghost btn-sm">View</a>
                <a [routerLink]="['/invoices/external', invoice.id, 'edit']" class="btn btn-ghost btn-sm">Edit</a>
                <button *ngIf="invoice.verificationMode === 'portal' && invoice.status === 'Draft'" class="btn btn-outline-accent btn-sm" type="button" (click)="sendForVerification(invoice)">Send</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <ng-template #emptyState>
        <div class="p-12 text-center">
          <div style="font-size:40px">📥</div>
          <div class="font-medium mt-3">No external receivables yet</div>
          <div class="text-muted text-sm mt-1">Add one manually or import a CSV from another system.</div>
        </div>
      </ng-template>
    </div>

    <app-import-invoices-modal
      *ngIf="importOpen()"
      [customers]="customers()"
      [existingExternalRefs]="existingExternalRefs()"
      (closed)="importOpen.set(false)"
      (importConfirmed)="handleImport($event)">
    </app-import-invoices-modal>
  `,
  styles: [`
    .tabs { display:flex; gap:8px; border-bottom:2px solid var(--border); }
    .tab { padding:12px 24px; color:var(--text-secondary); text-decoration:none; border-bottom:2px solid transparent; margin-bottom:-2px; font-weight:500; }
    .tab:hover { color:var(--brand); background:var(--hover-bg); }
    .tab-active { color:var(--brand); border-bottom-color:var(--brand); }
    .invoice-count { margin-left: auto; }
  `],
})
export class ExternalInvoiceListComponent implements OnInit {
  private readonly invoiceSvc = inject(InvoiceDataService);
  private readonly customerSvc = inject(CustomerDataService);
  private readonly toast = inject(ToastService);

  invoices = signal<Invoice[]>([]);
  customers = signal<Customer[]>([]);
  importOpen = signal(false);
  searchTerm = '';
  sourceFilter = '';
  verificationFilter = '';

  filtered = computed(() => {
    const search = this.searchTerm.toLowerCase().trim();
    return this.invoices()
      .filter(invoice => !!invoice.isExternal)
      .filter(invoice => !this.sourceFilter || invoice.sourceType === this.sourceFilter)
      .filter(invoice => {
        if (!this.verificationFilter) return true;
        if (this.verificationFilter === 'verified') return !!invoice.isVerified;
        return invoice.verificationMode === this.verificationFilter;
      })
      .filter(invoice => {
        if (!search) return true;
        return [
          invoice.customerName,
          invoice.externalInvoiceNo || '',
          invoice.sourceSystem || '',
          invoice.serialNumber,
        ].some(value => value.toLowerCase().includes(search));
      });
  });

  existingExternalRefs = computed(() => this.invoices().filter(invoice => invoice.isExternal).map(invoice => invoice.externalInvoiceNo || invoice.serialNumber));

  ngOnInit(): void {
    this.load();
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

  sendForVerification(invoice: Invoice): void {
    this.invoiceSvc.sendInvoice(invoice.id).subscribe(() => {
      this.toast.success(`External invoice ${invoice.externalInvoiceNo || invoice.serialNumber} sent for portal verification.`);
      this.load();
    });
  }

  handleImport(rows: ImportedInvoiceRow[]): void {
    if (!rows.length) {
      this.toast.warn('No importable rows were found in the CSV preview.');
      return;
    }

    const saveCalls = rows.map((row, index) => {
      const customer = this.customers().find(item => item.id === row.customerId);
      const serial = row.externalInvoiceNo.trim().toUpperCase();
      const invoice: Invoice = {
        id: '',
        serialNumber: serial,
        sourceType: 'external-csv',
        isExternal: true,
        externalInvoiceNo: serial,
        sourceSystem: row.sourceSystem || 'CSV Import',
        importBatchId: `batch-${Date.now()}`,
        importedAt: new Date().toLocaleDateString('en-US'),
        verificationMode: row.verificationMode,
        customerId: customer?.id || '',
        customerName: customer?.name || row.customerName,
        customerTin: customer?.tin || '',
        customerVatReg: customer?.vatRegNo || '',
        customerAddress: customer?.address || '',
        customerPhone: customer?.phone || '',
        supplierName: 'Precision Manufacturing (Pvt) Ltd',
        supplierAddress: '42, Galle Road, Colombo 03, Sri Lanka',
        supplierTin: '114567890V',
        supplierVatReg: '114567890 7000',
        supplierBrn: 'PV00123456',
        invoiceDate: this.toUsDate(row.invoiceDate),
        deliveryDate: this.toUsDate(row.invoiceDate),
        dueDate: this.toUsDate(row.dueDate),
        placeOfSupply: `Imported from ${row.sourceSystem || 'CSV Import'}`,
        paymentTermId: 'pt1',
        debtorOfficerId: row.debtorOfficerId || customer?.officers.find(officer => officer.isPrimary)?.id || '',
        debtorOfficerName: customer?.officers.find(officer => officer.id === row.debtorOfficerId)?.name || customer?.officers.find(officer => officer.isPrimary)?.name || '',
        debtorOfficerEmail: row.debtorOfficerEmail || customer?.officers.find(officer => officer.isPrimary)?.email || '',
        modeOfPayment: 'Bank Transfer',
        description: 'Imported receivable from CSV',
        additionalInformation: `CSV import row ${index + 1}`,
        lines: [
          { id: `import-line-${Date.now()}-${index}`, reference: serial, description: 'Imported receivable summary', qty: 1, unitPrice: row.netAmount, discount: 0 },
        ],
        netAmount: row.netAmount,
        vatAmount: row.vatAmount,
        grossAmount: row.grossAmount,
        status: row.verificationMode === 'visibility-only' ? 'Viewed' : 'Draft',
        isVerified: false,
        createdAt: new Date().toLocaleDateString('en-US'),
      };
      return this.invoiceSvc.saveInvoice(invoice);
    });

    forkJoin(saveCalls).subscribe(saved => {
      this.toast.success(`${saved.length} external invoice(s) imported successfully.`);
      this.importOpen.set(false);
      this.load();
    });
  }

  downloadTemplate(): void {
    const csv = [
      'customerName,externalInvoiceNo,sourceSystem,invoiceDate,dueDate,grossAmount,vatAmount,verificationMode',
      'Acme Corp Ltd,ERP-90045,Legacy ERP,2026-04-02,2026-04-28,737500,112500,portal',
      'Sunrise Traders (Pvt) Ltd,MAN-10017,CSV Import,2026-04-04,2026-04-25,531000,81000,visibility-only',
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'cashday-external-invoices-template.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  private load(): void {
    this.invoiceSvc.getInvoices().subscribe(invoices => this.invoices.set(invoices));
    this.customerSvc.getCustomers().subscribe(customers => this.customers.set(customers));
  }

  private toUsDate(value: string): string {
    if (value.includes('/')) return value;
    const [year, month, day] = value.split('-');
    return `${month}/${day}/${year}`;
  }
}
