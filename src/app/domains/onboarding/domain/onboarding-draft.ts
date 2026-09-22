import { OwnershipRoster } from './beneficial-owner';
import { OnboardingStatus } from './onboarding-status';

/**
 * Borrador del asistente de vinculación. Se guarda en el BFF (PUT /api/onboarding/draft) y nunca
 * viaja a Kira por sí solo. Los campos usan los nombres de Kira para que enviar sea una proyección directa.
 * No contiene archivos: de los documentos solo recuerda qué se subió y cuándo.
 */
export interface OnboardingDraft {
  readonly company: CompanySection;
  readonly activity: ActivitySection;
  readonly representative: RepresentativeSection;
  /** Registros de documentos enviados al proveedor desde este portal, por tipo de registro. */
  readonly documents: Readonly<Record<string, UploadedRecord>>;
}

export interface CompanySection {
  readonly business_legal_name: string;
  readonly email: string;
  readonly business_type: string;
  readonly business_trade_name: string;
  readonly business_description: string;
  readonly business_website: string;
  readonly phone: string;
  readonly formation_date: string;
  readonly formation_country: string;
  readonly formation_state: string;
  /** Slug NAICS del catálogo del proveedor (INDUSTRIES). Se envía como arreglo de un elemento. */
  readonly business_industry: string;
  /** Identificador tributario de la empresa (NIT, RFC…) y país que lo emite (ISO alfa-3). */
  readonly document_number: string;
  readonly document_country: string;
  /** Tipo de entidad en su país, en texto libre. Solo para empresas no constituidas en EE. UU. */
  readonly international_entity_type: string;
  readonly registered_address: AddressSection;
}

export interface AddressSection {
  readonly street_line_1: string;
  readonly street_line_2: string;
  readonly city: string;
  readonly subdivision: string;
  readonly postal_code: string;
  readonly country: string;
}

export interface ActivitySection {
  readonly account_purpose: string;
  readonly source_of_funds: string;
  readonly expected_monthly_volume: string;
  readonly expected_transaction_count: string;
  /** Descripción libre adicional que Kira puede exigir para algunos productos. */
  readonly expected_monthly_payments: string;
  /** Códigos ISO alfa-3 separados por coma; se proyectan a arreglo para Kira. */
  readonly transaction_countries: string;
  /** "Yes" | "No" | "" — así lo define el proveedor. */
  readonly high_risk_industries: string;
  readonly is_nbfi_vasp: string;
  readonly business_legal_history: string;
  /** "true" | "false" | "" — si algún socio, directivo o representante es persona expuesta políticamente. */
  readonly pep_status: string;
  /** "Yes" | "No" | "" — additional_info del proveedor, sensible a mayúsculas. */
  readonly has_us_bank_account: string;
  readonly has_denied_bank_account: string;
}

export interface RepresentativeSection {
  readonly representative_first_name: string;
  readonly representative_last_name: string;
  readonly representative_title: string;
  readonly representative_date_of_birth: string;
}

export interface UploadedRecord {
  readonly fileNames: readonly string[];
  readonly uploadedAt: string;
}

export const EMPTY_ADDRESS: AddressSection = {
  street_line_1: '',
  street_line_2: '',
  city: '',
  subdivision: '',
  postal_code: '',
  country: '',
};

export const EMPTY_DRAFT: OnboardingDraft = {
  company: {
    business_legal_name: '',
    email: '',
    business_type: '',
    business_trade_name: '',
    business_description: '',
    business_website: '',
    phone: '',
    formation_date: '',
    formation_country: '',
    formation_state: '',
    business_industry: '',
    document_number: '',
    document_country: '',
    international_entity_type: '',
    registered_address: EMPTY_ADDRESS,
  },
  activity: {
    account_purpose: '',
    source_of_funds: '',
    expected_monthly_volume: '',
    expected_transaction_count: '',
    expected_monthly_payments: '',
    transaction_countries: '',
    high_risk_industries: '',
    is_nbfi_vasp: '',
    business_legal_history: '',
    pep_status: '',
    has_us_bank_account: '',
    has_denied_bank_account: '',
  },
  representative: {
    representative_first_name: '',
    representative_last_name: '',
    representative_title: '',
    representative_date_of_birth: '',
  },
  documents: {},
};

