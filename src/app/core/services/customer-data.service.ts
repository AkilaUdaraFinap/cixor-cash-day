import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { MockDataService } from './mock-data.service';
import { Customer, Invoice } from '../../shared/models/models';

@Injectable({ providedIn: 'root' })
export class CustomerDataService {
  private readonly mock = inject(MockDataService);

  getCustomers(): Observable<Customer[]> { return this.mock.getCustomers(); }
  getCustomer(id: string): Observable<Customer | null> { return this.mock.getCustomer(id); }
  getInvoices(): Observable<Invoice[]> { return this.mock.getInvoices(); }
  saveCustomer(customer: Customer): Observable<Customer> { return this.mock.saveCustomer(customer); }
}
