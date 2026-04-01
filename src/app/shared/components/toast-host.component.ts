import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-toast-host',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container">
      <div *ngFor="let t of svc.toasts()" class="toast" [class]="t.type" (click)="svc.remove(t.id)">
        <span class="toast-icon">
          <ng-container [ngSwitch]="t.type">
            <span *ngSwitchCase="'success'" style="color:#16A34A">✓</span>
            <span *ngSwitchCase="'error'"   style="color:#DC2626">✕</span>
            <span *ngSwitchCase="'warn'"    style="color:#D97706">⚠</span>
            <span *ngSwitchDefault          style="color:#2563EB">ℹ</span>
          </ng-container>
        </span>
        <span style="flex:1">{{ t.message }}</span>
        <button class="toast-close" (click)="svc.remove(t.id)">×</button>
      </div>
    </div>
  `
})
export class ToastHostComponent {
  svc = inject(ToastService);
}
