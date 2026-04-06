import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { InvoiceDataService } from '../../core/services/invoice-data.service';
import { ToastService } from '../../core/services/toast.service';
import { Invoice } from '../../shared/models/models';
import { LkrPipe } from '../../shared/pipes/lkr.pipe';
import { NumberToWordsPipe } from '../../shared/pipes/number-to-words.pipe';

@Component({
  selector: 'app-invoice-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, LkrPipe, NumberToWordsPipe],
  template: `
    <div class="page-header flex items-center gap-3 mb-6">
      <button class="btn btn-ghost btn-sm" routerLink="/invoices">← Back to Invoices</button>
      <div style="flex:1">
        <h2>{{ invoice()?.serialNumber || 'Invoice' }}</h2>
        <div class="text-muted text-sm mt-1">Read-only tax invoice view with lifecycle history.</div>
      </div>
      <div class="flex gap-2 flex-wrap">
        <a *ngIf="invoice()?.status === 'Draft'" [routerLink]="['/invoices', invoice()?.id, 'edit']" class="btn btn-secondary">Edit</a>
        <button *ngIf="invoice()?.status === 'Draft'" class="btn btn-primary" type="button" (click)="requestAction('send')">Send</button>
        <button class="btn btn-secondary" type="button" (click)="downloadPdf()">Download PDF</button>
        <button *ngIf="canLiquidate()" class="btn btn-outline-accent" type="button" (click)="requestAction('liquidate')">Liquidate Now</button>
        <button *ngIf="canSettle()" class="btn btn-success" type="button" (click)="requestAction('settle')">Mark as Settled</button>
      </div>
    </div>

    <div *ngIf="invoice() as inv" class="invoice-paper">
      <div class="invoice-title-box">Tax Invoice</div>

      <div class="invoice-grid mt-6">
        <div>
          <div class="block-label">Supplier</div>
          <div class="font-semibold mt-1">{{ inv.supplierName }}</div>
          <div class="text-sm mt-1">TIN: {{ inv.supplierTin }}</div>
          <div class="text-sm">VAT Reg.: {{ inv.supplierVatReg || '—' }}</div>
          <div class="text-sm">Telephone: {{ invoiceCompanyPhone() }}</div>
          <div class="text-sm mt-1">{{ inv.supplierAddress }}</div>
        </div>
        <div>
          <div class="block-label">Purchaser</div>
          <div class="font-semibold mt-1">{{ inv.customerName }}</div>
          <div class="text-sm mt-1">TIN: {{ inv.customerTin || '—' }}</div>
          <div class="text-sm">VAT Reg.: {{ inv.customerVatReg || '—' }}</div>
          <div class="text-sm">Telephone: {{ inv.customerPhone || '—' }}</div>
          <div class="text-sm mt-1">{{ inv.customerAddress || '—' }}</div>
        </div>
      </div>

      <div class="meta-grid mt-6">
        <div><span class="block-label">Invoice No.</span><div class="font-medium mt-1">{{ inv.serialNumber }}</div></div>
        <div><span class="block-label">Date of Invoice</span><div class="font-medium mt-1">{{ inv.invoiceDate }}</div></div>
        <div><span class="block-label">Date of Delivery</span><div class="font-medium mt-1">{{ inv.deliveryDate || '—' }}</div></div>
        <div><span class="block-label">Due Date</span><div class="font-medium mt-1">{{ inv.dueDate }}</div></div>
        <div class="meta-span"><span class="block-label">Place of Supply</span><div class="font-medium mt-1">{{ inv.placeOfSupply || '—' }}</div></div>
        <div class="meta-span" *ngIf="inv.additionalInformation"><span class="block-label">Additional Information</span><div class="font-medium mt-1">{{ inv.additionalInformation }}</div></div>
      </div>

      <div class="invoice-table-wrap mt-6">
        <table class="invoice-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Reference</th>
              <th>Description of Goods or Services</th>
              <th class="text-right">Quantity</th>
              <th class="text-right">Unit Price</th>
              <th class="text-right">Amount Excl. VAT</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let line of inv.lines; let index = index">
              <td>{{ index + 1 }}</td>
              <td>{{ line.reference || '—' }}</td>
              <td>{{ line.description }}</td>
              <td class="text-right">{{ line.qty }}</td>
              <td class="text-right lkr-mono">{{ line.unitPrice | lkr }}</td>
              <td class="text-right lkr-mono">{{ (line.qty * line.unitPrice - (line.discount || 0)) | lkr }}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td colspan="5" class="text-right font-medium">Total Value of Supply</td>
              <td class="text-right lkr-mono">{{ inv.netAmount | lkr }}</td>
            </tr>
            <tr>
              <td colspan="5" class="text-right font-medium">VAT Amount</td>
              <td class="text-right lkr-mono">{{ inv.vatAmount | lkr }}</td>
            </tr>
            <tr class="total-row">
              <td colspan="5" class="text-right font-bold">Total Amount including VAT</td>
              <td class="text-right lkr-mono font-bold">{{ inv.grossAmount | lkr }}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div class="words-row mt-4">
        <span class="block-label">Total Amount in Words</span>
        <div class="font-medium mt-1">{{ inv.grossAmount | numberToWords }}</div>
      </div>

      <div class="meta-grid mt-4">
        <div><span class="block-label">Mode of Payment</span><div class="font-medium mt-1">{{ inv.modeOfPayment }}</div></div>
        <div><span class="block-label">Debtor Officer</span><div class="font-medium mt-1">{{ inv.debtorOfficerName || '—' }}</div></div>
      </div>

      <div class="timeline mt-6">
        <div class="section-title">Status Timeline</div>
        <div class="timeline-row" *ngFor="let item of timeline()">
          <div class="timeline-bullet" [class.active]="!!item.date"></div>
          <div class="timeline-content">
            <div class="font-medium">{{ item.label }}</div>
            <div class="text-muted text-sm">{{ item.date || 'Pending' }}</div>
          </div>
        </div>
        <div class="info-box warn text-sm mt-3" *ngIf="inv.rejectionReason">
          <strong>Rejection Reason:</strong> {{ inv.rejectionReason }}
        </div>
      </div>

      <div class="invoice-footer mt-6">
        This is a system-generated Tax Invoice from CIXOR CashDay.
      </div>
    </div>

    <ng-container *ngIf="pendingAction() as action">
      <div class="overlay" (click.self)="closeActionDialog()" (keydown.escape)="closeActionDialog()" tabindex="-1">
        <div class="modal" [style.max-width]="action === 'liquidate' ? '600px' : '500px'" role="dialog" aria-modal="true" aria-labelledby="invoice-action-title">
          <div class="modal-header">
            <h3 id="invoice-action-title">{{ actionTitle(action) }}</h3>
            <button class="btn btn-ghost btn-sm" type="button" (click)="closeActionDialog()" aria-label="Close dialog">✕</button>
          </div>
          <div class="modal-body">
            <div class="text-sm mb-4">{{ actionMessage(action) }}</div>
            
            <!-- Liquidation-specific fields -->
            <ng-container *ngIf="action === 'liquidate' && invoice() as inv">
              <div class="form-group mb-4">
                <label class="form-label">Amount to Liquidate (LKR) <span class="required">*</span></label>
                <input class="form-control" type="number" [value]="liquidationAmount()" (input)="liquidationAmount.set(+($any($event.target).value))" [max]="inv.grossAmount" min="1" placeholder="Enter amount"/>
                <div class="text-muted text-sm mt-1">Maximum: {{ inv.grossAmount | lkr }} • Fee (2%): {{ (liquidationAmount() * 0.02) | lkr }} • Net: {{ (liquidationAmount() - (liquidationAmount() * 0.02)) | lkr }}</div>
              </div>
              
              <div class="form-group mb-3">
                <label class="form-label">Notification Message for Debtor</label>
                <textarea class="form-control" rows="3" [value]="liquidationMessage()" (input)="liquidationMessage.set($any($event.target).value)" placeholder="Message to send to debtor"></textarea>
                <div class="text-muted text-sm mt-1">Debtor will receive this message along with the due date.</div>
              </div>
            </ng-container>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" type="button" (click)="closeActionDialog()">Cancel</button>
            <button class="btn btn-primary" type="button" (click)="confirmAction()">{{ actionCta(action) }}</button>
          </div>
        </div>
      </div>
    </ng-container>
  `,
  styles: [`
    .invoice-paper {
      background:#fff;
      color:#0f172a;
      border:1px solid #d4dbe5;
      border-radius:10px;
      padding:40px;
      max-width:980px;
      margin:0 auto;
    }
    .invoice-title-box { width:220px; margin:0 auto; padding:12px 18px; border:2px solid var(--brand); text-align:center; font-size:22px; font-weight:800; color:var(--brand); text-transform:uppercase; letter-spacing:.08em; }
    .invoice-grid { display:grid; grid-template-columns:1fr 1fr; gap:32px; }
    .meta-grid { display:grid; grid-template-columns:repeat(4, 1fr); gap:16px; }
    .meta-span { grid-column:span 2; }
    .block-label, .section-title { font-size:11px; text-transform:uppercase; letter-spacing:.06em; color:#475569; font-weight:700; }
    .invoice-table-wrap { overflow-x: auto; }
    .invoice-table { width:100%; border-collapse:collapse; }
    .invoice-table th { background:var(--brand); color:#fff; padding:10px 12px; font-size:12px; text-align:left; }
    .invoice-table th.text-right, .invoice-table td.text-right { text-align:right; }
    .invoice-table td { padding:10px 12px; border-bottom:1px solid #d4dbe5; color:#0f172a; }
    .invoice-table .total-row td { background:#f6f8fb; border-top:2px solid var(--brand); }
    .words-row { background:#f6f8fb; border:1px solid #d4dbe5; border-radius:8px; padding:14px 16px; }
    .timeline { border-top:1px solid #d4dbe5; padding-top:24px; }
    .timeline-row { display:flex; gap:12px; align-items:flex-start; padding:10px 0; }
    .timeline-bullet { width:12px; height:12px; border-radius:50%; background:#D1D5DB; margin-top:5px; }
    .timeline-bullet.active { background:var(--accent); }
    .invoice-footer { text-align:center; font-size:12px; color:#64748b; border-top:1px solid #d4dbe5; padding-top:20px; }
    @media (max-width: 900px) {
      .invoice-paper { padding:24px; }
      .invoice-grid, .meta-grid { grid-template-columns:1fr; }
      .meta-span { grid-column:auto; }
      .invoice-table { min-width: 700px; }
    }
    @media print {
      .page-header { display: none !important; }
      .invoice-paper {
        width: 190mm;
        max-width: 190mm;
        min-height: 267mm;
        margin: 0;
        border: none;
        border-radius: 0;
        padding: 8mm 6mm;
        color: #000;
      }
      .invoice-table,
      .invoice-grid,
      .meta-grid,
      .words-row,
      .timeline,
      .invoice-footer,
      .info-box {
        break-inside: avoid;
        page-break-inside: avoid;
      }
    }
  `],
})
export class InvoiceDetailComponent implements OnInit {
  private readonly svc = inject(InvoiceDataService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private shouldAutoPrint = false;
  private hasTriggeredAutoPrint = false;

  invoice = signal<Invoice | null>(null);
  pendingAction = signal<'send' | 'liquidate' | 'settle' | null>(null);
  liquidationAmount = signal<number>(0);
  liquidationMessage = signal<string>('');
  invoiceCompanyPhone = computed(() => this.invoice()?.supplierName ? '+94 11 234 5678' : '—');
  timeline = computed(() => {
    const invoice = this.invoice();
    if (!invoice) return [] as Array<{ label: string; date?: string }>;
    return [
      { label: 'Draft Created', date: invoice.createdAt },
      { label: 'Sent to Customer', date: invoice.sentAt },
      { label: 'Viewed by Debtor', date: invoice.viewedAt },
      { label: invoice.status === 'Rejected' ? 'Rejected' : 'Accepted / Verified', date: invoice.status === 'Rejected' ? invoice.rejectedAt : invoice.acceptedAt },
      { label: 'Settled', date: invoice.settledAt },
    ];
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.shouldAutoPrint = this.route.snapshot.queryParamMap.get('print') === '1';
    if (!id) return;
    this.loadInvoice(id, true);
  }

  canLiquidate(): boolean {
    const invoice = this.invoice();
    return !!invoice && invoice.isVerified && invoice.status !== 'Settled';
  }

  canSettle(): boolean {
    const invoice = this.invoice();
    return !!invoice && !['Draft', 'Rejected', 'Settled'].includes(invoice.status);
  }

  requestAction(action: 'send' | 'liquidate' | 'settle'): void {
    const invoice = this.invoice();
    if (action === 'liquidate' && invoice) {
      this.liquidationAmount.set(invoice.grossAmount); // Default to full amount
      this.liquidationMessage.set(`Your payment for invoice ${invoice.serialNumber} has been processed through CIXOR PayDay. Due date: ${invoice.dueDate}. Please contact us if you have any questions.`);
    }
    this.pendingAction.set(action);
  }

  closeActionDialog(): void {
    this.pendingAction.set(null);
  }

  actionTitle(action: 'send' | 'liquidate' | 'settle'): string {
    return action === 'send' ? 'Send Invoice' : action === 'liquidate' ? 'Confirm Liquidity' : 'Mark Invoice as Settled';
  }

  actionCta(action: 'send' | 'liquidate' | 'settle'): string {
    return action === 'send' ? 'Send Invoice' : action === 'liquidate' ? 'Confirm Liquidity' : 'Mark as Settled';
  }

  actionMessage(action: 'send' | 'liquidate' | 'settle'): string {
    const serial = this.invoice()?.serialNumber || 'this invoice';
    if (action === 'send') return `Send ${serial} to the debtor officer for OTP acceptance?`;
    if (action === 'liquidate') return `Confirm liquidity for ${serial}. This settles the invoice through CIXOR PayDay and applies the liquidity fee.`;
    return `Mark ${serial} as settled. This should only be done after settlement is confirmed.`;
  }

  confirmAction(): void {
    const action = this.pendingAction();
    if (!action) return;
    this.pendingAction.set(null);
    if (action === 'send') this.sendInvoice();
    if (action === 'liquidate') this.confirmLiquidity();
    if (action === 'settle') this.markSettled();
  }

  private sendInvoice(): void {
    const invoice = this.invoice();
    if (!invoice) return;
    this.svc.sendInvoice(invoice.id).subscribe(updated => {
      this.invoice.set(updated);
      this.toast.success(`Invoice ${updated.serialNumber} sent successfully.`);
    });
  }

  private markSettled(): void {
    const invoice = this.invoice();
    if (!invoice) return;
    this.svc.markInvoiceSettled(invoice.id).subscribe(updated => {
      this.invoice.set(updated);
      this.toast.success(`Invoice ${updated.serialNumber} marked as settled.`);
    });
  }

  private confirmLiquidity(): void {
    const invoice = this.invoice();
    if (!invoice) return;
    
    const amount = this.liquidationAmount();
    const message = this.liquidationMessage().trim();
    
    // Validate amount
    if (amount <= 0 || amount > invoice.grossAmount) {
      this.toast.error(`Liquidation amount must be between 1 and ${invoice.grossAmount.toLocaleString('en-LK')}`);
      return;
    }
    
    this.svc.confirmLiquidity(invoice.id, amount, message).subscribe(updated => {
      this.invoice.set(updated);
      this.pendingAction.set(null);
      this.toast.success(`Liquidity confirmed for ${updated.serialNumber}. Debtor will be notified.`);
    });
  }

  downloadPdf(): void {
    window.print();
  }

  private triggerAutoPrintIfNeeded(): void {
    if (!this.shouldAutoPrint || this.hasTriggeredAutoPrint) return;
    this.hasTriggeredAutoPrint = true;
    setTimeout(() => window.print(), 150);
  }

  private loadInvoice(id: string, markViewed: boolean): void {
    this.svc.getInvoice(id).subscribe(invoice => {
      if (!invoice) return;
      if (markViewed && invoice.status === 'Sent') {
        this.svc.markInvoiceViewed(id).subscribe(updated => {
          this.invoice.set(updated);
          this.triggerAutoPrintIfNeeded();
        });
        return;
      }
      this.invoice.set(invoice);
      this.triggerAutoPrintIfNeeded();
    });
  }
}
