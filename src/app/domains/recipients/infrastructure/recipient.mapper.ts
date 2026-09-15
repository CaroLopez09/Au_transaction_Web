import { toDate } from '../../../shared/utilities/dates';
import {
  parseRecipientRail,
  PostalAddress,
  ProviderRecipient,
  Recipient,
  RegisterRecipient,
} from '../domain/recipient';
import { KiraRecipientViewDto, PostalAddressDto, RecipientViewDto, RegisterRecipientDto } from './recipient.dto';

export function toRecipient(dto: RecipientViewDto): Recipient {
  const status = dto.status?.trim().toUpperCase();
  return {
    id: dto.id,
    providerRecipientId: dto.kiraRecipientId ?? null,
    name: dto.name,
    rail: parseRecipientRail(dto.rail),
    network: dto.network ?? null,
    bankName: dto.bankName ?? null,
    maskedDestination: dto.maskedDestination ?? null,
    status: status === 'ACTIVE' || status === 'ARCHIVED' ? status : 'UNKNOWN',
    registeredWithProvider: dto.registeredInKira,
    alreadyExisted: dto.alreadyExisted,
    replacedByRecipientId: dto.replacedByRecipientId ?? null,
    bankAddress: dto.bankAddress ? toAddress(dto.bankAddress) : null,
    createdAt: toDate(dto.createdAt),
  };
}

export function toProviderRecipient(dto: KiraRecipientViewDto): ProviderRecipient {
  return {
    providerRecipientId: dto.kiraRecipientId ?? null,
    localRecipientId: dto.localRecipientId ?? null,
    holderType: dto.type ?? null,
    name: dto.name ?? null,
    accountType: dto.accountType ?? null,
    maskedDestination: dto.maskedDestination ?? null,
    email: dto.email ?? null,
    createdAt: dto.createdAt ?? null,
  };
}

function toAddress(dto: PostalAddressDto): PostalAddress {
  return {
    streetName: dto.streetName ?? null,
    city: dto.city ?? null,
    state: dto.state ?? null,
    postalCode: dto.postalCode ?? null,
    country: dto.country ?? null,
  };
}

/** Un destinatario = un riel: solo viajan los campos del riel elegido (el BFF rechaza mezclas). */
export function toRegisterRecipientDto(command: RegisterRecipient): RegisterRecipientDto {
  const { holder, destination } = command;
  const base: RegisterRecipientDto = {
    rail: destination.rail,
    business: holder.business,
    ...(holder.business
      ? text('companyName', holder.companyName)
      : { ...text('firstName', holder.firstName), ...text('lastName', holder.lastName) }),
    ...text('email', holder.email),
    ...text('phone', holder.phone),
    ...addressField('address', destination.address),
    ...text('docType', command.docType),
    ...text('docNumber', command.docNumber),
  };
  if (destination.rail === 'WALLET') {
    return {
      ...base,
      token: destination.token,
      network: destination.network,
      walletAddress: destination.walletAddress.trim(),
    };
  }
  return {
    ...base,
    routingNumber: destination.routingNumber.trim(),
    accountNumber: destination.accountNumber.trim(),
    accountKind: destination.accountKind,
    ...text('bankName', destination.bankName),
    ...(destination.rail === 'WIRE'
      ? {
          ...text('swiftCode', destination.swiftCode?.toUpperCase() ?? null),
          ...addressField('bankAddress', destination.bankAddress),
        }
      : text('bankAddressText', destination.bankAddressText)),
  };
}

function text<K extends keyof RegisterRecipientDto>(key: K, value: string | null): Partial<RegisterRecipientDto> {
  const trimmed = value?.trim();
  return trimmed ? { [key]: trimmed } : {};
}

function addressField(key: 'address' | 'bankAddress', address: PostalAddress | null): Partial<RegisterRecipientDto> {
  if (!address) {
    return {};
  }
  const dto: PostalAddressDto = {
    ...(address.streetName?.trim() ? { streetName: address.streetName.trim() } : {}),
    ...(address.city?.trim() ? { city: address.city.trim() } : {}),
    ...(address.state?.trim() ? { state: address.state.trim() } : {}),
    ...(address.postalCode?.trim() ? { postalCode: address.postalCode.trim() } : {}),
    ...(address.country?.trim() ? { country: address.country.trim().toUpperCase() } : {}),
  };
  return Object.keys(dto).length ? { [key]: dto } : {};
}
