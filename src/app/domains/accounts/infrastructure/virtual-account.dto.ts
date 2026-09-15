/** application/account/VirtualAccountView (non_null: lo nulo no llega). */
export interface VirtualAccountViewDto {
  id: string;
  kiraAccountId?: string;
  status: string;
  mode: string;
  bank?: string;
  bankName?: string;
  description?: string;
  accountNumber?: string;
  routingNumber?: string;
  currency?: string;
  availableBalance?: number;
  balanceRefreshedAt?: string;
  balanceStale: boolean;
  fundsReady: boolean;
  activationDelayed: boolean;
  createdAt?: string;
}

/** application/account/VirtualAccountCommands.OpenAccount — la moneda no se envía: la fija el BFF. */
export interface OpenAccountDto {
  description?: string;
  mode?: string;
}

/** application/account/VirtualAccountCommands.SimulateDeposit */
export interface SimulateDepositDto {
  amount: number;
  paymentType: string;
}
