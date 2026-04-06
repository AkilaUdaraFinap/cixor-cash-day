import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CompanyConfig, PaymentTerm, BankAccount, Tax } from '../../shared/models/models';
import { SettingsDataService } from '../../core/services/settings-data.service';
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
      <button class="tab-item" [class.active]="tab() === 2" (click)="tab.set(2)">Bank Accounts</button>
      <button class="tab-item" [class.active]="tab() === 3" (click)="tab.set(3)">Balance History</button>
      <button class="tab-item" [class.active]="tab() === 4" (click)="tab.set(4)">Payment Terms</button>
      <button class="tab-item" [class.active]="tab() === 5" (click)="tab.set(5)">Appearance</button>
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
      
      <!-- Taxes Section -->
      <div class="mb-6">
        <div class="flex items-center justify-between mb-3">
          <div>
            <h4 class="font-medium text-base">Tax Rates</h4>
            <div class="text-muted text-sm mt-1">Configure tax rates for invoices</div>
          </div>
          <button class="btn btn-secondary btn-sm" type="button" (click)="addTax()">+ Add Tax</button>
        </div>
        
        <div class="info-box danger text-sm mb-3" *ngIf="taxesIssues().length">
          {{ taxesIssues()[0] }}
        </div>

        <div class="desktop-table-only">
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width:50%">Tax Name</th>
                  <th style="width:25%">Rate (%)</th>
                  <th style="width:15%">Default</th>
                  <th style="width:10%" class="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let tax of pagedTaxes(); let i = index">
                  <td>
                    <input class="form-control form-control-sm" [(ngModel)]="tax.label" placeholder="Tax name"/>
                  </td>
                  <td>
                    <input class="form-control form-control-sm" type="number" [(ngModel)]="tax.rate" min="0" max="100" step="0.01"/>
                  </td>
                  <td>
                    <input type="radio" name="defaultTax" [checked]="tax.isDefault" (change)="taxes().forEach(t => t.isDefault = t.id === tax.id)"/>
                  </td>
                  <td class="text-right">
                    <button class="btn btn-sm btn-text-danger" type="button" (click)="removeTax(taxesPageStartIndex() + i)">Delete</button>
                  </td>
                </tr>
                <tr *ngIf="!pagedTaxes().length">
                  <td colspan="4" class="text-center text-muted">No taxes configured. Click "Add Tax" to get started.</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="pagination-controls" *ngIf="taxesTotalPages() > 1">
            <button class="btn btn-outline btn-sm" [disabled]="taxesCurrentPage() === 1" (click)="setTaxesPage(taxesCurrentPage() - 1)">Previous</button>
            <span class="pagination-info">{{ taxesPageStart() }}–{{ taxesPageEnd() }} of {{ taxes().length }}</span>
            <button class="btn btn-outline btn-sm" [disabled]="taxesCurrentPage() === taxesTotalPages()" (click)="setTaxesPage(taxesCurrentPage() + 1)">Next</button>
          </div>
        </div>

        <div class="mobile-cards-only">
          <div class="card-list">
            <div class="list-card" *ngFor="let tax of pagedTaxes(); let i = index">
              <div class="form-group mb-2">
                <label class="form-label text-xs">Tax Name</label>
                <input class="form-control form-control-sm" [(ngModel)]="tax.label" placeholder="Tax name"/>
              </div>
              <div class="form-group mb-2">
                <label class="form-label text-xs">Rate (%)</label>
                <input class="form-control form-control-sm" type="number" [(ngModel)]="tax.rate" min="0" max="100" step="0.01"/>
              </div>
              <div class="form-group mb-2">
                <label class="form-label text-xs">
                  <input type="radio" name="defaultTax" [checked]="tax.isDefault" (change)="taxes().forEach(t => t.isDefault = t.id === tax.id)"/>
                  Set as default
                </label>
              </div>
              <button class="btn btn-sm btn-text-danger" type="button" (click)="removeTax(taxesPageStartIndex() + i)">Delete</button>
            </div>
            <div class="list-card text-center text-muted" *ngIf="!pagedTaxes().length">
              No taxes configured. Click "Add Tax" to get started.
            </div>
          </div>
          <div class="pagination-controls" *ngIf="taxesTotalPages() > 1">
            <button class="btn btn-outline btn-sm" [disabled]="taxesCurrentPage() === 1" (click)="setTaxesPage(taxesCurrentPage() - 1)">Previous</button>
            <span class="pagination-info">{{ taxesPageStart() }}–{{ taxesPageEnd() }} of {{ taxes().length }}</span>
            <button class="btn btn-outline btn-sm" [disabled]="taxesCurrentPage() === taxesTotalPages()" (click)="setTaxesPage(taxesCurrentPage() + 1)">Next</button>
          </div>
        </div>

        <button class="btn btn-primary mt-3" type="button" [disabled]="taxesIssues().length > 0" (click)="saveTaxes()">Save Taxes</button>
      </div>

      <!-- Country of Operation -->
      <div class="border-top pt-4">
        <h4 class="font-medium text-base mb-3">Country of Operation</h4>
        <div class="form-group mb-0" style="max-width: 400px;">
          <label class="form-label">Country</label>
          <select class="form-control" [(ngModel)]="company.country">
            <option>Sri Lanka</option>
            <option>Other</option>
          </select>
        </div>
        <button class="btn btn-primary mt-4" type="button" (click)="saveConfig()">Save</button>
      </div>
    </div>

    <!-- Tab 2: Bank Accounts -->
    <div *ngIf="tab() === 2" class="card mt-4 settings-card-wide">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h3 class="section-title" style="margin:0">Bank Accounts</h3>
          <div class="text-muted text-sm mt-1">Manage multiple bank accounts and track balances</div>
        </div>
        <button class="btn btn-secondary btn-sm" type="button" (click)="addBankAccount()">+ Add Account</button>
      </div>
      
      <div class="info-box info text-sm mb-4">
        <div class="font-medium mb-1">Total Cash Across All Accounts: <span class="lkr-mono text-lg">{{ totalCash() | lkr }}</span></div>
        <div class="text-muted text-xs">This total is used for cash projections and dashboard calculations</div>
      </div>

      <div class="desktop-table-only" *ngIf="bankAccounts().length > 0">
        <div class="table-wrap">
          <table class="data-table bank-accounts-table">
            <thead><tr>
              <th style="width:22%">Account Name</th>
              <th style="width:17%">Bank</th>
              <th style="width:13%">Account No.</th>
              <th style="width:10%">Type</th>
              <th class="text-right" style="width:13%">Balance</th>
              <th style="width:8%">Status</th>
              <th style="width:17%">Actions</th>
            </tr></thead>
            <tbody>
              <tr *ngFor="let acc of pagedBankAccounts()">
                <td style="width:22%">
                  <div class="font-medium text-sm">{{ acc.accountName }}</div>
                  <div class="text-xs text-muted" *ngIf="acc.isPrimary">⭐ Primary</div>
                </td>
                <td style="width:17%" class="text-sm">{{ acc.bankName }}</td>
                <td class="font-mono text-xs" style="width:13%">{{ acc.accountNumber }}</td>
                <td style="width:10%" class="text-sm"><span class="capitalize">{{ acc.accountType }}</span></td>
                <td class="text-right lkr-mono font-medium text-sm" style="width:13%">{{ acc.currentBalance | lkr }}</td>
                <td style="width:8%"><span class="badge badge-sm" [class]="acc.isActive ? 'badge-verified' : 'badge-rejected'">{{ acc.isActive ? 'Active' : 'Inactive' }}</span></td>
                <td class="row-actions" style="width:17%">
                  <button class="btn btn-ghost btn-xs" type="button" (click)="editBankAccount(acc)" title="Edit Account">Edit</button>
                  <button class="btn btn-ghost btn-xs" type="button" (click)="updateAccountBalance(acc)" title="Update Balance">Balance</button>
                  <button class="btn btn-ghost btn-xs text-red" type="button" (click)="deleteBankAccountConfirm(acc)" [disabled]="bankAccounts().length === 1" title="Delete Account">Delete</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="mobile-cards-only" *ngIf="bankAccounts().length > 0">
        <div class="mobile-data-list">
          <div class="mobile-data-card" *ngFor="let acc of pagedBankAccounts()">
            <div class="mobile-data-card-header">
              <div>
                <div class="mobile-data-card-title">{{ acc.accountName }}</div>
                <div class="mobile-data-card-subtitle">{{ acc.bankName }} • {{ acc.accountNumber }}</div>
              </div>
              <div class="text-right">
                <div class="lkr-mono font-medium">{{ acc.currentBalance | lkr }}</div>
                <div class="text-xs text-muted mt-1" *ngIf="acc.isPrimary">⭐ Primary</div>
              </div>
            </div>
            <div class="mobile-data-grid">
              <div class="mobile-data-row"><span class="mobile-data-label">Type</span><span class="mobile-data-value capitalize">{{ acc.accountType }}</span></div>
              <div class="mobile-data-row"><span class="mobile-data-label">Status</span><span class="mobile-data-value"><span class="badge" [class]="acc.isActive ? 'badge-verified' : 'badge-rejected'">{{ acc.isActive ? 'Active' : 'Inactive' }}</span></span></div>
              <div class="mobile-data-row"><span class="mobile-data-label">Last Updated</span><span class="mobile-data-value">{{ acc.lastUpdated }}</span></div>
            </div>
            <div class="mobile-data-actions">
              <button class="btn btn-ghost btn-sm" type="button" (click)="editBankAccount(acc)">Edit</button>
              <button class="btn btn-ghost btn-sm" type="button" (click)="updateAccountBalance(acc)">Update Balance</button>
              <button class="btn btn-ghost btn-sm text-red" type="button" (click)="deleteBankAccountConfirm(acc)" [disabled]="bankAccounts().length === 1">Delete</button>
            </div>
          </div>
        </div>
      </div>

      <div class="pagination-bar" *ngIf="bankAccounts().length > 0 && bankAccountsTotalPages() > 1">
        <div class="pagination-info">Showing {{ bankAccountsPageStart() }}-{{ bankAccountsPageEnd() }} of {{ bankAccounts().length }}</div>
        <div class="pagination-controls">
          <button class="btn btn-secondary btn-sm" type="button" [disabled]="bankAccountsCurrentPage() === 1" (click)="setBankAccountsPage(bankAccountsCurrentPage() - 1)">Previous</button>
          <span class="pagination-page">Page {{ bankAccountsCurrentPage() }} / {{ bankAccountsTotalPages() }}</span>
          <button class="btn btn-secondary btn-sm" type="button" [disabled]="bankAccountsCurrentPage() === bankAccountsTotalPages()" (click)="setBankAccountsPage(bankAccountsCurrentPage() + 1)">Next</button>
        </div>
      </div>

      <div *ngIf="bankAccounts().length === 0" class="text-center p-6">
        <div class="text-muted">No bank accounts configured yet.</div>
        <button class="btn btn-primary btn-sm mt-3" type="button" (click)="addBankAccount()">Add Your First Account</button>
      </div>
    </div>

    <!-- Tab 3: Balance History -->
    <div *ngIf="tab() === 3" class="card mt-4 settings-card">
      <h3 class="section-title">Balance Update History</h3>
      <div class="info-box danger text-sm mb-4" *ngIf="balanceIssues().length">
        {{ balanceIssues()[0] }}
      </div>
      <div class="info-box info text-sm mb-4">
        Enter your current bank balance. This is the starting point for all cash projections. Negative values are allowed for overdraft accounts.
      </div>
      <div class="grid-2 gap-4">
        <div class="form-group mb-0 col-span-2">
          <label class="form-label">Select Bank Account <span class="required">*</span></label>
          <select class="form-control" [class.error]="balanceFieldError('account')" [(ngModel)]="balanceEntry.accountId">
            <option value="">-- Select an account --</option>
            <option *ngFor="let acc of bankAccounts().filter(a => a.isActive)" [value]="acc.id">
              {{ acc.accountName }} - {{ acc.bankName }} ({{ acc.accountNumber }})
            </option>
          </select>
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

    <!-- Tab 4: Payment Terms -->
    <div *ngIf="tab() === 4" class="card mt-4 settings-card">
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

    <!-- Tab 5: Appearance -->
    <div *ngIf="tab() === 5" class="card mt-4 settings-card">
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

      <div class="divider my-6"></div>

      <h3 class="section-title">Regional Settings</h3>
      <div class="grid-2 gap-4">
        <div class="form-group mb-0">
          <label class="form-label">Timezone</label>
          <select class="form-control" [(ngModel)]="cfg()!.timezone" (change)="saveAppearanceSettings()">
            <option value="Asia/Colombo">Asia/Colombo (GMT+5:30)</option>
            <option value="Asia/Kolkata">Asia/Kolkata (GMT+5:30)</option>
            <option value="Asia/Dubai">Asia/Dubai (GMT+4:00)</option>
            <option value="Asia/Singapore">Asia/Singapore (GMT+8:00)</option>
            <option value="Asia/Tokyo">Asia/Tokyo (GMT+9:00)</option>
            <option value="Europe/London">Europe/London (GMT+0:00)</option>
            <option value="Europe/Paris">Europe/Paris (GMT+1:00)</option>
            <option value="America/New_York">America/New York (GMT-5:00)</option>
            <option value="America/Los_Angeles">America/Los Angeles (GMT-8:00)</option>
            <option value="Australia/Sydney">Australia/Sydney (GMT+10:00)</option>
          </select>
          <div class="form-hint">Affects timestamps and scheduling</div>
        </div>
        <div class="form-group mb-0">
          <label class="form-label">Date Format</label>
          <select class="form-control" [(ngModel)]="cfg()!.dateFormat" (change)="saveAppearanceSettings()">
            <option value="MM/DD/YYYY">MM/DD/YYYY (04/03/2026)</option>
            <option value="DD/MM/YYYY">DD/MM/YYYY (03/04/2026)</option>
            <option value="YYYY-MM-DD">YYYY-MM-DD (2026-04-03)</option>
            <option value="DD-MMM-YYYY">DD-MMM-YYYY (03-Apr-2026)</option>
            <option value="MMM DD, YYYY">MMM DD, YYYY (Apr 03, 2026)</option>
          </select>
          <div class="form-hint">Display format for all dates in the system</div>
        </div>
      </div>
    </div>

    <!-- Bank Account Form Modal -->
    <ng-container *ngIf="accountFormOpen()">
      <div class="overlay" (click.self)="accountFormOpen.set(false)">
        <div class="modal" style="max-width:600px" role="dialog" aria-modal="true">
          <div class="modal-header">
            <h3>{{ editingAccount ? 'Edit Bank Account' : 'Add Bank Account' }}</h3>
            <button class="btn btn-ghost btn-sm" (click)="accountFormOpen.set(false)">✕</button>
          </div>
          <div class="modal-body">
            <div class="grid-2 gap-4">
              <div class="form-group col-span-2">
                <label class="form-label">Account Name <span class="required">*</span></label>
                <input class="form-control" [(ngModel)]="accountForm.accountName" placeholder="e.g., Operating Account"/>
                <div class="form-hint">Give this account a descriptive name</div>
              </div>
              <div class="form-group">
                <label class="form-label">Bank Name <span class="required">*</span></label>
                <input class="form-control" [(ngModel)]="accountForm.bankName" placeholder="e.g., Commercial Bank"/>
              </div>
              <div class="form-group">
                <label class="form-label">Account Number <span class="required">*</span></label>
                <input class="form-control" [(ngModel)]="accountForm.accountNumber" placeholder="e.g., 8001234567"/>
              </div>
              <div class="form-group">
                <label class="form-label">Account Type <span class="required">*</span></label>
                <select class="form-control" [(ngModel)]="accountForm.accountType">
                  <option value="current">Current</option>
                  <option value="checking">Checking</option>
                  <option value="savings">Savings</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Currency <span class="required">*</span></label>
                <input class="form-control" [(ngModel)]="accountForm.currency" placeholder="LKR" maxlength="3"/>
              </div>
              <div class="form-group">
                <label class="form-label">Current Balance <span class="required">*</span></label>
                <input class="form-control" type="number" [(ngModel)]="accountForm.currentBalance" placeholder="0"/>
              </div>
              <div class="form-group">
                <label class="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" [(ngModel)]="accountForm.isActive"/>
                  <span>Account is Active</span>
                </label>
              </div>
              <div class="form-group">
                <label class="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" [(ngModel)]="accountForm.isPrimary"/>
                  <span>Set as Primary Account</span>
                </label>
              </div>
              <div class="form-group col-span-2">
                <label class="form-label">Notes (Optional)</label>
                <textarea class="form-control" [(ngModel)]="accountForm.notes" rows="2" placeholder="Add any additional notes about this account"></textarea>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="accountFormOpen.set(false)">Cancel</button>
            <button class="btn btn-primary" (click)="saveBankAccountForm()">{{ editingAccount ? 'Update' : 'Create' }} Account</button>
          </div>
        </div>
      </div>
    </ng-container>

    <!-- Balance Update Form Modal -->
    <ng-container *ngIf="balanceFormOpen() && selectedAccountForBalance">
      <div class="overlay" (click.self)="balanceFormOpen.set(false)">
        <div class="modal" style="max-width:500px" role="dialog" aria-modal="true">
          <div class="modal-header">
            <h3>Update Balance</h3>
            <button class="btn btn-ghost btn-sm" (click)="balanceFormOpen.set(false)">✕</button>
          </div>
          <div class="modal-body">
            <div class="info-box info text-sm mb-4">
              <div class="font-medium">{{ selectedAccountForBalance.accountName }}</div>
              <div class="text-muted text-xs mt-1">{{ selectedAccountForBalance.bankName }} • {{ selectedAccountForBalance.accountNumber }}</div>
              <div class="text-muted text-xs">Current Balance: <span class="lkr-mono">{{ selectedAccountForBalance.currentBalance | lkr }}</span></div>
            </div>
            <div class="form-group">
              <label class="form-label">New Balance ({{ selectedAccountForBalance.currency }}) <span class="required">*</span></label>
              <input class="form-control" type="number" [(ngModel)]="balanceUpdateForm.balance" placeholder="0"/>
            </div>
            <div class="form-group">
              <label class="form-label">As of Date <span class="required">*</span></label>
              <input class="form-control" type="date" [(ngModel)]="balanceUpdateForm.date"/>
            </div>
            <div class="form-group">
              <label class="form-label">Notes (Optional)</label>
              <textarea class="form-control" [(ngModel)]="balanceUpdateForm.notes" rows="2" placeholder="Add any notes about this balance update"></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="balanceFormOpen.set(false)">Cancel</button>
            <button class="btn btn-primary" (click)="saveBalanceUpdate()">Update Balance</button>
          </div>
        </div>
      </div>
    </ng-container>
  `,
  styles: [`
    .settings-card { max-width: 760px; }
    .settings-card-wide { max-width: 1180px; }
    .section-title { font-size:12px; font-weight:700; color:var(--text-secondary); text-transform:uppercase; letter-spacing:.06em; margin-bottom:12px; }
    .col-span-2 { grid-column:1 / -1; }
    .capitalize { text-transform: capitalize; }
    .bank-accounts-table { table-layout: fixed; width: 100%; font-size: 13px; }
    .bank-accounts-table td { word-wrap: break-word; overflow-wrap: break-word; padding: 8px 6px; }
    .bank-accounts-table th { padding: 8px 6px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
    .bank-accounts-table .row-actions { white-space: nowrap; }
    .bank-accounts-table .btn-xs { font-size: 11px; padding: 3px 6px; margin-right: 3px; }
    .bank-accounts-table .badge-sm { font-size: 10px; padding: 2px 6px; }
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
      .settings-card-wide { max-width: 100%; }
      .tabs { margin-bottom: 0; }
      .tab-item { padding: 10px 12px; }
      .mode-switch { grid-template-columns: 1fr; }
      .table-wrap .form-control { min-width: 120px; }
      .theme-grid { grid-template-columns: 1fr; }
      .bank-accounts-table { font-size: 12px; }
      .bank-accounts-table .btn-xs { font-size: 10px; padding: 2px 5px; margin-right: 2px; }
    }
    @media (min-width: 769px) and (max-width: 1366px) {
      .settings-card-wide { max-width: 98%; }
      .bank-accounts-table { font-size: 12px; }
      .bank-accounts-table td, .bank-accounts-table th { padding: 7px 5px; }
      .theme-grid { grid-template-columns: 1fr 1fr; }
    }
    @media (min-width: 1367px) {
      .settings-card-wide { max-width: 1180px; }
    }
    @media (min-width: 769px) and (max-width: 1120px) {
      .theme-grid { grid-template-columns: 1fr 1fr; }
    }
  `],
})
export class SettingsComponent implements OnInit {
  private readonly svc = inject(SettingsDataService);
  private readonly toast = inject(ToastService);
  private readonly theme = inject(ThemeService);

  tab = signal(0);
  cfg = signal<CompanyConfig | null>(null);
  paymentTerms = signal<PaymentTerm[]>([]);
  taxes = signal<Tax[]>([]);
  bankAccounts = signal<BankAccount[]>([]);
  balanceHistory = signal<Array<{ id: string; accountId: string; date: string; bank: string; account: string; balance: number }>>([]);
  readonly listPageSize = 6;
  balancePage = signal(1);
  paymentTermsPage = signal(1);
  taxesPage = signal(1);
  bankAccountsPage = signal(1);
  defaultTermId = '';
  balanceEntry = { accountId: '', balance: 0, date: new Date().toISOString().split('T')[0] };
  accountFormOpen = signal(false);
  balanceFormOpen = signal(false);
  editingAccount: BankAccount | null = null;
  selectedAccountForBalance: BankAccount | null = null;
  accountForm: Partial<BankAccount> = {};
  balanceUpdateForm = { balance: 0, date: new Date().toISOString().split('T')[0], notes: '' };

  totalCash = computed(() => 
    this.bankAccounts()
      .filter(acc => acc.isActive)
      .reduce((sum, acc) => sum + acc.currentBalance, 0)
  );

  ngOnInit(): void {
    this.svc.getCompanyConfig().subscribe(config => this.cfg.set(config));
    this.svc.getPaymentTerms().subscribe(terms => {
      this.paymentTerms.set(terms);
      this.paymentTermsPage.set(1);
      this.defaultTermId = terms.find(term => term.isDefault)?.id || terms[0]?.id || '';
    });
    this.svc.getTaxes().subscribe(taxes => {
      this.taxes.set(taxes);
      this.taxesPage.set(1);
    });
    this.svc.getBankAccounts().subscribe(accounts => {
      this.bankAccounts.set(accounts);
      this.bankAccountsPage.set(1);
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

  // Bank Accounts Pagination
  bankAccountsTotalPages(): number {
    return Math.max(1, Math.ceil(this.bankAccounts().length / this.listPageSize));
  }

  bankAccountsCurrentPage(): number {
    return Math.min(this.bankAccountsPage(), this.bankAccountsTotalPages());
  }

  pagedBankAccounts(): BankAccount[] {
    const start = (this.bankAccountsCurrentPage() - 1) * this.listPageSize;
    return this.bankAccounts().slice(start, start + this.listPageSize);
  }

  setBankAccountsPage(nextPage: number): void {
    this.bankAccountsPage.set(Math.min(Math.max(1, nextPage), this.bankAccountsTotalPages()));
  }

  bankAccountsPageStart(): number {
    return (this.bankAccountsCurrentPage() - 1) * this.listPageSize + 1;
  }

  bankAccountsPageEnd(): number {
    return Math.min(this.bankAccountsCurrentPage() * this.listPageSize, this.bankAccounts().length);
  }

  // Bank Account CRUD
  addBankAccount(): void {
    this.editingAccount = null;
    this.accountForm = {
      accountName: '',
      bankName: '',
      accountNumber: '',
      accountType: 'current',
      currentBalance: 0,
      currency: 'LKR',
      isActive: true,
      isPrimary: this.bankAccounts().length === 0,
      notes: '',
    };
    this.accountFormOpen.set(true);
  }

  editBankAccount(account: BankAccount): void {
    this.editingAccount = account;
    this.accountForm = { ...account };
    this.accountFormOpen.set(true);
  }

  saveBankAccountForm(): void {
    const account: BankAccount = {
      id: this.editingAccount?.id || '',
      accountName: this.accountForm.accountName || '',
      bankName: this.accountForm.bankName || '',
      accountNumber: this.accountForm.accountNumber || '',
      accountType: (this.accountForm.accountType as any) || 'current',
      currentBalance: Number(this.accountForm.currentBalance) || 0,
      currency: this.accountForm.currency || 'LKR',
      isActive: !!this.accountForm.isActive,
      isPrimary: !!this.accountForm.isPrimary,
      lastUpdated: new Date().toISOString().split('T')[0],
      notes: this.accountForm.notes || '',
    };

    this.svc.saveBankAccount(account).subscribe({
      next: (saved) => {
        this.svc.getBankAccounts().subscribe(accounts => {
          this.bankAccounts.set(accounts);
          this.toast.success(this.editingAccount ? 'Account updated.' : 'Account created.');
          this.accountFormOpen.set(false);
        });
      },
      error: (error) => this.toast.error(error?.message || 'Unable to save account.'),
    });
  }

  deleteBankAccountConfirm(account: BankAccount): void {
    if (!confirm(`Delete "${account.accountName}"? This action cannot be undone.`)) return;
    
    this.svc.deleteBankAccount(account.id).subscribe({
      next: () => {
        this.svc.getBankAccounts().subscribe(accounts => {
          this.bankAccounts.set(accounts);
          this.toast.success('Account deleted.');
        });
      },
      error: (error) => this.toast.error(error?.message || 'Unable to delete account.'),
    });
  }

  updateAccountBalance(account: BankAccount): void {
    this.selectedAccountForBalance = account;
    this.balanceUpdateForm = {
      balance: account.currentBalance,
      date: new Date().toISOString().split('T')[0],
      notes: '',
    };
    this.balanceFormOpen.set(true);
  }

  saveBalanceUpdate(): void {
    if (!this.selectedAccountForBalance) return;
    
    this.svc.updateBankAccountBalance(
      this.selectedAccountForBalance.id,
      Number(this.balanceUpdateForm.balance),
      this.balanceUpdateForm.date,
      this.balanceUpdateForm.notes
    ).subscribe({
      next: () => {
        this.svc.getBankAccounts().subscribe(accounts => this.bankAccounts.set(accounts));
        this.svc.getBankBalanceHistory().subscribe(history => this.balanceHistory.set(history));
        this.toast.success('Balance updated.');
        this.balanceFormOpen.set(false);
      },
      error: (error) => this.toast.error(error?.message || 'Unable to update balance.'),
    });
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



  balanceIssues(): string[] {
    const issues: string[] = [];
    if (!this.balanceEntry.accountId) issues.push('Please select a bank account.');
    const balance = Number(this.balanceEntry.balance);
    if (!Number.isFinite(balance) || balance < 0) issues.push('Current bank balance must be zero or greater.');
    if (!this.balanceEntry.date || Number.isNaN(new Date(`${this.balanceEntry.date}T00:00:00`).getTime())) issues.push('Select a valid balance date.');
    return issues;
  }

  balanceFieldError(field: 'account' | 'balance' | 'date'): string {
    if (field === 'account' && !this.balanceEntry.accountId) return 'Please select an account.';
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

  taxesIssues(): string[] {
    const taxes = this.taxes();
    const issues: string[] = [];
    if (!taxes.length) issues.push('Add at least one tax.');
    if (taxes.some(tax => !tax.label?.trim())) issues.push('Every tax needs a name.');
    if (taxes.some(tax => !Number.isFinite(Number(tax.rate)) || Number(tax.rate) < 0 || Number(tax.rate) > 100)) issues.push('Tax rate must be between 0 and 100.');
    const labels = taxes.map(tax => tax.label.trim().toLowerCase()).filter(Boolean);
    if (new Set(labels).size !== labels.length) issues.push('Tax names must be unique.');
    if (taxes.length && !taxes.some(tax => tax.isDefault)) issues.push('Select a default tax.');
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
    const issues = this.companyProfileIssues();
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
    
    const selectedAccount = this.bankAccounts().find(acc => acc.id === this.balanceEntry.accountId);
    if (!selectedAccount) {
      this.toast.error('Selected account not found.');
      return;
    }
    
    this.svc.updateBankAccountBalance(
      selectedAccount.id,
      Number(this.balanceEntry.balance),
      this.balanceEntry.date,
      'Balance update from history tab'
    ).subscribe({
      next: () => {
        this.toast.success('Bank balance updated.');
        this.svc.getBankAccounts().subscribe(accounts => this.bankAccounts.set(accounts));
        this.svc.getBankBalanceHistory().subscribe(history => this.balanceHistory.set(history));
        // Reset form
        this.balanceEntry = { accountId: '', balance: 0, date: new Date().toISOString().split('T')[0] };
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

  addTax(): void {
    this.taxes.update(taxes => [...taxes, { id: Date.now().toString(), label: 'New Tax', rate: 0 }]);
    this.taxesPage.set(this.taxesTotalPages());
  }

  removeTax(index: number): void {
    const taxes = this.taxes();
    const tax = taxes[index];
    if (!tax) return;
    if (!confirm(`Delete tax "${tax.label || 'Untitled'}"?`)) return;
    this.taxes.update(current => {
      const updated = current.filter((_, taxIndex) => taxIndex !== index);
      const maxPage = Math.max(1, Math.ceil(updated.length / this.listPageSize));
      this.taxesPage.set(Math.min(this.taxesPage(), maxPage));
      return updated;
    });
  }

  saveTaxes(): void {
    const issues = this.taxesIssues();
    if (issues.length) {
      this.toast.error(issues[0]);
      return;
    }
    this.svc.saveTaxes(this.taxes()).subscribe({
      next: saved => {
        this.taxes.set(saved);
        this.taxesPage.set(1);
        this.toast.success('Taxes saved.');
      },
      error: error => this.toast.error(error?.message || 'Unable to save taxes.'),
    });
  }

  taxesTotalPages(): number {
    return Math.max(1, Math.ceil(this.taxes().length / this.listPageSize));
  }

  taxesCurrentPage(): number {
    return Math.min(this.taxesPage(), this.taxesTotalPages());
  }

  pagedTaxes(): Tax[] {
    const start = (this.taxesCurrentPage() - 1) * this.listPageSize;
    return this.taxes().slice(start, start + this.listPageSize);
  }

  setTaxesPage(nextPage: number): void {
    this.taxesPage.set(Math.min(Math.max(1, nextPage), this.taxesTotalPages()));
  }

  taxesPageStartIndex(): number {
    return (this.taxesCurrentPage() - 1) * this.listPageSize;
  }

  taxesPageStart(): number {
    return this.taxesPageStartIndex() + 1;
  }

  taxesPageEnd(): number {
    return Math.min(this.taxesCurrentPage() * this.listPageSize, this.taxes().length);
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

  saveAppearanceSettings(): void {
    const config = this.cfg();
    if (!config) return;
    this.svc.saveCompanyConfig(config).subscribe(() => {
      this.toast.success('Regional settings updated.');
    });
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
