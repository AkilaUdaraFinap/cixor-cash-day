import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { InvoiceDataService } from '../../core/services/invoice-data.service';
import { ToastService } from '../../core/services/toast.service';
import { LkrPipe } from '../../shared/pipes/lkr.pipe';
import { NumberToWordsPipe } from '../../shared/pipes/number-to-words.pipe';
import { CompanyConfig, Customer, Invoice, LineItem, PaymentTerm, Tax } from '../../shared/models/models';

interface InvoiceFormLine extends LineItem {
  reference: string;
}

interface InvoiceFormState {
  id: string;
  serialNumber: string;
  customerId: string;
  customerName: string;
  paymentTermId: string;
  selectedTaxIds: string[];
  branchCode: string;
  invoiceDateRaw: string;
  deliveryDateRaw: string;
  dueDateRaw: string;
  placeOfSupply: string;
  debtorOfficerId: string;
  modeOfPayment: string;
  description: string;
  additionalInformation: string;
  lines: InvoiceFormLine[];
  netAmount: number;
  vatAmount: number;
  grossAmount: number;
}

@Component({
  selector: 'app-invoice-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, RouterModule, LkrPipe, NumberToWordsPipe],
  template: `
    <div class="page-header flex items-center gap-3 mb-6">
      <button class="btn btn-ghost btn-sm" routerLink="/invoices">← Back</button>
      <div>
        <h2>{{ isEdit() ? 'Edit Tax Invoice' : 'Create Tax Invoice' }}</h2>
        <div class="text-muted text-sm mt-1">
          {{ isEdit() ? 'Update and re-send only if the invoice is still in draft.' : 'Sri Lanka Gazette-compliant VAT tax invoice.' }}
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
          <div class="info-box info text-sm mb-4">
            Invoice supplier fields are populated from Company Settings to keep every tax invoice consistent and compliant.
          </div>
          <div class="grid-2 gap-3 text-sm">
            <div><span class="text-muted">Supplier Name</span><div class="font-medium mt-1">{{ cfg.companyName }}</div></div>
            <div><span class="text-muted">Supplier TIN</span><div class="font-medium mt-1">{{ cfg.tin }}</div></div>
            <div><span class="text-muted">VAT Registration</span><div class="font-medium mt-1">{{ cfg.vatRegNo || '—' }}</div></div>
            <div><span class="text-muted">Telephone</span><div class="font-medium mt-1">{{ cfg.phone || '—' }}</div></div>
            <div class="col-span-2"><span class="text-muted">Address</span><div class="font-medium mt-1">{{ cfg.address }}</div></div>
          </div>
        </div>

        <div class="card mb-4">
          <h3 class="section-title">Purchaser</h3>
          <div class="grid-2 gap-4">
            <div class="form-group mb-0">
              <label class="form-label">Customer <span class="required">*</span></label>
              <select class="form-control" [(ngModel)]="form.customerId" (change)="onCustomerChange()">
                <option value="">Select a customer</option>
                <option *ngFor="let customer of customers()" [value]="customer.id">{{ customer.name }}</option>
              </select>
            </div>
            <div class="form-group mb-0">
              <label class="form-label">Debtor Officer <span class="required">*</span></label>
              <select class="form-control" [(ngModel)]="form.debtorOfficerId">
                <option value="">Select the debtor officer for OTP acceptance</option>
                <option *ngFor="let officer of availableOfficers()" [value]="officer.id">
                  {{ officer.name }} · {{ officer.designation }}
                </option>
              </select>
            </div>
          </div>
          <div class="grid-2 gap-3 text-sm mt-4" *ngIf="selectedCustomer() as customer">
            <div><span class="text-muted">Purchaser Name</span><div class="font-medium mt-1">{{ customer.name }}</div></div>
            <div><span class="text-muted">Purchaser TIN</span><div class="font-medium mt-1">{{ customer.tin || '—' }}</div></div>
            <div><span class="text-muted">Purchaser Telephone</span><div class="font-medium mt-1">{{ customer.phone || '—' }}</div></div>
            <div><span class="text-muted">VAT Registration</span><div class="font-medium mt-1">{{ customer.vatRegNo || '—' }}</div></div>
            <div class="col-span-2"><span class="text-muted">Address</span><div class="font-medium mt-1">{{ customer.address || '—' }}</div></div>
          </div>
        </div>

        <div class="card mb-4">
          <h3 class="section-title">Invoice Metadata</h3>
          <div class="grid-2 gap-4">
            <div class="form-group mb-0 col-span-2">
              <label class="form-label">Invoice Serial Number</label>
              <div class="serial-row">
                <input class="form-control readonly" [value]="form.serialNumber" readonly maxlength="40"/>
                <button class="btn btn-secondary btn-sm" type="button" (click)="copySerial()">Copy</button>
              </div>
              <div class="char-count">{{ form.serialNumber.length }}/40</div>
            </div>
            <div class="form-group mb-0 col-span-2">
              <label class="form-label">Tax Rates <span class="required">*</span></label>
              <div class="tax-selection">
                <div *ngFor="let tax of taxes()" class="tax-checkbox">
                  <label>
                    <input type="checkbox" [checked]="isTaxSelected(tax.id)" (change)="toggleTax(tax.id)"/>
                    <span>{{ tax.label }} ({{ tax.rate }}%)</span>
                  </label>
                </div>
              </div>
              <div class="form-hint">Select one or more tax rates to apply to this invoice</div>
            </div>
            <div class="form-group mb-0">
              <label class="form-label">Invoice Branch / Unit Code <span class="required">*</span></label>
              <input class="form-control" [(ngModel)]="form.branchCode" maxlength="4" placeholder="HQ01" style="text-transform:uppercase"/>
              <div class="form-hint">Used in serial number (e.g., HQ01, BR03)</div>
            </div>
            <div class="form-group mb-0">
              <label class="form-label">Date of Invoice <span class="required">*</span></label>
              <input class="form-control" type="date" [(ngModel)]="form.invoiceDateRaw" (change)="computeDue(true)"/>
            </div>
            <div class="form-group mb-0">
              <label class="form-label">Date of Delivery <span class="required">*</span></label>
              <input class="form-control" type="date" [(ngModel)]="form.deliveryDateRaw"/>
            </div>
            <div class="form-group mb-0">
              <label class="form-label">Payment Terms <span class="required">*</span></label>
              <select class="form-control" [(ngModel)]="form.paymentTermId" (change)="computeDue(true)">
                <option *ngFor="let term of paymentTerms()" [value]="term.id">{{ term.label }}</option>
              </select>
            </div>
            <div class="form-group mb-0">
              <label class="form-label">Due Date <span class="required">*</span></label>
              <input class="form-control" type="date" [(ngModel)]="form.dueDateRaw"/>
            </div>
            <div class="form-group mb-0 col-span-2">
              <label class="form-label">Place of Supply <span class="required">*</span></label>
              <input class="form-control" [(ngModel)]="form.placeOfSupply" placeholder="Location from which delivery originates"/>
            </div>
            <div class="form-group mb-0 col-span-2">
              <label class="form-label">Mode of Payment <span class="required">*</span></label>
              <select class="form-control" [(ngModel)]="form.modeOfPayment">
                <option>Cash</option>
                <option>Bank Transfer</option>
                <option>Cheque</option>
                <option>Credit / Debit Card</option>
                <option>Mobile Payment</option>
                <option>Online Payment</option>
              </select>
            </div>
            <div class="form-group mb-0 col-span-2">
              <label class="form-label">Additional Information</label>
              <textarea class="form-control" rows="3" [(ngModel)]="form.additionalInformation" placeholder="Optional remarks as allowed by the gazette"></textarea>
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
                  <th>Description of Goods or Services</th>
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
                  <td colspan="7" class="text-center text-muted p-4">At least one line item is required to save this invoice.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="card mb-4">
          <h3 class="section-title">Totals</h3>
          <div class="totals-box">
            <div class="totals-row">
              <span>Total Value of Supply (Excl. Tax)</span>
              <strong class="lkr-mono">{{ form.netAmount | lkr }}</strong>
            </div>
            <div class="totals-row" *ngFor="let taxBreakdown of taxBreakdowns()">
              <span>{{ taxBreakdown.label }} ({{ taxBreakdown.rate }}%)</span>
              <strong class="lkr-mono">{{ taxBreakdown.amount | lkr }}</strong>
            </div>
            <div class="totals-row totals-row-grand">
              <span>Total Amount including Tax</span>
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
            <button class="btn btn-primary" type="button" [disabled]="!canSend()" (click)="saveAndSend()">Send Invoice</button>
            <button class="btn btn-ghost" type="button" routerLink="/invoices">Cancel</button>
          </div>
          <div class="divider"></div>
          <div class="text-sm text-muted">Sending will create the debtor acceptance request and lock this invoice from further editing.</div>
        </div>

        <div class="card">
          <h3 class="section-title">Compliance Checklist</h3>
          <div class="check-list">
            <div [class]="form.serialNumber ? 'check-ok' : 'check-fail'">{{ form.serialNumber ? '✓' : '•' }} Serial number generated</div>
            <div [class]="selectedCustomer() ? 'check-ok' : 'check-fail'">{{ selectedCustomer() ? '✓' : '•' }} Purchaser selected</div>
            <div [class]="form.debtorOfficerId ? 'check-ok' : 'check-fail'">{{ form.debtorOfficerId ? '✓' : '•' }} Debtor officer assigned</div>
            <div [class]="form.selectedTaxIds.length ? 'check-ok' : 'check-fail'">{{ form.selectedTaxIds.length ? '✓' : '•' }} Tax rate(s) selected</div>
            <div [class]="form.branchCode ? 'check-ok' : 'check-fail'">{{ form.branchCode ? '✓' : '•' }} Branch code entered</div>
            <div [class]="form.placeOfSupply ? 'check-ok' : 'check-fail'">{{ form.placeOfSupply ? '✓' : '•' }} Place of supply entered</div>
            <div [class]="form.deliveryDateRaw ? 'check-ok' : 'check-fail'">{{ form.deliveryDateRaw ? '✓' : '•' }} Delivery date entered</div>
            <div [class]="form.lines.length ? 'check-ok' : 'check-fail'">{{ form.lines.length ? '✓' : '•' }} At least one line item</div>
            <div [class]="serialValid() ? 'check-ok' : 'check-fail'">{{ serialValid() ? '✓' : '•' }} Serial format valid</div>
            <div [class]="taxValid() ? 'check-ok' : 'check-fail'">{{ taxValid() ? '✓' : '•' }} Net + Tax = Gross</div>
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
    .serial-row { display:flex; gap:8px; align-items:center; }
    .tax-selection { display:flex; flex-direction:column; gap:8px; }
    .tax-checkbox { display:flex; align-items:center; }
    .tax-checkbox label { display:flex; align-items:center; gap:8px; cursor:pointer; font-size:14px; margin:0; }
    .tax-checkbox input[type="checkbox"] { cursor:pointer; width:16px; height:16px; }
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
    @media (max-width: 768px) {
      .serial-row { flex-direction: column; align-items: stretch; }
      .serial-row .btn { width: 100%; }
      .totals-box { margin-left: 0; max-width: 100%; }
      .invoice-side .card { position: static; }
    }
  `],
})
export class InvoiceFormComponent implements OnInit {
  private readonly svc = inject(InvoiceDataService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  isEdit = signal(false);
  config = signal<CompanyConfig | null>(null);
  customers = signal<Customer[]>([]);
  paymentTerms = signal<PaymentTerm[]>([]);
  taxes = signal<Tax[]>([]);

  selectedCustomer = computed(() => this.customers().find(customer => customer.id === this.form.customerId) ?? null);
  availableOfficers = computed(() => this.selectedCustomer()?.officers ?? []);
  taxBreakdowns = computed(() => {
    return this.form.selectedTaxIds.map(taxId => {
      const tax = this.taxes().find(t => t.id === taxId);
      if (!tax) return null;
      return {
        id: tax.id,
        label: tax.label,
        rate: tax.rate,
        amount: Math.round(this.form.netAmount * tax.rate / 100)
      };
    }).filter(item => item !== null);
  });
  validationIssues = computed(() => this.collectValidationIssues());

  form: InvoiceFormState = this.createEmptyForm();

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.isEdit.set(!!id);

    this.svc.getCompanyConfig().subscribe(config => {
      this.config.set(config);
      if (!id) {
        this.svc.nextSerialNumber().subscribe(serial => { this.form.serialNumber = serial; });
        this.form.branchCode = config.branchCode || 'HQ01';
      }
    });

    this.svc.getCustomers().subscribe(customers => this.customers.set(customers));
    this.svc.getPaymentTerms().subscribe(terms => {
      this.paymentTerms.set(terms);
      if (!id) {
        this.form.paymentTermId = terms.find(term => term.isDefault)?.id || terms[0]?.id || '';
        this.computeDue(true);
      }
    });
    this.svc.getTaxes().subscribe(taxes => {
      this.taxes.set(taxes);
      if (!id) {
        const defaultTax = taxes.find(t => t.isDefault);
        if (defaultTax) {
          this.form.selectedTaxIds = [defaultTax.id];
        }
        this.computeTotals();
      }
    });

    if (id) {
      this.svc.getInvoice(id).subscribe(invoice => {
        if (!invoice) return;
        this.form = {
          id: invoice.id,
          serialNumber: invoice.serialNumber,
          customerId: invoice.customerId,
          customerName: invoice.customerName,
          paymentTermId: invoice.paymentTermId || '',
          selectedTaxIds: this.taxes().find(tax => tax.isDefault) ? [this.taxes().find(tax => tax.isDefault)!.id] : [],
          branchCode: this.config()?.branchCode || 'HQ01',
          invoiceDateRaw: this.toInputDate(invoice.invoiceDate),
          deliveryDateRaw: this.toInputDate(invoice.deliveryDate || invoice.invoiceDate),
          dueDateRaw: this.toInputDate(invoice.dueDate),
          placeOfSupply: invoice.placeOfSupply || '',
          debtorOfficerId: invoice.debtorOfficerId || '',
          modeOfPayment: invoice.modeOfPayment,
          description: invoice.description || '',
          additionalInformation: invoice.additionalInformation || '',
          lines: invoice.lines.map(line => ({ 
            ...line, 
            reference: line.reference || ''
          })),
          netAmount: invoice.netAmount,
          vatAmount: invoice.vatAmount,
          grossAmount: invoice.grossAmount,
        };
      });
    } else {
      this.form.lines = [this.createLine()];
    }
  }

