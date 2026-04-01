import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { switchMap, map, catchError, debounceTime } from 'rxjs/operators';
import { of } from 'rxjs';
import { MockDataService } from '../../../core/services/mock-data.service';
import * as A from './dashboard.actions';

@Injectable()
export class DashboardEffects {
  private actions$ = inject(Actions);
  private svc = inject(MockDataService);

  loadDashboard$ = createEffect(() =>
    this.actions$.pipe(
      ofType(A.loadDashboard),
      switchMap(() => this.svc.getDashboard(0).pipe(
        map(data => A.loadDashboardOk({ data })),
        catchError(err => of(A.loadDashboardErr({ error: err.message })))
      ))
    )
  );

  updateSlider$ = createEffect(() =>
    this.actions$.pipe(
      ofType(A.updateSlider),
      debounceTime(150),
      switchMap(({ value }) => this.svc.getDashboard(value).pipe(
        map(data => A.updateSliderOk({ data })),
        catchError(err => of(A.loadDashboardErr({ error: err.message })))
      ))
    )
  );
}