/** Lee lo guardado en el BFF tolerando borradores viejos o parciales: lo desconocido se ignora. */
export function normalizeDraft(raw: Readonly<Record<string, unknown>>): OnboardingDraft {
  const section = <T extends object>(key: string, empty: T): T => {
    const value = raw[key];
    if (typeof value !== 'object' || value === null) {
      return empty;
    }
    return pickStrings(value as Record<string, unknown>, empty);
  };
  const company = section('company', EMPTY_DRAFT.company);
  const companyRaw = raw['company'] as Record<string, unknown> | undefined;
  const address =
    typeof companyRaw?.['registered_address'] === 'object' && companyRaw['registered_address'] !== null
      ? pickStrings(companyRaw['registered_address'] as Record<string, unknown>, EMPTY_ADDRESS)
      : EMPTY_ADDRESS;
  const documentsRaw = raw['documents'];
  const documents: Record<string, UploadedRecord> = {};
  if (typeof documentsRaw === 'object' && documentsRaw !== null) {
    for (const [type, record] of Object.entries(documentsRaw as Record<string, unknown>)) {
      const value = record as { fileNames?: unknown; uploadedAt?: unknown } | null;
      if (value && Array.isArray(value.fileNames) && typeof value.uploadedAt === 'string') {
        documents[type] = {
          fileNames: value.fileNames.filter((name): name is string => typeof name === 'string'),
          uploadedAt: value.uploadedAt,
        };
      }
    }
  }
  return {
    company: { ...company, registered_address: address },
    activity: section('activity', EMPTY_DRAFT.activity),
    representative: section('representative', EMPTY_DRAFT.representative),
    documents,
  };
}

function pickStrings<T extends object>(source: Record<string, unknown>, template: T): T {
  const result: Record<string, unknown> = { ...(template as Record<string, unknown>) };
  for (const key of Object.keys(template)) {
    const value = source[key];
    if (typeof value === 'string') {
      result[key] = value;
    }
  }
  return result as T;
}

// ---------- Reglas de completitud ----------

export type WizardStep = 'company' | 'activity' | 'representative' | 'owners' | 'documents' | 'review';
export type StepProgress = 'complete' | 'incomplete' | 'empty';

export const E164_PATTERN = /^\+[1-9]\d{6,14}$/;
export const ISO_ALPHA3 = /^[A-Za-z]{3}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Qué falta en cada sección para considerarla completa en el portal (el proveedor decide al final con pendingFields). */
export function companyGaps(company: CompanySection): string[] {
  const gaps: string[] = [];
  if (!company.business_legal_name.trim()) gaps.push('Razón social');
  if (!EMAIL.test(company.email.trim())) gaps.push('Correo de la empresa');
  if (!company.business_type) gaps.push('Tipo de sociedad');
  if (!company.formation_date) gaps.push('Fecha de constitución');
  if (!ISO_ALPHA3.test(company.formation_country)) gaps.push('País de constitución');
  if (!company.business_industry) gaps.push('Industria');
  if (!company.document_number.trim()) gaps.push('Identificador tributario');
  if (!ISO_ALPHA3.test(company.document_country)) gaps.push('País que emite el identificador tributario');
  if (isInternational(company) && !company.international_entity_type.trim()) gaps.push('Tipo de entidad en su país');
  if (company.phone && !E164_PATTERN.test(company.phone)) gaps.push('Teléfono en formato internacional');
  const address = company.registered_address;
  if (!address.street_line_1.trim() || !address.city.trim() || !ISO_ALPHA3.test(address.country)) {
    gaps.push('Dirección registrada');
  }
  return gaps;
}