  onCustomerChange(): void {
    const customer = this.selectedCustomer();
    this.form.customerName = customer?.name || '';
    this.form.debtorOfficerId = customer?.officers.find(officer => officer.isPrimary)?.id || customer?.officers[0]?.id || '';
  }

  copySerial(): void {
    navigator.clipboard?.writeText(this.form.serialNumber);
    this.toast.info('Invoice serial number copied.');
  }

  isTaxSelected(taxId: string): boolean {
    return this.form.selectedTaxIds.includes(taxId);
  }

  toggleTax(taxId: string): void {
    if (this.isTaxSelected(taxId)) {
      this.form.selectedTaxIds = this.form.selectedTaxIds.filter(id => id !== taxId);
    } else {
      this.form.selectedTaxIds = [...this.form.selectedTaxIds, taxId];
    }
    this.computeTotals();
  }

  addLine(): void {
    this.form.lines = [...this.form.lines, this.createLine()];
  }

  removeLine(index: number): void {
    this.form.lines = this.form.lines.filter((_, lineIndex) => lineIndex !== index);
    this.computeTotals();
  }

  lineTotal(line: InvoiceFormLine): number {
    return Math.round((line.qty || 0) * (line.unitPrice || 0) - (line.discount || 0));
  }

  computeTotals(): void {
    const netAmount = this.form.lines.reduce((sum, line) => sum + this.lineTotal(line), 0);
    const taxAmount = this.form.selectedTaxIds.reduce((sum, taxId) => {
      const tax = this.taxes().find(t => t.id === taxId);
      if (!tax) return sum;
      return sum + Math.round(netAmount * tax.rate / 100);
    }, 0);
    this.form.netAmount = Math.round(netAmount);
    this.form.vatAmount = Math.round(taxAmount);
    this.form.grossAmount = this.form.netAmount + this.form.vatAmount;
  }

