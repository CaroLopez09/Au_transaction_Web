import { inject, Injectable, signal } from '@angular/core';
import {
  ActionResult,
  fetchRemote,
  loading,
  RemoteData,
  runAction,
  success,
} from '../../../shared/utilities/remote-data';
import { Deposit, DEPOSITS_LIMIT, DepositRepository } from '../domain/deposit';

@Injectable()
export class DepositsFacade {
  private readonly repository = inject(DepositRepository);

  private readonly state = signal<RemoteData<readonly Deposit[]>>(loading());
  private readonly syncingState = signal(false);

  readonly deposits = this.state.asReadonly();
  readonly syncing = this.syncingState.asReadonly();
  readonly limit = DEPOSITS_LIMIT;

  async loadAll(): Promise<void> {
    this.state.set(loading());
    this.state.set(await fetchRemote(this.repository.list(DEPOSITS_LIMIT)));
  }

  async loadForAccount(accountId: string): Promise<void> {
    this.state.set(loading());
    this.state.set(await fetchRemote(this.repository.listByAccount(accountId, DEPOSITS_LIMIT)));
  }

  async syncAccount(accountId: string): Promise<ActionResult<readonly Deposit[]> | null> {
    if (this.syncingState()) {
      return null;
    }
    this.syncingState.set(true);
    try {
      const result = await runAction(this.repository.syncAccount(accountId));
      if (result.ok) {
        this.state.set(success(result.value));
      }
      return result;
    } finally {
      this.syncingState.set(false);
    }
  }
}
