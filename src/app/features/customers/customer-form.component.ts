import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CustomerDataService } from '../../core/services/customer-data.service';
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
        <div class="info-box danger text-sm mb-4" *ngIf="customerIssues().length">
          {{ customerIssues()[0] }}
        </div>
        <div class="grid-2 gap-4">
          <div class="form-group mb-0">
            <label class="form-label">Company / Customer Name <span class="required">*</span></label>
            <input class="form-control" [class.error]="customerFieldError('name')" [(ngModel)]="form.name" placeholder="Acme Technologies (Pvt) Ltd"/>
            <div class="form-error" *ngIf="customerFieldError('name')">{{ customerFieldError('name') }}</div>
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
            <input class="form-control" [class.error]="customerFieldError('email')" type="email" [(ngModel)]="form.email"/>
            <div class="form-error" *ngIf="customerFieldError('email')">{{ customerFieldError('email') }}</div>
          </div>
          <div class="form-group mb-0">
            <label class="form-label">Phone</label>
            <input class="form-control" [class.error]="customerFieldError('phone')" [(ngModel)]="form.phone" placeholder="+94 11 xxx xxxx"/>
            <div class="form-error" *ngIf="customerFieldError('phone')">{{ customerFieldError('phone') }}</div>
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
        <div class="info-box danger text-sm mb-4" *ngIf="officerIssues().length">
          {{ officerIssues()[0] }}
        </div>

        <div *ngFor="let off of form.officers; let i = index" class="officer-row" [class.officer-row-invalid]="officerRowInvalid(i)">
          <div class="flex items-center justify-between mb-2">
            <div class="font-medium text-sm">Officer {{ i + 1 }}</div>
            <button class="btn btn-ghost btn-sm text-red" (click)="removeOfficer(i)">Remove</button>
          </div>
          <div class="grid-2 gap-3">
            <div class="form-group mb-0">
              <label class="form-label">Full Name <span class="required">*</span></label>
              <input class="form-control form-control-sm" [class.error]="officerFieldError(i, 'name')" [(ngModel)]="off.name" placeholder="John Smith"/>
              <div class="form-error" *ngIf="officerFieldError(i, 'name')">{{ officerFieldError(i, 'name') }}</div>
            </div>
            <div class="form-group mb-0">
              <label class="form-label">Designation <span class="required">*</span></label>
              <input class="form-control form-control-sm" [class.error]="officerFieldError(i, 'designation')" [(ngModel)]="off.designation" placeholder="CFO, Finance Manager…"/>
              <div class="form-error" *ngIf="officerFieldError(i, 'designation')">{{ officerFieldError(i, 'designation') }}</div>
            </div>
            <div class="form-group mb-0">
              <label class="form-label">Email <span class="required">*</span></label>
              <input class="form-control form-control-sm" [class.error]="officerFieldError(i, 'email')" type="email" [(ngModel)]="off.email"/>
              <div class="form-error" *ngIf="officerFieldError(i, 'email')">{{ officerFieldError(i, 'email') }}</div>
            </div>
            <div class="form-group mb-0">
              <label class="form-label">Mobile <span class="required">*</span></label>
              <input class="form-control form-control-sm" [class.error]="officerFieldError(i, 'mobile')" [(ngModel)]="off.mobile" placeholder="+94 7X XXX XXXX"/>
              <div class="form-error" *ngIf="officerFieldError(i, 'mobile')">{{ officerFieldError(i, 'mobile') }}</div>
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
          Add at least one authorized officer before saving this customer.
        </div>
      </div>

      <div class="flex gap-3">
        <button class="btn btn-secondary" routerLink="/customers">Cancel</button>
        <button class="btn btn-primary" [disabled]="!canSave()" (click)="save()">Save Customer</button>
      </div>
    </div>
  `,
  styles: [`
    .section-title { font-size:13px; font-weight:600; color:var(--text-secondary); text-transform:uppercase; letter-spacing:.05em; margin-bottom:12px; }
    .col-span-2 { grid-column: 1 / -1; }
    .officer-row { background:var(--bg); border:1px solid var(--border); border-radius:8px; padding:16px; margin-bottom:12px; }
    .officer-row-invalid { border-color: color-mix(in srgb, var(--red) 65%, var(--border)); }
  `]
})
export class CustomerFormComponent implements OnInit {
  private svc   = inject(CustomerDataService);
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
    this.form.officers = [...this.form.officers, { id: Date.now().toString(), name: '', designation: '', email: '', mobile: '', nic: '', isPrimary: this.form.officers.length === 0 }];
  }

  removeOfficer(i: number) {
    const removedOfficer = this.form.officers[i];
    const nextOfficers = this.form.officers.filter((_: any, idx: number) => idx !== i);
    if (removedOfficer?.isPrimary && nextOfficers.length) {
      nextOfficers[0] = { ...nextOfficers[0], isPrimary: true };
    }
    this.form.officers = nextOfficers;
  }

  setPrimary(i: number) {
    this.form.officers = this.form.officers.map((o: DebtorOfficer, idx: number) => ({ ...o, isPrimary: idx === i }));
  }

  customerIssues(): string[] {
    const issues: string[] = [];
    if (!this.form.name?.trim()) issues.push('Customer name is required.');
    if (!this.form.email?.trim()) issues.push('Customer email is required.');
    else if (!this.isEmailValid(this.form.email)) issues.push('Enter a valid customer email address.');
    if (this.form.phone?.trim() && !this.isPhoneValid(this.form.phone)) issues.push('Enter a valid customer phone number.');
    return issues;
  }

  customerFieldError(field: 'name' | 'email' | 'phone'): string {
    if (field === 'name' && !this.form.name?.trim()) return 'Customer name is required.';
    if (field === 'email') {
      if (!this.form.email?.trim()) return 'Customer email is required.';
      if (!this.isEmailValid(this.form.email)) return 'Enter a valid email address.';
    }
    if (field === 'phone' && this.form.phone?.trim() && !this.isPhoneValid(this.form.phone)) return 'Use digits, spaces, +, hyphen, or parentheses only.';
    return '';
  }

  officerIssues(): string[] {
    const officers = this.form.officers as DebtorOfficer[];
    const issues: string[] = [];
    if (!officers.length) issues.push('At least one authorized officer is required for invoice acceptance.');
    if (officers.length && !officers.some(officer => officer.isPrimary)) issues.push('Select one primary authorized officer.');
    officers.forEach((_, index) => {
      if (this.officerFieldError(index, 'name')) issues.push(`Officer ${index + 1} needs a full name.`);
      if (this.officerFieldError(index, 'designation')) issues.push(`Officer ${index + 1} needs a designation.`);
      if (this.officerFieldError(index, 'email')) issues.push(`Officer ${index + 1} needs a valid email address.`);
      if (this.officerFieldError(index, 'mobile')) issues.push(`Officer ${index + 1} needs a valid mobile number.`);
    });
    return Array.from(new Set(issues));
  }

  officerFieldError(index: number, field: 'name' | 'designation' | 'email' | 'mobile'): string {
    const officer = this.form.officers[index] as DebtorOfficer | undefined;
    if (!officer) return '';
    if (field === 'name' && !officer.name?.trim()) return 'Full name is required.';
    if (field === 'designation' && !officer.designation?.trim()) return 'Designation is required.';
    if (field === 'email') {
      if (!officer.email?.trim()) return 'Email is required.';
      if (!this.isEmailValid(officer.email)) return 'Enter a valid email address.';
    }
    if (field === 'mobile') {
      if (!officer.mobile?.trim()) return 'Mobile number is required.';
      if (!this.isPhoneValid(officer.mobile)) return 'Enter a valid mobile number.';
    }
    return '';
  }

  officerRowInvalid(index: number): boolean {
    return !!this.officerFieldError(index, 'name')
      || !!this.officerFieldError(index, 'designation')
      || !!this.officerFieldError(index, 'email')
      || !!this.officerFieldError(index, 'mobile');
  }

  canSave(): boolean {
    return this.customerIssues().length === 0 && this.officerIssues().length === 0;
  }

  save() {
    const issues = [...this.customerIssues(), ...this.officerIssues()];
    if (issues.length) {
      this.toast.error(issues[0]);
      return;
    }
    const payload: Customer = {
      ...this.form,
      name: this.form.name.trim(),
      tin: this.form.tin?.trim() || '',
      vatRegNo: this.form.vatRegNo?.trim() || '',
      brn: this.form.brn?.trim() || '',
      email: this.form.email.trim().toLowerCase(),
      phone: this.form.phone?.trim() || '',
      address: this.form.address?.trim() || '',
      officers: (this.form.officers as DebtorOfficer[]).map(officer => ({
        ...officer,
        name: officer.name.trim(),
        designation: officer.designation.trim(),
        email: officer.email.trim().toLowerCase(),
        mobile: officer.mobile?.trim() || '',
        nic: officer.nic?.trim() || '',
      })),
    };
    this.svc.saveCustomer(payload).subscribe({
      next: saved => {
        this.toast.success(`Customer "${saved.name}" saved.`);
        this.router.navigate(['/customers', saved.id]);
      },
      error: error => this.toast.error(error?.message || 'Unable to save customer.'),
    });
  }

  private isEmailValid(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((value || '').trim());
  }

  private isPhoneValid(value: string): boolean {
    return /^[+()\d\s-]{7,20}$/.test((value || '').trim());
  }
}
