import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MockDataService } from '../../core/services/mock-data.service';
import { ToastService } from '../../core/services/toast.service';
import { Customer, DebtorOfficer } from '../../shared/models/models';

@Component({
  selector: 'app-customer-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="page-header flex items-center gap-3 mb-6">
      <button class="btn btn-ghost btn-sm" routerLink="/customers">← Back</button>
      <h2>{{ isEdit() ? 'Edit Customer' : 'New Customer' }}</h2>
    </div>

    <div style="max-width:740px">
      <!-- Customer Details -->
      <div class="card mb-4">
        <h3 class="section-title">Customer Details</h3>
        <div class="grid-2 gap-4">
          <div class="form-group mb-0">
            <label class="form-label">Company / Customer Name <span class="required">*</span></label>
            <input class="form-control" [(ngModel)]="form.name" placeholder="Acme Technologies (Pvt) Ltd"/>
          </div>
          <div class="form-group mb-0">
            <label class="form-label">TIN</label>
            <input class="form-control" [(ngModel)]="form.tin" placeholder="114XXXXXXX V"/>
          </div>
          <div class="form-group mb-0">
            <label class="form-label">VAT Reg. No.</label>
            <input class="form-control" [(ngModel)]="form.vatRegNo" placeholder="114XXXXXXX 7000"/>
          </div>
          <div class="form-group mb-0">
            <label class="form-label">Business Reg. No.</label>
            <input class="form-control" [(ngModel)]="form.brn" placeholder="PV 12345"/>
          </div>
          <div class="form-group mb-0">
            <label class="form-label">Email <span class="required">*</span></label>
            <input class="form-control" type="email" [(ngModel)]="form.email"/>
          </div>
          <div class="form-group mb-0">
            <label class="form-label">Phone</label>
            <input class="form-control" [(ngModel)]="form.phone" placeholder="+94 11 xxx xxxx"/>
          </div>
          <div class="form-group mb-0 col-span-2">
            <label class="form-label">Address</label>
            <textarea class="form-control" [(ngModel)]="form.address" rows="2" placeholder="No. 1, Main Street, Colombo 01"></textarea>
          </div>
        </div>
      </div>

      <!-- Authorized Officers -->
      <div class="card mb-4">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h3 class="section-title" style="margin:0">Debtor Authorized Officers</h3>
            <div class="text-xs text-muted mt-1">These officers will receive OTP to accept invoices in the Debtor Portal.</div>
          </div>
          <button class="btn btn-secondary btn-sm" (click)="addOfficer()">+ Add Officer</button>
        </div>

        <div *ngFor="let off of form.officers; let i = index" class="officer-row">
          <div class="flex items-center justify-between mb-2">
            <div class="font-medium text-sm">Officer {{ i + 1 }}</div>
            <button class="btn btn-ghost btn-sm text-red" (click)="removeOfficer(i)">Remove</button>
          </div>
          <div class="grid-2 gap-3">
            <div class="form-group mb-0">
              <label class="form-label">Full Name <span class="required">*</span></label>
              <input class="form-control form-control-sm" [(ngModel)]="off.name" placeholder="John Smith"/>
            </div>
            <div class="form-group mb-0">
              <label class="form-label">Designation <span class="required">*</span></label>
              <input class="form-control form-control-sm" [(ngModel)]="off.designation" placeholder="CFO, Finance Manager…"/>
            </div>
            <div class="form-group mb-0">
              <label class="form-label">Email <span class="required">*</span></label>
              <input class="form-control form-control-sm" type="email" [(ngModel)]="off.email"/>
            </div>
            <div class="form-group mb-0">
              <label class="form-label">Mobile <span class="required">*</span></label>
              <input class="form-control form-control-sm" [(ngModel)]="off.mobile" placeholder="+94 7X XXX XXXX"/>
            </div>
            <div class="form-group mb-0">
              <label class="form-label">National ID</label>
              <input class="form-control form-control-sm" [(ngModel)]="off.nic" placeholder="XXXXXXXXXX V"/>
            </div>
            <div class="form-group mb-0 flex items-end">
              <label class="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" [(ngModel)]="off.isPrimary" (change)="setPrimary(i)"/>
                <span>Primary Contact</span>
              </label>
            </div>
          </div>
        </div>

        <div *ngIf="form.officers.length === 0" class="text-muted text-sm p-4 text-center">
          No officers added. At least one authorized officer is recommended for invoice acceptance.
        </div>
      </div>

      <div class="flex gap-3">
        <button class="btn btn-secondary" routerLink="/customers">Cancel</button>
        <button class="btn btn-primary" (click)="save()">Save Customer</button>
      </div>
    </div>
  `,
  styles: [`
    .section-title { font-size:13px; font-weight:600; color:var(--text-secondary); text-transform:uppercase; letter-spacing:.05em; margin-bottom:12px; }
    .col-span-2 { grid-column: 1 / -1; }
    .officer-row { background:var(--bg); border:1px solid var(--border); border-radius:8px; padding:16px; margin-bottom:12px; }
  `]
})
export class CustomerFormComponent implements OnInit {
  private svc   = inject(MockDataService);
  private toast = inject(ToastService);
  private router = inject(Router);
  private route  = inject(ActivatedRoute);

  isEdit = signal(false);
  form: any = { id: null, name: '', tin: '', vatRegNo: '', brn: '', email: '', phone: '', address: '', officers: [] };

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    this.isEdit.set(!!id);
    if (id) {
      this.svc.getCustomer(id).subscribe(c => { if (c) this.form = { ...c, officers: [...(c.officers || [])] }; });
    }
  }

  addOfficer() {
    this.form.officers = [...this.form.officers, { id: Date.now().toString(), name: '', designation: '', email: '', mobile: '', nic: '', isPrimary: false }];
  }

  removeOfficer(i: number) {
    this.form.officers = this.form.officers.filter((_: any, idx: number) => idx !== i);
  }

  setPrimary(i: number) {
    this.form.officers = this.form.officers.map((o: DebtorOfficer, idx: number) => ({ ...o, isPrimary: idx === i }));
  }

  save() {
    if (!this.form.name) { this.toast.error('Customer name is required.'); return; }
    this.svc.saveCustomer(this.form).subscribe(saved => {
      this.toast.success(`Customer "${saved.name}" saved.`);
      this.router.navigate(['/customers', saved.id]);
    });
  }
}
