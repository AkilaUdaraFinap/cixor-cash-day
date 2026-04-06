import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { MockDataService } from './mock-data.service';
import {
  BankAccount,
  BankBalanceEntry,
  CompanyConfig,
  DashboardData,
  LiquidityImpact,
  OneOffExpense,
  PaymentTerm,
  RecurringExpense,
  Tax,
  Invoice,
} from '../../shared/models/models';

@Injectable({ providedIn: 'root' })
export class SettingsDataService {
  private readonly mock = inject(MockDataService);

  getCompanyConfig(): Observable<CompanyConfig> { return this.mock.getCompanyConfig(); }
  saveCompanyConfig(config: CompanyConfig): Observable<CompanyConfig> { return this.mock.saveCompanyConfig(config); }

  getPaymentTerms(): Observable<PaymentTerm[]> { return this.mock.getPaymentTerms(); }
  savePaymentTerms(terms: PaymentTerm[]): Observable<PaymentTerm[]> { return this.mock.savePaymentTerms(terms); }

  getTaxes(): Observable<Tax[]> { return this.mock.getTaxes(); }
  saveTaxes(taxes: Tax[]): Observable<Tax[]> { return this.mock.saveTaxes(taxes); }

  getBankAccounts(): Observable<BankAccount[]> { return this.mock.getBankAccounts(); }
  getBankAccount(id: string): Observable<BankAccount | null> { return this.mock.getBankAccount(id); }
  saveBankAccount(account: BankAccount): Observable<BankAccount> { return this.mock.saveBankAccount(account); }
  deleteBankAccount(id: string): Observable<void> { return this.mock.deleteBankAccount(id); }
  updateBankAccountBalance(accountId: string, balance: number, date: string, notes?: string): Observable<void> {
    return this.mock.updateBankAccountBalance(accountId, balance, date, notes);
  }
  getBankBalanceHistory(): Observable<BankBalanceEntry[]> { return this.mock.getBankBalanceHistory(); }

  getDashboard(sliderPct = 0): Observable<DashboardData> { return this.mock.getDashboard(sliderPct); }
  getLiquidityImpact(id: string): Observable<LiquidityImpact> { return this.mock.getLiquidityImpact(id); }
  confirmLiquidity(id: string, amount?: number, message?: string): Observable<Invoice> { return this.mock.confirmLiquidity(id, amount, message); }
  getRecurring(): Observable<RecurringExpense[]> { return this.mock.getRecurring(); }
  getOneOff(): Observable<OneOffExpense[]> { return this.mock.getOneOff(); }
  saveRecurring(expense: RecurringExpense): Observable<RecurringExpense> { return this.mock.saveRecurring(expense); }
  deleteRecurring(id: string): Observable<void> { return this.mock.deleteRecurring(id); }
  saveOneOff(expense: OneOffExpense): Observable<OneOffExpense> { return this.mock.saveOneOff(expense); }
  deleteOneOff(id: string): Observable<void> { return this.mock.deleteOneOff(id); }
}
