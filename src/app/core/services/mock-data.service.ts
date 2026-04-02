import { Injectable } from '@angular/core';
import { Observable, of, delay, throwError } from 'rxjs';
import {
  AppUser,
  BankBalanceEntry,
  CompanyConfig,
  Customer,
  DashboardData,
  Invoice,
  LiquidityImpact,
  OneOffExpense,
  PaymentTerm,
  PortalOtpRequestResult,
  PortalOtpVerificationResult,
  ProjectionPoint,
  RecurringExpense,
} from '../../shared/models/models';

@Injectable({ providedIn: 'root' })
export class MockDataService {
  private company: CompanyConfig = {
    id: '1001',
    companyName: 'Precision Manufacturing (Pvt) Ltd',
    tin: '114567890V',
    vatRegNo: '114567890 7000',
    brn: 'PV00123456',
    address: '42, Galle Road, Colombo 03, Sri Lanka',
    email: 'accounts@precisionmfg.lk',
    emailDomain: 'precisionmfg.lk',
    phone: '+94 11 234 5678',
    taxRegimeLabel: 'VAT',
    country: 'Sri Lanka',
    vatRate: 18,
    branchCode: 'HQ01',
    invoiceCounter: 9,
    currentBalance: 4250000,
  };

  private bankHistory: BankBalanceEntry[] = [
    { date: '04/01/2026', bank: 'Commercial Bank', account: '8001234567', balance: 4250000 },
    { date: '03/01/2026', bank: 'Commercial Bank', account: '8001234567', balance: 3800000 },
    { date: '02/01/2026', bank: 'Commercial Bank', account: '8001234567', balance: 5100000 },
  ];

  private paymentTermsList: PaymentTerm[] = [
    { id: 'pt1', label: 'Net 30', days: 30, isDefault: true },
    { id: 'pt2', label: 'Net 60', days: 60 },
    { id: 'pt3', label: 'Immediate', days: 0 },
  ];

  private customers: Customer[] = [
    {
      id: 'c1',
      name: 'Acme Corp Ltd',
      tin: '985432100V',
      vatRegNo: '985432100 7000',
      brn: 'PV00987654',
      email: 'accounts@acme.lk',
      phone: '+94 11 678 9012',
      address: '15, Union Place, Colombo 02',
      officers: [
        { id: 'o1', name: 'Ranjith Silva', email: 'ranjith@acme.lk', designation: 'Finance Manager', mobile: '+94 77 123 4567', isPrimary: true },
        { id: 'o2', name: 'Nadeesha Fernando', email: 'nadeesha@acme.lk', designation: 'Director', mobile: '+94 76 234 5678' },
      ],
    },
    {
      id: 'c2',
      name: 'Sunrise Traders (Pvt) Ltd',
      tin: '765432100V',
      brn: 'PV00765432',
      email: 'procurement@sunrise.lk',
      phone: '+94 11 291 3344',
      address: 'No 8, Kandy Road, Kiribathgoda',
      officers: [
        { id: 'o3', name: 'Chaminda Bandara', email: 'chaminda@sunrise.lk', designation: 'Procurement Head', mobile: '+94 71 345 6789', isPrimary: true },
      ],
    },
    {
      id: 'c3',
      name: 'Lanka Retail Solutions Ltd',
      tin: '543210000V',
      brn: 'PV00543210',
      email: 'finance@lankaretail.lk',
      phone: '+94 11 456 7890',
      address: '220, Baseline Road, Colombo 09',
      officers: [
        { id: 'o4', name: 'Kumari Wickramasinghe', email: 'kumari@lankaretail.lk', designation: 'CFO', mobile: '+94 77 456 7890', isPrimary: true },
      ],
    },
  ];

