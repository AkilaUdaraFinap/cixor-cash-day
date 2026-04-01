import { createAction, props } from '@ngrx/store';
import { DashboardData, RecurringExpense, OneOffExpense } from '../../../shared/models/models';

export const loadDashboard    = createAction('[Dashboard] Load');
export const loadDashboardOk  = createAction('[Dashboard] Load OK',  props<{ data: DashboardData }>());
export const loadDashboardErr = createAction('[Dashboard] Load ERR', props<{ error: string }>());
export const updateSlider     = createAction('[Dashboard] Slider',   props<{ value: number }>());
export const updateSliderOk   = createAction('[Dashboard] Slider OK', props<{ data: DashboardData }>());
export const saveRecurring    = createAction('[Dashboard] Save Recurring', props<{ expense: RecurringExpense }>());
export const deleteRecurring  = createAction('[Dashboard] Delete Recurring', props<{ id: string }>());
export const saveOneOff       = createAction('[Dashboard] Save OneOff', props<{ expense: OneOffExpense }>());
export const deleteOneOff     = createAction('[Dashboard] Delete OneOff', props<{ id: string }>());
