import { Component, OnInit, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { MockDataService } from '../../core/services/mock-data.service';
import { ToastService } from '../../core/services/toast.service';
import { CompanyConfig, Customer, PaymentTerm, ProformaInvoice } from '../../shared/models/models';
import { LkrPipe } from '../../shared/pipes/lkr.pipe';
import { NumberToWordsPipe } from '../../shared/pipes/number-to-words.pipe';

interface ProformaFormLine {
  id: string;
  reference: string;
  description: string;
  qty: number;
  unitPrice: number;
  discount: number;
}

interface ProformaFormState {
  id: string;
  serialNumber: string;
  customerId: string;
  customerName: string;
  paymentTermId: string;
  issueDateRaw: string;
  validUntilRaw: string;
  description: string;
  notes: string;
  lines: ProformaFormLine[];
  netAmount: number;
  vatAmount: number;
  grossAmount: number;
}

@Component({
  selector: 'app-proforma-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, RouterModule, LkrPipe, NumberToWordsPipe],
  template: `
    <div class="page-header flex items-center gap-3 mb-6">
      <button class="btn btn-ghost btn-sm" routerLink="/invoices/proforma">← Back</button>
      <div>
        <h2>{{ isEdit() ? 'Edit Proforma Invoice' : 'Create Proforma Invoice' }}</h2>
        <div class="text-muted text-sm mt-1">
          {{ isEdit() ? 'Update this quotation or convert it to a tax invoice.' : 'Create a preliminary quotation before issuing a tax invoice.' }}
        </div>
      </div>
    </div>

    <div class="invoice-layout" *ngIf="config() as cfg">
      <div class="invoice-main">
        <div class="card mb-4">
          <div class="flex items-center justify-between mb-4">
            <h3 class="section-title" style="margin:0">Supplier</h3>
            <span class="badge badge-verified">Auto-filled from settings</span>
          </div>
          <div class="grid-2 gap-3 text-sm">
            <div><span class="text-muted">Supplier Name</span><div class="font-medium mt-1">{{ cfg.companyName }}</div></div>
            <div><span class="text-muted">Supplier TIN</span><div class="font-medium mt-1">{{ cfg.tin }}</div></div>
            <div class="col-span-2"><span class="text-muted">Address</span><div class="font-medium mt-1">{{ cfg.address }}</div></div>
          </div>
        </div>

        <div class="card mb-4">
          <h3 class="section-title">Customer</h3>
          <div class="form-group mb-0">
            <label class="form-label">Select Customer <span class="required">*</span></label>
            <select class="form-control" [(ngModel)]="form.customerId" (change)="onCustomerChange()">
              <option value="">Select a customer</option>
              <option *ngFor="let customer of customers()" [value]="customer.id">{{ customer.name }}</option>
            </select>
          </div>
          <div class="grid-2 gap-3 text-sm mt-4" *ngIf="selectedCustomer() as customer">
            <div><span class="text-muted">Customer Name</span><div class="font-medium mt-1">{{ customer.name }}</div></div>
            <div><span class="text-muted">Customer TIN</span><div class="font-medium mt-1">{{ customer.tin || '—' }}</div></div>
            <div class="col-span-2"><span class="text-muted">Address</span><div class="font-medium mt-1">{{ customer.address || '—' }}</div></div>
          </div>
        </div>

        <div class="card mb-4">
          <h3 class="section-title">Proforma Details</h3>
          <div class="grid-2 gap-4">
            <div class="form-group mb-0 col-span-2">
              <label class="form-label">Proforma Serial Number</label>
              <input class="form-control readonly" [value]="form.serialNumber" readonly/>
            </div>
            <div class="form-group mb-0">
              <label class="form-label">Issue Date <span class="required">*</span></label>
              <input class="form-control" type="date" [(ngModel)]="form.issueDateRaw" (change)="computeValidUntil()"/>
            </div>
            <div class="form-group mb-0">
              <label class="form-label">Valid Until <span class="required">*</span></label>
              <input class="form-control" type="date" [(ngModel)]="form.validUntilRaw"/>
            </div>
            <div class="form-group mb-0">
              <label class="form-label">Payment Terms</label>
              <select class="form-control" [(ngModel)]="form.paymentTermId">
                <option value="">Select payment terms</option>
                <option *ngFor="let term of paymentTerms()" [value]="term.id">{{ term.label }}</option>
              </select>
            </div>
            <div class="form-group mb-0">
              <label class="form-label">Description</label>
              <input class="form-control" [(ngModel)]="form.description" placeholder="Brief description of this quotation"/>
            </div>
            <div class="form-group mb-0 col-span-2">
              <label class="form-label">Notes</label>
              <textarea class="form-control" rows="3" [(ngModel)]="form.notes" placeholder="Terms, conditions, or validity notes"></textarea>
            </div>
          </div>
        </div>

        <div class="card mb-4">
          <div class="flex items-center justify-between mb-4">
            <h3 class="section-title" style="margin:0">Line Items</h3>
            <button class="btn btn-secondary btn-sm" type="button" (click)="addLine()">+ Add Line Item</button>
          </div>
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Reference</th>
                  <th>Description</th>
                  <th>Quantity</th>
                  <th>Unit Price (LKR)</th>
                  <th class="text-right">Amount (LKR)</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let line of form.lines; let i = index">
                  <td>{{ i + 1 }}</td>
                  <td><input class="form-control form-control-sm" [(ngModel)]="line.reference" placeholder="Ref"/></td>
                  <td><input class="form-control form-control-sm" [(ngModel)]="line.description" (input)="computeTotals()" placeholder="Item description"/></td>
                  <td><input class="form-control form-control-sm text-right" type="number" min="1" [(ngModel)]="line.qty" (input)="computeTotals()"/></td>
                  <td><input class="form-control form-control-sm text-right" type="number" min="0" [(ngModel)]="line.unitPrice" (input)="computeTotals()"/></td>
                  <td class="text-right lkr-mono font-medium">{{ lineTotal(line) | lkr }}</td>
                  <td><button class="btn btn-ghost btn-sm text-red" type="button" (click)="removeLine(i)">Remove</button></td>
                </tr>
                <tr *ngIf="!form.lines.length">
                  <td colspan="7" class="text-center text-muted p-4">Add at least one line item to create this proforma invoice.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="card mb-4">
          <h3 class="section-title">Totals</h3>
          <div class="totals-box">
            <div class="totals-row">
              <span>Subtotal (Excl. Tax)</span>
              <strong class="lkr-mono">{{ form.netAmount | lkr }}</strong>
            </div>
            <div class="totals-row">
              <span>VAT ({{ config()?.vatRate }}%)</span>
              <strong class="lkr-mono">{{ form.vatAmount | lkr }}</strong>
            </div>
            <div class="totals-row totals-row-grand">
              <span>Total Amount</span>
              <strong class="lkr-mono">{{ form.grossAmount | lkr }}</strong>
            </div>
          </div>
          <div class="info-box mt-4" style="background:#F0FDF4;border-color:#86EFAC">
            <div class="text-sm text-muted mb-1">Total Amount in Words</div>
            <div class="font-medium" style="color:#166534">{{ form.grossAmount | numberToWords }}</div>
          </div>
        </div>
      </div>

      <div class="invoice-side">
        <div class="card mb-4 sticky-top">
          <h3 class="section-title">Actions</h3>
          <div class="flex flex-col gap-2">
            <button class="btn btn-secondary" type="button" (click)="saveDraft()">Save as Draft</button>
            <button class="btn btn-primary" type="button" [disabled]="!canSend()" (click)="sendProforma()">Send Proforma</button>
            <button class="btn btn-accent" type="button" [disabled]="!canConvert()" (click)="convertToInvoice()">Convert to Tax Invoice</button>
            <button class="btn btn-ghost" type="button" routerLink="/invoices/proforma">Cancel</button>
          </div>
          <div class="divider"></div>
          <div class="text-sm text-muted">Proforma invoices are quotations and do not require compliance validation.</div>
        </div>

        <div class="card">
          <h3 class="section-title">Validation</h3>
          <div class="check-list">
            <div [class]="form.customerId ? 'check-ok' : 'check-fail'">{{ form.customerId ? '✓' : '•' }} Customer selected</div>
            <div [class]="form.issueDateRaw ? 'check-ok' : 'check-fail'">{{ form.issueDateRaw ? '✓' : '•' }} Issue date entered</div>
            <div [class]="form.validUntilRaw ? 'check-ok' : 'check-fail'">{{ form.validUntilRaw ? '✓' : '•' }} Valid until date entered</div>
            <div [class]="form.lines.length ? 'check-ok' : 'check-fail'">{{ form.lines.length ? '✓' : '•' }} At least one line item</div>
          </div>
          <div class="form-error mt-3" *ngFor="let issue of validationIssues()">{{ issue }}</div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .invoice-layout { display:grid; grid-template-columns:minmax(0, 1fr) 340px; gap:24px; align-items:start; }
    .invoice-main { min-width:0; }
    .invoice-side { min-width:0; }
    .sticky-top { position:sticky; top:80px; }
    .section-title { font-size:13px; font-weight:600; color:var(--text-secondary); text-transform:uppercase; letter-spacing:.05em; margin-bottom:12px; }
    .col-span-2 { grid-column:1 / -1; }
    .totals-box { margin-left:auto; max-width:420px; }
    .totals-row { display:flex; justify-content:space-between; gap:16px; padding:10px 0; border-bottom:1px solid var(--border); }
    .totals-row-grand { border-bottom:none; font-size:16px; color:var(--brand); }
    .check-list { display:flex; flex-direction:column; gap:10px; font-size:13px; }
    .check-ok { color:#166534; }
    .check-fail { color:var(--red); }
    @media (max-width: 1080px) {
      .invoice-layout { grid-template-columns:1fr; }
      .sticky-top { position:static; }
    }
  `],
})
export class ProformaFormComponent implements OnInit {
  private readonly svc = inject(MockDataService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  isEdit = signal(false);
  config = signal<CompanyConfig | null>(null);
  customers = signal<Customer[]>([]);
  paymentTerms = signal<PaymentTerm[]>([]);

  selectedCustomer = computed(() => this.customers().find(c => c.id === this.form.customerId) ?? null);
  validationIssues = computed(() => this.collectValidationIssues());

  form: ProformaFormState = this.createEmptyForm();

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.isEdit.set(!!id);

    this.svc.getCompanyConfig().subscribe(config => {
      this.config.set(config);
      if (!id) {
        this.form.serialNumber = 'Auto-generated on save';
      }
    });

    this.svc.getCustomers().subscribe(customers => this.customers.set(customers));
    this.svc.getPaymentTerms().subscribe(terms => {
      this.paymentTerms.set(terms);
      if (!id) {
        this.form.paymentTermId = terms.find(t => t.isDefault)?.id || '';
      }
    });

    if (id) {
      this.svc.getProformaInvoice(id).subscribe(proforma => {
        if (!proforma) return;
        this.form = {
          id: proforma.id,
          serialNumber: proforma.serialNumber,
          customerId: proforma.customerId,
          customerName: proforma.customerName,
          paymentTermId: proforma.paymentTermId || '',
          issueDateRaw: this.toInputDate(proforma.issueDate),
          validUntilRaw: this.toInputDate(proforma.validUntil),
          description: proforma.description || '',
          notes: proforma.notes || '',
          lines: proforma.lines.map(line => ({ 
            ...line, 
            reference: line.reference || '',
            discount: line.discount || 0
          })),
          netAmount: proforma.netAmount,
          vatAmount: proforma.vatAmount,
          grossAmount: proforma.grossAmount,
        };
      });
    } else {
      this.form.lines = [this.createLine()];
      const today = new Date();
      this.form.issueDateRaw = today.toISOString().split('T')[0];
      this.computeValidUntil();
    }
  }