  private invoices: Invoice[] = [
    {
      id: 'inv1',
      serialNumber: '26APR_HQ01_00001',
      customerId: 'c1',
      customerName: 'Acme Corp Ltd',
      customerTin: '985432100V',
      customerVatReg: '985432100 7000',
      customerAddress: '15, Union Place, Colombo 02',
      customerPhone: '+94 11 678 9012',
      supplierName: 'Precision Manufacturing (Pvt) Ltd',
      supplierAddress: '42, Galle Road, Colombo 03, Sri Lanka',
      supplierTin: '114567890V',
      supplierVatReg: '114567890 7000',
      supplierBrn: 'PV00123456',
      invoiceDate: '04/01/2026',
      deliveryDate: '04/01/2026',
      dueDate: '05/01/2026',
      placeOfSupply: 'Colombo 03 Warehouse',
      paymentTermId: 'pt1',
      debtorOfficerId: 'o1',
      debtorOfficerName: 'Ranjith Silva',
      debtorOfficerEmail: 'ranjith@acme.lk',
      modeOfPayment: 'Bank Transfer',
      additionalInformation: 'Please reference purchase order PO-2045.',
      lines: [
        { id: 'li1', reference: 'PO-2045-A', description: 'Industrial Steel Brackets (Box of 50)', qty: 10, unitPrice: 75000 },
        { id: 'li2', reference: 'PO-2045-B', description: 'High-Tension Bolts M12', qty: 200, unitPrice: 500 },
      ],
      netAmount: 850000,
      vatAmount: 153000,
      grossAmount: 1003000,
      status: 'Accepted',
      isVerified: true,
      createdAt: '04/01/2026',
      sentAt: '04/01/2026',
      viewedAt: '04/01/2026',
      acceptedAt: '04/01/2026',
    },
    {
      id: 'inv2',
      serialNumber: '26APR_HQ01_00002',
      customerId: 'c2',
      customerName: 'Sunrise Traders (Pvt) Ltd',
      customerTin: '765432100V',
      customerAddress: 'No 8, Kandy Road, Kiribathgoda',
      customerPhone: '+94 11 291 3344',
      supplierName: 'Precision Manufacturing (Pvt) Ltd',
      supplierAddress: '42, Galle Road, Colombo 03, Sri Lanka',
      supplierTin: '114567890V',
      supplierVatReg: '114567890 7000',
      supplierBrn: 'PV00123456',
      invoiceDate: '03/28/2026',
      deliveryDate: '03/29/2026',
      dueDate: '04/27/2026',
      placeOfSupply: 'Kiribathgoda Depot',
      paymentTermId: 'pt1',
      debtorOfficerId: 'o3',
      debtorOfficerName: 'Chaminda Bandara',
      debtorOfficerEmail: 'chaminda@sunrise.lk',
      modeOfPayment: 'Cheque',
      description: 'Urgent delivery confirmed',
      additionalInformation: 'Signed delivery note available on request.',
      lines: [
        { id: 'li3', reference: 'SR-001', description: 'Consulting Services – Q1 2026', qty: 1, unitPrice: 500000 },
      ],
      netAmount: 500000,
      vatAmount: 90000,
      grossAmount: 590000,
      status: 'Sent',
      isVerified: false,
      createdAt: '03/28/2026',
      sentAt: '03/28/2026',
    },
    {
      id: 'inv3',
      serialNumber: '26APR_HQ01_00003',
      customerId: 'c3',
      customerName: 'Lanka Retail Solutions Ltd',
      customerTin: '543210000V',
      customerAddress: '220, Baseline Road, Colombo 09',
      customerPhone: '+94 11 456 7890',
      supplierName: 'Precision Manufacturing (Pvt) Ltd',
      supplierAddress: '42, Galle Road, Colombo 03, Sri Lanka',
      supplierTin: '114567890V',
      supplierVatReg: '114567890 7000',
      supplierBrn: 'PV00123456',
      invoiceDate: '03/15/2026',
      deliveryDate: '03/15/2026',
      dueDate: '04/14/2026',
      placeOfSupply: 'Colombo 09 Showroom',
      paymentTermId: 'pt1',
      debtorOfficerId: 'o4',
      debtorOfficerName: 'Kumari Wickramasinghe',
      debtorOfficerEmail: 'kumari@lankaretail.lk',
      modeOfPayment: 'Bank Transfer',
      additionalInformation: 'Installation included in the total value of supply.',
      lines: [
        { id: 'li4', reference: 'LR-103', description: 'Display Racks – Aluminum (set of 5)', qty: 3, unitPrice: 120000 },
        { id: 'li5', reference: 'LR-104', description: 'Installation & Setup', qty: 1, unitPrice: 40000 },
      ],
      netAmount: 400000,
      vatAmount: 72000,
      grossAmount: 472000,
      status: 'Draft',
      isVerified: false,
      createdAt: '03/15/2026',
    },
    {
      id: 'inv4',
      serialNumber: '26MAR_HQ01_00008',
      customerId: 'c1',
      customerName: 'Acme Corp Ltd',
      customerTin: '985432100V',
      customerAddress: '15, Union Place, Colombo 02',
      customerPhone: '+94 11 678 9012',
      supplierName: 'Precision Manufacturing (Pvt) Ltd',
      supplierAddress: '42, Galle Road, Colombo 03, Sri Lanka',
      supplierTin: '114567890V',
      supplierVatReg: '114567890 7000',
      supplierBrn: 'PV00123456',
      invoiceDate: '03/01/2026',
      deliveryDate: '03/01/2026',
      dueDate: '03/31/2026',
      placeOfSupply: 'Colombo 03 Warehouse',
      paymentTermId: 'pt1',
      debtorOfficerId: 'o1',
      debtorOfficerName: 'Ranjith Silva',
      debtorOfficerEmail: 'ranjith@acme.lk',
      modeOfPayment: 'Bank Transfer',
      lines: [
        { id: 'li6', reference: 'AC-778', description: 'Precision Valves', qty: 5, unitPrice: 235400 },
      ],
      netAmount: 1177000,
      vatAmount: 211860,
      grossAmount: 1388860,
      status: 'Settled',
      isVerified: true,
      createdAt: '03/01/2026',
      sentAt: '03/01/2026',
      viewedAt: '03/02/2026',
      acceptedAt: '03/03/2026',
      settledAt: '04/01/2026',
      liquidatedAt: '03/10/2026',
      liquidationFee: 27776,
      netReceived: 1361084,
      settlementPath: 'CIXOR PayDay',
    },
  ];

