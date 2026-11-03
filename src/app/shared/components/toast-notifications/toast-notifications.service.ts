import { Injectable, signal } from '@angular/core';

export type ToastNotificationType = 'success' | 'error' | 'warning' | 'info';

export interface ToastNotification {
  id: number;
  message: string;
  type: ToastNotificationType;
}

interface PendingToast extends ToastNotification {
  duration: number;
}

const MAX_PENDING_TOASTS = 4;

@Injectable({ providedIn: 'root' })
export class ToastNotificationsService {
  readonly current = signal<ToastNotification | null>(null);
  readonly leaving = signal(false);

  private nextId = 0;
  private expiryTimer?: ReturnType<typeof setTimeout>;
  private transitionTimer?: ReturnType<typeof setTimeout>;
  private pending: PendingToast[] = [];

  success(message: string): void { this.show(message, 'success'); }
  error(message: string): void { this.show(message, 'error'); }
  warning(message: string): void { this.show(message, 'warning'); }
  info(message: string): void { this.show(message, 'info'); }

  dismiss(id = this.current()?.id): void {
    const current = this.current();
    if (!current || current.id !== id || this.leaving()) return;
    this.clearExpiryTimer();
    this.leaving.set(true);
    this.transitionTimer = setTimeout(() => this.finishDismissal(current.id), 180);
  }

  private show(message: string, type: ToastNotificationType): void {
    const cleanMessage = message.trim();
    if (!cleanMessage) return;

    const current = this.current();
    if (current?.message === cleanMessage && current.type === type) return;
    if (this.pending.some((item) => item.message === cleanMessage && item.type === type)) return;

    const notification: PendingToast = {
      id: ++this.nextId,
      message: cleanMessage,
      type,
      duration: this.durationFor(type),
    };

    if (!current) {
      this.present(notification);
      return;
    }

    if (this.pending.length === MAX_PENDING_TOASTS) this.pending.shift();
    this.pending.push(notification);
    if (!this.leaving()) this.dismiss(current.id);
  }

  private present(notification: PendingToast): void {
    this.clearTimers();
    this.current.set({ id: notification.id, message: notification.message, type: notification.type });
    this.leaving.set(false);
    this.expiryTimer = setTimeout(() => this.dismiss(notification.id), notification.duration);
  }

  private finishDismissal(id: number): void {
    if (this.current()?.id !== id) return;
    this.current.set(null);
    this.leaving.set(false);
    this.transitionTimer = undefined;
    const pending = this.pending.shift();
    if (pending) this.present(pending);
  }

  private durationFor(type: ToastNotificationType): number {
    return type === 'error' || type === 'warning' ? 5500 : 4000;
  }

  private clearExpiryTimer(): void {
    if (this.expiryTimer) clearTimeout(this.expiryTimer);
    this.expiryTimer = undefined;
  }

  private clearTimers(): void {
    this.clearExpiryTimer();
    if (this.transitionTimer) clearTimeout(this.transitionTimer);
    this.transitionTimer = undefined;
  }
}
