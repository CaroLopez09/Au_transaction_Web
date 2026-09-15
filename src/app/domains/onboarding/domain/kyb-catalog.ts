/**
 * Valores que acepta el proveedor para el expediente de una empresa.
 * Fuente: docs.kirafin.ai/api-reference/users/create-a-user y /reference/users/values (consultado 14-sep-2026).
 * Las etiquetas son traducciones del significado documentado; el valor enviado es siempre el código.
 */
export interface Option<T extends string = string> {
  readonly value: T;
  readonly label: string;
}

export const BUSINESS_TYPES: readonly Option[] = [
  { value: 'limited_liability_company', label: 'Sociedad de responsabilidad limitada (LLC)' },
  { value: 'corporation', label: 'Sociedad anónima / corporación' },
  { value: 'general_partnership', label: 'Sociedad colectiva' },
  { value: 'limited_liability_partnership', label: 'Sociedad de responsabilidad limitada entre socios (LLP)' },
  { value: 'sole_proprietor', label: 'Empresario individual' },
  { value: 'non_profit', label: 'Entidad sin ánimo de lucro' },
  { value: 'trust', label: 'Fideicomiso (trust)' },
  { value: 'government_organization', label: 'Organización gubernamental' },
  { value: 'publicly_traded_company', label: 'Empresa que cotiza en bolsa' },
];

export const SOURCES_OF_FUNDS: readonly Option[] = [
  { value: 'sales_of_goods_and_services', label: 'Venta de bienes y servicios' },
  { value: 'company_funds', label: 'Fondos de la empresa' },
  { value: 'owners_capital', label: 'Capital de los socios' },
  { value: 'business_loans', label: 'Préstamos empresariales' },
  { value: 'investment_proceeds', label: 'Rendimientos de inversiones' },
  { value: 'investments_loans', label: 'Inversiones y préstamos' },
  { value: 'inter_company_funds', label: 'Fondos entre empresas del grupo' },
  { value: 'third_party_funds', label: 'Fondos de terceros' },
  { value: 'treasury_reserves', label: 'Reservas de tesorería' },
  { value: 'tax_refund', label: 'Devolución de impuestos' },
];

export const ACCOUNT_PURPOSES: readonly Option[] = [
  { value: 'operating_a_company', label: 'Operación de la empresa' },
  { value: 'receive_payments_for_goods_and_services', label: 'Recibir pagos por bienes y servicios' },
  { value: 'purchase_goods_and_services', label: 'Comprar bienes y servicios' },
  { value: 'internal_treasury', label: 'Tesorería interna' },
  { value: 'ecommerce_retail_payments', label: 'Pagos de comercio electrónico' },
  { value: 'investment_purposes', label: 'Inversión' },
  { value: 'third_party_money_transmission', label: 'Transmisión de dinero de terceros' },
  { value: 'charitable_donations', label: 'Donaciones benéficas' },
];

/** El proveedor no indica la moneda de estos rangos: se muestran tal cual. */
export const MONTHLY_VOLUMES: readonly Option[] = [
  { value: 'less_than_50000', label: 'Menos de 50.000' },
  { value: '50000_to_100000', label: 'Entre 50.000 y 100.000' },
  { value: '100000_to_500000', label: 'Entre 100.000 y 500.000' },
  { value: '500000_to_1000000', label: 'Entre 500.000 y 1.000.000' },
  { value: '1000000_to_5000000', label: 'Entre 1.000.000 y 5.000.000' },
  { value: '5000000_to_10000000', label: 'Entre 5.000.000 y 10.000.000' },
  { value: 'more_than_10000000', label: 'Más de 10.000.000' },
];

export const TRANSACTION_COUNTS: readonly Option[] = [
  { value: 'less_than_10', label: 'Menos de 10' },
  { value: '10_to_25', label: 'Entre 10 y 25' },
  { value: '26_to_50', label: 'Entre 26 y 50' },
  { value: '51_to_100', label: 'Entre 51 y 100' },
  { value: '101_to_500', label: 'Entre 101 y 500' },
  { value: 'more_than_500', label: 'Más de 500' },
];

/** Registros de identificación de la empresa con el archivo que los acompaña (identifying_information). */
export interface CompanyRecord {
  readonly informationType: string;
  readonly fileRole: string;
  readonly label: string;
  readonly help: string;
  /** Algunos registros llevan número (p. ej. identificador fiscal). */
  readonly hasNumber: boolean;
  /** Si el registro admite varios tipos documentados (identificadores fiscales por país). */
  readonly typeOptions?: readonly Option[];
}