  private recurringExpenses: RecurringExpense[] = [
    { id: 're1', name: 'Office Rent', amount: 250000, frequency: 'Monthly', nextDueDate: '05/01/2026' },
    { id: 're2', name: 'Salaries', amount: 420000, frequency: 'Monthly', nextDueDate: '04/25/2026' },
    { id: 're3', name: 'Electricity & Utilities', amount: 45000, frequency: 'Monthly', nextDueDate: '04/20/2026' },
    { id: 're4', name: 'Vehicle Leases', amount: 55000, frequency: 'Monthly', nextDueDate: '04/15/2026' },
    { id: 're5', name: 'Software Subscriptions', amount: 28000, frequency: 'Quarterly', nextDueDate: '06/01/2026' },
  ];

  private oneOffExpenses: OneOffExpense[] = [
    { id: 'oo1', name: 'Equipment Maintenance', amount: 80000, dueDate: '04/10/2026' },
    { id: 'oo2', name: 'Annual Audit Fee', amount: 70000, dueDate: '04/30/2026' },
  ];

  private users: AppUser[] = [
    { id: 'u1', name: 'Amara Perera', email: 'amara@precisionmfg.lk', role: 'Admin', status: 'Active', isActive: true, lastActive: '04/01/2026' },
    { id: 'u2', name: 'Nuwan Jayawardena', email: 'nuwan@precisionmfg.lk', role: 'Finance', status: 'Active', isActive: true, lastActive: '03/31/2026' },
    { id: 'u3', name: 'Dilini Ranasinghe', email: 'dilini@precisionmfg.lk', role: 'Sales', status: 'Active', isActive: true, lastActive: '03/30/2026' },
    { id: 'u4', name: 'Kasun Mendis', email: 'kasun@precisionmfg.lk', role: 'Finance', status: 'Invited', isActive: false, lastActive: 'Invitation Pending' },
  ];

  private portalOtpAttempts: Record<string, number[]> = {};
  private portalOtpCodes: Record<string, { code: string; expiresAt: number }> = {};

  getCompanyConfig(): Observable<CompanyConfig> {
    return of({ ...this.company }).pipe(delay(80));
  }

  saveCompanyConfig(config: CompanyConfig): Observable<CompanyConfig> {
    const error = this.validateCompanyConfig(config);
    if (error) return throwError(() => new Error(error));
    this.company = {
      ...config,
      companyName: config.companyName.trim(),
      tin: config.tin.trim().toUpperCase(),
      brn: config.brn?.trim() || '',
      address: config.address?.trim() || '',
      emailDomain: config.emailDomain?.trim().toLowerCase() || '',
      phone: config.phone?.trim() || '',
      branchCode: this.normalizeBranchCode(config.branchCode),
      vatRate: Number(config.vatRate),
    };
    return of({ ...this.company }).pipe(delay(80));
  }

