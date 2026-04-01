import { DashboardData, ProjectionPoint, Invoice, RecurringExpense, OneOffExpense } from '../../../shared/models/models';

export interface DashboardState extends DashboardData {
  loading: boolean;
  error: string | null;
}

export const initialDashboardState: DashboardState = {
  availableCashToday: 0,
  minMonthlyCost: 0,
  plannedOneOffTotal: 0,
  projectionCurve: [],
  breakEvenThreshold: 0,
  stressPoint: null,
  sliderValue: 0,
  outstandingInvoices: [],
  liquidatedInvoices: [],
  recurringExpenses: [],
  oneOffExpenses: [],
  loading: false,
  error: null,
};