  onCustomerChange(): void {
    const customer = this.selectedCustomer();
    this.form.customerName = customer?.name || '';
  }

  addLine(): void {
    this.form.lines = [...this.form.lines, this.createLine()];
  }

  removeLine(index: number): void {
    this.form.lines = this.form.lines.filter((_, i) => i !== index);
    this.computeTotals();
  }

  lineTotal(line: ProformaFormLine): number {
    return Math.round((line.qty || 0) * (line.unitPrice || 0) - (line.discount || 0));
  }

  computeTotals(): void {
    const netAmount = this.form.lines.reduce((sum, line) => sum + this.lineTotal(line), 0);
    const vatRate = this.config()?.vatRate || 18;
    const vatAmount = Math.round(netAmount * vatRate / 100);
    this.form.netAmount = Math.round(netAmount);
    this.form.vatAmount = Math.round(vatAmount);
    this.form.grossAmount = this.form.netAmount + this.form.vatAmount;
  }

  computeValidUntil(): void {
    if (!this.form.issueDateRaw) return;
    const issueDate = new Date(`${this.form.issueDateRaw}T00:00:00`);
    const validUntil = new Date(issueDate);
    validUntil.setDate(validUntil.getDate() + 14); // Default 14 days validity
    this.form.validUntilRaw = validUntil.toISOString().split('T')[0];
  }