  getPaymentTerms(): Observable<PaymentTerm[]> {
    return of(this.paymentTermsList.map(term => ({ ...term }))).pipe(delay(50));
  }

  savePaymentTerms(terms: PaymentTerm[]): Observable<PaymentTerm[]> {
    const error = this.validatePaymentTerms(terms);
    if (error) return throwError(() => new Error(error));
    this.paymentTermsList = terms.map(term => ({
      ...term,
      label: term.label.trim(),
      days: Number(term.days),
      isDefault: !!term.isDefault,
    }));
    return of(this.paymentTermsList.map(term => ({ ...term }))).pipe(delay(80));
  }

  getBankBalanceHistory(): Observable<BankBalanceEntry[]> {
    return of(this.bankHistory.map(item => ({ ...item }))).pipe(delay(50));
  }

  saveBankBalance(entry: { bank: string; account: string; balance: number; date: string }): Observable<void> {
    const error = this.validateBankBalance(entry);
    if (error) return throwError(() => new Error(error));
    const normalizedEntry = {
      bank: entry.bank.trim(),
      account: entry.account.trim(),
      balance: Math.round(entry.balance),
      date: this.normalizeDate(entry.date),
    };
    this.company.currentBalance = normalizedEntry.balance;
    this.bankHistory.unshift(normalizedEntry);
    return of(undefined).pipe(delay(80));
  }

  getCustomers(): Observable<Customer[]> {
    return of(this.customers.map(customer => this.cloneCustomer(customer))).pipe(delay(100));
  }

  getCustomer(id: string): Observable<Customer | null> {
    const customer = this.customers.find(item => item.id === id) ?? null;
    return of(customer ? this.cloneCustomer(customer) : null).pipe(delay(80));
  }

  saveCustomer(customer: Customer): Observable<Customer> {
    const error = this.validateCustomer(customer);
    if (error) return throwError(() => new Error(error));
    const next = this.cloneCustomer(customer);
    if (!next.id || next.id === 'new') next.id = 'c' + Date.now();
    next.name = next.name.trim();
    next.tin = next.tin?.trim() || '';
    next.vatRegNo = next.vatRegNo?.trim() || '';
    next.brn = next.brn?.trim() || '';
    next.email = next.email?.trim().toLowerCase() || '';
    next.phone = next.phone?.trim() || '';
    next.address = next.address?.trim() || '';
    next.officers = next.officers.map((officer, index) => ({
      ...officer,
      id: officer.id || 'o' + Date.now() + index,
      name: officer.name?.trim() || '',
      designation: officer.designation?.trim() || '',
      email: officer.email?.trim().toLowerCase() || '',
      mobile: officer.mobile?.trim() || '',
      nic: officer.nic?.trim() || '',
      isPrimary: !!officer.isPrimary,
    }));
    if (!next.officers.some(officer => officer.isPrimary) && next.officers.length) {
      next.officers[0].isPrimary = true;
    }
    const idx = this.customers.findIndex(item => item.id === next.id);
    if (idx >= 0) this.customers[idx] = next;
    else this.customers.push(next);
    return of(this.cloneCustomer(next)).pipe(delay(80));
  }

  getInvoices(): Observable<Invoice[]> {
    return of(this.invoices.map(invoice => this.cloneInvoice(invoice))).pipe(delay(150));
  }

  getInvoice(id: string): Observable<Invoice | null> {
    const invoice = this.invoices.find(item => item.id === id) ?? null;
    return of(invoice ? this.cloneInvoice(invoice) : null).pipe(delay(80));
  }

  saveInvoice(invoice: Invoice): Observable<Invoice> {
    const next = this.prepareInvoice(invoice);
    if (!next.id) {
      next.id = 'inv' + Date.now();
      next.createdAt = this.today();
      next.serialNumber = next.serialNumber || this.consumeSerial();
    }
    const idx = this.invoices.findIndex(item => item.id === next.id);
    if (idx >= 0) this.invoices[idx] = next;
    else this.invoices.push(next);
    return of(this.cloneInvoice(next)).pipe(delay(100));
  }

  sendInvoice(id: string): Observable<Invoice> {
    const invoice = this.requireInvoice(id);
    invoice.status = 'Sent';
    invoice.sentAt = invoice.sentAt || this.today();
    return of(this.cloneInvoice(invoice)).pipe(delay(80));
  }

