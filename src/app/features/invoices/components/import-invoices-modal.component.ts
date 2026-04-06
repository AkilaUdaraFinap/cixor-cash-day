import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Customer } from '../../../shared/models/models';

export interface ImportedInvoiceRow {
  customerId?: string;
  customerName: string;
  externalInvoiceNo: string;
  sourceSystem: string;
  invoiceDate: string;
  dueDate: string;
  grossAmount: number;
  vatAmount: number;
  netAmount: number;
  debtorOfficerId?: string;
  debtorOfficerEmail?: string;
  verificationMode: 'portal' | 'visibility-only';
  severity: 'ready' | 'warning' | 'blocked';
  issues: string[];
}

@Component({
  selector: 'app-import-invoices-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="overlay" (click.self)="closed.emit()" tabindex="-1">
      <div class="modal" style="max-width:920px" role="dialog" aria-modal="true" aria-labelledby="import-invoices-title">
        <div class="modal-header">
          <h3 id="import-invoices-title">Import External Invoices</h3>
          <button class="btn btn-ghost btn-sm" type="button" (click)="closed.emit()">✕</button>
        </div>
        <div class="modal-body">
          <div class="text-muted text-sm mb-3">Paste CSV content or upload a <code>.csv</code> file. Required columns: <code>customerName</code>, <code>externalInvoiceNo</code>, <code>invoiceDate</code>, <code>dueDate</code>, <code>grossAmount</code>.</div>

          <div class="flex gap-2 flex-wrap mb-3">
            <input type="file" accept=".csv,text/csv" (change)="onFilePicked($event)" />
            <button class="btn btn-secondary btn-sm" type="button" (click)="parseCsv()">Preview Import</button>
          </div>

          <textarea class="form-control" rows="8" [(ngModel)]="csvText" placeholder="customerName,externalInvoiceNo,sourceSystem,invoiceDate,dueDate,grossAmount,vatAmount,verificationMode&#10;Acme Corp Ltd,ERP-90045,Legacy ERP,2026-04-02,2026-04-28,737500,112500,portal"></textarea>

          <div class="info-box info text-sm mt-3" *ngIf="rows().length">
            Ready: <strong>{{ summary().ready }}</strong> · Warning: <strong>{{ summary().warning }}</strong> · Blocked: <strong>{{ summary().blocked }}</strong>
          </div>

          <div class="table-wrap mt-4" *ngIf="rows().length">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>External No.</th>
                  <th>Source</th>
                  <th>Gross (LKR)</th>
                  <th>Verification</th>
                  <th>Status</th>
                  <th>Issues</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let row of rows()">
                  <td>{{ row.customerName }}</td>
                  <td>{{ row.externalInvoiceNo }}</td>
                  <td>{{ row.sourceSystem }}</td>
                  <td>{{ row.grossAmount | number:'1.0-0' }}</td>
                  <td>{{ row.verificationMode }}</td>
                  <td>
                    <span class="badge" [class.badge-verified]="row.severity === 'ready'" [class.badge-invited]="row.severity === 'warning'" [class.badge-rejected]="row.severity === 'blocked'">
                      {{ row.severity }}
                    </span>
                  </td>
                  <td>{{ row.issues.join('; ') || '—' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" type="button" (click)="closed.emit()">Cancel</button>
          <button class="btn btn-primary" type="button" [disabled]="!importableRows().length" (click)="confirmImport()">Import {{ importableRows().length }} row(s)</button>
        </div>
      </div>
    </div>
  `,
})
export class ImportInvoicesModalComponent {
  @Input() customers: Customer[] = [];
  @Input() existingExternalRefs: string[] = [];
  @Output() closed = new EventEmitter<void>();
  @Output() importConfirmed = new EventEmitter<ImportedInvoiceRow[]>();

  csvText = '';
  rows = signal<ImportedInvoiceRow[]>([]);
  summary = signal({ ready: 0, warning: 0, blocked: 0 });

  importableRows(): ImportedInvoiceRow[] {
    return this.rows().filter(row => row.severity !== 'blocked');
  }

  onFilePicked(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      this.csvText = String(reader.result || '');
      this.parseCsv();
    };
    reader.readAsText(file);
  }

  parseCsv(): void {
    const text = this.csvText.trim();
    if (!text) {
      this.rows.set([]);
      this.summary.set({ ready: 0, warning: 0, blocked: 0 });
      return;
    }

    const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    if (lines.length < 2) {
      this.rows.set([]);
      this.summary.set({ ready: 0, warning: 0, blocked: 1 });
      return;
    }

    const headers = lines[0].split(',').map(value => value.trim());
    const indexOf = (name: string) => headers.findIndex(header => header.toLowerCase() === name.toLowerCase());
    const requiredHeaders = ['customerName', 'externalInvoiceNo', 'invoiceDate', 'dueDate', 'grossAmount'];
    if (requiredHeaders.some(header => indexOf(header) < 0)) {
      this.rows.set([]);
      this.summary.set({ ready: 0, warning: 0, blocked: 1 });
      return;
    }

    const parsed = lines.slice(1).map(line => {
      const parts = line.split(',').map(value => value.trim().replace(/^"|"$/g, ''));
      const customerName = parts[indexOf('customerName')] || '';
      const externalInvoiceNo = parts[indexOf('externalInvoiceNo')] || '';
      const sourceSystem = parts[indexOf('sourceSystem')] || 'CSV Import';
      const invoiceDate = parts[indexOf('invoiceDate')] || '';
      const dueDate = parts[indexOf('dueDate')] || '';
      const grossAmount = Number(parts[indexOf('grossAmount')] || 0);
      const vatAmount = Number(parts[indexOf('vatAmount')] || Math.round(grossAmount * 0.18));
      const verificationMode = ((parts[indexOf('verificationMode')] || 'portal').toLowerCase() === 'visibility-only' ? 'visibility-only' : 'portal') as 'portal' | 'visibility-only';
      const issues: string[] = [];

      const matchedCustomer = this.customers.find(customer => customer.name.toLowerCase() === customerName.toLowerCase());
      if (!customerName || !matchedCustomer) issues.push('Customer not matched');
      if (!externalInvoiceNo) issues.push('Missing external invoice number');
      if (this.existingExternalRefs.includes(externalInvoiceNo)) issues.push('Duplicate external invoice number');
      if (!invoiceDate || Number.isNaN(new Date(`${invoiceDate}T00:00:00`).getTime())) issues.push('Invalid invoice date');
      if (!dueDate || Number.isNaN(new Date(`${dueDate}T00:00:00`).getTime())) issues.push('Invalid due date');
      if (!Number.isFinite(grossAmount) || grossAmount <= 0) issues.push('Invalid gross amount');

      const severity: 'ready' | 'warning' | 'blocked'
        = issues.some(issue => /Customer|Missing|Invalid|Duplicate/.test(issue)) ? 'blocked' : (sourceSystem === 'CSV Import' ? 'warning' : 'ready');

      return {
        customerId: matchedCustomer?.id,
        customerName,
        externalInvoiceNo,
        sourceSystem,
        invoiceDate,
        dueDate,
        grossAmount,
        vatAmount,
        netAmount: Math.max(0, grossAmount - vatAmount),
        debtorOfficerId: matchedCustomer?.officers.find(officer => officer.isPrimary)?.id,
        debtorOfficerEmail: matchedCustomer?.officers.find(officer => officer.isPrimary)?.email,
        verificationMode,
        severity,
        issues,
      } satisfies ImportedInvoiceRow;
    });

    this.rows.set(parsed);
    this.summary.set({
      ready: parsed.filter(row => row.severity === 'ready').length,
      warning: parsed.filter(row => row.severity === 'warning').length,
      blocked: parsed.filter(row => row.severity === 'blocked').length,
    });
  }

  confirmImport(): void {
    this.importConfirmed.emit(this.importableRows());
  }
}
