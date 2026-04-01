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
      <div class="grid-2 gap-4">
        <div class="form-group mb-0 col-span-2">
          <label class="form-label">Legal Company Name <span class="required">*</span></label>
          <input class="form-control" [(ngModel)]="company.companyName"/>
        </div>
        <div class="form-group mb-0">
          <label class="form-label">Taxpayer Identification Number (TIN) <span class="required">*</span></label>
          <input class="form-control" [(ngModel)]="company.tin"/>
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
          <input class="form-control" [(ngModel)]="company.phone"/>
        </div>
        <div class="form-group mb-0">
          <label class="form-label">Email Domain</label>
          <input class="form-control" [(ngModel)]="company.emailDomain" placeholder="company.lk"/>
        </div>
      </div>
      <button class="btn btn-primary mt-4" type="button" (click)="saveConfig()">Save</button>
    </div>

    <div *ngIf="tab() === 1 && cfg() as company" class="card mt-4 settings-card">
      <h3 class="section-title">Tax & Invoice Config</h3>
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
          <input class="form-control" type="number" [(ngModel)]="company.vatRate" min="0" max="100"/>
        </div>
        <div class="form-group mb-0">
          <label class="form-label">Invoice Branch / Unit Code (QQQQ)</label>
          <input class="form-control" maxlength="4" [(ngModel)]="company.branchCode" placeholder="HQ01"/>
          <div class="form-hint">This appears inside the serial number, for example HQ01 or BR03.</div>
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
      <button class="btn btn-primary mt-4" type="button" (click)="saveConfig()">Save</button>
    </div>

    <div *ngIf="tab() === 2" class="card mt-4 settings-card">
      <h3 class="section-title">Bank Balance</h3>
      <div class="info-box info text-sm mb-4">
        Enter your current bank balance. This is the starting point for all cash projections.
      </div>
      <div class="grid-2 gap-4">
        <div class="form-group mb-0">
          <label class="form-label">Bank Name</label>
          <input class="form-control" [(ngModel)]="balanceEntry.bank"/>
        </div>
        <div class="form-group mb-0">
          <label class="form-label">Account No.</label>
          <input class="form-control" [(ngModel)]="balanceEntry.account"/>
        </div>
        <div class="form-group mb-0">
          <label class="form-label">Current Bank Balance (LKR) <span class="required">*</span></label>
          <input class="form-control" type="number" [(ngModel)]="balanceEntry.balance"/>
        </div>
        <div class="form-group mb-0">
          <label class="form-label">As of Date</label>
          <input class="form-control" type="date" [(ngModel)]="balanceEntry.date"/>
        </div>
      </div>
      <button class="btn btn-primary mt-4" type="button" (click)="saveBalance()">Update Balance</button>
      <div class="info-box warn text-sm mt-4">Update your balance regularly for accurate projections. CashDay does not connect to your bank automatically.</div>

      <div class="table-wrap mt-4">
        <table class="data-table">
          <thead><tr><th>Date</th><th>Bank</th><th>Account</th><th class="text-right">Balance (LKR)</th></tr></thead>
          <tbody>
            <tr *ngFor="let item of balanceHistory()">
              <td>{{ item.date }}</td>
              <td>{{ item.bank }}</td>
              <td>{{ item.account }}</td>
              <td class="text-right lkr-mono">{{ item.balance | lkr }}</td>
            </tr>
          </tbody>
        </table>
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
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>Term Name</th><th>Days</th><th>Default</th><th>Actions</th></tr></thead>
          <tbody>
            <tr *ngFor="let term of paymentTerms(); let index = index">
              <td><input class="form-control form-control-sm" [(ngModel)]="term.label"/></td>
              <td><input class="form-control form-control-sm" type="number" [(ngModel)]="term.days" style="width:90px"/></td>
              <td class="text-center"><input type="radio" name="defaultTerm" [value]="term.id" [(ngModel)]="defaultTermId"/></td>
              <td><button class="btn btn-ghost btn-sm text-red" type="button" (click)="removeTerm(index)">Delete</button></td>
            </tr>
          </tbody>
        </table>
      </div>
      <button class="btn btn-primary mt-4" type="button" (click)="saveTerms()">Save</button>
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
  defaultTermId = '';
  balanceEntry = { bank: 'Commercial Bank', account: '8001234567', balance: 0, date: new Date().toISOString().split('T')[0] };

  ngOnInit(): void {
    this.svc.getCompanyConfig().subscribe(config => this.cfg.set(config));
    this.svc.getPaymentTerms().subscribe(terms => {
      this.paymentTerms.set(terms);
      this.defaultTermId = terms.find(term => term.isDefault)?.id || terms[0]?.id || '';
    });
    this.svc.getBankBalanceHistory().subscribe(history => this.balanceHistory.set(history));
  }

  previewSerial(): string {
    const config = this.cfg();
    if (!config) return '';
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mmm = now.toLocaleString('en-US', { month: 'short' }).toUpperCase();
    return `${yy}${mmm}_${config.branchCode}_${String(config.invoiceCounter).padStart(5, '0')}`;
  }

  saveConfig(): void {
    const config = this.cfg();
    if (!config) return;
    this.svc.saveCompanyConfig(config).subscribe(() => this.toast.success('Settings saved.'));
  }

  saveBalance(): void {
    this.svc.saveBankBalance(this.balanceEntry).subscribe(() => {
      this.toast.success('Bank balance updated.');
      this.svc.getBankBalanceHistory().subscribe(history => this.balanceHistory.set(history));
    });
  }

  addTerm(): void {
    this.paymentTerms.update(terms => [...terms, { id: Date.now().toString(), label: 'Net 45', days: 45 }]);
  }

  removeTerm(index: number): void {
    this.paymentTerms.update(terms => terms.filter((_, termIndex) => termIndex !== index));
  }

  saveTerms(): void {
    const terms = this.paymentTerms().map(term => ({ ...term, isDefault: term.id === this.defaultTermId }));
    this.svc.savePaymentTerms(terms).subscribe(() => this.toast.success('Payment terms saved.'));
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
}
