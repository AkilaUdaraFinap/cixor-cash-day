import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CompanyConfig, PaymentTerm } from '../../shared/models/models';
import { MockDataService } from '../../core/services/mock-data.service';
import { ToastService } from '../../core/services/toast.service';
import { LkrPipe } from '../../shared/pipes/lkr.pipe';
import { ThemeMode, ThemePalette, ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, LkrPipe],
  template: `
    <div class="page-header mb-6">
      <h2>Company Settings</h2>
      <div class="text-muted text-sm mt-1">Manage company profile, tax configuration, starting balance, and payment term templates.</div>
    </div>

    <div class="tabs mb-0 border-bottom" style="border-bottom:2px solid var(--border); margin-bottom:0">
      <button class="tab-item" [class.active]="tab() === 0" (click)="tab.set(0)">Company Profile</button>
      <button class="tab-item" [class.active]="tab() === 1" (click)="tab.set(1)">Tax & Invoice Config</button>
      <button class="tab-item" [class.active]="tab() === 2" (click)="tab.set(2)">Bank Balance</button>
      <button class="tab-item" [class.active]="tab() === 3" (click)="tab.set(3)">Payment Terms</button>
      <button class="tab-item" [class.active]="tab() === 4" (click)="tab.set(4)">Appearance</button>
    </div>

    <div *ngIf="tab() === 0 && cfg() as company" class="card mt-4 settings-card">
      <h3 class="section-title">Company Profile</h3>
      <div class="info-box danger text-sm mb-4" *ngIf="companyProfileIssues().length">
        {{ companyProfileIssues()[0] }}
      </div>
      <div class="grid-2 gap-4">
        <div class="form-group mb-0 col-span-2">
          <label class="form-label">Legal Company Name <span class="required">*</span></label>
          <input class="form-control" [class.error]="companyProfileFieldError('companyName')" [(ngModel)]="company.companyName"/>
          <div class="form-error" *ngIf="companyProfileFieldError('companyName')">{{ companyProfileFieldError('companyName') }}</div>
        </div>
        <div class="form-group mb-0">
          <label class="form-label">Taxpayer Identification Number (TIN) <span class="required">*</span></label>
          <input class="form-control" [class.error]="companyProfileFieldError('tin')" [(ngModel)]="company.tin"/>
          <div class="form-error" *ngIf="companyProfileFieldError('tin')">{{ companyProfileFieldError('tin') }}</div>
        </div>
        <div class="form-group mb-0">
          <label class="form-label">Business Registration Number</label>
          <input class="form-control" [(ngModel)]="company.brn"/>
        </div>
        <div class="form-group mb-0 col-span-2">
          <label class="form-label">Registered Address</label>
          <textarea class="form-control" rows="3" [(ngModel)]="company.address"></textarea>
        </div>
        <div class="form-group mb-0">
          <label class="form-label">Telephone Number</label>
          <input class="form-control" [class.error]="companyProfileFieldError('phone')" [(ngModel)]="company.phone"/>
          <div class="form-error" *ngIf="companyProfileFieldError('phone')">{{ companyProfileFieldError('phone') }}</div>
        </div>
        <div class="form-group mb-0">
          <label class="form-label">Email Domain</label>
          <input class="form-control" [class.error]="companyProfileFieldError('emailDomain')" [(ngModel)]="company.emailDomain" placeholder="company.lk"/>
          <div class="form-error" *ngIf="companyProfileFieldError('emailDomain')">{{ companyProfileFieldError('emailDomain') }}</div>
        </div>
      </div>
      <button class="btn btn-primary mt-4" type="button" [disabled]="companyProfileIssues().length > 0" (click)="saveConfig()">Save</button>
    </div>

    <div *ngIf="tab() === 1 && cfg() as company" class="card mt-4 settings-card">
      <h3 class="section-title">Tax & Invoice Config</h3>
      <div class="info-box danger text-sm mb-4" *ngIf="taxConfigIssues().length">
        {{ taxConfigIssues()[0] }}
      </div>
      <div class="grid-2 gap-4">
        <div class="form-group mb-0">
          <label class="form-label">Tax Regime Label</label>
          <select class="form-control" [(ngModel)]="company.taxRegimeLabel">
            <option>VAT</option>
            <option>GST</option>
            <option>Other</option>
          </select>
        </div>
        <div class="form-group mb-0">
          <label class="form-label">Tax Rate (%)</label>
          <input class="form-control" [class.error]="taxConfigFieldError('vatRate')" type="number" [(ngModel)]="company.vatRate" min="0" max="100"/>
          <div class="form-error" *ngIf="taxConfigFieldError('vatRate')">{{ taxConfigFieldError('vatRate') }}</div>
        </div>
        <div class="form-group mb-0">
          <label class="form-label">Invoice Branch / Unit Code (QQQQ)</label>
          <input class="form-control" [class.error]="taxConfigFieldError('branchCode')" maxlength="4" [ngModel]="company.branchCode" (ngModelChange)="company.branchCode = normalizeBranchCode($event)" placeholder="HQ01"/>
          <div class="form-hint">This appears inside the serial number, for example HQ01 or BR03.</div>
          <div class="form-error" *ngIf="taxConfigFieldError('branchCode')">{{ taxConfigFieldError('branchCode') }}</div>
        </div>
        <div class="form-group mb-0">
          <label class="form-label">Country of Operation</label>
          <select class="form-control" [(ngModel)]="company.country">
            <option>Sri Lanka</option>
            <option>Other</option>
          </select>
        </div>
      </div>
      <div class="info-box mt-4">
        <div class="font-medium">Invoice Preview</div>
        <div class="text-sm mt-1">Your invoice numbers will look like: {{ previewSerial() }}</div>
      </div>
      <button class="btn btn-primary mt-4" type="button" [disabled]="taxConfigIssues().length > 0" (click)="saveConfig()">Save</button>
    </div>

    <div *ngIf="tab() === 2" class="card mt-4 settings-card">
      <h3 class="section-title">Bank Balance</h3>
      <div class="info-box danger text-sm mb-4" *ngIf="balanceIssues().length">
        {{ balanceIssues()[0] }}
      </div>
      <div class="info-box info text-sm mb-4">
        Enter your current bank balance. This is the starting point for all cash projections.
      </div>
      <div class="grid-2 gap-4">
        <div class="form-group mb-0">
          <label class="form-label">Bank Name</label>
          <input class="form-control" [class.error]="balanceFieldError('bank')" [(ngModel)]="balanceEntry.bank"/>
          <div class="form-error" *ngIf="balanceFieldError('bank')">{{ balanceFieldError('bank') }}</div>
        </div>
        <div class="form-group mb-0">
          <label class="form-label">Account No.</label>
          <input class="form-control" [class.error]="balanceFieldError('account')" [(ngModel)]="balanceEntry.account"/>
          <div class="form-error" *ngIf="balanceFieldError('account')">{{ balanceFieldError('account') }}</div>
        </div>
        <div class="form-group mb-0">
          <label class="form-label">Current Bank Balance (LKR) <span class="required">*</span></label>
          <input class="form-control" [class.error]="balanceFieldError('balance')" type="number" [(ngModel)]="balanceEntry.balance"/>
          <div class="form-error" *ngIf="balanceFieldError('balance')">{{ balanceFieldError('balance') }}</div>
        </div>
        <div class="form-group mb-0">
          <label class="form-label">As of Date</label>
          <input class="form-control" [class.error]="balanceFieldError('date')" type="date" [(ngModel)]="balanceEntry.date"/>
          <div class="form-error" *ngIf="balanceFieldError('date')">{{ balanceFieldError('date') }}</div>
        </div>
      </div>
      <button class="btn btn-primary mt-4" type="button" [disabled]="balanceIssues().length > 0" (click)="saveBalance()">Update Balance</button>
      <div class="info-box warn text-sm mt-4">Update your balance regularly for accurate projections. CashDay does not connect to your bank automatically.</div>

      <div class="desktop-table-only mt-4">
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr><th>Date</th><th>Bank</th><th>Account</th><th class="text-right">Balance (LKR)</th></tr></thead>
            <tbody>
              <tr *ngFor="let item of pagedBalanceHistory()">
                <td>{{ item.date }}</td>
                <td>{{ item.bank }}</td>
                <td>{{ item.account }}</td>
                <td class="text-right lkr-mono">{{ item.balance | lkr }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="mobile-cards-only mt-4" *ngIf="balanceHistory().length">
        <div class="mobile-data-list">
          <div class="mobile-data-card" *ngFor="let item of pagedBalanceHistory()">
            <div class="mobile-data-card-header">
              <div class="mobile-data-card-title">{{ item.bank }}</div>
              <div class="mobile-data-value lkr-mono">{{ item.balance | lkr }}</div>
            </div>
            <div class="mobile-data-grid">
              <div class="mobile-data-row"><span class="mobile-data-label">Date</span><span class="mobile-data-value">{{ item.date }}</span></div>
              <div class="mobile-data-row"><span class="mobile-data-label">Account</span><span class="mobile-data-value">{{ item.account }}</span></div>
            </div>
          </div>
        </div>
      </div>

      <div class="pagination-bar" *ngIf="balanceHistory().length > 0 && balanceTotalPages() > 1">
        <div class="pagination-info">Showing {{ balancePageStart() }}-{{ balancePageEnd() }} of {{ balanceHistory().length }}</div>
        <div class="pagination-controls">
          <button class="btn btn-secondary btn-sm" type="button" [disabled]="balanceCurrentPage() === 1" (click)="setBalancePage(balanceCurrentPage() - 1)">Previous</button>
          <span class="pagination-page">Page {{ balanceCurrentPage() }} / {{ balanceTotalPages() }}</span>
          <button class="btn btn-secondary btn-sm" type="button" [disabled]="balanceCurrentPage() === balanceTotalPages()" (click)="setBalancePage(balanceCurrentPage() + 1)">Next</button>
        </div>
      </div>
    </div>

    <div *ngIf="tab() === 3" class="card mt-4 settings-card">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h3 class="section-title" style="margin:0">Payment Terms</h3>
          <div class="text-muted text-sm mt-1">Define standard payment term templates to use on invoices.</div>
        </div>
        <button class="btn btn-secondary btn-sm" type="button" (click)="addTerm()">+ Add Term</button>
      </div>
      <div class="info-box danger text-sm mb-4" *ngIf="paymentTermsIssues().length">
        {{ paymentTermsIssues()[0] }}
      </div>
      <div class="desktop-table-only">
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr><th>Term Name</th><th>Days</th><th>Default</th><th>Actions</th></tr></thead>
            <tbody>
              <tr *ngFor="let term of pagedPaymentTerms(); let index = index">
                <td>
                  <input class="form-control form-control-sm" [class.error]="paymentTermFieldError(term, 'label')" [(ngModel)]="term.label"/>
                  <div class="form-error" *ngIf="paymentTermFieldError(term, 'label')">{{ paymentTermFieldError(term, 'label') }}</div>
                </td>
                <td>
                  <input class="form-control form-control-sm" [class.error]="paymentTermFieldError(term, 'days')" type="number" min="0" max="365" [(ngModel)]="term.days" style="width:90px"/>
                  <div class="form-error" *ngIf="paymentTermFieldError(term, 'days')">{{ paymentTermFieldError(term, 'days') }}</div>
                </td>
                <td class="text-center"><input type="radio" name="defaultTerm" [value]="term.id" [(ngModel)]="defaultTermId"/></td>
                <td><button class="btn btn-ghost btn-sm text-red" type="button" (click)="removeTerm(paymentTermsPageStartIndex() + index)">Delete</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="mobile-cards-only">
        <div class="mobile-data-list">
          <div class="mobile-data-card" *ngFor="let term of pagedPaymentTerms(); let index = index">
            <div class="mobile-data-card-header">
              <div class="mobile-data-card-title">Payment Term {{ paymentTermsPageStartIndex() + index + 1 }}</div>
              <label class="text-sm flex items-center gap-2">
                <input type="radio" name="defaultTerm" [value]="term.id" [(ngModel)]="defaultTermId"/>
                <span class="text-muted">Default</span>
              </label>
            </div>
            <div class="grid-2 gap-3">
              <div>
                <label class="form-label">Term Name</label>
                <input class="form-control form-control-sm" [class.error]="paymentTermFieldError(term, 'label')" [(ngModel)]="term.label"/>
                <div class="form-error" *ngIf="paymentTermFieldError(term, 'label')">{{ paymentTermFieldError(term, 'label') }}</div>
              </div>
              <div>
                <label class="form-label">Days</label>
                <input class="form-control form-control-sm" [class.error]="paymentTermFieldError(term, 'days')" type="number" min="0" max="365" [(ngModel)]="term.days"/>
                <div class="form-error" *ngIf="paymentTermFieldError(term, 'days')">{{ paymentTermFieldError(term, 'days') }}</div>
              </div>
            </div>
            <div class="mobile-data-actions">
              <button class="btn btn-ghost btn-sm text-red" type="button" (click)="removeTerm(paymentTermsPageStartIndex() + index)">Delete</button>
            </div>
          </div>
        </div>
      </div>

      <div class="pagination-bar" *ngIf="paymentTerms().length > 0 && paymentTermsTotalPages() > 1">
        <div class="pagination-info">Showing {{ paymentTermsPageStart() }}-{{ paymentTermsPageEnd() }} of {{ paymentTerms().length }}</div>
        <div class="pagination-controls">
          <button class="btn btn-secondary btn-sm" type="button" [disabled]="paymentTermsCurrentPage() === 1" (click)="setPaymentTermsPage(paymentTermsCurrentPage() - 1)">Previous</button>
          <span class="pagination-page">Page {{ paymentTermsCurrentPage() }} / {{ paymentTermsTotalPages() }}</span>
          <button class="btn btn-secondary btn-sm" type="button" [disabled]="paymentTermsCurrentPage() === paymentTermsTotalPages()" (click)="setPaymentTermsPage(paymentTermsCurrentPage() + 1)">Next</button>
        </div>
      </div>
      <button class="btn btn-primary mt-4" type="button" [disabled]="paymentTermsIssues().length > 0" (click)="saveTerms()">Save</button>
    </div>

    <div *ngIf="tab() === 4" class="card mt-4 settings-card">
      <h3 class="section-title">Appearance</h3>
      <div class="info-box info text-sm mb-4">
        Choose your brand palette and contrast polarity. Light mode remains the recommended default for everyday readability.
      </div>

      <div class="theme-grid">
        <button class="palette-card" [class.active]="activePalette() === 'finap-emerald'" type="button" (click)="setPalette('finap-emerald')">
          <div class="palette-name">FINAP Emerald</div>
          <div class="palette-meta">FIN #1FAD4E · AP #000000</div>
          <div class="swatch-row">
            <span class="swatch" style="background:#1FAD4E"></span>
            <span class="swatch" style="background:#545353"></span>
            <span class="swatch" style="background:#41A5DA"></span>
            <span class="swatch" style="background:#E8252A"></span>
          </div>
        </button>

        <button class="palette-card" [class.active]="activePalette() === 'finap-royal'" type="button" (click)="setPalette('finap-royal')">
          <div class="palette-name">FINAP Royal</div>
          <div class="palette-meta">FIN #023260 · AP #E8B547</div>
          <div class="swatch-row">
            <span class="swatch" style="background:#023260"></span>
            <span class="swatch" style="background:#E8B547"></span>
            <span class="swatch" style="background:#0DB4D7"></span>
          </div>
        </button>

        <button class="palette-card" [class.active]="activePalette() === 'cashday-logo'" type="button" (click)="setPalette('cashday-logo')">
          <div class="palette-name">CashDay Signature</div>
          <div class="palette-meta">Purple #3B1E72 · Gold #E9C46A</div>
          <div class="swatch-row">
            <span class="swatch" style="background:#3B1E72"></span>
            <span class="swatch" style="background:#5A2DA8"></span>
            <span class="swatch" style="background:#E9C46A"></span>
          </div>
        </button>
      </div>

      <div class="mode-switch mt-4">
        <button class="mode-pill" [class.active]="activeMode() === 'light'" type="button" (click)="setMode('light')">Light mode</button>
        <button class="mode-pill" [class.active]="activeMode() === 'dark'" type="button" (click)="setMode('dark')">Dark mode</button>
      </div>
    </div>
  `,
  styles: [`
    .settings-card { max-width: 760px; }
    .section-title { font-size:12px; font-weight:700; color:var(--text-secondary); text-transform:uppercase; letter-spacing:.06em; margin-bottom:12px; }
    .col-span-2 { grid-column:1 / -1; }
    .theme-grid { display:grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap:12px; }
    .palette-card {
      text-align:left; border:1px solid var(--border); background:var(--surface); border-radius:12px;
      padding:14px; cursor:pointer; transition:all .15s ease;
    }
    .palette-card.active { border-color: var(--accent); box-shadow: 0 0 0 2px rgba(37,99,235,.15); transform: translateY(-1px); }
    .palette-name { font-size:14px; font-weight:700; color:var(--text); }
    .palette-meta { font-size:12px; color:var(--text-secondary); margin-top:2px; }
    .swatch-row { display:flex; gap:6px; margin-top:10px; }
    .swatch { width:16px; height:16px; border-radius:50%; display:inline-flex; }
    .mode-switch { display:grid; grid-template-columns: 1fr 1fr; gap:8px; }
    .mode-pill {
      border:1px solid var(--border); background:var(--surface); color:var(--text);
      border-radius:8px; padding:10px 12px; font-size:13px; cursor:pointer;
    }
    .mode-pill.active { border-color: var(--accent); background: var(--accent-light); color: var(--accent); }
    @media (max-width: 768px) {
      .settings-card { max-width: 100%; }
      .tabs { margin-bottom: 0; }
      .tab-item { padding: 10px 12px; }
      .mode-switch { grid-template-columns: 1fr; }
      .table-wrap .form-control { min-width: 120px; }
      .theme-grid { grid-template-columns: 1fr; }
    }
    @media (min-width: 769px) and (max-width: 1120px) {
      .theme-grid { grid-template-columns: 1fr 1fr; }
    }
  `],
})
export class SettingsComponent implements OnInit {
  private readonly svc = inject(MockDataService);
  private readonly toast = inject(ToastService);
  private readonly theme = inject(ThemeService);