  markInvoiceViewed(id: string): Observable<Invoice> {
    const invoice = this.requireInvoice(id);
    if (invoice.status === 'Sent') {
      invoice.status = 'Viewed';
      invoice.viewedAt = this.today();
    }
    return of(this.cloneInvoice(invoice)).pipe(delay(60));
  }

  markInvoiceSettled(id: string): Observable<Invoice> {
    const invoice = this.requireInvoice(id);
    invoice.status = 'Settled';
    invoice.settledAt = this.today();
    invoice.settlementPath = invoice.settlementPath || 'Direct customer settlement';
    this.company.currentBalance += invoice.grossAmount;
    return of(this.cloneInvoice(invoice)).pipe(delay(80));
  }

  confirmLiquidity(id: string): Observable<Invoice> {
    const invoice = this.requireInvoice(id);
    invoice.status = 'Settled';
    invoice.liquidatedAt = this.today();
    invoice.settledAt = this.today();
    invoice.liquidationFee = Math.round(invoice.grossAmount * 0.02);
    invoice.netReceived = invoice.grossAmount - invoice.liquidationFee;
    invoice.settlementPath = 'CIXOR PayDay';
    this.company.currentBalance += invoice.netReceived;
    return of(this.cloneInvoice(invoice)).pipe(delay(80));
  }

  getLiquidityImpact(id: string): Observable<LiquidityImpact> {
    const invoice = this.requireInvoice(id);
    const fee = Math.round(invoice.grossAmount * 0.02);
    return of({
      invoice: this.cloneInvoice(invoice),
      fee,
      feePercent: 2,
      netCashToday: invoice.grossAmount - fee,
      before: {
        cashToday: this.company.currentBalance,
        breakEven: this.computeBreakEven(),
        lowestBalance: -80000,
        lowestDate: '04/14/2026',
      },
      after: {
        cashToday: this.company.currentBalance + invoice.grossAmount - fee,
        breakEven: Math.max(0, this.computeBreakEven() - 4),
        lowestBalance: 76400,
        lowestDate: '04/14/2026',
      },
    }).pipe(delay(80));
  }

  nextSerialNumber(): Observable<string> {
    return of(this.peekSerial()).pipe(delay(40));
  }

  getRecurring(): Observable<RecurringExpense[]> {
    return of(this.recurringExpenses.map(expense => ({ ...expense }))).pipe(delay(50));
  }

  getOneOff(): Observable<OneOffExpense[]> {
    return of(this.oneOffExpenses.map(expense => ({ ...expense }))).pipe(delay(50));
  }

  saveRecurring(expense: RecurringExpense): Observable<RecurringExpense> {
    const next = { ...expense, id: expense.id || 're' + Date.now() };
    const idx = this.recurringExpenses.findIndex(item => item.id === next.id);
    if (idx >= 0) this.recurringExpenses[idx] = next;
    else this.recurringExpenses.push(next);
    return of({ ...next }).pipe(delay(80));
  }

  deleteRecurring(id: string): Observable<void> {
    this.recurringExpenses = this.recurringExpenses.filter(expense => expense.id !== id);
    return of(undefined).pipe(delay(80));
  }

  saveOneOff(expense: OneOffExpense): Observable<OneOffExpense> {
    const next = { ...expense, id: expense.id || 'oo' + Date.now() };
    const idx = this.oneOffExpenses.findIndex(item => item.id === next.id);
    if (idx >= 0) this.oneOffExpenses[idx] = next;
    else this.oneOffExpenses.push(next);
    return of({ ...next }).pipe(delay(80));
  }

  deleteOneOff(id: string): Observable<void> {
    this.oneOffExpenses = this.oneOffExpenses.filter(expense => expense.id !== id);
    return of(undefined).pipe(delay(80));
  }

