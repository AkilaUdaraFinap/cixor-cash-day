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
        <div class="text-sm text-muted mt-2">as of {{ today }}</div>
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
      <div class="flex items-center justify-between mb-3">
        <div>
          <h3 style="font-size:16px">Cash Collection Simulation</h3>
          <div class="text-sm text-muted mt-1">What % of your outstanding invoices will be paid on time in the next 30 days?</div>
        </div>
        <div class="flex gap-2 items-center">
          <span class="badge" [class]="slider() >= breakEven() ? 'badge-verified' : 'badge-invited'">
            Break-even at {{ breakEven() }}%
          </span>
          <ng-container *ngIf="stressPoint() as sp">
            <span class="badge" [class]="slider() >= breakEven() ? 'badge-verified' : 'badge-rejected'">
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
        <h3 style="font-size:16px">30-Day Cash Projection</h3>
        <div class="text-sm text-muted">Simulation at {{ slider() }}% collection probability</div>
      </div>
      <div style="position:relative;height:280px">
        <canvas #chartCanvas></canvas>
      </div>
      <div class="flex gap-4 mt-3 text-sm text-muted" style="justify-content:center;flex-wrap:wrap">
        <span><span style="display:inline-block;width:16px;height:3px;background:var(--brand);margin-right:4px;vertical-align:middle"></span>Projected Cash</span>
        <span><span style="display:inline-block;width:16px;height:2px;background:var(--red);margin-right:4px;vertical-align:middle;border-top:2px dashed var(--red)"></span>Zero Line</span>
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
        <button class="tab-item" [class.active]="activeTab()===2" (click)="activeTab.set(2)">Fixed Expenses</button>
      </div>

      <!-- Tab 0: Outstanding Invoices -->
      <div *ngIf="activeTab()===0" class="p-6">
        <ng-container *ngIf="outstanding().length > 0; else emptyOutstanding">
          <!-- Verified section -->
          <ng-container *ngIf="verifiedInvoices().length > 0">
            <div class="section-header">
              Verified Receivables
              <span class="badge badge-verified">{{ verifiedInvoices().length }}</span>
            </div>
            <div class="table-wrap">
              <table class="data-table">
                <thead><tr>
                  <th>Invoice No.</th><th>Customer</th><th>Due Date</th>
                  <th class="text-right">Net (LKR)</th><th class="text-right">VAT (LKR)</th><th class="text-right">Gross (LKR)</th>
                  <th>Status</th><th>Action</th>
                </tr></thead>
                <tbody>
                  <tr *ngFor="let inv of verifiedInvoices()">
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
          </ng-container>
          <!-- Unverified section -->
          <ng-container *ngIf="unverifiedInvoices().length > 0">
            <div class="section-header mt-4">
              Unverified Receivables
              <span class="badge badge-unverified">{{ unverifiedInvoices().length }}</span>
            </div>
            <div class="table-wrap">
              <table class="data-table">
                <thead><tr>
                  <th>Invoice No.</th><th>Customer</th><th>Due Date</th>
                  <th class="text-right">Gross (LKR)</th><th>Status</th><th>Action</th>
                </tr></thead>
                <tbody>
                  <tr *ngFor="let inv of unverifiedInvoices()">
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
          <div class="table-wrap">
            <table class="data-table">
              <thead><tr>
                <th>Invoice No.</th><th>Customer</th><th>Liquidated</th>
                <th class="text-right">Gross (LKR)</th><th class="text-right">Fee (LKR)</th><th class="text-right">Net Received (LKR)</th>
                <th>Settlement</th>
              </tr></thead>
              <tbody>
                <tr *ngFor="let inv of liquidated()">
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
        </ng-container>
        <ng-template #emptyLiquidated>
          <div class="empty-state">
            <div class="empty-icon">💸</div>
            <div class="font-medium mt-2">No liquidated invoices yet</div>
          </div>
        </ng-template>
      </div>

      <!-- Tab 2: Fixed Expenses -->
      <div *ngIf="activeTab()===2" class="p-6">
        <!-- Recurring -->
        <div class="flex items-center justify-between mb-3">
          <h4>Recurring Expenses</h4>
          <button class="btn btn-secondary btn-sm" (click)="openExpenseForm('recurring')">+ Add Recurring</button>
        </div>
        <div class="table-wrap mb-6">
          <table class="data-table" *ngIf="recurring().length > 0; else emptyRecurring">
            <thead><tr><th>Name</th><th>Amount (LKR)</th><th>Frequency</th><th>Next Due</th><th></th></tr></thead>
            <tbody>
              <tr *ngFor="let e of recurring()">
                <td>{{ e.name }}</td>
                <td class="lkr-mono">{{ e.amount | lkr }}</td>
                <td>{{ e.frequency }}</td>
                <td>{{ e.nextDueDate }}</td>
                <td class="row-actions">
                  <button class="btn btn-ghost btn-sm" (click)="editRecurring(e)">Edit</button>
                  <button class="btn btn-ghost btn-sm text-red" (click)="deleteRecurring(e.id)">Delete</button>
                </td>
              </tr>
              <tr style="font-weight:600;background:var(--bg)">
                <td>Monthly Operating Cost</td>
                <td class="lkr-mono text-amber">{{ monthlyTotal() | lkr }}</td>
                <td colspan="3"></td>
              </tr>
            </tbody>
          </table>
          <ng-template #emptyRecurring>
            <div class="text-muted text-sm p-4">No recurring expenses. Add one to improve projection accuracy.</div>
          </ng-template>
        </div>
        <!-- One-Off -->
        <div class="flex items-center justify-between mb-3">
          <h4>One-Off Planned Expenses</h4>
          <button class="btn btn-secondary btn-sm" (click)="openExpenseForm('oneoff')">+ Add One-Off</button>
        </div>
        <div class="table-wrap">
          <table class="data-table" *ngIf="oneoff().length > 0; else emptyOneOff">
            <thead><tr><th>Name</th><th>Amount (LKR)</th><th>Due Date</th><th></th></tr></thead>
            <tbody>
              <tr *ngFor="let e of oneoff()">
                <td>{{ e.name }}</td>
                <td class="lkr-mono">{{ e.amount | lkr }}</td>
                <td>{{ e.dueDate }}</td>
                <td class="row-actions">
                  <button class="btn btn-ghost btn-sm" (click)="editOneOff(e)">Edit</button>
                  <button class="btn btn-ghost btn-sm text-red" (click)="deleteOneOff(e.id)">Delete</button>
                </td>
              </tr>
            </tbody>
          </table>
          <ng-template #emptyOneOff>
            <div class="text-muted text-sm p-4">No one-off expenses planned.</div>
          </ng-template>
        </div>
      </div>
    </div>

    <!-- Expense Slide-over -->
    <ng-container *ngIf="expenseFormOpen()">
      <div class="slideover-overlay" (click)="expenseFormOpen.set(false)"></div>
      <div class="slideover">
        <div class="slideover-header">
          <h3 style="font-size:16px">{{ editingExpense?.id ? 'Edit' : 'Add' }} {{ expenseFormType() === 'recurring' ? 'Recurring Expense' : 'One-Off Expense' }}</h3>
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
      <div class="overlay" (click.self)="liquidityModal.set(false)">
        <div class="modal" style="max-width:600px">
          <div class="modal-header">
            <h3>Confirm Liquidity Intent</h3>
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
            <!-- Fee Breakdown -->
            <h4 class="mb-3" style="color:var(--text-secondary);font-size:12px;text-transform:uppercase;letter-spacing:.05em">Fee Breakdown</h4>
            <div class="grid-2 gap-2 mb-4 text-sm">
              <div class="flex justify-between"><span class="text-muted">Discount / Fee</span><span class="text-red lkr-mono">{{ li.fee | lkr }} ({{ li.feePercent }}%)</span></div>
              <div class="flex justify-between"><span class="text-muted">Net Cash Received Today</span><span class="font-bold text-green lkr-mono">{{ li.netCashToday | lkr }}</span></div>
            </div>
            <hr class="divider"/>
            <!-- Before / After -->
            <h4 class="mb-3" style="color:var(--text-secondary);font-size:12px;text-transform:uppercase;letter-spacing:.05em">Cash Impact</h4>
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
              <strong>Settlement Disclosure:</strong> If you confirm, this invoice will be settled to CIXOR PayDay at the time of the liquidity event. The settlement path for this invoice will change from direct customer payment to CIXOR PayDay settlement.
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="liquidityModal.set(false)">Cancel</button>
            <button class="btn btn-primary" (click)="confirmLiquidity()">Confirm Liquidity</button>
          </div>
        </div>
      </div>
    </ng-container>
  `,
  styles: [`
    .empty-state { text-align:center; padding: 40px; }
    .empty-icon  { font-size: 36px; }
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

  verifiedInvoices   = computed(() => this.outstanding().filter(i => i.isVerified));
  unverifiedInvoices = computed(() => this.outstanding().filter(i => !i.isVerified));
  verifiedCount      = computed(() => this.verifiedInvoices().length);
  monthlyTotal       = computed(() => this.recurring().filter(e => e.frequency === 'Monthly').reduce((s, e) => s + e.amount, 0));

  activeTab    = signal(0);
  liquidityModal = signal(false);
  liquidityImpact = signal<LiquidityImpact | null>(null);
  expenseFormOpen = signal(false);
  expenseFormType = signal<'recurring'|'oneoff'>('recurring');
  editingExpense: any = null;
  expForm: any = {};

  ngOnInit() {
    this.store.dispatch(A.loadDashboard());
    this.store.select(Sel.selectCurve).pipe(takeUntil(this.destroy$)).subscribe(curve => {
      if (this.chart && curve.length) this.updateChart(curve);
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
    const data   = curve.map(p => p.balance);
    const theme = this.getChartTheme();
    this.chart = new C(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Projected Cash Balance',
          data,
          borderColor: theme.line,
          backgroundColor: theme.fill,
          pointBackgroundColor: theme.line,
          pointBorderColor: theme.line,
          borderWidth: 2.2,
          fill: true,
          tension: 0.35,
          pointRadius: 2.5,
          pointHoverRadius: 5,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { intersect: false, mode: 'index' },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: theme.tooltipBg,
            borderColor: theme.tooltipBorder,
            borderWidth: 1,
            titleColor: theme.tooltipText,
            bodyColor: theme.tooltipText,
            callbacks: {
              label: (ctx: any) => ' LKR ' + Math.round(ctx.parsed.y).toLocaleString('en-LK')
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
    this.chart.data.datasets[0].data = curve.map(p => p.balance);
    this.applyChartTheme();
    this.chart.update('active');
  }

  private applyChartTheme(): void {
    if (!this.chart) return;
    const theme = this.getChartTheme();
    const dataset = this.chart.data.datasets[0];
    dataset.borderColor = theme.line;
    dataset.backgroundColor = theme.fill;
    dataset.pointBackgroundColor = theme.line;
    dataset.pointBorderColor = theme.line;

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

  onSlider(event: Event) {
    const val = +(event.target as HTMLInputElement).value;
    this.store.dispatch(A.updateSlider({ value: val }));
  }

  openLiquidityModal(inv: Invoice) {
    this.svc.getLiquidityImpact(inv.id).subscribe(impact => {
      this.liquidityImpact.set(impact);
      this.liquidityModal.set(true);
    });
  }

  confirmLiquidity() {
    const inv = this.liquidityImpact()?.invoice;
    if (!inv) return;
    this.svc.confirmLiquidity(inv.id).subscribe(() => {
      this.liquidityModal.set(false);
      this.toast.success(`Liquidity intent confirmed for ${inv.serialNumber}.`);
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

  deleteRecurring(id: string) {
    this.svc.deleteRecurring(id).subscribe(() => { this.toast.success('Expense removed.'); this.store.dispatch(A.loadDashboard()); });
  }
  deleteOneOff(id: string) {
    this.svc.deleteOneOff(id).subscribe(() => { this.toast.success('Expense removed.'); this.store.dispatch(A.loadDashboard()); });
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
