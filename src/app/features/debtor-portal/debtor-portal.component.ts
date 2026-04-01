import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MockDataService } from '../../core/services/mock-data.service';
import { Invoice } from '../../shared/models/models';
import { LkrPipe } from '../../shared/pipes/lkr.pipe';
import { NumberToWordsPipe } from '../../shared/pipes/number-to-words.pipe';

type Step = 'request' | 'otp' | 'review' | 'confirm';
type Decision = 'Accepted' | 'Rejected' | null;

@Component({
  selector: 'app-debtor-portal',
  standalone: true,
  imports: [CommonModule, FormsModule, LkrPipe, NumberToWordsPipe],
  template: `
    <div class="portal-shell">
      <div class="portal-header">
        <div class="portal-brand">
          <span class="portal-brand-icon">C</span>
          <div>
            <div class="portal-brand-name">CashDay</div>
            <div class="portal-brand-sub">Invoice Acceptance Portal</div>
          </div>
        </div>
      </div>

      <div class="step-bar">
        <div class="step-item" [class.active]="stepIndex() === 0" [class.done]="stepIndex() > 0"><div class="step-circle">1</div><div class="step-label">Request</div></div>
        <div class="step-line" [class.done]="stepIndex() > 0"></div>
        <div class="step-item" [class.active]="stepIndex() === 1" [class.done]="stepIndex() > 1"><div class="step-circle">2</div><div class="step-label">Verify</div></div>
        <div class="step-line" [class.done]="stepIndex() > 1"></div>
        <div class="step-item" [class.active]="stepIndex() === 2" [class.done]="stepIndex() > 2"><div class="step-circle">3</div><div class="step-label">Review</div></div>
        <div class="step-line" [class.done]="stepIndex() > 2"></div>
        <div class="step-item" [class.active]="stepIndex() === 3"><div class="step-circle">4</div><div class="step-label">Confirm</div></div>
      </div>

      <div *ngIf="step() === 'request'" class="portal-card">
        <h2 class="portal-card-title">Invoice Acceptance Request</h2>
        <p class="portal-card-subtitle" *ngIf="invoice() as inv">
          {{ inv.supplierName }} has sent you an invoice for review.
        </p>
        <div class="summary-card" *ngIf="invoice() as inv">
          <div><span class="text-muted">Invoice No.</span><strong>{{ inv.serialNumber }}</strong></div>
          <div><span class="text-muted">Amount incl. VAT</span><strong>{{ inv.grossAmount | lkr }}</strong></div>
          <div><span class="text-muted">Due Date</span><strong>{{ inv.dueDate }}</strong></div>
        </div>
        <div class="info-box info text-sm mt-4">
          A one-time code will be sent to your registered email address.
        </div>
        <div class="form-error mt-3" *ngIf="rateLimitMessage()">{{ rateLimitMessage() }}</div>
        <button class="btn btn-primary btn-block mt-4" type="button" (click)="requestOtp()" [disabled]="!!rateLimitMessage()">
          Send me a verification code
        </button>
      </div>

      <div *ngIf="step() === 'otp'" class="portal-card">
        <h2 class="portal-card-title">Enter your verification code</h2>
        <p class="portal-card-subtitle">A 6-digit code was sent to {{ maskedDestination() }}.</p>
        <div class="otp-grid">
          <input *ngFor="let _ of otpBoxes; let index = index"
            class="otp-box"
            [id]="'otp-' + index"
            type="text"
            maxlength="1"
            inputmode="numeric"
            [(ngModel)]="otpDigits[index]"
            (input)="onOtpInput($event, index)"
            (keydown)="onOtpKeydown($event, index)"
            (paste)="onOtpPaste($event)"/>
        </div>
        <div class="text-muted text-sm mt-3">Code expires in {{ countdownLabel() }}</div>
        <div class="form-error mt-3" *ngIf="error()">{{ error() }}</div>
        <div class="countdown-row mt-4">
          <button class="btn btn-ghost btn-sm" type="button" (click)="requestOtp()" [disabled]="countdown() > 0 || !!rateLimitMessage()">Resend code</button>
        </div>
        <button class="btn btn-primary btn-block mt-4" type="button" (click)="verifyOtp()" [disabled]="otpValue().length < 6">Verify</button>
      </div>

      <div *ngIf="step() === 'review' && invoice() as inv" class="portal-card portal-card-wide">
        <h2 class="portal-card-title">Review Invoice</h2>
        <p class="portal-card-subtitle">Please review the invoice before accepting or rejecting it.</p>

        <div class="portal-metadata">
          <div><span class="text-muted">Supplier</span><div class="font-medium mt-1">{{ inv.supplierName }}</div></div>
          <div><span class="text-muted">Purchaser</span><div class="font-medium mt-1">{{ inv.customerName }}</div></div>
          <div><span class="text-muted">Invoice No.</span><div class="font-medium mt-1">{{ inv.serialNumber }}</div></div>
          <div><span class="text-muted">Invoice Date</span><div class="font-medium mt-1">{{ inv.invoiceDate }}</div></div>
          <div><span class="text-muted">Due Date</span><div class="font-medium mt-1">{{ inv.dueDate }}</div></div>
          <div><span class="text-muted">Place of Supply</span><div class="font-medium mt-1">{{ inv.placeOfSupply || '—' }}</div></div>
        </div>

        <table class="invoice-table-portal mt-4">
          <thead>
            <tr>
              <th>Reference</th>
              <th>Description</th>
              <th class="text-right">Quantity</th>
              <th class="text-right">Unit Price</th>
              <th class="text-right">Amount Excl. VAT</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let line of inv.lines">
              <td>{{ line.reference || '—' }}</td>
              <td>{{ line.description }}</td>
              <td class="text-right">{{ line.qty }}</td>
              <td class="text-right lkr-mono">{{ line.unitPrice | lkr }}</td>
              <td class="text-right lkr-mono">{{ (line.qty * line.unitPrice - (line.discount || 0)) | lkr }}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr><td colspan="4" class="text-right">Total Value of Supply</td><td class="text-right lkr-mono">{{ inv.netAmount | lkr }}</td></tr>
            <tr><td colspan="4" class="text-right">VAT Amount</td><td class="text-right lkr-mono">{{ inv.vatAmount | lkr }}</td></tr>
            <tr class="total-row"><td colspan="4" class="text-right font-bold">Total Amount including VAT</td><td class="text-right lkr-mono font-bold">{{ inv.grossAmount | lkr }}</td></tr>
          </tfoot>
        </table>

        <div class="words-box mt-4">{{ inv.grossAmount | numberToWords }}</div>

        <div class="consent-box mt-4">
          <div class="font-semibold mb-2">Before you accept</div>
          <div class="text-sm">
            By accepting this invoice, you acknowledge that:
          </div>
          <ul class="text-sm mt-2">
            <li>This invoice may be subject to liquidity arrangements via CIXOR CashDay.</li>
            <li>If a liquidity event occurs in the future, the settlement path may change and a liquidity event contract will be issued at that time.</li>
            <li>Your acceptance creates a legally binding acknowledgement of the debt described above.</li>
          </ul>
        </div>

        <label class="flex items-start gap-2 cursor-pointer text-sm mt-4">
          <input type="checkbox" [(ngModel)]="consented" style="margin-top:3px"/>
          <span>I have read and understood the above.</span>
        </label>

        <div class="portal-actions mt-4" *ngIf="!showRejectReason()">
          <button class="btn btn-danger" type="button" (click)="showRejectReason.set(true)">Reject Invoice</button>
          <button class="btn btn-success" type="button" [disabled]="!consented" (click)="accept()">Accept Invoice</button>
        </div>

        <div class="card mt-4" *ngIf="showRejectReason()">
          <div class="form-group mb-0">
            <label class="form-label">Please provide a reason for rejection <span class="required">*</span></label>
            <textarea class="form-control" rows="4" [(ngModel)]="rejectionReason" placeholder="Explain why this invoice cannot be accepted"></textarea>
          </div>
          <div class="flex gap-2 justify-end mt-4">
            <button class="btn btn-secondary" type="button" (click)="showRejectReason.set(false)">Cancel</button>
            <button class="btn btn-danger" type="button" [disabled]="!rejectionReason.trim()" (click)="reject()">Confirm Rejection</button>
          </div>
        </div>
      </div>

      <div *ngIf="step() === 'confirm'" class="portal-card">
        <div class="portal-confirm-icon">{{ decision() === 'Accepted' ? '✓' : '!' }}</div>
        <h2 class="portal-card-title">{{ decision() === 'Accepted' ? 'Invoice Accepted' : 'Invoice Rejected' }}</h2>
        <p class="portal-card-subtitle" *ngIf="invoice() as inv">
          <ng-container *ngIf="decision() === 'Accepted'">
            Your acceptance has been recorded. Reference: {{ inv.serialNumber }}.
          </ng-container>
          <ng-container *ngIf="decision() === 'Rejected'">
            Your rejection has been recorded and the supplier has been notified.
          </ng-container>
        </p>
        <div class="text-muted text-sm mt-4">You may now close this window.</div>
      </div>
    </div>
  `,
  styles: [`
    .portal-shell { min-height:100vh; background:linear-gradient(180deg, #F8FAFC 0%, #EEF6FF 100%); padding:0 16px 40px; }
    .portal-header { display:flex; justify-content:center; padding:24px 0; }
    .portal-brand { display:flex; align-items:center; gap:12px; color:var(--brand); }
    .portal-brand-icon { width:40px; height:40px; border-radius:10px; background:var(--brand); color:#fff; display:flex; align-items:center; justify-content:center; font-weight:800; }
    .portal-brand-name { font-size:20px; font-weight:700; }
    .portal-brand-sub { font-size:12px; color:var(--text-secondary); }
    .step-bar { max-width:760px; margin:0 auto 28px; display:flex; align-items:center; }
    .step-item { display:flex; flex-direction:column; align-items:center; gap:6px; }
    .step-circle { width:34px; height:34px; border-radius:50%; background:#E5E7EB; color:var(--text-secondary); display:flex; align-items:center; justify-content:center; font-weight:700; }
    .step-item.active .step-circle { background:var(--accent); color:#fff; }
    .step-item.done .step-circle { background:var(--green); color:#fff; }
    .step-label { font-size:12px; color:var(--text-secondary); }
    .step-line { flex:1; height:2px; background:#E5E7EB; margin:0 6px 18px; }
    .step-line.done { background:var(--green); }
    .portal-card { max-width:520px; margin:0 auto; background:#fff; border:1px solid var(--border); border-radius:14px; box-shadow:0 10px 30px rgba(15, 23, 42, .08); padding:32px; }
    .portal-card-wide { max-width:860px; }
    .portal-card-title { font-size:24px; color:var(--brand); margin:0 0 10px; }
    .portal-card-subtitle { color:var(--text-secondary); margin:0; line-height:1.6; }
    .summary-card { display:grid; gap:12px; background:var(--bg); border:1px solid var(--border); border-radius:10px; padding:18px; margin-top:20px; }
    .summary-card div { display:flex; justify-content:space-between; gap:12px; }
    .btn-block { width:100%; }
    .portal-metadata { display:grid; grid-template-columns:repeat(3, 1fr); gap:16px; }
    .invoice-table-portal { width:100%; border-collapse:collapse; }
    .invoice-table-portal th { background:var(--brand); color:#fff; padding:10px 12px; text-align:left; font-size:12px; }
    .invoice-table-portal td { padding:10px 12px; border-bottom:1px solid var(--border); }
    .invoice-table-portal th.text-right, .invoice-table-portal td.text-right { text-align:right; }
    .invoice-table-portal .total-row td { background:var(--bg); border-top:2px solid var(--brand); }
    .words-box { background:#F0FDF4; border:1px solid #86EFAC; color:#166534; border-radius:8px; padding:14px 16px; }
    .consent-box { background:#FFFBEB; border:1px solid #FCD34D; border-radius:10px; padding:16px; }
    .consent-box ul { padding-left:18px; margin:0; }
    .portal-actions { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
    .portal-confirm-icon { width:64px; height:64px; border-radius:50%; margin:0 auto 12px; display:flex; align-items:center; justify-content:center; font-size:28px; font-weight:800; background:var(--green-light); color:var(--green); }
    .otp-grid { display:flex; justify-content:center; gap:10px; margin-top:20px; }
    .otp-box { width:48px; height:56px; border-radius:8px; border:2px solid var(--border); text-align:center; font-size:24px; font-weight:700; }
    .countdown-row { display:flex; justify-content:center; }
    @media (max-width: 760px) {
      .portal-card { padding:24px; }
      .portal-metadata { grid-template-columns:1fr; }
      .portal-actions { grid-template-columns:1fr; }
      .step-label { display:none; }
    }
  `],
})
export class DebtorPortalComponent implements OnInit, OnDestroy {
  private readonly svc = inject(MockDataService);
  private readonly route = inject(ActivatedRoute);

