import { Injectable, signal } from '@angular/core';
import type { HomeViewer } from '../../features/home/data-access/home-api.service';

@Injectable({ providedIn: 'root' })
export class AppShellStateService {
  readonly hasUnreadNotifications = signal(false);
  readonly viewer = signal<HomeViewer | null>(null);

  updateHomeState(viewer: HomeViewer | null, hasUnreadNotifications: boolean): void {
    this.viewer.set(viewer);
    this.hasUnreadNotifications.set(hasUnreadNotifications);
  }

  clearHomeState(): void {
    this.viewer.set(null);
    this.hasUnreadNotifications.set(false);
  }
}