  tab = signal(0);
  cfg = signal<CompanyConfig | null>(null);
  paymentTerms = signal<PaymentTerm[]>([]);
  balanceHistory = signal<Array<{ date: string; bank: string; account: string; balance: number }>>([]);
  readonly listPageSize = 6;
  balancePage = signal(1);
  paymentTermsPage = signal(1);
  defaultTermId = '';
  balanceEntry = { bank: 'Commercial Bank', account: '8001234567', balance: 0, date: new Date().toISOString().split('T')[0] };

  ngOnInit(): void {
    this.svc.getCompanyConfig().subscribe(config => this.cfg.set(config));
    this.svc.getPaymentTerms().subscribe(terms => {
      this.paymentTerms.set(terms);
      this.paymentTermsPage.set(1);
      this.defaultTermId = terms.find(term => term.isDefault)?.id || terms[0]?.id || '';
    });
    this.svc.getBankBalanceHistory().subscribe(history => {
      this.balanceHistory.set(history);
      this.balancePage.set(1);
    });
  }

  balanceTotalPages(): number {
    return Math.max(1, Math.ceil(this.balanceHistory().length / this.listPageSize));
  }

  balanceCurrentPage(): number {
    return Math.min(this.balancePage(), this.balanceTotalPages());
  }

  pagedBalanceHistory() {
    const start = (this.balanceCurrentPage() - 1) * this.listPageSize;
    return this.balanceHistory().slice(start, start + this.listPageSize);
  }