  computeDue(shouldDefaultDueDate: boolean): void {
    if (!this.form.invoiceDateRaw) return;
    const baseDate = new Date(`${this.form.invoiceDateRaw}T00:00:00`);
    const term = this.paymentTerms().find(item => item.id === this.form.paymentTermId);
    const dueDate = new Date(baseDate);
    dueDate.setDate(dueDate.getDate() + (term?.days ?? 0));
    if (shouldDefaultDueDate || !this.form.dueDateRaw) {
      this.form.dueDateRaw = dueDate.toISOString().split('T')[0];
    }
    if (!this.form.deliveryDateRaw) {
      this.form.deliveryDateRaw = this.form.invoiceDateRaw;
    }
  }

  serialValid(): boolean {
    return /^[0-9]{2}[A-Z]{3}_[A-Za-z0-9]{1,4}_[0-9]{5}$/.test(this.form.serialNumber) && this.form.serialNumber.length <= 40 && !this.form.serialNumber.includes(' ');
  }

  taxValid(): boolean {
    return this.form.netAmount + this.form.vatAmount === this.form.grossAmount;
  }

  canSend(): boolean {
    return this.validationIssues().length === 0;
  }

  saveDraft(): void {
    const payload = this.buildPayload('Draft');
    this.svc.saveInvoice(payload).subscribe(saved => {
      this.toast.success(`Invoice ${saved.serialNumber} saved as draft.`);
      this.router.navigate(['/invoices', saved.id]);
    });
  }

