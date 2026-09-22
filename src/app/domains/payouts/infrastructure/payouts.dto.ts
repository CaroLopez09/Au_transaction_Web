/** application/treasury/QuotationView */
export interface QuotationViewDto {
  id: string;
  kiraQuoteId?: string;
  virtualAccountId: string;
  recipientId: string;
  rail: string;
  originAmount?: number;
  destinationAmount?: number;
  destinationCurrency?: string;
  exchangeRate?: number;
  kiraFee?: number;
  platformFee?: number;
  totalFee?: number;
  totalDebitAmount?: number;
  balanceSufficient: boolean;
  fallbackRate: boolean;
  status: string;
  expiresAt?: string;
  secondsToExpiry: number;
}

/** application/treasury/QuotationCommands.CreateQuote */
export interface CreateQuoteDto {
  virtualAccountId: string;
  recipientId: string;
  amount: number;
  rail?: string;
}

/** application/treasury/PayoutView */
export interface PayoutViewDto {
  id: string;
  virtualAccountId: string;
  recipientId: string;
  /** Nombre del destinatario, también si está archivado (el directorio solo trae los activos). */
  recipientName?: string;
  quotationId?: string;
  amount?: number;
  currency?: string;
  kiraFee?: number;
  platformFee?: number;
  totalFee?: number;
  totalDebitAmount?: number;
  approvalState: string;
  status: string;
  terminal: boolean;
  makerUserId: string;
  makerName?: string;
  approverUserId?: string;
  approverName?: string;
  firstApproverUserId?: string;
  firstApproverName?: string;
  requiredApprovals?: number;
  priceLocked: boolean;
  kiraPayoutId?: string;
  referenceNumber?: string;
  paymentMethod?: string;
  errorCode?: string;
  blockedByRfiId?: string;
  fundingNetwork?: string;
  fundingCurrency?: string;
  depositInstructions?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** application/treasury/PayoutEventView */
export interface PayoutEventViewDto {
  eventId?: string;
  status?: string;
  message?: string;
  createdAt?: string;
}

/** application/treasury/KiraPayoutPage */
export interface KiraPayoutPageDto {
  items?: KiraPayoutItemDto[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface KiraPayoutItemDto {
  kiraPayoutId?: string;
  shortId?: string;
  localPayoutId?: string;
  virtualAccountId?: string;
  status?: string;
  origin?: string;
  fromAmount?: string;
  fromCurrency?: string;
  toAmount?: string;
  toCurrency?: string;
  paymentMethod?: string;
  senderName?: string;
  recipientName?: string;
  reference?: string;
  memo?: string;
  createdAt?: string;
}

/** application/treasury/PayoutCommands.CreatePayout */
export interface CreatePayoutDto {
  virtualAccountId: string;
  recipientId: string;
  amount: number;
  currency: string;
  quotationId: string;
  cryptoNetwork?: string | null;
  cryptoCurrency?: string | null;
}

/** application/treasury/PayoutCommands.ApprovePayout */
export interface ApprovePayoutDto {
  comment?: string;
  natureOfPayment?: string;
  memo?: string;
  documents?: { type: string; file: string }[];
}