  setBalancePage(nextPage: number): void {
    this.balancePage.set(Math.min(Math.max(1, nextPage), this.balanceTotalPages()));
  }

  balancePageStart(): number {
    return (this.balanceCurrentPage() - 1) * this.listPageSize + 1;
  }

  balancePageEnd(): number {
    return Math.min(this.balanceCurrentPage() * this.listPageSize, this.balanceHistory().length);
  }

  paymentTermsTotalPages(): number {
    return Math.max(1, Math.ceil(this.paymentTerms().length / this.listPageSize));
  }

  paymentTermsCurrentPage(): number {
    return Math.min(this.paymentTermsPage(), this.paymentTermsTotalPages());
  }

  pagedPaymentTerms(): PaymentTerm[] {
    const start = (this.paymentTermsCurrentPage() - 1) * this.listPageSize;
    return this.paymentTerms().slice(start, start + this.listPageSize);
  }

  setPaymentTermsPage(nextPage: number): void {
    this.paymentTermsPage.set(Math.min(Math.max(1, nextPage), this.paymentTermsTotalPages()));
  }

  paymentTermsPageStartIndex(): number {
    return (this.paymentTermsCurrentPage() - 1) * this.listPageSize;
  }

  paymentTermsPageStart(): number {
    return this.paymentTermsPageStartIndex() + 1;
  }

