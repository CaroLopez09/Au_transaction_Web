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
import {
  OpenVirtualAccount,
  SimulateDeposit,
  VirtualAccount,
  VirtualAccountRepository,
} from '../domain/virtual-account';

@Injectable()
export class AccountsFacade {
  private readonly repository = inject(VirtualAccountRepository);

  private readonly listState = signal<RemoteData<readonly VirtualAccount[]>>(loading());
  private readonly detailState = signal<RemoteData<VirtualAccount>>(loading());
  private readonly busyState = signal<'open' | 'refresh' | 'balance' | 'simulate' | null>(null);

  readonly accounts = this.listState.asReadonly();
  readonly detail = this.detailState.asReadonly();
  readonly busy = this.busyState.asReadonly();

  async loadList(): Promise<void> {
    this.listState.set(loading());
    this.listState.set(await fetchRemote(this.repository.list()));
  }

  async loadDetail(id: string): Promise<void> {
    this.detailState.set(loading());
    this.detailState.set(await fetchRemote(this.repository.get(id)));
  }

  /** El BFF crea una cuenta nueva por cada POST: un segundo envío en curso se descarta. */
  open(command: OpenVirtualAccount): Promise<ActionResult<VirtualAccount> | null> {
    return this.run('open', this.repository.open(command), (account) => this.updateList((list) => [...list, account]));
  }

  refresh(id: string): Promise<ActionResult<VirtualAccount> | null> {
    return this.run('refresh', this.repository.refresh(id), (account) => this.applyDetail(account));
  }

  refreshBalance(id: string): Promise<ActionResult<VirtualAccount> | null> {
    return this.run('balance', this.repository.refreshBalance(id), (account) => this.applyDetail(account));
  }

  simulateDeposit(id: string, command: SimulateDeposit): Promise<ActionResult<VirtualAccount> | null> {
    return this.run('simulate', this.repository.simulateDeposit(id, command), (account) => this.applyDetail(account));
  }

  private async run(
    action: 'open' | 'refresh' | 'balance' | 'simulate',
    source: Observable<VirtualAccount>,
    onSuccess: (account: VirtualAccount) => void,
  ): Promise<ActionResult<VirtualAccount> | null> {
    if (this.busyState()) {
      return null;
    }
    this.busyState.set(action);
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

  private applyDetail(account: VirtualAccount): void {
    this.detailState.set(success(account));
    this.updateList((list) => list.map((item) => (item.id === account.id ? account : item)));
  }

  private updateList(change: (list: readonly VirtualAccount[]) => readonly VirtualAccount[]): void {
    const current = this.listState();
    if (current.status === 'success') {
      this.listState.set(success(change(current.data)));
    }
  }
}
