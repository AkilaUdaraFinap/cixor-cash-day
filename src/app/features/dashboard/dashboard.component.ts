import { Component, OnInit, OnDestroy, signal, inject, computed, ChangeDetectionStrategy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { LkrPipe } from '../../shared/pipes/lkr.pipe';
import { MockDataService } from '../../core/services/mock-data.service';
import { ToastService } from '../../core/services/toast.service';
import { Invoice, RecurringExpense, OneOffExpense, LiquidityImpact } from '../../shared/models/models';
import * as A from './store/dashboard.actions';
import * as Sel from './store/dashboard.selectors';
import { RouterModule } from '@angular/router';

declare const Chart: any;

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, LkrPipe, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-header flex items-center justify-between mb-6">
      <div>
        <h2>Dashboard</h2>
        <div class="text-muted text-sm mt-1">Your cash position at a glance — {{ today }}</div>
      </div>
    </div>

    <!-- Hero Stats Row -->
    <div class="grid-3 mb-6" *ngIf="!loading(); else heroSkeleton">
      <div class="card">
        <div class="text-muted text-sm font-medium mb-1">Available Cash Today</div>
        <div class="h1 font-bold text-brand lkr-mono" style="font-size:28px">{{ cashToday() | lkr }}</div>
        <div class="text-sm text-muted mt-2">
          as of {{ today }}
          <button class="btn btn-ghost btn-sm ml-2" style="font-size:10px;padding:2px 8px" (click)="showAccountBreakdown.set(!showAccountBreakdown())">
            {{ showAccountBreakdown() ? '▲ Hide' : '▼ View' }} Accounts
          </button>
        </div>
        <div *ngIf="showAccountBreakdown() && bankAccounts().length > 0" class="mt-3 pt-3" style="border-top:1px solid var(--border)">
          <div class="text-xs font-medium text-muted mb-2">ACCOUNT BREAKDOWN</div>
          <div *ngFor="let acc of activeBankAccounts()" class="flex justify-between text-sm mb-1">
            <span class="text-muted">{{ acc.accountName }}</span>
            <span class="lkr-mono">{{ acc.currentBalance | lkr }}</span>
          </div>
          <div class="flex justify-between text-sm font-medium mt-2 pt-2" style="border-top:1px dashed var(--border)">
            <span>Total</span>
            <span class="lkr-mono text-brand">{{ cashToday() | lkr }}</span>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="text-muted text-sm font-medium mb-1">Min. Monthly Operating Cost</div>
        <div class="font-bold lkr-mono" style="font-size:20px;color:var(--amber)">{{ minMonthly() | lkr }}</div>
        <div class="text-sm text-muted mt-2">recurring expenses only</div>
      </div>
      <div class="card">
        <div class="text-muted text-sm font-medium mb-1">Planned One-Off (next 30 days)</div>
        <div class="font-bold lkr-mono" style="font-size:20px;color:var(--slate)">{{ oneOffTotal() | lkr }}</div>
        <div class="text-sm text-muted mt-2">scheduled one-time outflows</div>
      </div>
    </div>
    <ng-template #heroSkeleton>
      <div class="grid-3 mb-6">
        <div class="card skeleton-row" style="height:96px"></div>
        <div class="card skeleton-row" style="height:96px"></div>
        <div class="card skeleton-row" style="height:96px"></div>
      </div>
    </ng-template>

    <!-- Simulation Slider -->
    <div class="card mb-6">
      <div class="simulation-header mb-3">
        <div class="simulation-copy">
          <h3 style="font-size:16px">Cash Collection Simulation</h3>
          <div class="text-sm text-muted mt-1">What % of your outstanding invoices will be paid on time in the next 30 days?</div>
        </div>
        <div class="simulation-badges">
          <span class="badge simulation-badge" [class]="slider() >= breakEven() ? 'badge-verified' : 'badge-invited'">
            Break-even at {{ breakEven() }}%
          </span>
          <ng-container *ngIf="stressPoint() as sp">
            <span class="badge simulation-badge" [class]="slider() >= breakEven() ? 'badge-verified' : 'badge-rejected'">
              {{ slider() >= breakEven() ? 'Cash stays positive ✓' : 'Lowest: ' + (sp.balance | lkr) + ' on ' + sp.date }}
            </span>
          </ng-container>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <span class="text-sm text-muted nowrap">0%</span>
        <input type="range" min="0" max="100" [value]="slider()"
               (input)="onSlider($event)"
               class="slider w-full" style="height:6px; cursor:pointer; accent-color:var(--accent)"/>
        <span class="text-sm text-muted nowrap">100%</span>
      </div>
      <div class="text-center mt-2">
        <span class="font-bold" style="font-size:22px;color:var(--accent)">{{ slider() }}%</span>
        <span class="text-muted text-sm ml-2">collection probability</span>
      </div>
    </div>

    <!-- Projection Chart -->
    <div class="card mb-6">
      <div class="flex items-center justify-between mb-4">
        <h3 style="font-size:16px">30-Day Cash Forecast</h3>
        <div class="text-sm text-muted">Simulation at {{ slider() }}% collection probability</div>
      </div>
      <div style="position:relative;height:280px">
        <canvas #chartCanvas></canvas>
      </div>
      <div class="flex gap-4 mt-3 text-sm text-muted" style="justify-content:center;flex-wrap:wrap">
        <span><span style="display:inline-block;width:16px;height:3px;background:var(--green);margin-right:4px;vertical-align:middle"></span>Income (Line)</span>
        <span><span style="display:inline-block;width:8px;height:8px;background:var(--red);margin-right:4px;vertical-align:middle;border-radius:50%"></span>Expenses (Dot)</span>
        <span><span style="display:inline-block;width:8px;height:8px;background:var(--amber);margin-right:4px;vertical-align:middle;border-radius:50%"></span>Payables (Dot)</span>
      </div>
    </div>

    <!-- Sub Tabs -->
    <div class="card card-flush">
      <div class="tabs px-6 pt-4" style="border-bottom:2px solid var(--border);margin:0">
        <button class="tab-item" [class.active]="activeTab()===0" (click)="activeTab.set(0)">
          Outstanding Invoices
          <span class="badge badge-accepted ml-2" style="font-size:10px">{{ verifiedCount() }}</span>
        </button>
        <button class="tab-item" [class.active]="activeTab()===1" (click)="activeTab.set(1)">Liquidated</button>
        <button class="tab-item" [class.active]="activeTab()===2" (click)="activeTab.set(2)">Expenses</button>
      </div>

      <!-- Tab 0: Outstanding Invoices -->
      <div *ngIf="activeTab()===0" class="p-6">
        <ng-container *ngIf="outstanding().length > 0; else emptyOutstanding">
          <!-- Verified section -->
          <ng-container *ngIf="verifiedInvoices().length > 0">
            <div class="section-header">
              Verified Receivables (Dues)
              <span class="badge badge-verified">{{ verifiedInvoices().length }}</span>
            </div>
            <div class="desktop-table-only">
              <div class="table-wrap">
                <table class="data-table">
                <thead><tr>
                  <th>Invoice No.</th><th>Customer</th><th>Due Date</th>
                  <th class="text-right">Net (LKR)</th><th class="text-right">VAT (LKR)</th><th class="text-right">Gross (LKR)</th>
                  <th>Status</th><th>Action</th>
                </tr></thead>
                <tbody>
                  <tr *ngFor="let inv of pagedVerifiedInvoices()">
                    <td class="font-medium text-accent">{{ inv.serialNumber }}</td>
                    <td>{{ inv.customerName }}</td>
                    <td>{{ inv.dueDate }}</td>
                    <td class="text-right lkr-mono">{{ inv.netAmount | lkr }}</td>
                    <td class="text-right lkr-mono">{{ inv.vatAmount | lkr }}</td>
                    <td class="text-right lkr-mono font-medium">{{ inv.grossAmount | lkr }}</td>
                    <td><span class="badge badge-verified">Verified</span></td>
                    <td>
                      <button class="btn btn-outline-accent btn-sm" (click)="openLiquidityModal(inv)">
                        Liquidate Now
                      </button>
                    </td>
                  </tr>
                </tbody>
                </table>
              </div>
            </div>

            <div class="mobile-cards-only mt-3">
              <div class="mobile-data-list">
                <div class="mobile-data-card" *ngFor="let inv of pagedVerifiedInvoices()">
                  <div class="mobile-data-card-header">
                    <div>
                      <div class="mobile-data-card-title text-accent">{{ inv.serialNumber }}</div>
                      <div class="mobile-data-card-subtitle">{{ inv.customerName }}</div>
                    </div>
                    <span class="badge badge-verified">Verified</span>
                  </div>
                  <div class="mobile-data-grid">
                    <div class="mobile-data-row"><span class="mobile-data-label">Due Date</span><span class="mobile-data-value">{{ inv.dueDate }}</span></div>
                    <div class="mobile-data-row"><span class="mobile-data-label">Net (LKR)</span><span class="mobile-data-value lkr-mono">{{ inv.netAmount | lkr }}</span></div>
                    <div class="mobile-data-row"><span class="mobile-data-label">VAT (LKR)</span><span class="mobile-data-value lkr-mono">{{ inv.vatAmount | lkr }}</span></div>
                    <div class="mobile-data-row"><span class="mobile-data-label">Gross (LKR)</span><span class="mobile-data-value lkr-mono">{{ inv.grossAmount | lkr }}</span></div>
                  </div>
                  <div class="mobile-data-actions">
                    <button class="btn btn-outline-accent btn-sm" (click)="openLiquidityModal(inv)">Liquidate Now</button>
                  </div>
                </div>
              </div>
            </div>
            <div class="pagination-bar mt-3" *ngIf="verifiedInvoices().length > 0 && verifiedTotalPages() > 1">
              <div class="pagination-info">Showing {{ verifiedPageStart() }}-{{ verifiedPageEnd() }} of {{ verifiedInvoices().length }}</div>
              <div class="pagination-controls">
                <button class="btn btn-secondary btn-sm" type="button" [disabled]="verifiedCurrentPage() === 1" (click)="setVerifiedPage(verifiedCurrentPage() - 1)">Previous</button>
                <span class="pagination-page">Page {{ verifiedCurrentPage() }} / {{ verifiedTotalPages() }}</span>
                <button class="btn btn-secondary btn-sm" type="button" [disabled]="verifiedCurrentPage() === verifiedTotalPages()" (click)="setVerifiedPage(verifiedCurrentPage() + 1)">Next</button>
              </div>
            </div>
          </ng-container>
          <!-- Unverified section -->
          <ng-container *ngIf="unverifiedInvoices().length > 0">
            <div class="section-header mt-4">
              Unverified Receivables
              <span class="badge badge-unverified">{{ unverifiedInvoices().length }}</span>
            </div>
            <div class="desktop-table-only">
              <div class="table-wrap">
                <table class="data-table">
                <thead><tr>
                  <th>Invoice No.</th><th>Customer</th><th>Due Date</th>
                  <th class="text-right">Gross (LKR)</th><th>Status</th><th>Action</th>
                </tr></thead>
                <tbody>
                  <tr *ngFor="let inv of pagedUnverifiedInvoices()">
                    <td class="font-medium">{{ inv.serialNumber }}</td>
                    <td>{{ inv.customerName }}</td>
                    <td>{{ inv.dueDate }}</td>
                    <td class="text-right lkr-mono">{{ inv.grossAmount | lkr }}</td>
                    <td><span class="badge" [class]="'badge-' + inv.status.toLowerCase()">{{ inv.status }}</span></td>
                    <td>
                      <button class="btn btn-secondary btn-sm" disabled title="Invoice must be Verified first">Liquidate Now</button>
                    </td>
                  </tr>
                </tbody>
                </table>
              </div>
            </div>

            <div class="mobile-cards-only mt-3">
              <div class="mobile-data-list">
                <div class="mobile-data-card" *ngFor="let inv of pagedUnverifiedInvoices()">
                  <div class="mobile-data-card-header">
                    <div>
                      <div class="mobile-data-card-title">{{ inv.serialNumber }}</div>
                      <div class="mobile-data-card-subtitle">{{ inv.customerName }}</div>
                    </div>
                    <span class="badge" [class]="'badge-' + inv.status.toLowerCase()">{{ inv.status }}</span>
                  </div>
                  <div class="mobile-data-grid">
                    <div class="mobile-data-row"><span class="mobile-data-label">Due Date</span><span class="mobile-data-value">{{ inv.dueDate }}</span></div>
                    <div class="mobile-data-row"><span class="mobile-data-label">Gross (LKR)</span><span class="mobile-data-value lkr-mono">{{ inv.grossAmount | lkr }}</span></div>
                  </div>
                  <div class="mobile-data-actions">
                    <button class="btn btn-secondary btn-sm" disabled title="Invoice must be Verified first">Liquidate Now</button>
                  </div>
                </div>
              </div>
            </div>
            <div class="pagination-bar mt-3" *ngIf="unverifiedInvoices().length > 0 && unverifiedTotalPages() > 1">
              <div class="pagination-info">Showing {{ unverifiedPageStart() }}-{{ unverifiedPageEnd() }} of {{ unverifiedInvoices().length }}</div>
              <div class="pagination-controls">
                <button class="btn btn-secondary btn-sm" type="button" [disabled]="unverifiedCurrentPage() === 1" (click)="setUnverifiedPage(unverifiedCurrentPage() - 1)">Previous</button>
                <span class="pagination-page">Page {{ unverifiedCurrentPage() }} / {{ unverifiedTotalPages() }}</span>
                <button class="btn btn-secondary btn-sm" type="button" [disabled]="unverifiedCurrentPage() === unverifiedTotalPages()" (click)="setUnverifiedPage(unverifiedCurrentPage() + 1)">Next</button>
              </div>
            </div>
          </ng-container>
        </ng-container>
        <ng-template #emptyOutstanding>
          <div class="empty-state">
            <div class="empty-icon">📄</div>
            <div class="font-medium mt-2">No outstanding invoices</div>
            <div class="text-muted text-sm mt-1">Create your first invoice to see it here.</div>
            <a routerLink="/invoices" class="btn btn-primary btn-sm mt-4">Create Invoice</a>
          </div>
        </ng-template>
      </div>

      <!-- Tab 1: Liquidated Invoices -->
      <div *ngIf="activeTab()===1" class="p-6">
        <ng-container *ngIf="liquidated().length > 0; else emptyLiquidated">
          <div class="desktop-table-only">
            <div class="table-wrap">
              <table class="data-table">
              <thead><tr>
                <th>Invoice No.</th><th>Customer</th><th>Liquidated</th>
                <th class="text-right">Gross (LKR)</th><th class="text-right">Fee (LKR)</th><th class="text-right">Net Received (LKR)</th>
                <th>Settlement</th>
              </tr></thead>
              <tbody>
                <tr *ngFor="let inv of pagedLiquidated()">
                  <td class="font-medium text-accent">{{ inv.serialNumber }}</td>
                  <td>{{ inv.customerName }}</td>
                  <td>{{ inv.liquidatedAt }}</td>
                  <td class="text-right lkr-mono">{{ inv.grossAmount | lkr }}</td>
                  <td class="text-right lkr-mono text-red">{{ inv.liquidationFee | lkr }}</td>
                  <td class="text-right lkr-mono font-medium text-green">{{ inv.netReceived | lkr }}</td>
                  <td>{{ inv.settlementPath }}</td>
                </tr>
              </tbody>
              </table>
            </div>
          </div>

          <div class="mobile-cards-only">
            <div class="mobile-data-list">
              <div class="mobile-data-card" *ngFor="let inv of pagedLiquidated()">
                <div class="mobile-data-card-header">
                  <div>
                    <div class="mobile-data-card-title text-accent">{{ inv.serialNumber }}</div>
                    <div class="mobile-data-card-subtitle">{{ inv.customerName }}</div>
                  </div>
                  <span class="badge badge-settled">Settled</span>
                </div>
                <div class="mobile-data-grid">
                  <div class="mobile-data-row"><span class="mobile-data-label">Liquidated</span><span class="mobile-data-value">{{ inv.liquidatedAt }}</span></div>
                  <div class="mobile-data-row"><span class="mobile-data-label">Gross (LKR)</span><span class="mobile-data-value lkr-mono">{{ inv.grossAmount | lkr }}</span></div>
                  <div class="mobile-data-row"><span class="mobile-data-label">Fee (LKR)</span><span class="mobile-data-value lkr-mono text-red">{{ inv.liquidationFee | lkr }}</span></div>
                  <div class="mobile-data-row"><span class="mobile-data-label">Net Received (LKR)</span><span class="mobile-data-value lkr-mono text-green">{{ inv.netReceived | lkr }}</span></div>
                  <div class="mobile-data-row"><span class="mobile-data-label">Settlement</span><span class="mobile-data-value">{{ inv.settlementPath }}</span></div>
                </div>
              </div>
            </div>
          </div>
          <div class="pagination-bar mt-3" *ngIf="liquidated().length > 0 && liquidatedTotalPages() > 1">
            <div class="pagination-info">Showing {{ liquidatedPageStart() }}-{{ liquidatedPageEnd() }} of {{ liquidated().length }}</div>
            <div class="pagination-controls">
              <button class="btn btn-secondary btn-sm" type="button" [disabled]="liquidatedCurrentPage() === 1" (click)="setLiquidatedPage(liquidatedCurrentPage() - 1)">Previous</button>
              <span class="pagination-page">Page {{ liquidatedCurrentPage() }} / {{ liquidatedTotalPages() }}</span>
              <button class="btn btn-secondary btn-sm" type="button" [disabled]="liquidatedCurrentPage() === liquidatedTotalPages()" (click)="setLiquidatedPage(liquidatedCurrentPage() + 1)">Next</button>
            </div>
          </div>
        </ng-container>
        <ng-template #emptyLiquidated>
          <div class="empty-state">
            <div class="empty-icon">💸</div>
            <div class="font-medium mt-2">No liquidated invoices yet</div>
          </div>
        </ng-template>
      </div>

      <!-- Tab 2: Expenses -->
      <div *ngIf="activeTab()===2" class="p-6">
        <!-- Recurring -->
        <div class="flex items-center justify-between mb-3">
          <h4>Recurring Expenses</h4>
          <button class="btn btn-secondary btn-sm" (click)="openExpenseForm('recurring')">+ Add Recurring</button>
        </div>
        <div class="mb-6" *ngIf="recurring().length > 0">
          <div class="desktop-table-only">
            <div class="table-wrap">
              <table class="data-table">
                <thead><tr><th>Name</th><th>Amount (LKR)</th><th>Frequency</th><th>Next Due</th><th></th></tr></thead>
                <tbody>
                  <tr *ngFor="let e of pagedRecurring()">
                    <td>{{ e.name }}</td>
                    <td class="lkr-mono">{{ e.amount | lkr }}</td>
                    <td>{{ e.frequency }}</td>
                    <td>{{ e.nextDueDate }}</td>
                    <td class="row-actions">
                      <button class="btn btn-ghost btn-sm" (click)="editRecurring(e)">Edit</button>
                      <button class="btn btn-ghost btn-sm text-red" (click)="deleteRecurring(e)">Delete</button>
                    </td>
                  </tr>
                  <tr style="font-weight:600;background:var(--bg)">
                    <td>Monthly Operating Cost</td>
                    <td class="lkr-mono text-amber">{{ monthlyTotal() | lkr }}</td>
                    <td colspan="3"></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="mobile-cards-only">
            <div class="mobile-data-list">
              <div class="mobile-data-card" *ngFor="let e of pagedRecurring()">
                <div class="mobile-data-card-header">
                  <div class="mobile-data-card-title">{{ e.name }}</div>
                </div>
                <div class="mobile-data-grid">
                  <div class="mobile-data-row"><span class="mobile-data-label">Amount (LKR)</span><span class="mobile-data-value lkr-mono">{{ e.amount | lkr }}</span></div>
                  <div class="mobile-data-row"><span class="mobile-data-label">Frequency</span><span class="mobile-data-value">{{ e.frequency }}</span></div>
                  <div class="mobile-data-row"><span class="mobile-data-label">Next Due</span><span class="mobile-data-value">{{ e.nextDueDate }}</span></div>
                </div>
                <div class="mobile-data-actions">
                  <button class="btn btn-ghost btn-sm" (click)="editRecurring(e)">Edit</button>
                  <button class="btn btn-ghost btn-sm text-red" (click)="deleteRecurring(e)">Delete</button>
                </div>
              </div>
              <div class="mobile-data-card">
                <div class="mobile-data-row">
                  <span class="mobile-data-label">Monthly Operating Cost</span>
                  <span class="mobile-data-value lkr-mono text-amber">{{ monthlyTotal() | lkr }}</span>
                </div>
              </div>
            </div>
          </div>
          <div class="pagination-bar mt-3" *ngIf="recurring().length > 0 && recurringTotalPages() > 1">
            <div class="pagination-info">Showing {{ recurringPageStart() }}-{{ recurringPageEnd() }} of {{ recurring().length }}</div>
            <div class="pagination-controls">
              <button class="btn btn-secondary btn-sm" type="button" [disabled]="recurringCurrentPage() === 1" (click)="setRecurringPage(recurringCurrentPage() - 1)">Previous</button>
              <span class="pagination-page">Page {{ recurringCurrentPage() }} / {{ recurringTotalPages() }}</span>
              <button class="btn btn-secondary btn-sm" type="button" [disabled]="recurringCurrentPage() === recurringTotalPages()" (click)="setRecurringPage(recurringCurrentPage() + 1)">Next</button>
            </div>
          </div>

        </div>
        <div *ngIf="!recurring().length" class="text-muted text-sm p-4">No recurring expenses. Add one to improve projection accuracy.</div>
        <!-- One-Off -->
        <div class="flex items-center justify-between mb-3">
          <h4>One-Off Planned Expenses</h4>
          <button class="btn btn-secondary btn-sm" (click)="openExpenseForm('oneoff')">+ Add One-Off</button>
        </div>
        <div *ngIf="oneoff().length > 0">
          <div class="desktop-table-only">
            <div class="table-wrap">
              <table class="data-table">
                <thead><tr><th>Name</th><th>Amount (LKR)</th><th>Due Date</th><th></th></tr></thead>
                <tbody>
                  <tr *ngFor="let e of pagedOneoff()">
                    <td>{{ e.name }}</td>
                    <td class="lkr-mono">{{ e.amount | lkr }}</td>
                    <td>{{ e.dueDate }}</td>
                    <td class="row-actions">
                      <button class="btn btn-ghost btn-sm" (click)="editOneOff(e)">Edit</button>
                      <button class="btn btn-ghost btn-sm text-red" (click)="deleteOneOff(e)">Delete</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="mobile-cards-only">
            <div class="mobile-data-list">
              <div class="mobile-data-card" *ngFor="let e of pagedOneoff()">
                <div class="mobile-data-card-header">
                  <div class="mobile-data-card-title">{{ e.name }}</div>
                </div>
                <div class="mobile-data-grid">
                  <div class="mobile-data-row"><span class="mobile-data-label">Amount (LKR)</span><span class="mobile-data-value lkr-mono">{{ e.amount | lkr }}</span></div>
                  <div class="mobile-data-row"><span class="mobile-data-label">Due Date</span><span class="mobile-data-value">{{ e.dueDate }}</span></div>
                </div>
                <div class="mobile-data-actions">
                  <button class="btn btn-ghost btn-sm" (click)="editOneOff(e)">Edit</button>
                  <button class="btn btn-ghost btn-sm text-red" (click)="deleteOneOff(e)">Delete</button>
                </div>
              </div>
            </div>
          </div>
          <div class="pagination-bar mt-3" *ngIf="oneoff().length > 0 && oneoffTotalPages() > 1">
            <div class="pagination-info">Showing {{ oneoffPageStart() }}-{{ oneoffPageEnd() }} of {{ oneoff().length }}</div>
            <div class="pagination-controls">
              <button class="btn btn-secondary btn-sm" type="button" [disabled]="oneoffCurrentPage() === 1" (click)="setOneoffPage(oneoffCurrentPage() - 1)">Previous</button>
              <span class="pagination-page">Page {{ oneoffCurrentPage() }} / {{ oneoffTotalPages() }}</span>
              <button class="btn btn-secondary btn-sm" type="button" [disabled]="oneoffCurrentPage() === oneoffTotalPages()" (click)="setOneoffPage(oneoffCurrentPage() + 1)">Next</button>
            </div>
          </div>

        </div>
        <div *ngIf="!oneoff().length" class="text-muted text-sm p-4">No one-off expenses planned.</div>
      </div>
    </div>

    <!-- Expense Slide-over -->
    <ng-container *ngIf="expenseFormOpen()">
      <div class="slideover-overlay" (click)="expenseFormOpen.set(false)" (keydown.escape)="expenseFormOpen.set(false)" tabindex="-1"></div>
      <div class="slideover" role="dialog" aria-modal="true" aria-labelledby="expense-dialog-title">
        <div class="slideover-header">
          <h3 id="expense-dialog-title" style="font-size:16px">{{ editingExpense?.id ? 'Edit' : 'Add' }} {{ expenseFormType() === 'recurring' ? 'Recurring Expense' : 'One-Off Expense' }}</h3>
          <button class="btn btn-ghost btn-sm" (click)="expenseFormOpen.set(false)">✕</button>
        </div>
        <div class="slideover-body">
          <div class="form-group mb-4">
            <label class="form-label">Name <span class="required">*</span></label>
            <input class="form-control" [(ngModel)]="expForm.name" placeholder="e.g. Office Rent"/>
          </div>
          <div class="form-group mb-4">
            <label class="form-label">Amount (LKR) <span class="required">*</span></label>
            <input class="form-control" type="number" [(ngModel)]="expForm.amount" placeholder="0"/>
          </div>
          <ng-container *ngIf="expenseFormType() === 'recurring'">
            <div class="form-group mb-4">
              <label class="form-label">Frequency <span class="required">*</span></label>
              <select class="form-control" [(ngModel)]="expForm.frequency">
                <option>Weekly</option><option>Monthly</option><option>Quarterly</option>
              </select>
            </div>
            <div class="form-group mb-4">
              <label class="form-label">Next Due Date <span class="required">*</span></label>
              <input class="form-control" [(ngModel)]="expForm.nextDueDate" placeholder="MM/DD/YYYY"/>
            </div>
          </ng-container>
          <ng-container *ngIf="expenseFormType() === 'oneoff'">
            <div class="form-group mb-4">
              <label class="form-label">Due Date <span class="required">*</span></label>
              <input class="form-control" [(ngModel)]="expForm.dueDate" placeholder="MM/DD/YYYY"/>
            </div>
          </ng-container>
        </div>
        <div class="slideover-footer">
          <button class="btn btn-secondary" (click)="expenseFormOpen.set(false)">Cancel</button>
          <button class="btn btn-primary" (click)="saveExpense()">Save</button>
        </div>
      </div>
    </ng-container>

    <!-- Liquidity Modal -->
    <ng-container *ngIf="liquidityModal() && liquidityImpact()">
      <div class="overlay" (click.self)="liquidityModal.set(false)" (keydown.escape)="liquidityModal.set(false)" tabindex="-1">
        <div class="modal" style="max-width:600px" role="dialog" aria-modal="true" aria-labelledby="liquidity-dialog-title">
          <div class="modal-header">
            <h3 id="liquidity-dialog-title">Confirm Liquidity Intent</h3>
            <button class="btn btn-ghost btn-sm" (click)="liquidityModal.set(false)">✕</button>
          </div>
          <div class="modal-body" *ngIf="liquidityImpact() as li">
            <!-- Invoice Summary -->
            <h4 class="mb-3" style="color:var(--text-secondary);font-size:12px;text-transform:uppercase;letter-spacing:.05em">Invoice Summary</h4>
            <div class="grid-2 gap-2 mb-4 text-sm">
              <div class="flex justify-between"><span class="text-muted">Invoice No.</span><span class="font-medium">{{ li.invoice.serialNumber }}</span></div>
              <div class="flex justify-between"><span class="text-muted">Customer</span><span class="font-medium">{{ li.invoice.customerName }}</span></div>
              <div class="flex justify-between"><span class="text-muted">Due Date</span><span>{{ li.invoice.dueDate }}</span></div>
              <div class="flex justify-between"><span class="text-muted">Net Amount</span><span class="lkr-mono">{{ li.invoice.netAmount | lkr }}</span></div>
              <div class="flex justify-between"><span class="text-muted">VAT Amount</span><span class="lkr-mono">{{ li.invoice.vatAmount | lkr }}</span></div>
              <div class="flex justify-between"><span class="text-muted">Gross Amount</span><span class="font-bold lkr-mono">{{ li.invoice.grossAmount | lkr }}</span></div>
            </div>
            <hr class="divider"/>
            <!-- Liquidation Amount -->
            <h4 class="mb-3" style="color:var(--text-secondary);font-size:12px;text-transform:uppercase;letter-spacing:.05em">Liquidation Amount</h4>
            <div class="form-group mb-4">
              <label class="form-label">Amount to Liquidate (LKR) <span class="required">*</span></label>
              <input class="form-control" type="number" [value]="liquidationAmount()" (input)="liquidationAmount.set(+($any($event.target).value))" [max]="li.invoice.grossAmount" min="1" placeholder="Enter amount"/>
              <div class="text-muted text-sm mt-1">Maximum: {{ li.invoice.grossAmount | lkr }}</div>
            </div>
            <!-- Fee Breakdown -->
            <h4 class="mb-3" style="color:var(--text-secondary);font-size:12px;text-transform:uppercase;letter-spacing:.05em">Fee Breakdown</h4>
            <div class="grid-2 gap-2 mb-4 text-sm">
              <div class="flex justify-between"><span class="text-muted">Discount / Fee (2%)</span><span class="text-red lkr-mono">{{ (liquidationAmount() * 0.02) | lkr }}</span></div>
              <div class="flex justify-between"><span class="text-muted">Net Cash Received Today</span><span class="font-bold text-green lkr-mono">{{ (liquidationAmount() - (liquidationAmount() * 0.02)) | lkr }}</span></div>
            </div>
            <hr class="divider"/>
            <!-- Debtor Notification Message -->
            <h4 class="mb-3" style="color:var(--text-secondary);font-size:12px;text-transform:uppercase;letter-spacing:.05em">Debtor Notification</h4>
            <div class="form-group mb-4">
              <label class="form-label">Notification Message</label>
              <textarea class="form-control" rows="4" [value]="liquidationMessage()" (input)="liquidationMessage.set($any($event.target).value)" placeholder="Message to send to debtor"></textarea>
              <div class="text-muted text-sm mt-1">This message will be sent to the debtor along with the due date information.</div>
            </div>
            <hr class="divider"/>
            <!-- Before / After -->
            <h4 class="mb-3" style="color:var(--text-secondary);font-size:12px;text-transform:uppercase;letter-spacing:.05em">Cash Impact (at full liquidation)</h4>
            <table class="data-table mb-4" style="font-size:13px">
              <thead><tr><th></th><th class="text-right">Before</th><th class="text-right">After</th></tr></thead>
              <tbody>
                <tr>
                  <td class="text-muted">Available Cash Today</td>
                  <td class="text-right lkr-mono">{{ li.before.cashToday | lkr }}</td>
                  <td class="text-right lkr-mono font-medium text-green">{{ li.after.cashToday | lkr }}</td>
                </tr>
                <tr>
                  <td class="text-muted">Break-even Threshold</td>
                  <td class="text-right">{{ li.before.breakEven }}%</td>
                  <td class="text-right font-medium text-green">{{ li.after.breakEven }}%</td>
                </tr>
                <tr>
                  <td class="text-muted">Lowest Projected Balance</td>
                  <td class="text-right lkr-mono" [class.text-red]="li.before.lowestBalance < 0">{{ li.before.lowestBalance | lkr }}</td>
                  <td class="text-right lkr-mono font-medium" [class.text-green]="li.after.lowestBalance >= 0" [class.text-red]="li.after.lowestBalance < 0">{{ li.after.lowestBalance | lkr }}</td>
                </tr>
              </tbody>
            </table>
            <!-- Disclosure -->
            <div class="info-box info text-sm">
              <strong>Settlement Disclosure:</strong> If you confirm, this invoice will be settled to CIXOR PayDay at the time of the liquidity event. The settlement path for this invoice will change from direct customer payment to CIXOR PayDay settlement. The debtor will receive a notification with the due date and your custom message.
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="liquidityModal.set(false)">Cancel</button>
            <button class="btn btn-primary" (click)="confirmLiquidity()">Confirm Liquidity</button>
          </div>
        </div>
      </div>
    </ng-container>

    <ng-container *ngIf="expenseToDelete() as pending">
      <div class="overlay" (click.self)="expenseToDelete.set(null)" (keydown.escape)="expenseToDelete.set(null)" tabindex="-1">
        <div class="modal" style="max-width:420px" role="dialog" aria-modal="true" aria-labelledby="expense-delete-title">
          <div class="modal-header">
            <h3 id="expense-delete-title">Confirm Delete</h3>
            <button class="btn btn-ghost btn-sm" (click)="expenseToDelete.set(null)" aria-label="Close dialog">✕</button>
          </div>
          <div class="modal-body">
            <div class="text-sm">Delete <strong>{{ pending.name }}</strong>?</div>
            <div class="text-muted text-sm mt-2">This removes the expense from future cash projections.</div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="expenseToDelete.set(null)">Cancel</button>
            <button class="btn btn-danger" (click)="confirmExpenseDelete()">Delete Expense</button>
          </div>
        </div>
      </div>
    </ng-container>
  `,
  styles: [`
    .empty-state { text-align:center; padding: 40px; }
    .empty-icon  { font-size: 36px; }
    .simulation-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
    }
    .simulation-copy {
      flex: 1 1 300px;
      min-width: 220px;
    }
    .simulation-badges {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 8px;
      min-width: 0;
      max-width: 100%;
    }
    .simulation-badge {
      max-width: 100%;
      white-space: normal;
      text-align: center;
      line-height: 1.25;
      word-break: break-word;
      padding: 4px 10px;
    }

    @media (max-width: 768px) {
      .simulation-copy {
        min-width: 0;
        flex-basis: 100%;
      }
      .simulation-badges {
        justify-content: flex-start;
        width: 100%;
      }
      .simulation-badge {
        font-size: 10px;
      }
    }
  `]
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('chartCanvas') chartCanvas!: ElementRef<HTMLCanvasElement>;

  private store = inject(Store);
  private svc   = inject(MockDataService);
  private toast = inject(ToastService);
  private destroy$ = new Subject<void>();
  private chart: any;
  private themeObserver?: MutationObserver;

  today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  loading     = this.store.selectSignal(Sel.selectLoading);
  cashToday   = this.store.selectSignal(Sel.selectCashToday);
  minMonthly  = this.store.selectSignal(Sel.selectMinMonthly);
  oneOffTotal = this.store.selectSignal(Sel.selectOneOffTotal);
  curve       = this.store.selectSignal(Sel.selectCurve);
  breakEven   = this.store.selectSignal(Sel.selectBreakEven);
  stressPoint = this.store.selectSignal(Sel.selectStressPoint);
  slider      = this.store.selectSignal(Sel.selectSlider);
  outstanding = this.store.selectSignal(Sel.selectOutstanding);
  liquidated  = this.store.selectSignal(Sel.selectLiquidated);
  recurring   = this.store.selectSignal(Sel.selectRecurring);
  oneoff      = this.store.selectSignal(Sel.selectOneOff);
  bankAccounts = signal<any[]>([]);
  showAccountBreakdown = signal(false);
  readonly listPageSize = 5;

  activeBankAccounts = computed(() => 
    this.bankAccounts().filter((acc: any) => acc.isActive)
  );

  verifiedInvoices   = computed(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.outstanding().filter(i => {
      if (!i.isVerified) return false;
      const dueDate = new Date(i.dueDate);
      return dueDate <= today;
    });
  });
  unverifiedInvoices = computed(() => this.outstanding().filter(i => !i.isVerified));
  verifiedCount      = computed(() => this.verifiedInvoices().length);
  monthlyTotal       = computed(() => this.recurring().filter(e => e.frequency === 'Monthly').reduce((s, e) => s + e.amount, 0));

  activeTab    = signal(0);
  verifiedPage = signal(1);
  unverifiedPage = signal(1);
  liquidatedPage = signal(1);
  recurringPage = signal(1);
  oneoffPage = signal(1);
  liquidityModal = signal(false);
  liquidityImpact = signal<LiquidityImpact | null>(null);
  liquidationAmount = signal<number>(0);
  liquidationMessage = signal<string>('');
  expenseFormOpen = signal(false);
  expenseFormType = signal<'recurring'|'oneoff'>('recurring');
  expenseToDelete = signal<{ type: 'recurring' | 'oneoff'; id: string; name: string } | null>(null);
  editingExpense: any = null;
  expForm: any = {};

  verifiedTotalPages = computed(() => Math.max(1, Math.ceil(this.verifiedInvoices().length / this.listPageSize)));
  verifiedCurrentPage = computed(() => Math.min(this.verifiedPage(), this.verifiedTotalPages()));
  pagedVerifiedInvoices = computed(() => {
    const start = (this.verifiedCurrentPage() - 1) * this.listPageSize;
    return this.verifiedInvoices().slice(start, start + this.listPageSize);
  });

  unverifiedTotalPages = computed(() => Math.max(1, Math.ceil(this.unverifiedInvoices().length / this.listPageSize)));
  unverifiedCurrentPage = computed(() => Math.min(this.unverifiedPage(), this.unverifiedTotalPages()));
  pagedUnverifiedInvoices = computed(() => {
    const start = (this.unverifiedCurrentPage() - 1) * this.listPageSize;
    return this.unverifiedInvoices().slice(start, start + this.listPageSize);
  });

  liquidatedTotalPages = computed(() => Math.max(1, Math.ceil(this.liquidated().length / this.listPageSize)));
  liquidatedCurrentPage = computed(() => Math.min(this.liquidatedPage(), this.liquidatedTotalPages()));
  pagedLiquidated = computed(() => {
    const start = (this.liquidatedCurrentPage() - 1) * this.listPageSize;
    return this.liquidated().slice(start, start + this.listPageSize);
  });

  recurringTotalPages = computed(() => Math.max(1, Math.ceil(this.recurring().length / this.listPageSize)));
  recurringCurrentPage = computed(() => Math.min(this.recurringPage(), this.recurringTotalPages()));
  pagedRecurring = computed(() => {
    const start = (this.recurringCurrentPage() - 1) * this.listPageSize;
    return this.recurring().slice(start, start + this.listPageSize);
  });

  oneoffTotalPages = computed(() => Math.max(1, Math.ceil(this.oneoff().length / this.listPageSize)));
  oneoffCurrentPage = computed(() => Math.min(this.oneoffPage(), this.oneoffTotalPages()));
  pagedOneoff = computed(() => {
    const start = (this.oneoffCurrentPage() - 1) * this.listPageSize;
    return this.oneoff().slice(start, start + this.listPageSize);
  });

  ngOnInit() {
    this.store.dispatch(A.loadDashboard());
    this.store.select(Sel.selectCurve).pipe(takeUntil(this.destroy$)).subscribe(curve => {
      if (this.chart && curve.length) this.updateChart(curve);
    });
    
    // Load bank accounts for breakdown display
    this.svc.getBankAccounts().subscribe(accounts => {
      this.bankAccounts.set(accounts);
    });
  }

  ngAfterViewInit() {
    this.loadChartJs().then(() => {
      const curve = this.curve();
      if (curve.length) this.buildChart(curve);
      else {
        this.store.select(Sel.selectCurve).pipe(takeUntil(this.destroy$)).subscribe(c => {
          if (c.length && !this.chart) this.buildChart(c);
          else if (c.length && this.chart) this.updateChart(c);
        });
      }

      // Keep canvas colors synchronized with runtime theme toggles.
      this.themeObserver = new MutationObserver(() => this.applyChartTheme());
      this.themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme', 'data-mode'],
      });
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.themeObserver?.disconnect();
    if (this.chart) this.chart.destroy();
  }

  private loadChartJs(): Promise<void> {
    return new Promise(resolve => {
      if ((window as any).Chart) { resolve(); return; }
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js';
      s.onload = () => resolve();
      document.head.appendChild(s);
    });
  }

  private buildChart(curve: any[]) {
    const ctx = this.chartCanvas?.nativeElement?.getContext('2d');
    if (!ctx) return;
    const C = (window as any).Chart;
    if (!C) return;
    const labels = curve.map(p => p.date);
    
    // Filter to only include points with actual values
    const incomeData = curve.map((p, i) => p.income > 0 ? p.income : null);
    const expensesData = curve.map((p, i) => p.expenses > 0 ? { x: i, y: p.expenses } : null).filter(p => p !== null);
    const payablesData = curve.map((p, i) => p.payables > 0 ? { x: i, y: p.payables } : null).filter(p => p !== null);
    
    const theme = this.getChartTheme();
    this.chart = new C(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Income',
            data: incomeData,
            type: 'line',
            borderColor: theme.income,
            backgroundColor: 'transparent',
            pointBackgroundColor: theme.income,
            pointBorderColor: theme.income,
            borderWidth: 2.2,
            fill: false,
            tension: 0.35,
            pointRadius: 2.5,
            pointHoverRadius: 5,
            spanGaps: true,
          },
          {
            label: 'Expenses',
            data: expensesData,
            type: 'scatter',
            borderColor: theme.expenses,
            backgroundColor: theme.expenses,
            pointBackgroundColor: theme.expenses,
            pointBorderColor: theme.expenses,
            pointRadius: 5,
            pointHoverRadius: 7,
          },
          {
            label: 'Payables',
            data: payablesData,
            type: 'scatter',
            borderColor: theme.payables,
            backgroundColor: theme.payables,
            pointBackgroundColor: theme.payables,
            pointBorderColor: theme.payables,
            pointRadius: 5,
            pointHoverRadius: 7,
          }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { intersect: false, mode: 'index' },
        plugins: {
          legend: { 
            display: true,
            position: 'bottom',
            labels: {
              color: theme.tick,
              usePointStyle: true,
              padding: 15,
              font: { size: 12 }
            }
          },
          tooltip: {
            backgroundColor: theme.tooltipBg,
            borderColor: theme.tooltipBorder,
            borderWidth: 1,
            titleColor: theme.tooltipText,
            bodyColor: theme.tooltipText,
            callbacks: {
              title: (ctx: any) => {
                return 'Date: ' + ctx[0].label;
              },
              label: (ctx: any) => {
                const value = ctx.parsed.y;
                if (value === 0) return null;
                return ctx.dataset.label + ': LKR ' + Math.round(value).toLocaleString('en-LK');
              },
              footer: (ctx: any) => {
                const point = curve[ctx[0].dataIndex];
                const lines = [];
                if (point.income > 0) lines.push('Income: LKR ' + point.income.toLocaleString('en-LK'));
                if (point.expenses > 0) lines.push('Expenses: LKR ' + point.expenses.toLocaleString('en-LK'));
                if (point.payables > 0) lines.push('Payables: LKR ' + point.payables.toLocaleString('en-LK'));
                return lines.length > 0 ? '\n' + lines.join('\n') : '';
              }
            }
          },
          annotation: {
            annotations: {
              zeroLine: {
                type: 'line', yMin: 0, yMax: 0,
                borderColor: theme.zero,
                borderWidth: 1.5,
                borderDash: [6, 3],
                label: { content: 'Zero', display: true, position: 'end', color: theme.zero, font: { size: 11 } }
              }
            }
          }
        },
        scales: {
          x: {
            grid: { color: theme.grid },
            ticks: { color: theme.tick, maxTicksLimit: 7, font: { size: 11 } }
          },
          y: {
            grid: { color: theme.grid },
            ticks: {
              color: theme.tick,
              font: { size: 11 },
              callback: (v: number) => 'LKR ' + (v/1000000).toFixed(1) + 'M'
            }
          }
        }
      }
    });
  }

  private updateChart(curve: any[]) {
    if (!this.chart) { this.buildChart(curve); return; }
    this.chart.data.labels = curve.map(p => p.date);
    
    // Update with filtered data - only show dots when values > 0
    this.chart.data.datasets[0].data = curve.map((p, i) => p.income > 0 ? p.income : null);
    this.chart.data.datasets[1].data = curve.map((p, i) => p.expenses > 0 ? { x: i, y: p.expenses } : null).filter(p => p !== null);
    this.chart.data.datasets[2].data = curve.map((p, i) => p.payables > 0 ? { x: i, y: p.payables } : null).filter(p => p !== null);
    
    this.applyChartTheme();
    this.chart.update('active');
  }

  private applyChartTheme(): void {
    if (!this.chart) return;
    const theme = this.getChartTheme();
    
    // Income dataset (line)
    const incomeDataset = this.chart.data.datasets[0];
    incomeDataset.borderColor = theme.income;
    incomeDataset.pointBackgroundColor = theme.income;
    incomeDataset.pointBorderColor = theme.income;
    
    // Expenses dataset (scatter)
    const expensesDataset = this.chart.data.datasets[1];
    expensesDataset.borderColor = theme.expenses;
    expensesDataset.backgroundColor = theme.expenses;
    expensesDataset.pointBackgroundColor = theme.expenses;
    expensesDataset.pointBorderColor = theme.expenses;
    
    // Payables dataset (scatter)
    const payablesDataset = this.chart.data.datasets[2];
    payablesDataset.borderColor = theme.payables;
    payablesDataset.backgroundColor = theme.payables;
    payablesDataset.pointBackgroundColor = theme.payables;
    payablesDataset.pointBorderColor = theme.payables;

    this.chart.options.plugins.legend.labels.color = theme.tick;
    this.chart.options.plugins.tooltip.backgroundColor = theme.tooltipBg;
    this.chart.options.plugins.tooltip.borderColor = theme.tooltipBorder;
    this.chart.options.plugins.tooltip.titleColor = theme.tooltipText;
    this.chart.options.plugins.tooltip.bodyColor = theme.tooltipText;

    this.chart.options.plugins.annotation.annotations.zeroLine.borderColor = theme.zero;
    this.chart.options.plugins.annotation.annotations.zeroLine.label.color = theme.zero;

    this.chart.options.scales.x.grid.color = theme.grid;
    this.chart.options.scales.y.grid.color = theme.grid;
    this.chart.options.scales.x.ticks.color = theme.tick;
    this.chart.options.scales.y.ticks.color = theme.tick;

    this.chart.update('none');
  }

  private getChartTheme() {
    const rootStyles = getComputedStyle(document.documentElement);
    const pick = (name: string, fallback: string) => rootStyles.getPropertyValue(name).trim() || fallback;

    const accent = pick('--accent-2', '#41A5DA');
    const text = pick('--text', '#111827');
    const textSecondary = pick('--text-secondary', '#6B7280');
    const border = pick('--border', '#DFE6E6');
    const surface = pick('--surface', '#FFFFFF');

    return {
      income: pick('--green', '#10B981'),
      expenses: pick('--red', '#EF4444'),
      payables: pick('--amber', '#F59E0B'),
      line: accent,
      fill: `color-mix(in srgb, ${accent} 22%, transparent)`,
      grid: `color-mix(in srgb, ${border} 72%, transparent)`,
      tick: textSecondary,
      zero: pick('--red', '#EF4444'),
      tooltipBg: `color-mix(in srgb, ${surface} 92%, ${text} 8%)`,
      tooltipBorder: border,
      tooltipText: text,
    };
  }

  setVerifiedPage(nextPage: number): void {
    this.verifiedPage.set(Math.min(Math.max(1, nextPage), this.verifiedTotalPages()));
  }

  verifiedPageStart(): number {
    return (this.verifiedCurrentPage() - 1) * this.listPageSize + 1;
  }

  verifiedPageEnd(): number {
    return Math.min(this.verifiedCurrentPage() * this.listPageSize, this.verifiedInvoices().length);
  }

  setUnverifiedPage(nextPage: number): void {
    this.unverifiedPage.set(Math.min(Math.max(1, nextPage), this.unverifiedTotalPages()));
  }

  unverifiedPageStart(): number {
    return (this.unverifiedCurrentPage() - 1) * this.listPageSize + 1;
  }

  unverifiedPageEnd(): number {
    return Math.min(this.unverifiedCurrentPage() * this.listPageSize, this.unverifiedInvoices().length);
  }

  setLiquidatedPage(nextPage: number): void {
    this.liquidatedPage.set(Math.min(Math.max(1, nextPage), this.liquidatedTotalPages()));
  }

  liquidatedPageStart(): number {
    return (this.liquidatedCurrentPage() - 1) * this.listPageSize + 1;
  }

  liquidatedPageEnd(): number {
    return Math.min(this.liquidatedCurrentPage() * this.listPageSize, this.liquidated().length);
  }

  setRecurringPage(nextPage: number): void {
    this.recurringPage.set(Math.min(Math.max(1, nextPage), this.recurringTotalPages()));
  }

  recurringPageStart(): number {
    return (this.recurringCurrentPage() - 1) * this.listPageSize + 1;
  }

  recurringPageEnd(): number {
    return Math.min(this.recurringCurrentPage() * this.listPageSize, this.recurring().length);
  }

  setOneoffPage(nextPage: number): void {
    this.oneoffPage.set(Math.min(Math.max(1, nextPage), this.oneoffTotalPages()));
  }

  oneoffPageStart(): number {
    return (this.oneoffCurrentPage() - 1) * this.listPageSize + 1;
  }

  oneoffPageEnd(): number {
    return Math.min(this.oneoffCurrentPage() * this.listPageSize, this.oneoff().length);
  }

  onSlider(event: Event) {
    const val = +(event.target as HTMLInputElement).value;
    this.store.dispatch(A.updateSlider({ value: val }));
  }

  openLiquidityModal(inv: Invoice) {
    this.svc.getLiquidityImpact(inv.id).subscribe(impact => {
      this.liquidityImpact.set(impact);
      this.liquidationAmount.set(inv.grossAmount); // Default to full amount
      this.liquidationMessage.set(`Your payment for invoice ${inv.serialNumber} has been processed through CIXOR PayDay. Due date: ${inv.dueDate}. Please contact us if you have any questions.`);
      this.liquidityModal.set(true);
    });
  }

  confirmLiquidity() {
    const inv = this.liquidityImpact()?.invoice;
    if (!inv) return;
    
    const amount = this.liquidationAmount();
    const message = this.liquidationMessage().trim();
    
    // Validate amount
    if (amount <= 0 || amount > inv.grossAmount) {
      this.toast.error(`Liquidation amount must be between 1 and ${inv.grossAmount.toLocaleString('en-LK')}`);
      return;
    }
    
    this.svc.confirmLiquidity(inv.id, amount, message).subscribe(() => {
      this.liquidityModal.set(false);
      this.toast.success(`Liquidity intent confirmed for ${inv.serialNumber}. Debtor will be notified.`);
      this.store.dispatch(A.loadDashboard());
    });
  }

  openExpenseForm(type: 'recurring'|'oneoff', expense?: any) {
    this.expenseFormType.set(type);
    this.editingExpense = expense ?? null;
    this.expForm = expense ? { ...expense } : { name: '', amount: 0, frequency: 'Monthly', nextDueDate: '', dueDate: '' };
    this.expenseFormOpen.set(true);
  }
  editRecurring(e: RecurringExpense) { this.openExpenseForm('recurring', e); }
  editOneOff(e: OneOffExpense)       { this.openExpenseForm('oneoff', e); }

  deleteRecurring(expense: RecurringExpense) {
    this.expenseToDelete.set({ type: 'recurring', id: expense.id, name: expense.name });
  }
  deleteOneOff(expense: OneOffExpense) {
    this.expenseToDelete.set({ type: 'oneoff', id: expense.id, name: expense.name });
  }

  confirmExpenseDelete() {
    const pending = this.expenseToDelete();
    if (!pending) return;
    const request = pending.type === 'recurring'
      ? this.svc.deleteRecurring(pending.id)
      : this.svc.deleteOneOff(pending.id);
    request.subscribe(() => {
      this.expenseToDelete.set(null);
      this.toast.success('Expense removed.');
      this.store.dispatch(A.loadDashboard());
    });
  }

  saveExpense() {
    if (this.expenseFormType() === 'recurring') {
      this.svc.saveRecurring(this.expForm).subscribe(() => {
        this.expenseFormOpen.set(false);
        this.toast.success('Recurring expense saved.');
        this.store.dispatch(A.loadDashboard());
      });
    } else {
      this.svc.saveOneOff(this.expForm).subscribe(() => {
        this.expenseFormOpen.set(false);
        this.toast.success('One-off expense saved.');
        this.store.dispatch(A.loadDashboard());
      });
    }
  }
}
