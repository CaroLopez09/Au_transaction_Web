import { inject, Injectable, signal } from '@angular/core';
import {
  ActionResult,
  fetchRemote,
  loading,
  RemoteData,
  runAction,
  success,
} from '../../../shared/utilities/remote-data';
import { ProviderRecipient, Recipient, RecipientRepository, RegisterRecipient } from '../domain/recipient';

@Injectable()
export class RecipientsFacade {
  private readonly repository = inject(RecipientRepository);

  private readonly listState = signal<RemoteData<readonly Recipient[]>>(loading());
  private readonly providerState = signal<RemoteData<readonly ProviderRecipient[]> | null>(null);
  private readonly busyState = signal<'register' | 'archive' | null>(null);

  readonly recipients = this.listState.asReadonly();
  /** `null` hasta que la persona pide consultar el proveedor (llama a Kira). */
  readonly providerRecipients = this.providerState.asReadonly();
  readonly busy = this.busyState.asReadonly();

  async loadList(): Promise<void> {
    this.listState.set(loading());
    this.listState.set(await fetchRemote(this.repository.list()));
  }

  async loadProvider(): Promise<void> {
    this.providerState.set(loading());
    this.providerState.set(await fetchRemote(this.repository.listInProvider()));
  }

  /** Cada alta usa una clave nueva en el BFF: un segundo envío en curso se descarta. */
  async register(command: RegisterRecipient): Promise<ActionResult<Recipient> | null> {
    if (this.busyState()) {
      return null;
    }
    this.busyState.set('register');
    try {
      return await runAction(this.repository.register(command));
    } finally {
      this.busyState.set(null);
    }
  }

  async archive(id: string, replacedByRecipientId: string | null): Promise<ActionResult<Recipient> | null> {
    if (this.busyState()) {
      return null;
    }
    this.busyState.set('archive');
    try {
      const result = await runAction(this.repository.archive(id, replacedByRecipientId));
      const current = this.listState();
      if (result.ok && current.status === 'success') {
        // El listado del BFF solo trae activos: el archivado sale de la vista.
        this.listState.set(success(current.data.filter((recipient) => recipient.id !== id)));
      }
      return result;
    } finally {
      this.busyState.set(null);
    }
  }
}