export const COMPANY_RECORDS: readonly CompanyRecord[] = [
  {
    informationType: 'business_formation',
    fileRole: 'file_business_formation',
    label: 'Documento de constitución',
    help: 'El documento que formó la empresa (acta o escritura de constitución).',
    hasNumber: false,
  },
  {
    informationType: 'proof_of_address',
    fileRole: 'file_proof_of_address',
    label: 'Prueba de domicilio de la empresa',
    help: 'Un documento reciente que acredite la dirección de la empresa.',
    hasNumber: false,
  },
  {
    informationType: 'certificate_of_registration',
    fileRole: 'file_certificate_of_registration',
    label: 'Certificado de registro',
    help: 'El certificado de registro de la empresa.',
    hasNumber: true,
  },
  {
    informationType: 'certificate_of_good_standing',
    fileRole: 'file_certificate_of_good_standing',
    label: 'Certificado de vigencia (good standing)',
    help: 'Certificado que acredita que la empresa está activa y al día.',
    hasNumber: false,
  },
  {
    informationType: 'bylaws',
    fileRole: 'file_bylaws',
    label: 'Estatutos',
    help: 'Los estatutos de la empresa.',
    hasNumber: false,
  },
  {
    informationType: 'corporate_resolution',
    fileRole: 'file_corporate_resolution',
    label: 'Resolución corporativa',
    help: 'La resolución que autoriza abrir la cuenta.',
    hasNumber: false,
  },
  {
    informationType: 'source_of_wealth',
    fileRole: 'file_source_of_wealth',
    label: 'Origen de los fondos',
    help: 'Evidencia de dónde proviene el dinero.',
    hasNumber: false,
  },
  {
    informationType: 'ein_letter',
    fileRole: 'file_ein_letter',
    label: 'Carta de EIN (EE. UU.)',
    help: 'La carta de identificación fiscal emitida a la empresa en EE. UU.',
    hasNumber: true,
  },
  {
    informationType: 'tax_id',
    fileRole: 'file_company_fiscal_registration',
    label: 'Registro fiscal',
    help: 'Certificado de registro fiscal con su número.',
    hasNumber: true,
    typeOptions: [
      { value: 'nit', label: 'NIT (Colombia)' },
      { value: 'rfc', label: 'RFC (México)' },
      { value: 'cnpj', label: 'CNPJ (Brasil)' },
      { value: 'tin', label: 'TIN' },
      { value: 'tax_id', label: 'Otro identificador fiscal' },
    ],
  },
];

/** Documentos de identidad con foto admitidos para personas (identifying_information, sección "Government Photo IDs"). */
export const PERSON_ID_TYPES: readonly Option[] = [
  { value: 'passport', label: 'Pasaporte' },
  { value: 'national_id', label: 'Documento nacional de identidad' },
  { value: 'drivers_license', label: 'Licencia de conducción' },
  { value: 'permanent_residency_id', label: 'Documento de residencia permanente' },
  { value: 'state_or_provincial_id', label: 'Documento de identidad estatal o provincial' },
  { value: 'military_id', label: 'Identificación militar' },
  { value: 'matriculate_id', label: 'Matrícula consular' },
  { value: 'visa', label: 'Visa' },
];

/** API-GUIA §POST /api/onboarding/documents: el reverso es obligatorio en todo ID con foto salvo pasaporte y visa. */
export function requiresBackSide(idType: string): boolean {
  return idType !== 'passport' && idType !== 'visa';
}

/** KybDocuments del BFF. */
export const KYB_MIME_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
export const KYB_MAX_FILES = 10;
export const KYB_MAX_TOTAL_BYTES = 7 * 1024 * 1024;

export function kybFilesProblem(files: readonly { name: string; type: string; size: number }[]): string | null {
  if (files.length === 0) {
    return 'Adjunta al menos un archivo.';
  }
  if (files.length > KYB_MAX_FILES) {
    return `Como máximo ${KYB_MAX_FILES} archivos por envío.`;
  }
  for (const file of files) {
    if (file.size === 0) {
      return `${file.name} está vacío.`;
    }
    if (!KYB_MIME_TYPES.includes(file.type.toLowerCase())) {
      return `${file.name}: solo se admiten JPEG, PNG o PDF.`;
    }
  }
  if (files.reduce((total, file) => total + file.size, 0) > KYB_MAX_TOTAL_BYTES) {
    return 'Los archivos superan 7 MB en total. Súbelos en varias tandas.';
  }
  return null;
}