  saveAndSend(): void {
    if (!this.canSend()) return;
    const payload = this.buildPayload('Draft');
    this.svc.saveInvoice(payload).subscribe(saved => {
      this.svc.sendInvoice(saved.id).subscribe(() => {
        this.toast.success(`Invoice ${saved.serialNumber} sent successfully.`);
        this.router.navigate(['/invoices', saved.id]);
      });
    });
  }

  private collectValidationIssues(): string[] {
    const issues: string[] = [];
    if (!this.form.customerId) issues.push('Select the purchaser.');
    if (!this.form.debtorOfficerId) issues.push('Assign a debtor officer for OTP acceptance.');
    if (!this.form.selectedTaxIds.length) issues.push('Select at least one tax rate.');
    if (!this.form.branchCode.trim()) issues.push('Enter the invoice branch/unit code.');
    if (this.form.branchCode && !/^[A-Z0-9]{1,4}$/.test(this.form.branchCode.trim().toUpperCase())) issues.push('Branch code must be 1-4 uppercase letters or numbers.');
    if (!this.form.invoiceDateRaw) issues.push('Provide the invoice date.');
    if (!this.form.deliveryDateRaw) issues.push('Provide the delivery date.');
    if (!this.form.dueDateRaw) issues.push('Provide the due date.');
    if (!this.form.placeOfSupply.trim()) issues.push('Provide the place of supply.');
    if (!this.form.modeOfPayment) issues.push('Select the mode of payment.');
    if (!this.form.lines.length) issues.push('Add at least one line item.');
    if (this.form.lines.some(line => !line.description.trim() || !line.qty || line.unitPrice < 0)) issues.push('Each line item needs a description, quantity, and unit price.');
    if (!this.serialValid()) issues.push('Invoice serial number must follow YYMMM_QQQQ_XXXXX, contain no spaces, and stay within 40 characters.');
    if (!this.taxValid()) issues.push('Tax totals must satisfy Net + VAT = Gross.');
    return issues;
  }

