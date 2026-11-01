import { ModalFocusDirective } from '../../../../shared/directives/modal-focus.directive';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthApiService } from '../../../auth/data-access/auth-api.service';
import { AuthSessionService, SessionUser } from '../../../../core/session/session.service';
import {
  FollowRequestUser,
  NotificationsApiService,
} from '../../../notifications/data-access/notifications-api.service';
import {
  BlockedUserRecord,
  SettingsView,
  SettingsApiService,
  UpdateUserSettingsRequest,
  UserSettingsUpdate,
} from '../../data-access/settings-api.service';

type SettingsSection = 'profile' | 'privacy' | 'content' | 'account';
type SettingsDialog = 'delete' | 'all-sessions' | null;
type ConnectionLoadState = 'loading' | 'ready' | 'error';
type FollowRequestDecision = 'accepted' | 'rejected';

const SETTINGS_SECTIONS: Array<{ id: SettingsSection; title: string; subtitle: string }> = [
  { id: 'profile', title: 'Perfil', subtitle: 'Foto, nome, bio e visibilidade' },
  { id: 'privacy', title: 'Privacidade', subtitle: 'Solicitações para seguir e usuários bloqueados' },
  { id: 'content', title: 'Preferências de conteúdo', subtitle: 'Idioma e região dos títulos' },
  { id: 'account', title: 'Segurança e conta', subtitle: 'E-mail, senha e sessões' },
];

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [ModalFocusDirective, RouterLink],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css',
})
export class SettingsComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly session = inject(AuthSessionService);
  private readonly authApi = inject(AuthApiService);
  private readonly notificationsApi = inject(NotificationsApiService);
  private readonly settingsApi = inject(SettingsApiService);
  private readonly router = inject(Router);

  protected readonly sections = SETTINGS_SECTIONS;
  protected readonly activeSection = signal<SettingsSection | null>(null);
  protected activeSectionTitle(): string {
    const section = this.activeSection();
    return SETTINGS_SECTIONS.find((item) => item.id === section)?.title ?? 'Configurações';
  }
  protected readonly user = this.session.user;
  protected readonly displayName = signal('');
  protected readonly username = signal('');
  protected readonly bio = signal('');
  protected readonly profilePhoto = signal<string | null>(null);
  protected readonly bannerImage = signal<string | null>(null);
  protected readonly settingsLoaded = signal(false);
  protected readonly removeBannerRequested = signal(false);
  protected readonly visibility = signal<'PUBLIC' | 'PRIVATE'>('PRIVATE');
  protected readonly language = signal('pt-BR');
  protected readonly region = signal('BR');
  protected readonly newEmail = signal('');
  protected readonly emailCurrentPassword = signal('');
  protected readonly passwordCurrentPassword = signal('');
  protected readonly newPassword = signal('');
  protected readonly confirmPassword = signal('');
  protected readonly deleteAccountPassword = signal('');
  protected readonly notice = signal('');
  protected readonly noticeKind = signal<'error' | 'success'>('error');
  protected readonly dialog = signal<SettingsDialog>(null);
  protected readonly busy = signal(false);
  protected readonly followRequests = signal<FollowRequestUser[]>([]);
  protected readonly followRequestCount = signal(0);
  protected readonly followRequestsStatus = signal<ConnectionLoadState>('loading');
  protected readonly followRequestsHasNext = signal(false);
  protected readonly followRequestsPage = signal(1);
  protected readonly loadingMoreFollowRequests = signal(false);
  protected readonly followRequestActionId = signal<string | null>(null);
  protected readonly followRequestsError = signal('');
  protected readonly followRequestsMessage = signal('');
  protected readonly blockedUsers = signal<BlockedUserRecord[]>([]);
  protected readonly blockedUserCount = signal(0);
  protected readonly blockedUsersStatus = signal<ConnectionLoadState>('loading');
  protected readonly blockedUsersHasNext = signal(false);
  protected readonly blockedUsersPage = signal(1);
  protected readonly loadingMoreBlockedUsers = signal(false);
  protected readonly blockedUserActionId = signal<string | null>(null);
  protected readonly blockedUsersError = signal('');
  protected readonly blockedUsersMessage = signal('');
  protected readonly settingsBaseline = signal<SettingsView | null>(null);
  protected readonly isProfileDirty = computed(() => {
    const baseline = this.settingsBaseline();
    if (!baseline) return false;
    return this.displayName().trim() !== (baseline.profile.name ?? '') ||
      this.username().trim() !== baseline.profile.username ||
      this.bio() !== (baseline.profile.description ?? '') ||
      this.profilePhoto() !== baseline.profile.profilePicture ||
      this.bannerImage() !== baseline.profile.banner ||
      this.removeBannerRequested();
  });
  protected readonly isVisibilityDirty = computed(() => {
    const baseline = this.settingsBaseline();
    return !!baseline && (this.visibility() === 'PUBLIC') !== (baseline.profile.isProfilePublic ?? false);
  });
  protected readonly isPreferencesDirty = computed(() => {
    const baseline = this.settingsBaseline();
    return !!baseline && (
      this.language() !== (baseline.contentPreferences.preferredLanguage ?? 'pt-BR') ||
      this.region() !== (baseline.contentPreferences.preferredRegion ?? 'BR')
    );
  });

  constructor() {
    this.loadFollowRequests();
    this.loadBlockedUsers();
    this.session.ensureUser().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((user) => {
      if (!user) return;
      this.displayName.set(user.name ?? '');
      this.username.set(user.username);
      this.profilePhoto.set(user.profilePicture ?? null);
      this.bannerImage.set(user.banner ?? null);
      this.visibility.set(user.isProfilePublic ? 'PUBLIC' : 'PRIVATE');
      this.language.set(user.preferredLanguage ?? 'pt-BR');
      this.region.set(user.preferredRegion ?? 'BR');
      this.loadSettings();
    });
  }

  protected retryFollowRequests(): void {
    this.loadFollowRequests();
  }

  protected loadMoreFollowRequests(): void {
    if (!this.followRequestsHasNext() || this.loadingMoreFollowRequests()) return;
    const page = this.followRequestsPage() + 1;
    this.loadingMoreFollowRequests.set(true);
    this.notificationsApi.getFollowRequests(page, 20).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (result) => {
        this.followRequests.update((current) => [...current, ...result.content.filter((user) => !current.some((item) => item.id === user.id))]);
        this.followRequestCount.set(result.totalElements);
        this.followRequestsPage.set(result.page);
        this.followRequestsHasNext.set(result.hasNext);
        this.loadingMoreFollowRequests.set(false);
      },
      error: () => {
        this.loadingMoreFollowRequests.set(false);
        this.followRequestsError.set('Não foi possível carregar mais solicitações. Tente novamente.');
      },
    });
  }

  protected decideFollowRequest(request: FollowRequestUser, decision: FollowRequestDecision): void {
    if (this.followRequestActionId()) return;
    this.followRequestActionId.set(request.id);
    this.followRequestsError.set('');
    this.followRequestsMessage.set('');
    const action = decision === 'accepted'
      ? this.notificationsApi.acceptFollowRequest(request.id)
      : this.notificationsApi.rejectFollowRequest(request.id);
    action.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.followRequests.update((current) => current.filter((user) => user.id !== request.id));
        this.followRequestCount.update((count) => Math.max(0, count - 1));
        this.followRequestActionId.set(null);
        this.followRequestsMessage.set(decision === 'accepted' ? 'Solicitação aceita.' : 'Solicitação recusada.');
      },
      error: () => {
        this.followRequestActionId.set(null);
        this.followRequestsError.set('Não foi possível atualizar a solicitação. Tente novamente.');
      },
    });
  }

  protected retryBlockedUsers(): void {
    this.loadBlockedUsers();
  }

  protected loadMoreBlockedUsers(): void {
    if (!this.blockedUsersHasNext() || this.loadingMoreBlockedUsers()) return;
    const page = this.blockedUsersPage() + 1;
    this.loadingMoreBlockedUsers.set(true);
    this.settingsApi.getBlockedUsers(page, 20).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (result) => {
        this.blockedUsers.update((current) => [...current, ...result.content.filter((item) => !current.some((entry) => entry.user.id === item.user.id))]);
        this.blockedUserCount.set(result.totalElements);
        this.blockedUsersPage.set(result.page);
        this.blockedUsersHasNext.set(result.hasNext);
        this.loadingMoreBlockedUsers.set(false);
      },
      error: () => {
        this.loadingMoreBlockedUsers.set(false);
        this.blockedUsersError.set('Não foi possível carregar mais usuários bloqueados. Tente novamente.');
      },
    });
  }

  protected unblockUser(record: BlockedUserRecord): void {
    if (this.blockedUserActionId()) return;
    this.blockedUserActionId.set(record.user.id);
    this.blockedUsersError.set('');
    this.blockedUsersMessage.set('');
    this.settingsApi.unblockUser(record.user.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.blockedUsers.update((current) => current.filter((item) => item.user.id !== record.user.id));
        this.blockedUserCount.update((count) => Math.max(0, count - 1));
        this.blockedUserActionId.set(null);
        this.blockedUsersMessage.set('Usuário desbloqueado.');
      },
      error: () => {
        this.blockedUserActionId.set(null);
        this.blockedUsersError.set('Não foi possível desbloquear este usuário. Tente novamente.');
      },
    });
  }

  protected connectionName(name: string | null, username: string): string {
    return name?.trim() || username;
  }

  protected connectionInitial(name: string | null, username: string): string {
    return this.connectionName(name, username).slice(0, 1).toLocaleUpperCase('pt-BR') || 'W';
  }

  protected requestDate(value: string | null): string {
    if (!value) return 'data indisponível';
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return 'data indisponível';
    const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60_000));
    if (minutes < 60) return `há ${Math.max(1, minutes)} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `há ${hours} h`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'ontem';
    if (days < 7) return `há ${days} dias`;
    return `em ${new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short' }).format(date)}`;
  }

  protected openSection(section: SettingsSection): void {
    this.activeSection.set(section);
    this.notice.set('');
    if (window.matchMedia('(max-width: 760px)').matches) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    document.getElementById(`settings-${section}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  protected closeMobileSection(): void {
    this.activeSection.set(null);
    this.notice.set('');
  }

  protected onPhotoSelected(event: Event, target: 'profile' | 'banner'): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      this.showUnavailable('Escolha uma imagem JPG, PNG ou WebP.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const url = typeof reader.result === 'string' ? reader.result : null;
      if (target === 'profile') this.profilePhoto.set(url);
      else {
        this.bannerImage.set(url);
        this.removeBannerRequested.set(false);
      }
      this.noticeKind.set('success');
      this.notice.set('Imagem disponível apenas na prévia; esta API não oferece envio de arquivos.');
    };
    reader.readAsDataURL(file);
  }

  protected removeBanner(): void {
    this.bannerImage.set(null);
    this.removeBannerRequested.set(!!this.settingsBaseline()?.profile.banner);
  }

  protected saveProfile(): void {
    if (this.busy() || !this.settingsLoaded()) return;
    const baseline = this.settingsBaseline();
    if (!baseline) return;
    const name = this.displayName().trim();
    const username = this.username().trim();
    if (!name) return this.showUnavailable('Informe seu nome para salvar o perfil.');
    if (!/^[A-Za-z0-9._]{3,30}$/.test(username)) {
      return this.showUnavailable('O nome de usuário deve ter de 3 a 30 caracteres: letras, números, pontos ou sublinhados.');
    }

    const patch: UpdateUserSettingsRequest = {};
    if (name !== (baseline.profile.name ?? '')) patch.name = name;
    if (username !== baseline.profile.username) patch.username = username;
    if (this.bio() !== (baseline.profile.description ?? '')) patch.description = this.bio();
    const hasPatch = Object.keys(patch).length > 0;
    const removeBanner = this.removeBannerRequested();
    const photoDraft = this.profilePhoto();
    const bannerDraft = this.bannerImage();
    const hasLocalOnlyMedia = photoDraft !== baseline.profile.profilePicture ||
      (!removeBanner && bannerDraft !== baseline.profile.banner);

    if (!hasPatch && !removeBanner) {
      if (hasLocalOnlyMedia) {
        this.showUnavailable('A API não oferece envio de fotos. A imagem escolhida aparece apenas nesta prévia e não foi enviada.');
      }
      return;
    }

    this.busy.set(true);
    this.notice.set('');
    const finish = (message: string, kind: 'success' | 'error' = 'success'): void => {
      if (hasLocalOnlyMedia) {
        this.profilePhoto.set(photoDraft);
        if (!removeBanner) this.bannerImage.set(bannerDraft);
      }
      this.busy.set(false);
      this.noticeKind.set(kind);
      this.notice.set(hasLocalOnlyMedia && kind === 'success'
        ? `${message} A imagem escolhida continua apenas na prévia porque a API não oferece envio de arquivos.`
        : message);
    };
    const finishAfterRefresh = (message: string, kind: 'success' | 'error' = 'success'): void => {
      this.loadSettings(() => finish(message, kind));
    };
    const removeBannerAfterPatch = (): void => {
      if (!removeBanner) {
        finishAfterRefresh('Perfil atualizado.');
        return;
      }
      this.settingsApi.removeBanner().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: () => {
          this.markBannerRemoved();
          finishAfterRefresh('Perfil atualizado e banner removido.');
        },
        error: (error: unknown) => finishAfterRefresh(this.errorMessage(error, 'Não foi possível remover o banner.'), 'error'),
      });
    };

    if (!hasPatch) {
      removeBannerAfterPatch();
      return;
    }
    this.settingsApi.updateUser(patch).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (updated) => {
        this.applyUpdatedUser(updated);
        removeBannerAfterPatch();
      },
      error: (error: unknown) => {
        this.busy.set(false);
        this.showUnavailable(this.errorMessage(error, 'Não foi possível salvar o perfil.'));
      },
    });
  }

  protected saveVisibility(): void {
    if (this.busy() || !this.isVisibilityDirty()) return;
    const isProfilePublic = this.visibility() === 'PUBLIC';
    this.submitUserPatch({ isProfilePublic }, 'Visibilidade atualizada.', (updated) => {
      this.visibility.set(updated.isProfilePublic ? 'PUBLIC' : 'PRIVATE');
      this.loadFollowRequests();
    });
  }

  protected savePreferences(): void {
    if (this.busy() || !this.isPreferencesDirty()) return;
    this.submitUserPatch({ preferredLanguage: this.language(), preferredRegion: this.region() }, 'Preferências atualizadas.', (updated) => {
      this.language.set(updated.preferredLanguage ?? this.language());
      this.region.set(updated.preferredRegion ?? this.region());
    });
  }

  protected updateEmail(): void {
    if (this.busy()) return;
    const email = this.newEmail().trim().toLowerCase();
    const currentPassword = this.emailCurrentPassword();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return this.showUnavailable('Informe um endereço de e-mail válido.');
    }
    if (!currentPassword) return this.showUnavailable('Informe sua senha atual para alterar o e-mail.');
    if (email === (this.user()?.email ?? '').toLowerCase()) {
      return this.showUnavailable('Este já é o e-mail atual da conta.');
    }
    this.submitUserPatch({ email, currentPassword }, 'Enviamos um link de confirmação para o novo e-mail.', () => {
      this.newEmail.set('');
      this.emailCurrentPassword.set('');
    });
  }

  protected updatePassword(): void {
    if (this.busy()) return;
    const currentPassword = this.passwordCurrentPassword();
    const password = this.newPassword();
    if (!currentPassword) return this.showUnavailable('Informe sua senha atual.');
    if (password.length < 8 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
      return this.showUnavailable('A nova senha precisa ter ao menos 8 caracteres, uma letra maiúscula, uma minúscula e um número.');
    }
    if (password !== this.confirmPassword()) return this.showUnavailable('A confirmação da nova senha não corresponde.');
    this.busy.set(true);
    this.notice.set('');
    this.settingsApi.updateUser({ password, currentPassword }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.session.clear();
        void this.router.navigateByUrl('/login');
      },
      error: (error: unknown) => {
        this.busy.set(false);
        this.showUnavailable(this.errorMessage(error, 'Não foi possível atualizar a senha.'));
      },
    });
  }

  protected resetProfile(): void {
    const baseline = this.settingsBaseline();
    if (!baseline) return;
    this.displayName.set(baseline.profile.name ?? '');
    this.username.set(baseline.profile.username);
    this.bio.set(baseline.profile.description ?? '');
    this.profilePhoto.set(baseline.profile.profilePicture);
    this.bannerImage.set(baseline.profile.banner);
    this.removeBannerRequested.set(false);
    this.notice.set('');
  }

  protected logoutHere(): void {
    if (this.busy()) return;
    this.busy.set(true);
    this.authApi.logout().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.session.clear();
        void this.router.navigateByUrl('/login');
      },
      error: (error: unknown) => {
        if (error instanceof HttpErrorResponse && error.status === 401) {
          this.session.clear();
          void this.router.navigateByUrl('/login');
          return;
        }
        this.noticeKind.set('error');
        this.notice.set('Não foi possível encerrar esta sessão. Tente novamente.');
        this.busy.set(false);
      },
    });
  }

  protected openDialog(dialog: Exclude<SettingsDialog, null>): void {
    this.deleteAccountPassword.set('');
    this.dialog.set(dialog);
  }

  protected closeDialog(): void {
    this.deleteAccountPassword.set('');
    this.dialog.set(null);
  }

  protected deleteAccount(): void {
    if (this.busy()) return;
    const password = this.deleteAccountPassword();
    if (!password) return this.showUnavailable('Informe sua senha atual para confirmar a exclusão.');
    this.busy.set(true);
    this.notice.set('');
    this.settingsApi.deleteAccount(password).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.session.clear();
        this.dialog.set(null);
        void this.router.navigateByUrl('/login');
      },
      error: (error: unknown) => {
        this.busy.set(false);
        this.showUnavailable(this.errorMessage(error, 'Não foi possível excluir a conta.'));
      },
    });
  }

  protected showUnavailable(message = 'A API atual não oferece esta operação; nenhuma alteração foi salva.'): void {
    this.noticeKind.set('error');
    this.notice.set(message);
  }

  private loadFollowRequests(): void {
    this.followRequestsStatus.set('loading');
    this.followRequestsError.set('');
    this.notificationsApi.getFollowRequests(1, 20).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (result) => {
        this.followRequests.set(result.content);
        this.followRequestCount.set(result.totalElements);
        this.followRequestsPage.set(result.page);
        this.followRequestsHasNext.set(result.hasNext);
        this.followRequestsStatus.set('ready');
      },
      error: () => {
        this.followRequestsStatus.set('error');
        this.followRequestsError.set('Não foi possível carregar as solicitações para seguir.');
      },
    });
  }

  private loadSettings(onLoaded?: () => void): void {
    this.settingsApi.getSettings().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (settings) => {
        this.applySettings(settings);
        onLoaded?.();
      },
      error: () => {
        if (onLoaded) onLoaded();
        else this.showUnavailable('Não foi possível carregar suas configurações. Tente novamente.');
      },
    });
  }

  private applySettings(settings: SettingsView): void {
    this.settingsBaseline.set(settings);
    this.settingsLoaded.set(true);
    this.displayName.set(settings.profile.name ?? '');
    this.username.set(settings.profile.username);
    this.bio.set(settings.profile.description ?? '');
    this.profilePhoto.set(settings.profile.profilePicture);
    this.bannerImage.set(settings.profile.banner);
    this.removeBannerRequested.set(false);
    this.visibility.set(settings.profile.isProfilePublic ? 'PUBLIC' : 'PRIVATE');
    this.language.set(settings.contentPreferences.preferredLanguage ?? 'pt-BR');
    this.region.set(settings.contentPreferences.preferredRegion ?? 'BR');
    const current = this.user();
    const sessionUser: SessionUser = {
      id: settings.profile.id,
      username: settings.profile.username,
      email: settings.account.email,
      name: settings.profile.name ?? undefined,
      description: settings.profile.description,
      profilePicture: settings.profile.profilePicture,
      banner: settings.profile.banner,
      isProfilePublic: settings.profile.isProfilePublic,
      preferredLanguage: settings.contentPreferences.preferredLanguage,
      preferredRegion: settings.contentPreferences.preferredRegion,
    };
    this.session.updateUser({ ...current, ...sessionUser });
  }

  private applyUpdatedUser(updated: UserSettingsUpdate): void {
    const baseline = this.settingsBaseline();
    if (baseline) {
      this.settingsBaseline.set({
        ...baseline,
        profile: {
          ...baseline.profile,
          id: updated.id,
          username: updated.username,
          name: updated.name,
          description: updated.description,
          profilePicture: updated.profilePicture,
          banner: updated.banner,
          isProfilePublic: updated.isProfilePublic,
        },
        contentPreferences: {
          preferredLanguage: updated.preferredLanguage,
          preferredRegion: updated.preferredRegion,
        },
        account: { email: updated.email },
      });
    }
    const current = this.user();
    this.session.updateUser({
      ...current,
      id: updated.id,
      username: updated.username,
      email: updated.email,
      name: updated.name ?? undefined,
      description: updated.description,
      profilePicture: updated.profilePicture,
      banner: updated.banner,
      isProfilePublic: updated.isProfilePublic,
      preferredLanguage: updated.preferredLanguage,
      preferredRegion: updated.preferredRegion,
    });
  }

  private markBannerRemoved(): void {
    const baseline = this.settingsBaseline();
    if (baseline) {
      this.settingsBaseline.set({ ...baseline, profile: { ...baseline.profile, banner: null } });
    }
    const current = this.user();
    if (current) this.session.updateUser({ ...current, banner: null });
  }

  private submitUserPatch(
    patch: UpdateUserSettingsRequest,
    successMessage: string,
    afterSuccess?: (updated: UserSettingsUpdate) => void,
  ): void {
    this.busy.set(true);
    this.notice.set('');
    this.settingsApi.updateUser(patch).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (updated) => {
        this.applyUpdatedUser(updated);
        afterSuccess?.(updated);
        this.busy.set(false);
        this.noticeKind.set('success');
        this.notice.set(successMessage);
      },
      error: (error: unknown) => {
        this.busy.set(false);
        this.showUnavailable(this.errorMessage(error, 'Não foi possível salvar as configurações.'));
      },
    });
  }

  private errorMessage(error: unknown, fallback: string): string {
    if (!(error instanceof HttpErrorResponse)) return fallback;
    if (error.status === 401) return 'Sua senha está incorreta ou sua sessão expirou.';
    if (error.status === 409) return 'Este nome de usuário ou e-mail já está em uso.';
    if (error.status === 400) return 'A API recusou os dados. Revise os campos e tente novamente.';
    if (error.status === 0 || error.status >= 500) return 'A API não respondeu. Tente novamente em instantes.';
    return fallback;
  }

  private loadBlockedUsers(): void {
    this.blockedUsersStatus.set('loading');
    this.blockedUsersError.set('');
    this.settingsApi.getBlockedUsers(1, 20).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (result) => {
        this.blockedUsers.set(result.content);
        this.blockedUserCount.set(result.totalElements);
        this.blockedUsersPage.set(result.page);
        this.blockedUsersHasNext.set(result.hasNext);
        this.blockedUsersStatus.set('ready');
      },
      error: () => {
        this.blockedUsersStatus.set('error');
        this.blockedUsersError.set('Não foi possível carregar os usuários bloqueados.');
      },
    });
  }
}
