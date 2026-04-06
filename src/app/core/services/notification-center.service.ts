import { Injectable, computed, signal } from '@angular/core';

export interface NotificationItem {
  id: number;
  title: string;
  detail: string;
  tone: 'info' | 'success' | 'warn';
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationCenterService {
  private nextId = 0;
  private readonly itemsState = signal<NotificationItem[]>([
    {
      id: 1,
      title: 'Welcome back',
      detail: 'CashDay is running in frontend demo mode.',
      tone: 'info',
      createdAt: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  readonly items = computed(() => this.itemsState());
  readonly unreadCount = computed(() => this.itemsState().length);

  push(title: string, detail: string, tone: NotificationItem['tone'] = 'info'): void {
    const id = ++this.nextId + this.itemsState().length;
    const item: NotificationItem = {
      id,
      title,
      detail,
      tone,
      createdAt: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    };
    this.itemsState.update(items => [item, ...items].slice(0, 8));
  }

  clear(): void {
    this.itemsState.set([]);
  }
}