  getDashboard(sliderPct = 0): Observable<DashboardData> {
    const curve = this.buildProjection(sliderPct);
    const minMonthly = this.recurringExpenses
      .filter(expense => expense.frequency === 'Monthly')
      .reduce((sum, expense) => sum + expense.amount, 0);
    const oneOffTotal = this.oneOffExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const balances = curve.map(point => point.balance);
    const minBalance = Math.min(...balances);
    const minDate = curve.find(point => point.balance === minBalance)?.date ?? '';
    return of({
      availableCashToday: this.company.currentBalance,
      minMonthlyCost: minMonthly,
      plannedOneOffTotal: oneOffTotal,
      projectionCurve: curve,
      breakEvenThreshold: this.computeBreakEven(),
      stressPoint: minBalance < 0 ? { balance: minBalance, date: minDate } : null,
      sliderValue: sliderPct,
      outstandingInvoices: this.invoices
        .filter(invoice => !['Settled', 'Rejected', 'Draft'].includes(invoice.status))
        .map(invoice => this.cloneInvoice(invoice)),
      liquidatedInvoices: this.invoices.filter(invoice => !!invoice.liquidatedAt).map(invoice => this.cloneInvoice(invoice)),
      recurringExpenses: this.recurringExpenses.map(expense => ({ ...expense })),
      oneOffExpenses: this.oneOffExpenses.map(expense => ({ ...expense })),
    }).pipe(delay(200));
  }

  getUsers(): Observable<AppUser[]> {
    return of(this.users.map(user => ({ ...user }))).pipe(delay(100));
  }

  saveUser(user: AppUser): Observable<AppUser> {
    const next: AppUser = {
      ...user,
      id: user.id || 'u' + Date.now(),
      status: user.status || (user.isActive ? 'Active' : 'Suspended'),
      isActive: user.status ? user.status === 'Active' : user.isActive,
    };
    const idx = this.users.findIndex(item => item.id === next.id);
    if (idx >= 0) this.users[idx] = next;
    else this.users.push(next);
    return of({ ...next }).pipe(delay(80));
  }

  resolvePortalToken(token: string): Observable<Invoice | null> {
    const invoice = this.findInvoiceByPortalToken(token);
    return of(invoice ? this.cloneInvoice(invoice) : null).pipe(delay(100));
  }

  requestPortalOtp(token: string): Observable<PortalOtpRequestResult> {
    const invoice = this.findInvoiceByPortalToken(token);
    const key = invoice?.id || token;
    const now = Date.now();
    const attempts = (this.portalOtpAttempts[key] || []).filter(timestamp => now - timestamp < 60 * 60 * 1000);
    if (attempts.length >= 3) {
      const retryAfterSeconds = Math.ceil((60 * 60 * 1000 - (now - attempts[0])) / 1000);
      this.portalOtpAttempts[key] = attempts;
      return of({
        allowed: false,
        maskedDestination: this.maskEmail(invoice?.debtorOfficerEmail || 'registered email'),
        expiresInSeconds: 0,
        retryAfterSeconds,
      }).pipe(delay(120));
    }
    attempts.push(now);
    this.portalOtpAttempts[key] = attempts;
    this.portalOtpCodes[key] = { code: '123456', expiresAt: now + 10 * 60 * 1000 };
    return of({
      allowed: true,
      maskedDestination: this.maskEmail(invoice?.debtorOfficerEmail || 'registered email'),
      expiresInSeconds: 10 * 60,
      demoCode: '123456',
    }).pipe(delay(120));
  }

  verifyPortalOtp(token: string, code: string): Observable<PortalOtpVerificationResult> {
    const invoice = this.findInvoiceByPortalToken(token);
    const state = this.portalOtpCodes[invoice?.id || token];
    if (!state) {
      return of({ valid: false, message: 'Request a new verification code to continue.' }).pipe(delay(80));
    }
    if (Date.now() > state.expiresAt) {
      return of({ valid: false, message: 'Invalid or expired code. Please try again.' }).pipe(delay(80));
    }
    if (code !== state.code) {
      return of({ valid: false, message: 'Invalid or expired code. Please try again.' }).pipe(delay(80));
    }
    return of({ valid: true }).pipe(delay(80));
  }

  submitPortalResponse(invoiceId: string, decision: 'Accepted' | 'Rejected', rejectionReason?: string): Observable<void> {
    const invoice = this.requireInvoice(invoiceId);
    invoice.viewedAt = invoice.viewedAt || this.today();
    invoice.status = decision;
    if (decision === 'Accepted') {
      invoice.isVerified = true;
      invoice.acceptedAt = this.today();
      invoice.rejectionReason = undefined;
    } else {
      invoice.isVerified = false;
      invoice.rejectedAt = this.today();
      invoice.rejectionReason = rejectionReason?.trim() || 'Rejected by debtor officer.';
    }
    return of(undefined).pipe(delay(200));
  }

