import { createReducer, on } from '@ngrx/store';
import { initialDashboardState } from './dashboard.state';
import * as A from './dashboard.actions';

export const dashboardReducer = createReducer(
  initialDashboardState,
  on(A.loadDashboard,    s => ({ ...s, loading: true, error: null })),
  on(A.loadDashboardOk,  (s, { data }) => ({ ...s, ...data, loading: false })),
  on(A.loadDashboardErr, (s, { error }) => ({ ...s, loading: false, error })),
  on(A.updateSlider,     (s, { value }) => ({ ...s, sliderValue: value })),
  on(A.updateSliderOk,   (s, { data }) => ({ ...s, ...data })),
);
