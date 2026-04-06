import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CustomerDataService } from '../../core/services/customer-data.service';
import { InvoiceDataService } from '../../core/services/invoice-data.service';
import { ToastService } from '../../core/services/toast.service';
import { Customer, DebtorOfficer, Invoice } from '../../shared/models/models';

interface ExternalInvoiceFormState {
  id: string;
  customerId: string;
  debtorOfficerId: string;
  externalInvoiceNo: string;
  sourceSystem: string;
  invoiceDateRaw: string;
  dueDateRaw: string;
  description: string;
  notes: string;
  netAmount: number;
  vatAmount: number;
  grossAmount: number;
  verificationMode: 'portal' | 'visibility-only';
}

@Component({
  selector: 'app-external-invoice-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="page-header flex items-center gap-3 mb-6">
      <button class="btn btn-ghost btn-sm" routerLink="/invoices/external">← Back</button>
      <div>
        <h2>{{ isEdit() ? 'Edit External Receivable' : 'Add External Receivable' }}</h2>
        <div class="text-muted text-sm mt-1">Register receivables created outside CashDay for visibility or portal verification.</div>
      </div>
    </div>

    <div class="invoice-layout">
      <div class="invoice-main">
        <div class="card mb-4">
          <h3 class="section-title">Source</h3>
          <div class="grid-2 gap-4">
            <div class="form-group mb-0">
              <label class="form-label">Source System <span class="required">*</span></label>
              <input class="form-control" [(ngModel)]="form.sourceSystem" placeholder="Legacy ERP / Manual Entry / CSV Import" />
            </div>
            <div class="form-group mb-0">
              <label class="form-label">External Invoice Number <span class="required">*</span></label>
              <input class="form-control" [(ngModel)]="form.externalInvoiceNo" placeholder="ERP-90045" />
            </div>
          </div>
        </div>

        <div class="card mb-4">
          <h3 class="section-title">Customer and Verification</h3>
          <div class="grid-2 gap-4">
            <div class="form-group mb-0">
              <label class="form-label">Customer <span class="required">*</span></label>
              <select class="form-control" [(ngModel)]="form.customerId" (change)="syncPrimaryOfficer()">
                <option value="">Select a customer</option>
                <option *ngFor="let customer of customers()" [value]="customer.id">{{ customer.name }}</option>
              </select>
            </div>
            <div class="form-group mb-0">
              <label class="form-label">Verification Mode</label>
              <select class="form-control" [(ngModel)]="form.verificationMode">
                <option value="portal">Portal verification</option>
                <option value="visibility-only">Visibility only</option>
              </select>
            </div>
            <div class="form-group mb-0 col-span-2" *ngIf="form.verificationMode === 'portal'">
              <label class="form-label">Debtor Officer <span class="required">*</span></label>
              <select class="form-control" [(ngModel)]="form.debtorOfficerId">
                <option value="">Select debtor officer</option>
                <option *ngFor="let officer of availableOfficers()" [value]="officer.id">{{ officer.name }} · {{ officer.email }}</option>
              </select>
            </div>
          </div>
        </div>

        <div class="card mb-4">
          <h3 class="section-title">Amounts and Dates</h3>
          <div class="grid-2 gap-4">
            <div class="form-group mb-0">
              <label class="form-label">Invoice Date <span class="required">*</span></label>
              <input class="form-control" type="date" [(ngModel)]="form.invoiceDateRaw" />
            </div>
            <div class="form-group mb-0">
              <label class="form-label">Due Date <span class="required">*</span></label>
              <input class="form-control" type="date" [(ngModel)]="form.dueDateRaw" />
            </div>
            <div class="form-group mb-0">
              <label class="form-label">Net Amount (LKR) <span class="required">*</span></label>
              <input class="form-control" type="number" min="0" [(ngModel)]="form.netAmount" (input)="recomputeGross()" />
            </div>
            <div class="form-group mb-0">
              <label class="form-label">VAT Amount (LKR)</label>
              <input class="form-control" type="number" min="0" [(ngModel)]="form.vatAmount" (input)="recomputeGross()" />
            </div>
            <div class="form-group mb-0 col-span-2">
              <label class="form-label">Gross Amount (LKR)</label>
              <input class="form-control readonly" [value]="form.grossAmount" readonly />
            </div>
          </div>
        </div>

        <div class="card mb-4">
          <h3 class="section-title">Description</h3>
          <div class="form-group mb-3">
            <label class="form-label">Summary</label>
            <input class="form-control" [(ngModel)]="form.description" placeholder="Imported receivable summary" />
          </div>
          <div class="form-group mb-0">
            <label class="form-label">Notes</label>
            <textarea class="form-control" rows="4" [(ngModel)]="form.notes" placeholder="Explain source and any follow-up needed."></textarea>
          </div>
        </div>
      </div>

      <div class="invoice-side">
        <div class="card sticky-top">
          <h3 class="section-title">Actions</h3>
          <div class="flex flex-col gap-2">
            <button class="btn btn-secondary" type="button" [disabled]="issues().length > 0" (click)="saveExternal(false)">Save External Receivable</button>
            <button class="btn btn-primary" type="button" [disabled]="!canSendForVerification()" (click)="saveExternal(true)">Save & Send for Verification</button>
            <button class="btn btn-ghost" type="button" routerLink="/invoices/external">Cancel</button>
          </div>
          <div class="divider"></div>
          <div class="text-sm text-muted" *ngFor="let issue of issues()">• {{ issue }}</div>
          <div class="text-sm text-muted" *ngIf="!issues().length">This receivable will be marked as imported and tracked separately from CashDay-issued invoices.</div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .invoice-layout { display:grid; grid-template-columns:minmax(0, 1fr) 320px; gap:24px; align-items:start; }
    .sticky-top { position:sticky; top:80px; }
    .section-title { font-size:13px; font-weight:600; color:var(--text-secondary); text-transform:uppercase; letter-spacing:.05em; margin-bottom:12px; }
    .col-span-2 { grid-column: 1 / -1; }
    @media (max-width: 1080px) { .invoice-layout { grid-template-columns:1fr; } .sticky-top { position:static; } }
  `],
})
export class ExternalInvoiceFormComponent implements OnInit {
  private readonly invoiceSvc = inject(InvoiceDataService);
  private readonly customerSvc = inject(CustomerDataService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  isEdit = signal(false);
  customers = signal<Customer[]>([]);
  form: ExternalInvoiceFormState = {
    id: '',
    customerId: '',
    debtorOfficerId: '',
    externalInvoiceNo: '',
    sourceSystem: 'Manual Entry',
    invoiceDateRaw: '',
    dueDateRaw: '',
    description: '',
    notes: '',
    netAmount: 0,
    vatAmount: 0,
    grossAmount: 0,
    verificationMode: 'portal',
  };

  selectedCustomer = computed(() => this.customers().find(customer => customer.id === this.form.customerId) ?? null);
  availableOfficers = computed(() => this.selectedCustomer()?.officers ?? []);
  issues = computed(() => this.collectIssues());

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.isEdit.set(!!id);
    this.customerSvc.getCustomers().subscribe(customers => this.customers.set(customers));

    if (id) {
      this.invoiceSvc.getInvoice(id).subscribe(invoice => {
        if (!invoice) return;
        this.form = {
          id: invoice.id,
          customerId: invoice.customerId,
          debtorOfficerId: invoice.debtorOfficerId || '',
          externalInvoiceNo: invoice.externalInvoiceNo || invoice.serialNumber,
          sourceSystem: invoice.sourceSystem || 'Manual Entry',
          invoiceDateRaw: this.toInputDate(invoice.invoiceDate),
          dueDateRaw: this.toInputDate(invoice.dueDate),
          description: invoice.description || '',
          notes: invoice.additionalInformation || '',
          netAmount: invoice.netAmount,
          vatAmount: invoice.vatAmount,
          grossAmount: invoice.grossAmount,
          verificationMode: invoice.verificationMode || 'portal',
        };
      });
    } else {
      const today = new Date().toISOString().split('T')[0];
      this.form.invoiceDateRaw = today;
      this.form.dueDateRaw = today;
    }
  }

  syncPrimaryOfficer(): void {
    const primary = this.availableOfficers().find(officer => officer.isPrimary) ?? this.availableOfficers()[0];
    this.form.debtorOfficerId = primary?.id || '';
  }

  recomputeGross(): void {
    this.form.netAmount = Math.max(0, Number(this.form.netAmount || 0));
    this.form.vatAmount = Math.max(0, Number(this.form.vatAmount || 0));
    this.form.grossAmount = Math.round(this.form.netAmount + this.form.vatAmount);
  }

  canSendForVerification(): boolean {
    return this.form.verificationMode === 'portal' && this.issues().length === 0;
  }

  saveExternal(sendForVerification: boolean): void {
    this.recomputeGross();
    const issues = this.issues();
    if (issues.length) {
      this.toast.error(issues[0]);
      return;
    }

    const customer = this.selectedCustomer();
    const officer = this.availableOfficers().find(item => item.id === this.form.debtorOfficerId) || customer?.officers.find(item => item.isPrimary);
    const serial = this.form.externalInvoiceNo.trim().toUpperCase();

    const payload: Invoice = {
      id: this.form.id,
      serialNumber: serial,
      sourceType: 'external-manual',
      isExternal: true,
      externalInvoiceNo: serial,
      sourceSystem: this.form.sourceSystem.trim() || 'Manual Entry',
      importedAt: new Date().toLocaleDateString('en-US'),
      verificationMode: this.form.verificationMode,
      customerId: customer?.id || this.form.customerId,
      customerName: customer?.name || '',
      customerTin: customer?.tin || '',
      customerVatReg: customer?.vatRegNo || '',
      customerAddress: customer?.address || '',
      customerPhone: customer?.phone || '',
      supplierName: 'Precision Manufacturing (Pvt) Ltd',
      supplierAddress: '42, Galle Road, Colombo 03, Sri Lanka',
      supplierTin: '114567890V',
      supplierVatReg: '114567890 7000',
      supplierBrn: 'PV00123456',
      invoiceDate: this.toUsDate(this.form.invoiceDateRaw),
      deliveryDate: this.toUsDate(this.form.invoiceDateRaw),
      dueDate: this.toUsDate(this.form.dueDateRaw),
      placeOfSupply: this.form.sourceSystem.trim() || 'External source',
      paymentTermId: 'pt1',
      debtorOfficerId: officer?.id || '',
      debtorOfficerName: officer?.name || '',
      debtorOfficerEmail: officer?.email || '',
      modeOfPayment: 'Bank Transfer',
      description: this.form.description.trim() || 'Imported external receivable',
      additionalInformation: this.form.notes.trim() || 'Imported into CashDay from an external source.',
      lines: [
        {
          id: `ext-line-${Date.now()}`,
          reference: serial,
          description: this.form.description.trim() || 'External receivable summary',
          qty: 1,
          unitPrice: this.form.netAmount,
          discount: 0,
        },
      ],
      netAmount: this.form.netAmount,
      vatAmount: this.form.vatAmount,
      grossAmount: this.form.grossAmount,
      status: this.form.verificationMode === 'visibility-only' ? 'Viewed' : 'Draft',
      isVerified: false,
      createdAt: new Date().toLocaleDateString('en-US'),
    };

    this.invoiceSvc.saveInvoice(payload).subscribe(saved => {
      if (sendForVerification) {
        this.invoiceSvc.sendInvoice(saved.id).subscribe(() => {
          this.toast.success(`External invoice ${saved.serialNumber} saved and sent for portal verification.`);
          this.router.navigate(['/invoices/external']);
        });
        return;
      }

      this.toast.success(`External receivable ${saved.serialNumber} saved.`);
      this.router.navigate(['/invoices/external']);
    });
  }

  private collectIssues(): string[] {
    const issues: string[] = [];
    if (!this.form.sourceSystem.trim()) issues.push('Source system is required.');
    if (!this.form.externalInvoiceNo.trim()) issues.push('External invoice number is required.');
    if (!this.form.customerId) issues.push('Select a customer.');
    if (!this.form.invoiceDateRaw) issues.push('Invoice date is required.');
    if (!this.form.dueDateRaw) issues.push('Due date is required.');
    if (this.form.verificationMode === 'portal' && !this.form.debtorOfficerId) issues.push('Select a debtor officer for portal verification.');
    if (Number(this.form.netAmount) < 0 || Number(this.form.vatAmount) < 0 || Number(this.form.grossAmount) <= 0) issues.push('Enter valid invoice amounts.');
    return issues;
  }

  private toUsDate(value: string): string {
    const [year, month, day] = value.split('-');
    return `${month}/${day}/${year}`;
  }

  private toInputDate(value?: string): string {
    if (!value) return '';
    const [month, day, year] = value.split('/');
    return `${year}-${month}-${day}`;
  }
}