  private prepareInvoice(invoice: Invoice): Invoice {
    const customer = this.customers.find(item => item.id === invoice.customerId);
    const officer = customer?.officers.find(item => item.id === invoice.debtorOfficerId)
      || customer?.officers.find(item => item.isPrimary)
      || customer?.officers[0];
    return {
      ...invoice,
      serialNumber: (invoice.serialNumber || '').trim(),
      supplierName: this.company.companyName,
      supplierAddress: this.company.address,
      supplierTin: this.company.tin,
      supplierVatReg: this.company.vatRegNo,
      supplierBrn: this.company.brn,
      customerName: customer?.name || invoice.customerName,
      customerTin: customer?.tin || invoice.customerTin,
      customerVatReg: customer?.vatRegNo || invoice.customerVatReg,
      customerAddress: customer?.address || invoice.customerAddress,
      customerPhone: customer?.phone || invoice.customerPhone,
      debtorOfficerId: officer?.id || invoice.debtorOfficerId,
      debtorOfficerName: officer?.name || invoice.debtorOfficerName,
      debtorOfficerEmail: officer?.email || invoice.debtorOfficerEmail,
      lines: invoice.lines.map((line, index) => ({
        ...line,
        id: line.id || 'li' + Date.now() + index,
        reference: line.reference?.trim() || '',
        description: line.description?.trim() || '',
        qty: Math.max(0, Math.round(line.qty || 0)),
        unitPrice: Math.max(0, Math.round(line.unitPrice || 0)),
        discount: Math.max(0, Math.round(line.discount || 0)),
      })),
      netAmount: Math.round(invoice.netAmount || 0),
      vatAmount: Math.round(invoice.vatAmount || 0),
      grossAmount: Math.round(invoice.grossAmount || 0),
      placeOfSupply: invoice.placeOfSupply?.trim() || '',
      additionalInformation: invoice.additionalInformation?.trim() || '',
      modeOfPayment: invoice.modeOfPayment,
      status: invoice.status || 'Draft',
      isVerified: invoice.status === 'Accepted' || invoice.status === 'Settled' || invoice.isVerified,
    };
  }

  private buildProjection(pct: number): ProjectionPoint[] {
    const points: ProjectionPoint[] = [];
    let balance = this.company.currentBalance;
    const today = new Date();
    const outstanding = this.invoices.filter(invoice => !['Settled', 'Rejected', 'Draft'].includes(invoice.status) && !invoice.liquidatedAt);
    for (let day = 0; day <= 30; day++) {
      const date = new Date(today);
      date.setDate(today.getDate() + day);
      const dateString = this.toUsDate(date);
      this.recurringExpenses.forEach(expense => {
        if (expense.nextDueDate === dateString) balance -= expense.amount;
      });
      this.oneOffExpenses.forEach(expense => {
        if (expense.dueDate === dateString) balance -= expense.amount;
      });
      outstanding.forEach(invoice => {
        if (invoice.dueDate === dateString) balance += Math.round(invoice.grossAmount * (pct / 100));
      });
      points.push({ date: dateString, balance: Math.round(balance) });
    }
    return points;
  }

  private computeBreakEven(): number {
    for (let pct = 0; pct <= 100; pct++) {
      const curve = this.buildProjection(pct);
      if (Math.min(...curve.map(point => point.balance)) >= 0) return pct;
    }
    return 100;
  }

  private findInvoiceByPortalToken(token: string): Invoice | null {
    return this.invoices.find(invoice => invoice.id === token || invoice.serialNumber === token) ?? null;
  }

  private requireInvoice(id: string): Invoice {
    const invoice = this.invoices.find(item => item.id === id);
    if (!invoice) throw new Error('Invoice not found');
    return invoice;
  }

  private peekSerial(): string {
    return this.formatSerial(this.company.invoiceCounter);
  }

  private consumeSerial(): string {
    const serial = this.formatSerial(this.company.invoiceCounter);
    this.company.invoiceCounter += 1;
    return serial;
  }

  private formatSerial(sequence: number): string {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(2);
    const mmm = now.toLocaleString('en-US', { month: 'short' }).toUpperCase();
    return `${yy}${mmm}_${this.company.branchCode}_${String(sequence).padStart(5, '0')}`;
  }

  private today(): string {
    return this.toUsDate(new Date());
  }

  private toUsDate(date: Date): string {
    return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
  }

  private cloneCustomer(customer: Customer): Customer {
    return {
      ...customer,
      officers: customer.officers.map(officer => ({ ...officer })),
    };
  }

