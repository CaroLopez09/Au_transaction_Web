/** domain/shared/PostalAddress */
export interface PostalAddressDto {
  streetName?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

/** application/treasury/RecipientView (el BFF solo lista los activos). */
export interface RecipientViewDto {
  id: string;
  kiraRecipientId?: string;
  name: string;
  rail: string;
  network?: string;
  bankName?: string;
  maskedDestination?: string;
  status: string;
  registeredInKira: boolean;
  alreadyExisted: boolean;
  replacedByRecipientId?: string;
  bankAddress?: PostalAddressDto;
  createdAt?: string;
}

/** application/treasury/KiraRecipientView */
export interface KiraRecipientViewDto {
  kiraRecipientId?: string;
  localRecipientId?: string;
  type?: string;
  name?: string;
  accountType?: string;
  maskedDestination?: string;
  email?: string;
  createdAt?: string;
}

/** application/treasury/RecipientCommands.RegisterRecipient */
export interface RegisterRecipientDto {
  rail: string;
  business: boolean;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  email?: string;
  phone?: string;
  address?: PostalAddressDto;
  routingNumber?: string;
  swiftCode?: string;
  accountNumber?: string;
  accountKind?: string;
  bankName?: string;
  bankAddressText?: string;
  bankAddress?: PostalAddressDto;
  token?: string;
  network?: string;
  walletAddress?: string;
  docType?: string;
  docNumber?: string;
}