export function activityGaps(activity: ActivitySection): string[] {
  const gaps: string[] = [];
  if (!activity.account_purpose) gaps.push('Propósito de la cuenta');
  if (!activity.source_of_funds) gaps.push('Origen de los fondos');
  if (!activity.expected_monthly_volume) gaps.push('Volumen mensual esperado');
  if (!activity.expected_transaction_count) gaps.push('Transacciones mensuales esperadas');
  if (!activity.high_risk_industries) gaps.push('Industrias de alto riesgo');
  if (!activity.is_nbfi_vasp) gaps.push('Institución financiera no bancaria o proveedor de activos virtuales');
  if (!activity.business_legal_history) gaps.push('Antecedentes legales');
  if (!activity.pep_status) gaps.push('Personas expuestas políticamente');
  if (!activity.has_us_bank_account) gaps.push('Cuenta bancaria en EE. UU.');
  if (!activity.has_denied_bank_account) gaps.push('Cuentas bancarias denegadas');
  return gaps;
}

/** El proveedor pide datos adicionales a las empresas no constituidas en EE. UU. */
export function isInternational(company: CompanySection): boolean {
  return ISO_ALPHA3.test(company.formation_country) && company.formation_country.toUpperCase() !== 'USA';
}

export function representativeGaps(representative: RepresentativeSection): string[] {
  const gaps: string[] = [];
  if (!representative.representative_first_name.trim()) gaps.push('Nombre del representante');
  if (!representative.representative_last_name.trim()) gaps.push('Apellido del representante');
  if (!representative.representative_title.trim()) gaps.push('Cargo del representante');
  if (!representative.representative_date_of_birth) gaps.push('Fecha de nacimiento del representante');
  return gaps;
}

/** Reglas de UboRoster del BFF + correo, que Kira necesita para emparejar a cada persona. */
export function ownersGaps(roster: OwnershipRoster | null): string[] {
  if (!roster || roster.members.length === 0) {
    return ['Al menos un beneficiario final'];
  }
  const gaps: string[] = [];
  if (!roster.hasBeneficialOwner) gaps.push('Una persona con participación declarada de al menos 5 %');
  if (roster.totalOwnership > 100) gaps.push('La participación no puede superar el 100 %');
  if (roster.members.some((member) => !member.email)) gaps.push('Correo de cada beneficiario');
  return gaps;
}

export function progressOf(gaps: readonly string[], touched: boolean): StepProgress {
  if (gaps.length === 0) {
    return 'complete';
  }
  return touched ? 'incomplete' : 'empty';
}

/** Mínimo que exige POST /api/onboarding para crear el expediente en el proveedor. */
export function registrationGaps(draft: OnboardingDraft): string[] {
  const gaps: string[] = [];
  if (!draft.company.business_legal_name.trim()) gaps.push('Razón social');
  if (!EMAIL.test(draft.company.email.trim())) gaps.push('Correo de la empresa');
  if (!draft.activity.source_of_funds) gaps.push('Origen de los fondos');
  return gaps;
}

// ---------- Proyección hacia el proveedor ----------