  paymentTermsPageEnd(): number {
    return Math.min(this.paymentTermsCurrentPage() * this.listPageSize, this.paymentTerms().length);
  }

  previewSerial(): string {
    const config = this.cfg();
    if (!config) return '';
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mmm = now.toLocaleString('en-US', { month: 'short' }).toUpperCase();
    return `${yy}${mmm}_${config.branchCode}_${String(config.invoiceCounter).padStart(5, '0')}`;
  }

  normalizeBranchCode(value: string): string {
    return (value || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 4);
  }

  companyProfileIssues(): string[] {
    const config = this.cfg();
    if (!config) return ['Company settings are still loading.'];
    const issues: string[] = [];
    if (!config.companyName?.trim()) issues.push('Legal company name is required.');
    if (!this.isTinValid(config.tin)) issues.push('Enter a valid TIN using 9 to 15 letters or numbers.');
    if (config.phone?.trim() && !this.isPhoneValid(config.phone)) issues.push('Enter a valid telephone number.');
    if (config.emailDomain?.trim() && !this.isDomainValid(config.emailDomain)) issues.push('Enter a valid email domain such as company.lk.');
    return issues;
  }

  companyProfileFieldError(field: 'companyName' | 'tin' | 'phone' | 'emailDomain'): string {
    const config = this.cfg();
    if (!config) return '';
    if (field === 'companyName' && !config.companyName?.trim()) return 'Legal company name is required.';
    if (field === 'tin' && !this.isTinValid(config.tin)) return 'Enter 9 to 15 letters or numbers.';
    if (field === 'phone' && config.phone?.trim() && !this.isPhoneValid(config.phone)) return 'Use digits, spaces, +, hyphen, or parentheses only.';
    if (field === 'emailDomain' && config.emailDomain?.trim() && !this.isDomainValid(config.emailDomain)) return 'Enter a valid domain like company.lk.';
    return '';
  }