  canSend(): boolean {
    return this.validationIssues().length === 0;
  }

  canConvert(): boolean {
    return this.isEdit() && this.form.id !== '' && this.validationIssues().length === 0;
  }

  saveDraft(): void {
    this.computeTotals();
    const payload = this.buildPayload('Draft');
    this.svc.saveProformaInvoice(payload).subscribe(saved => {
      this.toast.success(`Proforma ${saved.serialNumber} saved.`);
      this.router.navigate(['/invoices/proforma']);
    });
  }

  sendProforma(): void {
    if (!this.canSend()) return;
    this.computeTotals();
    const payload = this.buildPayload('Draft');
    this.svc.saveProformaInvoice(payload).subscribe(saved => {
      this.svc.sendProformaInvoice(saved.id).subscribe(() => {
        this.toast.success(`Proforma ${saved.serialNumber} sent to customer.`);
        this.router.navigate(['/invoices/proforma']);
      });
    });
  }

  convertToInvoice(): void {
    if (!this.canConvert()) return;
    this.svc.convertProformaToInvoice(this.form.id).subscribe(invoice => {
      this.toast.success(`Proforma converted to tax invoice ${invoice.serialNumber}.`);
      this.router.navigate(['/invoices', invoice.id]);
    });
  }

  private collectValidationIssues(): string[] {
    const issues: string[] = [];
    if (!this.form.customerId) issues.push('Select a customer.');
    if (!this.form.issueDateRaw) issues.push('Provide the issue date.');
    if (!this.form.validUntilRaw) issues.push('Provide the valid until date.');
    if (!this.form.lines.length) issues.push('Add at least one line item.');
    if (this.form.lines.some(line => !line.description.trim() || !line.qty || line.unitPrice < 0)) {
      issues.push('Each line item needs a description, quantity, and unit price.');
    }
    return issues;
  }