  token = '';
  step = signal<Step>('request');
  invoice = signal<Invoice | null>(null);
  error = signal('');
  rateLimitMessage = signal('');
  maskedDestination = signal('your registered email');
  decision = signal<Decision>(null);
  showRejectReason = signal(false);
  consented = false;
  rejectionReason = '';
  countdown = signal(0);
  otpDigits = Array.from({ length: 6 }, () => '');
  otpBoxes = Array.from({ length: 6 }, (_, index) => index);
  private timer?: ReturnType<typeof setInterval>;

  stepIndex = computed(() => ({ request: 0, otp: 1, review: 2, confirm: 3 }[this.step()]));
  otpValue = computed(() => this.otpDigits.join(''));
  countdownLabel = computed(() => {
    const total = this.countdown();
    const minutes = Math.floor(total / 60).toString().padStart(2, '0');
    const seconds = String(total % 60).padStart(2, '0');
    return `${minutes}:${seconds}`;
  });

  ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get('token') || 'inv2';
    this.svc.resolvePortalToken(this.token).subscribe(invoice => {
      if (invoice) {
        this.invoice.set(invoice);
        return;
      }
      this.svc.getInvoices().subscribe(list => this.invoice.set(list.find(item => item.status === 'Sent') || list[0] || null));
    });
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  requestOtp(): void {
    const token = this.invoice()?.id || this.token;
    this.error.set('');
    this.rateLimitMessage.set('');
    this.svc.requestPortalOtp(token).subscribe(result => {
      if (!result.allowed) {
        const minutes = Math.ceil((result.retryAfterSeconds || 0) / 60);
        this.rateLimitMessage.set(`You have reached the maximum OTP requests. Please try again in ${minutes} minute(s).`);
        return;
      }
      this.maskedDestination.set(result.maskedDestination);
      this.step.set('otp');
      this.startCountdown(result.expiresInSeconds);
      this.otpDigits = Array.from({ length: 6 }, () => '');
    });
  }

