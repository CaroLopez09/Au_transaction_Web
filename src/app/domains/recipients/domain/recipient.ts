import { Observable } from 'rxjs';

export type RecipientRail = 'ACH' | 'WIRE' | 'WALLET';

export interface PostalAddress {
  readonly streetName: string | null;
  readonly city: string | null;
  readonly state: string | null;
  readonly postalCode: string | null;
  /** ISO-3166 alfa-2 en destinatarios (no alfa-3 como en la vinculación). */
  readonly country: string | null;
}

export interface Recipient {
  readonly id: string;
  readonly providerRecipientId: string | null;
  readonly name: string;
  readonly rail: RecipientRail | null;
  readonly network: string | null;
  readonly bankName: string | null;
  /** Ya enmascarado por el BFF. */
  readonly maskedDestination: string | null;
  readonly status: 'ACTIVE' | 'ARCHIVED' | 'UNKNOWN';
  readonly registeredWithProvider: boolean;
  readonly alreadyExisted: boolean;
  readonly replacedByRecipientId: string | null;
  readonly bankAddress: PostalAddress | null;
  readonly createdAt: Date | null;
}

/** Destinatario tal como lo tiene el proveedor (conciliación). `localRecipientId` nulo = no nació en este portal. */
export interface ProviderRecipient {
  readonly providerRecipientId: string | null;
  readonly localRecipientId: string | null;
  readonly holderType: string | null;
  readonly name: string | null;
  readonly accountType: string | null;
  readonly maskedDestination: string | null;
  readonly email: string | null;
  readonly createdAt: string | null;
}

/** Recipient.assertUsable del BFF: activo y registrado en el proveedor. */
export function isUsableForPayouts(recipient: Recipient): boolean {
  return recipient.status === 'ACTIVE' && recipient.registeredWithProvider;
}

// ---------- Alta ----------

export interface RecipientHolder {
  readonly business: boolean;
  readonly firstName: string | null;
  readonly lastName: string | null;
  readonly companyName: string | null;
  readonly email: string | null;
  readonly phone: string | null;
}

export type BankAccountKind = 'checking' | 'savings';

export interface BankDestination {
  readonly rail: 'ACH' | 'WIRE';
  readonly routingNumber: string;
  readonly accountNumber: string;
  readonly accountKind: BankAccountKind;
  readonly bankName: string | null;
  /** Solo WIRE. */
  readonly swiftCode: string | null;
  /** ACH: dirección del banco como texto. */
  readonly bankAddressText: string | null;
  /** WIRE: dirección del banco como objeto. */
  readonly bankAddress: PostalAddress | null;
  /** Dirección del titular: obligatoria en rieles bancarios (Recipient del BFF). */
  readonly address: PostalAddress;
}

export interface WalletDestination {
  readonly rail: 'WALLET';
  readonly token: WalletToken;
  readonly network: string;
  readonly walletAddress: string;
  readonly address: PostalAddress | null;
}

export interface RegisterRecipient {
  readonly holder: RecipientHolder;
  readonly destination: BankDestination | WalletDestination;
  readonly docType: string | null;
  readonly docNumber: string | null;
}

/** WalletToken del BFF: valor que se envía → redes admitidas por el proveedor. USDC no existe en tron. */
export const WALLET_TOKENS = {
  USDC: { label: 'USDC', networks: ['polygon', 'solana'] },
  USDT: { label: 'USDT', networks: ['polygon', 'solana', 'tron'] },
  COPM: { label: 'COPm', networks: ['polygon'] },
} as const satisfies Record<string, { label: string; networks: readonly string[] }>;

export type WalletToken = keyof typeof WALLET_TOKENS;

export function networksFor(token: WalletToken | null): readonly string[] {
  return token ? WALLET_TOKENS[token].networks : [];
}

/** RecipientAccount del BFF: exactamente 9 dígitos. */
export const ROUTING_NUMBER_PATTERN = /^\d{9}$/;
/** RecipientAccount.Wire del BFF: SWIFT/BIC de 8 u 11 caracteres. */
export const SWIFT_PATTERN = /^[A-Za-z]{4}[A-Za-z]{2}[A-Za-z0-9]{2}([A-Za-z0-9]{3})?$/;
export const ISO_ALPHA2_PATTERN = /^[A-Za-z]{2}$/;
/** RecipientHolder.MAX_PHONE_LENGTH */
export const MAX_PHONE_LENGTH = 16;

/**
 * Valores que Kira acepta en account.doc_type (POST /v1/recipients). Cualquier otro valor
 * (p. ej. "cc") lo rechaza con un 400 solo despues de intentar guardar el destinatario.
 */
export const DOC_TYPES = {
  id: 'Cédula / identificación nacional',
  dni: 'DNI',
  passport: 'Pasaporte',
  ein: 'EIN (identificación fiscal de empresa, EE. UU.)',
} as const satisfies Record<string, string>;

export type DocType = keyof typeof DOC_TYPES;

/**
 * Digito verificador ABA (mod 10, pesos 3-7-1) de un routing number de 9 digitos. Kira lo valida
 * y rechaza numeros de prueba inventados que no cumplan el checksum, aunque tengan 9 digitos.
 */
export function isValidAbaRoutingNumber(value: string): boolean {
  if (!ROUTING_NUMBER_PATTERN.test(value)) {
    return false;
  }
  const d = value.split('').map(Number);
  const checksum = 3 * (d[0] + d[3] + d[6]) + 7 * (d[1] + d[4] + d[7]) + 1 * (d[2] + d[5] + d[8]);
  return checksum % 10 === 0;
}

/** PostalAddress.isBlank del BFF: sin calle, ciudad ni código postal cuenta como vacía. */
export function isBlankAddress(address: PostalAddress | null): boolean {
  return !address || (!address.streetName?.trim() && !address.city?.trim() && !address.postalCode?.trim());
}

export abstract class RecipientRepository {
  abstract list(): Observable<readonly Recipient[]>;
  abstract get(id: string): Observable<Recipient>;
  abstract listInProvider(): Observable<readonly ProviderRecipient[]>;
  /** `idempotencyKey`: UUID por intención; repetirla devuelve el destinatario ya registrado. */
  abstract register(command: RegisterRecipient, idempotencyKey: string): Observable<Recipient>;
  abstract archive(id: string, replacedByRecipientId: string | null): Observable<Recipient>;
}

export function parseRecipientRail(raw: string | null | undefined): RecipientRail | null {
  const value = raw?.trim().toUpperCase();
  return value === 'ACH' || value === 'WIRE' || value === 'WALLET' ? value : null;
}