  private buildPayload(status: ProformaInvoice['status']): ProformaInvoice {
    this.computeTotals();
    const customer = this.selectedCustomer();
    return {
      id: this.form.id,
      serialNumber: this.form.serialNumber,
      customerId: this.form.customerId,
      customerName: customer?.name || this.form.customerName,
      customerTin: customer?.tin,
      customerAddress: customer?.address,
      customerPhone: customer?.phone,
      issueDate: this.toUsDate(this.form.issueDateRaw),
      validUntil: this.toUsDate(this.form.validUntilRaw),
      paymentTermId: this.form.paymentTermId,
      description: this.form.description,
      notes: this.form.notes,
      lines: this.form.lines.map(line => ({
        id: line.id,
        reference: line.reference?.trim(),
        description: line.description.trim(),
        qty: Math.round(line.qty),
        unitPrice: Math.round(line.unitPrice),
        discount: 0,
      })),
      netAmount: this.form.netAmount,
      vatAmount: this.form.vatAmount,
      grossAmount: this.form.grossAmount,
      status,
    };
  }

  private createLine(): ProformaFormLine {
    return {
      id: Date.now().toString() + Math.random().toString(16).slice(2),
      reference: '',
      description: '',
      qty: 1,
      unitPrice: 0,
      discount: 0,
    };
  }

  private createEmptyForm(): ProformaFormState {
    return {
      id: '',
      serialNumber: '',
      customerId: '',
      customerName: '',
      paymentTermId: '',
      issueDateRaw: '',
      validUntilRaw: '',
      description: '',
      notes: '',
      lines: [],
      netAmount: 0,
      vatAmount: 0,
      grossAmount: 0,
    };
  }

  private toInputDate(usDate: string): string {
    const parts = usDate.split('/');
    if (parts.length !== 3) return '';
    return `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
  }

  private toUsDate(inputDate: string): string {
    if (!inputDate) return '';
    const date = new Date(`${inputDate}T00:00:00`);
    return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
  }
}