/** Cuerpo de PUT /api/onboarding `profile`: solo campos con valor, con los nombres de Kira. */
export function toProfile(draft: OnboardingDraft): Record<string, unknown> {
  const profile: Record<string, unknown> = {};
  const put = (key: string, value: string) => {
    if (value.trim()) profile[key] = value.trim();
  };
  const c = draft.company;
  put('business_legal_name', c.business_legal_name);
  put('email', c.email);
  put('business_type', c.business_type);
  put('business_trade_name', c.business_trade_name);
  put('business_description', c.business_description);
  put('business_website', c.business_website);
  put('phone', c.phone);
  put('formation_date', c.formation_date);
  put('formation_state', c.formation_state);
  if (c.formation_country.trim()) profile['formation_country'] = c.formation_country.trim().toUpperCase();
  if (c.business_industry) profile['business_industry'] = [c.business_industry];
  put('document_number', c.document_number);
  if (c.document_country.trim()) profile['document_country'] = c.document_country.trim().toUpperCase();
  if (isInternational(c)) put('international_entity_type', c.international_entity_type);
  const address = Object.fromEntries(
    Object.entries(c.registered_address)
      .filter(([, value]) => value.trim())
      .map(([key, value]) => [key, key === 'country' ? value.trim().toUpperCase() : value.trim()]),
  );
  if (Object.keys(address).length) profile['registered_address'] = address;

  const a = draft.activity;
  put('account_purpose', a.account_purpose);
  put('source_of_funds', a.source_of_funds);
  put('expected_monthly_volume', a.expected_monthly_volume);
  put('expected_transaction_count', a.expected_transaction_count);
  put('expected_monthly_payments', a.expected_monthly_payments);
  const transactionCountries = a.transaction_countries
    .split(',')
    .map((country) => country.trim().toUpperCase())
    .filter((country) => ISO_ALPHA3.test(country));
  if (transactionCountries.length) profile['transaction_countries'] = [...new Set(transactionCountries)];
  put('high_risk_industries', a.high_risk_industries);
  put('is_nbfi_vasp', a.is_nbfi_vasp);
  put('business_legal_history', a.business_legal_history);
  if (a.pep_status) profile['pep_status'] = a.pep_status === 'true';
  const additionalInfo: Record<string, string> = {};
  if (a.has_us_bank_account) additionalInfo['has_us_bank_account'] = a.has_us_bank_account;
  if (a.has_denied_bank_account) additionalInfo['has_denied_bank_account'] = a.has_denied_bank_account;
  if (Object.keys(additionalInfo).length) profile['additional_info'] = additionalInfo;

  const r = draft.representative;
  put('representative_first_name', r.representative_first_name);
  put('representative_last_name', r.representative_last_name);
  put('representative_title', r.representative_title);
  put('representative_date_of_birth', r.representative_date_of_birth);
  return profile;
}

/**
 * Campos que el proveedor sigue pidiendo (`pendingFields`), agrupados por paso del asistente.
 * Los nombres usan la notación del proveedor (`associated_persons:has_ownership`); lo no reconocido va a revisión.
 */
export function pendingByStep(status: OnboardingStatus | null): Record<WizardStep, string[]> {
  const result: Record<WizardStep, string[]> = {
    company: [],
    activity: [],
    representative: [],
    owners: [],
    documents: [],
    review: [],
  };
  for (const field of status?.pendingFields ?? []) {
    const root = field.split(':')[0];
    if (root.startsWith('associated_persons')) result.owners.push(field);
    else if (root.startsWith('representative_')) result.representative.push(field);
    else if (root.startsWith('identifying_information') || root.startsWith('file_') || root === 'documents')
      result.documents.push(field);
    else if (ACTIVITY_FIELDS.has(root)) result.activity.push(field);
    else if (COMPANY_FIELDS.has(root)) result.company.push(field);
    else result.review.push(field);
  }
  return result;
}

const COMPANY_FIELDS = new Set([
  'business_legal_name',
  'email',
  'business_type',
  'business_trade_name',
  'doing_business_as',
  'business_description',
  'business_website',
  'phone',
  'formation_date',
  'formation_country',
  'formation_state',
  'business_industry',
  'document_number',
  'document_country',
  'international_entity_type',
  'tax_id',
  'ein',
  'registered_address',
  'physical_address',
  'address_street',
  'address_city',
  'address_state',
  'address_zip_code',
  'address_country',
]);

const ACTIVITY_FIELDS = new Set([
  'account_purpose',
  'source_of_funds',
  'expected_monthly_volume',
  'expected_transaction_count',
  'expected_monthly_payments',
  'high_risk_industries',
  'is_nbfi_vasp',
  'business_legal_history',
  'pep_status',
  'additional_info',
  'transaction_countries',
]);
