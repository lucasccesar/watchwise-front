import { Injectable, signal } from '@angular/core';

export interface ConfirmationDialogRequest {
  title?: string;
  message: string;
  confirmLabel: string;
}

@Injectable({ providedIn: 'root' })
export class ConfirmationDialogService {
  readonly request = signal<ConfirmationDialogRequest | null>(null);
  private resolveCurrent: ((confirmed: boolean) => void) | null = null;

  requestConfirmation(request: ConfirmationDialogRequest): Promise<boolean> {
    this.resolveCurrent?.(false);

    return new Promise((resolve) => {
      this.resolveCurrent = resolve;
      this.request.set(request);
    });
  }

  resolve(confirmed: boolean): void {
    const resolve = this.resolveCurrent;
    if (!resolve) return;

    this.resolveCurrent = null;
    this.request.set(null);
    resolve(confirmed);
  }
}
