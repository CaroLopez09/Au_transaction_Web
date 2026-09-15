/** application/compliance/RfiView — `items` llega con la forma cruda del proveedor. */
export interface RfiViewDto {
  id: string;
  kiraRfiId?: string;
  status: string;
  resolutionReason?: string;
  open: boolean;
  overdue: boolean;
  dueDate?: string;
  totalItems: number;
  pendingItems: number;
  items?: Record<string, unknown>[];
  blocking?: {
    type?: string;
    kiraResourceId?: string;
    payoutId?: string;
    payoutStatus?: string;
    depositId?: string;
    depositStatus?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

/** application/compliance/RfiDocumentLink */
export interface RfiDocumentLinkDto {
  downloadUrl: string;
  expiresAt?: string;
}

/** application/compliance/RfiUboLink */
export interface RfiUboLinkDto {
  url: string;
  expiresAt?: string;
}