  private buildPayload(status: Invoice['status']): Invoice {
    this.computeTotals();
    const customer = this.selectedCustomer();
    const officer = this.availableOfficers().find(item => item.id === this.form.debtorOfficerId);
    return {
      id: this.form.id,
      serialNumber: this.form.serialNumber,
      customerId: this.form.customerId,
      customerName: customer?.name || this.form.customerName,
      customerTin: customer?.tin,
      customerVatReg: customer?.vatRegNo,
      customerAddress: customer?.address,
      customerPhone: customer?.phone,
      invoiceDate: this.toUsDate(this.form.invoiceDateRaw),
      deliveryDate: this.toUsDate(this.form.deliveryDateRaw),
      dueDate: this.toUsDate(this.form.dueDateRaw),
      placeOfSupply: this.form.placeOfSupply.trim(),
      paymentTermId: this.form.paymentTermId,
      debtorOfficerId: officer?.id,
      debtorOfficerName: officer?.name,
      debtorOfficerEmail: officer?.email,
      modeOfPayment: this.form.modeOfPayment,
      description: this.form.description,
      additionalInformation: this.form.additionalInformation,
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
      isVerified: false,
    } as Invoice;
  }

  private createLine(): InvoiceFormLine {
    return { 
      id: Date.now().toString() + Math.random().toString(16).slice(2), 
      reference: '', 
      description: '', 
      qty: 1, 
      unitPrice: 0, 
      discount: 0
    };
  }

  private createEmptyForm(): InvoiceFormState {
    return {
      id: '',
      serialNumber: '',
      customerId: '',
      customerName: '',
      paymentTermId: '',
      selectedTaxIds: [],
      branchCode: '',
      invoiceDateRaw: '',
      deliveryDateRaw: '',
      dueDateRaw: '',
      placeOfSupply: '',
      debtorOfficerId: '',
      modeOfPayment: 'Bank Transfer',
      description: '',
      additionalInformation: '',
      lines: [],
      netAmount: 0,
      vatAmount: 0,
      grossAmount: 0,
    };
  }

  private toInputDate(value?: string): string {
    if (!value) return '';
    const [month, day, year] = value.split('/');
    if (!month || !day || !year) return '';
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  private toUsDate(value: string): string {
    if (!value) return '';
    const date = new Date(`${value}T00:00:00`);
    return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
  }
}