  taxConfigIssues(): string[] {
    const config = this.cfg();
    if (!config) return ['Tax settings are still loading.'];
    const issues: string[] = [];
    if (!this.normalizeBranchCode(config.branchCode)) issues.push('Branch code is required.');
    else if (!/^[A-Z0-9]{1,4}$/.test(this.normalizeBranchCode(config.branchCode))) issues.push('Branch code must be 1 to 4 uppercase letters or numbers.');
    const vatRate = Number(config.vatRate);
    if (!Number.isFinite(vatRate) || vatRate < 0 || vatRate > 100) issues.push('Tax rate must be between 0 and 100.');
    return issues;
  }

  taxConfigFieldError(field: 'branchCode' | 'vatRate'): string {
    const config = this.cfg();
    if (!config) return '';
    if (field === 'branchCode') {
      if (!this.normalizeBranchCode(config.branchCode)) return 'Branch code is required.';
      if (!/^[A-Z0-9]{1,4}$/.test(this.normalizeBranchCode(config.branchCode))) return 'Use 1 to 4 letters or numbers.';
    }
    if (field === 'vatRate') {
      const vatRate = Number(config.vatRate);
      if (!Number.isFinite(vatRate) || vatRate < 0 || vatRate > 100) return 'Tax rate must be between 0 and 100.';
    }
    return '';
  }

