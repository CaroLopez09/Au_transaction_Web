/** application/account/DepositView */
export interface DepositViewDto {
  id: string;
  kiraDepositId?: string;
  virtualAccountId: string;
  grossAmount?: number;
  feeAmount?: number;
  netAmount?: number;
  currency?: string;
  senderName?: string;
  senderAccount?: string;
  rail?: string;
  status: string;
  microdeposit: boolean;
  creditsBalance: boolean;
  createdAt?: string;
  updatedAt?: string;
}