  private cloneInvoice(invoice: Invoice): Invoice {
    return {
      ...invoice,
      lines: invoice.lines.map(line => ({ ...line })),
    };
  }

  private validateCompanyConfig(config: CompanyConfig): string | null {
    if (!config.companyName?.trim()) return 'Legal company name is required.';
    if (!this.isTinValid(config.tin)) return 'Enter a valid TIN using 9 to 15 letters or numbers.';
    if (!/^[A-Z0-9]{1,4}$/.test(this.normalizeBranchCode(config.branchCode))) return 'Branch code must be 1 to 4 uppercase letters or numbers.';
    const vatRate = Number(config.vatRate);
    if (!Number.isFinite(vatRate) || vatRate < 0 || vatRate > 100) return 'Tax rate must be between 0 and 100.';
    if (config.phone?.trim() && !this.isPhoneValid(config.phone)) return 'Enter a valid telephone number.';
    if (config.emailDomain?.trim() && !this.isDomainValid(config.emailDomain)) return 'Enter a valid email domain such as company.lk.';
    return null;
  }

  private validatePaymentTerms(terms: PaymentTerm[]): string | null {
    if (!terms.length) return 'Add at least one payment term.';
    if (terms.some(term => !term.label?.trim())) return 'Every payment term needs a name.';
    if (terms.some(term => !Number.isInteger(Number(term.days)) || Number(term.days) < 0 || Number(term.days) > 365)) return 'Payment term days must be whole numbers between 0 and 365.';
    const labels = terms.map(term => term.label.trim().toLowerCase());
    if (new Set(labels).size !== labels.length) return 'Payment term names must be unique.';
    if (!terms.some(term => term.isDefault)) return 'Select a default payment term.';
    return null;
  }

  private validateBankBalance(entry: { bank: string; account: string; balance: number; date: string }): string | null {
    if (!entry.bank?.trim()) return 'Bank name is required.';
    if (!entry.account?.trim()) return 'Account number is required.';
    if (!Number.isFinite(Number(entry.balance)) || Number(entry.balance) < 0) return 'Current bank balance must be zero or greater.';
    if (!entry.date || Number.isNaN(new Date(`${entry.date}T00:00:00`).getTime())) return 'Select a valid balance date.';
    return null;
  }

  private validateCustomer(customer: Customer): string | null {
    if (!customer.name?.trim()) return 'Customer name is required.';
    if (!customer.email?.trim() || !this.isEmailValid(customer.email)) return 'Enter a valid customer email address.';
    if (customer.phone?.trim() && !this.isPhoneValid(customer.phone)) return 'Enter a valid customer phone number.';
    if (!customer.officers?.length) return 'At least one authorized officer is required for invoice acceptance.';
    if (!customer.officers.some(officer => officer.isPrimary)) return 'Select one primary authorized officer.';
    for (const officer of customer.officers) {
      if (!officer.name?.trim()) return 'Every authorized officer needs a full name.';
      if (!officer.designation?.trim()) return 'Every authorized officer needs a designation.';
      if (!officer.email?.trim() || !this.isEmailValid(officer.email)) return 'Every authorized officer needs a valid email address.';
      if (!officer.mobile?.trim() || !this.isPhoneValid(officer.mobile)) return 'Every authorized officer needs a valid mobile number.';
    }
    return null;
  }

  private normalizeBranchCode(value: string): string {
    return (value || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 4);
  }

  private normalizeDate(value: string): string {
    if (!value.includes('-')) return value;
    const [year, month, day] = value.split('-');
    if (!year || !month || !day) return value;
    return `${month}/${day}/${year}`;
  }

  private isTinValid(value: string): boolean {
    return /^[A-Za-z0-9]{9,15}$/.test((value || '').trim());
  }

  private isEmailValid(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((value || '').trim());
  }

  private isPhoneValid(value: string): boolean {
    return /^[+()\d\s-]{7,20}$/.test((value || '').trim());
  }

  private isDomainValid(value: string): boolean {
    return /^(?=.{3,253}$)([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[A-Za-z]{2,}$/.test((value || '').trim());
  }

  private maskEmail(email: string): string {
    if (!email.includes('@')) return email;
    const [name, domain] = email.split('@');
    if (name.length <= 2) return `${name[0] || '*'}***@${domain}`;
    return `${name.slice(0, 2)}***@${domain}`;
  }
}