  balanceIssues(): string[] {
    const issues: string[] = [];
    if (!this.balanceEntry.bank?.trim()) issues.push('Bank name is required.');
    if (!this.balanceEntry.account?.trim()) issues.push('Account number is required.');
    const balance = Number(this.balanceEntry.balance);
    if (!Number.isFinite(balance) || balance < 0) issues.push('Current bank balance must be zero or greater.');
    if (!this.balanceEntry.date || Number.isNaN(new Date(`${this.balanceEntry.date}T00:00:00`).getTime())) issues.push('Select a valid balance date.');
    return issues;
  }

  balanceFieldError(field: 'bank' | 'account' | 'balance' | 'date'): string {
    if (field === 'bank' && !this.balanceEntry.bank?.trim()) return 'Bank name is required.';
    if (field === 'account' && !this.balanceEntry.account?.trim()) return 'Account number is required.';
    if (field === 'balance') {
      const balance = Number(this.balanceEntry.balance);
      if (!Number.isFinite(balance) || balance < 0) return 'Enter a non-negative amount.';
    }
    if (field === 'date' && (!this.balanceEntry.date || Number.isNaN(new Date(`${this.balanceEntry.date}T00:00:00`).getTime()))) return 'Select a valid date.';
    return '';
  }

  paymentTermsIssues(): string[] {
    const terms = this.paymentTerms();
    const issues: string[] = [];
    if (!terms.length) issues.push('Add at least one payment term.');
    if (terms.some(term => !term.label?.trim())) issues.push('Every payment term needs a name.');
    if (terms.some(term => !Number.isInteger(Number(term.days)) || Number(term.days) < 0 || Number(term.days) > 365)) issues.push('Payment term days must be whole numbers between 0 and 365.');
    const labels = terms.map(term => term.label.trim().toLowerCase()).filter(Boolean);
    if (new Set(labels).size !== labels.length) issues.push('Payment term names must be unique.');
    if (terms.length && !this.defaultTermId) issues.push('Select a default payment term.');
    return issues;
  }

