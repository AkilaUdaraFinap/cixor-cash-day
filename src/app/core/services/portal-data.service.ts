import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { MockDataService } from './mock-data.service';
import { Invoice, PortalOtpRequestResult, PortalOtpVerificationResult } from '../../shared/models/models';

@Injectable({ providedIn: 'root' })
export class PortalDataService {
  private readonly mock = inject(MockDataService);

  getInvoices(): Observable<Invoice[]> { return this.mock.getInvoices(); }
  resolvePortalToken(token: string): Observable<Invoice | null> { return this.mock.resolvePortalToken(token); }
  requestPortalOtp(token: string): Observable<PortalOtpRequestResult> { return this.mock.requestPortalOtp(token); }
  verifyPortalOtp(token: string, code: string): Observable<PortalOtpVerificationResult> { return this.mock.verifyPortalOtp(token, code); }
  submitPortalResponse(invoiceId: string, decision: 'Accepted' | 'Rejected', rejectionReason?: string): Observable<void> {
    return this.mock.submitPortalResponse(invoiceId, decision, rejectionReason);
  }
}
