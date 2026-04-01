import { createFeatureSelector, createSelector } from '@ngrx/store';
import { DashboardState } from './dashboard.state';

export const selectDash = createFeatureSelector<DashboardState>('dashboard');
export const selectLoading        = createSelector(selectDash, s => s.loading);
export const selectCashToday      = createSelector(selectDash, s => s.availableCashToday);
export const selectMinMonthly     = createSelector(selectDash, s => s.minMonthlyCost);
export const selectOneOffTotal    = createSelector(selectDash, s => s.plannedOneOffTotal);
export const selectCurve          = createSelector(selectDash, s => s.projectionCurve);
export const selectBreakEven      = createSelector(selectDash, s => s.breakEvenThreshold);
export const selectStressPoint    = createSelector(selectDash, s => s.stressPoint);
export const selectSlider         = createSelector(selectDash, s => s.sliderValue);
export const selectOutstanding    = createSelector(selectDash, s => s.outstandingInvoices);
export const selectLiquidated     = createSelector(selectDash, s => s.liquidatedInvoices);
export const selectRecurring      = createSelector(selectDash, s => s.recurringExpenses);
export const selectOneOff         = createSelector(selectDash, s => s.oneOffExpenses);