  verifyOtp(): void {
    const token = this.invoice()?.id || this.token;
    this.svc.verifyPortalOtp(token, this.otpValue()).subscribe(result => {
      if (!result.valid) {
        this.error.set(result.message || 'Invalid or expired code. Please try again.');
        return;
      }
      this.error.set('');
      this.step.set('review');
    });
  }

  accept(): void {
    const invoice = this.invoice();
    if (!invoice || !this.consented) return;
    this.svc.submitPortalResponse(invoice.id, 'Accepted').subscribe(() => {
      this.decision.set('Accepted');
      this.step.set('confirm');
    });
  }

  reject(): void {
    const invoice = this.invoice();
    if (!invoice || !this.rejectionReason.trim()) return;
    this.svc.submitPortalResponse(invoice.id, 'Rejected', this.rejectionReason).subscribe(() => {
      this.decision.set('Rejected');
      this.step.set('confirm');
    });
  }

  onOtpInput(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.replace(/\D/g, '').slice(0, 1);
    this.otpDigits[index] = value;
    input.value = value;
    if (value && index < 5) {
      (document.getElementById(`otp-${index + 1}`) as HTMLInputElement | null)?.focus();
    }
  }

  onOtpKeydown(event: KeyboardEvent, index: number): void {
    if (event.key === 'Backspace' && !this.otpDigits[index] && index > 0) {
      (document.getElementById(`otp-${index - 1}`) as HTMLInputElement | null)?.focus();
    }
  }

  onOtpPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const digits = event.clipboardData?.getData('text').replace(/\D/g, '').slice(0, 6).split('') || [];
    this.otpDigits = Array.from({ length: 6 }, (_, index) => digits[index] || '');
  }

  private startCountdown(seconds: number): void {
    this.countdown.set(seconds);
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      this.countdown.update(value => Math.max(0, value - 1));
      if (this.countdown() === 0 && this.timer) {
        clearInterval(this.timer);
      }
    }, 1000);
  }
}