  paymentTermFieldError(term: PaymentTerm, field: 'label' | 'days'): string {
    if (field === 'label' && !term.label?.trim()) return 'Required.';
    if (field === 'label') {
      const normalized = term.label.trim().toLowerCase();
      if (normalized && this.paymentTerms().filter(item => item.label.trim().toLowerCase() === normalized).length > 1) return 'Must be unique.';
    }
    if (field === 'days' && (!Number.isInteger(Number(term.days)) || Number(term.days) < 0 || Number(term.days) > 365)) return '0-365 only.';
    return '';
  }

  saveConfig(): void {
    const config = this.cfg();
    if (!config) return;
    const issues = [...this.companyProfileIssues(), ...this.taxConfigIssues()];
    if (issues.length) {
      this.toast.error(issues[0]);
      return;
    }
    const payload = {
      ...config,
      companyName: config.companyName.trim(),
      tin: config.tin.trim().toUpperCase(),
      brn: config.brn?.trim() || '',
      address: config.address?.trim() || '',
      phone: config.phone?.trim() || '',
      emailDomain: config.emailDomain?.trim().toLowerCase() || '',
      branchCode: this.normalizeBranchCode(config.branchCode),
      vatRate: Number(config.vatRate),
    };
    this.svc.saveCompanyConfig(payload).subscribe({
      next: saved => {
        this.cfg.set(saved);
        this.toast.success('Settings saved.');
      },
      error: error => this.toast.error(error?.message || 'Unable to save settings.'),
    });
  }

