import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { MockDataService } from './mock-data.service';
import {
  CompanyConfig,
  Customer,
  Invoice,
  LiquidityImpact,
  PaymentTerm,
  ProformaInvoice,
  Tax,
} from '../../shared/models/models';

@Injectable({ providedIn: 'root' })
export class InvoiceDataService {
  private readonly mock = inject(MockDataService);

  getCompanyConfig(): Observable<CompanyConfig> { return this.mock.getCompanyConfig(); }
  getCustomers(): Observable<Customer[]> { return this.mock.getCustomers(); }
  getPaymentTerms(): Observable<PaymentTerm[]> { return this.mock.getPaymentTerms(); }
  getTaxes(): Observable<Tax[]> { return this.mock.getTaxes(); }

  getInvoices(): Observable<Invoice[]> { return this.mock.getInvoices(); }
  getInvoice(id: string): Observable<Invoice | null> { return this.mock.getInvoice(id); }
  saveInvoice(invoice: Invoice): Observable<Invoice> { return this.mock.saveInvoice(invoice); }
  sendInvoice(id: string): Observable<Invoice> { return this.mock.sendInvoice(id); }
  markInvoiceViewed(id: string): Observable<Invoice> { return this.mock.markInvoiceViewed(id); }
  markInvoiceSettled(id: string): Observable<Invoice> { return this.mock.markInvoiceSettled(id); }
  confirmLiquidity(id: string, amount?: number, message?: string): Observable<Invoice> { return this.mock.confirmLiquidity(id, amount, message); }
  getLiquidityImpact(id: string): Observable<LiquidityImpact> { return this.mock.getLiquidityImpact(id); }
  nextSerialNumber(): Observable<string> { return this.mock.nextSerialNumber(); }

  getProformaInvoices(): Observable<ProformaInvoice[]> { return this.mock.getProformaInvoices(); }
  getProformaInvoice(id: string): Observable<ProformaInvoice | null> { return this.mock.getProformaInvoice(id); }
  saveProformaInvoice(proforma: ProformaInvoice): Observable<ProformaInvoice> { return this.mock.saveProformaInvoice(proforma); }
  sendProformaInvoice(id: string): Observable<ProformaInvoice> { return this.mock.sendProformaInvoice(id); }
  markProformaViewed(id: string): Observable<ProformaInvoice> { return this.mock.markProformaViewed(id); }
  convertProformaToInvoice(id: string): Observable<Invoice> { return this.mock.convertProformaToInvoice(id); }
  deleteProformaInvoice(id: string): Observable<void> { return this.mock.deleteProformaInvoice(id); }
}
