import { inject, Injectable, signal } from '@angular/core';
import { Observable } from 'rxjs';
import {
  ActionResult,
  fetchRemote,
  loading,
  RemoteData,
  runAction,
  success,
} from '../../../shared/utilities/remote-data';
import { ItemAnswer, Rfi, RfiRepository, TemporaryLink } from '../domain/rfi';

type Busy =
  | 'sync'
  | 'refresh'
  | 'answer'
  | `upload:${string}`
  | `remove:${string}`
  | `link:${string}`
  | `owner-link:${string}`
  | null;

@Injectable()
export class RfisFacade {
  private readonly repository = inject(RfiRepository);

  private readonly listState = signal<RemoteData<readonly Rfi[]>>(loading());
  private readonly detailState = signal<RemoteData<Rfi>>(loading());
  private readonly busyState = signal<Busy>(null);

  readonly list = this.listState.asReadonly();
  readonly detail = this.detailState.asReadonly();
  readonly busy = this.busyState.asReadonly();

  async loadList(onlyOpen: boolean): Promise<void> {
    this.listState.set(loading());
    this.listState.set(await fetchRemote(this.repository.list(onlyOpen)));
  }

  async loadDetail(id: string): Promise<void> {
    this.detailState.set(loading());
    this.detailState.set(await fetchRemote(this.repository.get(id)));
  }

  sync(): Promise<ActionResult<readonly Rfi[]> | null> {
    return this.run('sync', this.repository.sync(), (list) => this.listState.set(success(list)));
  }

  refresh(id: string): Promise<ActionResult<Rfi> | null> {
    return this.run('refresh', this.repository.refresh(id), (rfi) => this.detailState.set(success(rfi)));
  }

  /** Todo o nada: si el BFF o el proveedor rechazan un ítem, no se guarda ninguno. */
  answer(id: string, answers: readonly ItemAnswer[]): Promise<ActionResult<Rfi> | null> {
    return this.run('answer', this.repository.answer(id, answers), (rfi) => this.detailState.set(success(rfi)));
  }

  upload(id: string, itemId: string, files: readonly File[]): Promise<ActionResult<Rfi> | null> {
    return this.run(`upload:${itemId}`, this.repository.uploadDocuments(id, itemId, files), (rfi) =>
      this.detailState.set(success(rfi)),
    );
  }

  removeDocument(id: string, itemId: string, documentId: string): Promise<ActionResult<Rfi> | null> {
    return this.run(`remove:${documentId}`, this.repository.removeDocument(id, itemId, documentId), (rfi) =>
      this.detailState.set(success(rfi)),
    );
  }

  /** El enlace es una credencial temporal: se pide al momento y no se guarda. */
  documentLink(id: string, itemId: string, documentId: string): Promise<ActionResult<TemporaryLink> | null> {
    return this.run(`link:${documentId}`, this.repository.documentLink(id, itemId, documentId), () => undefined);
  }

  /** Se acuña cuando la persona pulsa: caduca en torno a una hora y no se guarda. */
  ownerVerificationLink(id: string, itemId: string): Promise<ActionResult<TemporaryLink> | null> {
    return this.run(`owner-link:${itemId}`, this.repository.ownerVerificationLink(id, itemId), () => undefined);
  }

  private async run<T>(
    busy: Busy,
    source: Observable<T>,
    onSuccess: (value: T) => void,
  ): Promise<ActionResult<T> | null> {
    if (this.busyState()) {
      return null;
    }
    this.busyState.set(busy);
    try {
      const result = await runAction(source);
      if (result.ok) {
        onSuccess(result.value);
      }
      return result;
    } finally {
      this.busyState.set(null);
    }
  }
}
