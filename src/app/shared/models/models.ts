export type InvoiceStatus = 'Draft' | 'Sent' | 'Viewed' | 'Accepted' | 'Rejected' | 'Settled';

export interface LineItem {
  id: string;
  reference?: string;
  description: string;
  qty: number;
  unitPrice: number;
  discount?: number;
}

export interface Invoice {
  id: string;
  serialNumber: string;
  customerId: string;
  customerName: string;
  customerTin?: string;
  customerVatReg?: string;
  customerAddress?: string;
  customerPhone?: string;
  supplierName?: string;
  supplierAddress?: string;
  supplierTin?: string;
  supplierVatReg?: string;
  supplierBrn?: string;
  invoiceDate: string;
  deliveryDate?: string;
  dueDate: string;
  placeOfSupply?: string;
  paymentTermId?: string;
  debtorOfficerId?: string;
  debtorOfficerName?: string;
  debtorOfficerEmail?: string;
  modeOfPayment: string;
  description?: string;
  additionalInformation?: string;
  lines: LineItem[];
  netAmount: number;
  vatAmount: number;
  grossAmount: number;
  status: InvoiceStatus;
  isVerified: boolean;
  createdAt?: string;
  sentAt?: string;
  viewedAt?: string;
  acceptedAt?: string;
  rejectedAt?: string;
  settledAt?: string;
  liquidatedAt?: string;
  liquidationFee?: number;
  netReceived?: number;
  settlementPath?: string;
  rejectionReason?: string;
}

export interface DebtorOfficer {
  id: string;
  name: string;
  email: string;
  designation: string;
  mobile?: string;
  nic?: string;
  isPrimary?: boolean;
}

export interface Customer {
  id: string;
  name: string;
  tin?: string;
  vatRegNo?: string;
  brn?: string;
  email?: string;
  phone?: string;
  address?: string;
  officers: DebtorOfficer[];
}

export type Frequency = 'Weekly' | 'Monthly' | 'Quarterly';

export interface RecurringExpense {
  id: string;
  name: string;
  amount: number;
  frequency: Frequency;
  nextDueDate: string;
}

export interface OneOffExpense {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
}

export interface ProjectionPoint {
  date: string;
  balance: number;
}

export interface DashboardData {
  availableCashToday: number;
  minMonthlyCost: number;
  plannedOneOffTotal: number;
  projectionCurve: ProjectionPoint[];
  breakEvenThreshold: number;
  stressPoint: { balance: number; date: string } | null;
  sliderValue: number;
  outstandingInvoices: Invoice[];
  liquidatedInvoices: Invoice[];
  recurringExpenses: RecurringExpense[];
  oneOffExpenses: OneOffExpense[];
}

export interface LiquidityImpact {
  invoice: Invoice;
  fee: number;
  feePercent: number;
  netCashToday: number;
  before: { cashToday: number; breakEven: number; lowestBalance: number; lowestDate: string };
  after: { cashToday: number; breakEven: number; lowestBalance: number; lowestDate: string };
}

export type UserRole = 'Admin' | 'Finance' | 'Sales';
export type UserStatus = 'Active' | 'Invited' | 'Suspended';

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  isActive: boolean;
  lastActive?: string;
  companyId?: bigint;
}

export interface PaymentTerm {
  id: string;
  label: string;
  days: number;
  isDefault?: boolean;
}

export interface BankBalanceEntry {
  date: string;
  bank: string;
  account: string;
  balance: number;
}

export interface CompanyConfig {
  id: string;
  companyName: string;
  tin: string;
  vatRegNo?: string;
  brn?: string;
  address: string;
  email?: string;
  emailDomain?: string;
  phone?: string;
  taxRegimeLabel?: string;
  country?: string;
  vatRate: number;
  branchCode: string;
  invoiceCounter: number;
  currentBalance: number;
}

export interface PortalInvoiceSummary {
  serialNumber: string;
  supplierName: string;
  grossAmount: number;
  dueDate: string;
  token: string;
}

export interface PortalOtpRequestResult {
  allowed: boolean;
  maskedDestination: string;
  expiresInSeconds: number;
  retryAfterSeconds?: number;
  demoCode?: string;
}

export interface PortalOtpVerificationResult {
  valid: boolean;
  message?: string;
}
