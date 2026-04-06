import { Injectable, inject, signal } from '@angular/core';
import { NotificationCenterService } from './notification-center.service';

export interface Toast {
  id: number;
  type: 'success'|'error'|'info'|'warn';
  message: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  toasts = signal<Toast[]>([]);
  private next = 0;
  private readonly notifications = inject(NotificationCenterService);

  show(type: Toast['type'], message: string, duration = 4000) {
    const id = ++this.next;
    this.toasts.update(t => [...t, { id, type, message }]);
    this.notifications.push(
      type === 'success' ? 'Success' : type === 'error' ? 'Action needed' : 'Update',
      message,
      type === 'error' ? 'warn' : type === 'warn' ? 'warn' : type === 'success' ? 'success' : 'info'
    );
    setTimeout(() => this.remove(id), duration);
  }
  success(msg: string) { this.show('success', msg); }
  error(msg: string)   { this.show('error', msg); }
  info(msg: string)    { this.show('info', msg); }
  warn(msg: string)    { this.show('warn', msg); }
  remove(id: number)   { this.toasts.update(t => t.filter(x => x.id !== id)); }
}
