import { inject, Injectable, signal, WritableSignal } from '@angular/core';
import { firstValueFrom, Observable } from 'rxjs';
import { toApiError } from '../../../core/http/api-error';
import { mapApiError, UserFacingError } from '../../../core/http/error-mapping';
import { failure, loading, RemoteData, success } from '../../../shared/utilities/remote-data';
import { BeneficialOwner, OwnershipRoster, SaveBeneficialOwner } from '../domain/beneficial-owner';
import { OnboardingStatus } from '../domain/onboarding-status';
import { OnboardingRepository } from '../domain/onboarding.repository';

export type SaveOwnerResult =
  { readonly ok: true; readonly owner: BeneficialOwner } | { readonly ok: false; readonly error: UserFacingError };

/** Estado de vinculación compartido por Inicio y Vinculación dentro de la sesión. */
@Injectable()
export class OnboardingFacade {
  private readonly repository = inject(OnboardingRepository);

  private readonly statusState = signal<RemoteData<OnboardingStatus>>(loading());
  private readonly rosterState = signal<RemoteData<OwnershipRoster>>(loading());
  private readonly refreshingState = signal(false);
  private readonly refreshErrorState = signal<UserFacingError | null>(null);
  private readonly savingOwnerState = signal(false);

  readonly status = this.statusState.asReadonly();
  readonly roster = this.rosterState.asReadonly();
  readonly refreshing = this.refreshingState.asReadonly();
  readonly refreshError = this.refreshErrorState.asReadonly();
  readonly savingOwner = this.savingOwnerState.asReadonly();

  load(): void {
    void this.loadInto(this.statusState, this.repository.status());
    void this.loadInto(this.rosterState, this.repository.roster());
  }

  reloadStatus(): void {
    void this.loadInto(this.statusState, this.repository.status());
  }

  reloadRoster(): void {
    void this.loadInto(this.rosterState, this.repository.roster());
  }

  /** Relee en el proveedor. Si falla, se conserva el último estado conocido y se informa aparte. */
  async refreshFromProvider(): Promise<void> {
    if (this.refreshingState()) {
      return;
    }
    this.refreshingState.set(true);
    this.refreshErrorState.set(null);
    try {
      this.statusState.set(success(await firstValueFrom(this.repository.refresh())));
    } catch (error) {
      this.refreshErrorState.set(mapApiError(toApiError(error)));
    } finally {
      this.refreshingState.set(false);
    }
  }

  /**
   * Alta o edición local de un beneficiario. Un segundo envío mientras el primero sigue en curso se
   * descarta: el BFF crea un registro nuevo por cada POST sin `id` y no hay forma de borrarlo (G-17).
   */
  async saveOwner(command: SaveBeneficialOwner): Promise<SaveOwnerResult | null> {
    if (this.savingOwnerState()) {
      return null;
    }
    this.savingOwnerState.set(true);
    try {
      const owner = await firstValueFrom(this.repository.saveOwner(command));
      await this.refreshRosterKeepingCurrent();
      return { ok: true, owner };
    } catch (error) {
      return { ok: false, error: mapApiError(toApiError(error)) };
    } finally {
      this.savingOwnerState.set(false);
    }
  }

  /** El asistente publica aquí el estado que devuelve el BFF tras enviar algo al proveedor. */
  applyStatus(status: OnboardingStatus): void {
    this.statusState.set(success(status));
  }

  applyRoster(roster: OwnershipRoster): void {
    this.rosterState.set(success(roster));
  }

  /** Recarga el grupo sin volver a esqueleto (tras subir documentos o sincronizar). */
  reloadRosterQuietly(): Promise<void> {
    return this.refreshRosterKeepingCurrent();
  }

  /** Tras guardar, la lista visible se mantiene hasta que llega la nueva (sin volver a esqueleto). */
  private async refreshRosterKeepingCurrent(): Promise<void> {
    try {
      this.rosterState.set(success(await firstValueFrom(this.repository.roster())));
    } catch (error) {
      this.rosterState.set(failure(mapApiError(toApiError(error))));
    }
  }

  private async loadInto<T>(target: WritableSignal<RemoteData<T>>, source: Observable<T>): Promise<void> {
    target.set(loading());
    try {
      target.set(success(await firstValueFrom(source)));
    } catch (error) {
      target.set(failure(mapApiError(toApiError(error))));
    }
  }
}