  saveBalance(): void {
    const issues = this.balanceIssues();
    if (issues.length) {
      this.toast.error(issues[0]);
      return;
    }
    const payload = {
      bank: this.balanceEntry.bank.trim(),
      account: this.balanceEntry.account.trim(),
      balance: Number(this.balanceEntry.balance),
      date: this.balanceEntry.date,
    };
    this.svc.saveBankBalance(payload).subscribe({
      next: () => {
        this.toast.success('Bank balance updated.');
        this.svc.getBankBalanceHistory().subscribe(history => this.balanceHistory.set(history));
      },
      error: error => this.toast.error(error?.message || 'Unable to update bank balance.'),
    });
  }

  addTerm(): void {
    this.paymentTerms.update(terms => [...terms, { id: Date.now().toString(), label: 'Net 45', days: 45 }]);
    this.paymentTermsPage.set(this.paymentTermsTotalPages());
  }

  removeTerm(index: number): void {
    const terms = this.paymentTerms();
    const term = terms[index];
    if (!term) return;
    if (!confirm(`Delete payment term "${term.label || 'Untitled'}"?`)) return;
    this.paymentTerms.update(current => {
      const updated = current.filter((_, termIndex) => termIndex !== index);
      if (updated.length && !updated.some(item => item.id === this.defaultTermId)) {
        this.defaultTermId = updated[0].id;
      }
      if (!updated.length) {
        this.defaultTermId = '';
      }
      const maxPage = Math.max(1, Math.ceil(updated.length / this.listPageSize));
      this.paymentTermsPage.set(Math.min(this.paymentTermsPage(), maxPage));
      return updated;
    });
  }

  saveTerms(): void {
    const issues = this.paymentTermsIssues();
    if (issues.length) {
      this.toast.error(issues[0]);
      return;
    }
    const terms = this.paymentTerms().map(term => ({ ...term, isDefault: term.id === this.defaultTermId }));
    this.svc.savePaymentTerms(terms).subscribe({
      next: saved => {
        this.paymentTerms.set(saved);
        this.paymentTermsPage.set(1);
        this.defaultTermId = saved.find(term => term.isDefault)?.id || '';
        this.toast.success('Payment terms saved.');
      },
      error: error => this.toast.error(error?.message || 'Unable to save payment terms.'),
    });
  }

  activePalette() {
    return this.theme.palette();
  }

  activeMode() {
    return this.theme.mode();
  }

  setPalette(palette: ThemePalette) {
    this.theme.setPalette(palette);
    this.toast.success('Palette updated.');
  }

  setMode(mode: ThemeMode) {
    this.theme.setMode(mode);
    this.toast.info(`${mode === 'dark' ? 'Dark' : 'Light'} mode enabled.`);
  }

  private isTinValid(value: string): boolean {
    return /^[A-Za-z0-9]{9,15}$/.test((value || '').trim());
  }

  private isPhoneValid(value: string): boolean {
    return /^[+()\d\s-]{7,20}$/.test((value || '').trim());
  }

  private isDomainValid(value: string): boolean {
    return /^(?=.{3,253}$)([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[A-Za-z]{2,}$/.test((value || '').trim());
  }
}
