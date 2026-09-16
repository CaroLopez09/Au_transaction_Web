/**
 * Etiquetas humanas para los `pendingFields` del proveedor (G-16).
 *
 * El BFF los reenvía tal cual llegan de Kira (`business_industry`, `associated_persons:birth_date`).
 * Mostrar solo eso deja al operador con un nombre técnico y sin saber dónde escribirlo, así que
 * aquí viven la traducción y el hecho de si el asistente tiene campo para ese dato.
 * Lo que no esté en el diccionario se muestra con su nombre técnico: es información, no un error.
 */
export interface PendingFieldLabel {
  /** Nombre del campo tal como llega del proveedor. */
  readonly field: string;
  readonly label: string | null;
  /** false: el asistente todavía no tiene dónde escribirlo (hay que pedirlo por soporte). */
  readonly capturable: boolean;
}

const LABELS: Record<string, string> = {
  business_legal_name: 'Razón social',
  email: 'Correo de contacto de la empresa',
  business_type: 'Tipo de sociedad',
  business_trade_name: 'Nombre comercial',
  doing_business_as: 'Nombre comercial',
  business_description: 'Descripción de la actividad',
  business_website: 'Sitio web',
  phone: 'Teléfono de la empresa',
  formation_date: 'Fecha de constitución',
  formation_country: 'País de constitución',
  formation_state: 'Departamento o estado de constitución',
  business_industry: 'Industria',
  document_number: 'Identificación tributaria',
  document_country: 'País que emite la identificación',
  international_entity_type: 'Tipo de entidad en su país',
  registered_address: 'Dirección registrada',
  physical_address: 'Dirección física',
  address_street: 'Dirección: calle',
  address_city: 'Dirección: ciudad',
  address_state: 'Dirección: departamento o estado',
  address_zip_code: 'Dirección: código postal',
  address_country: 'Dirección: país',
  tax_id: 'Identificación tributaria',
  ein: 'EIN (solo empresas de EE. UU.)',
  account_purpose: 'Propósito de la cuenta',
  source_of_funds: 'Origen de los fondos',
  expected_monthly_volume: 'Volumen mensual esperado',
  expected_transaction_count: 'Número de operaciones al mes',
  expected_monthly_payments: 'Pagos mensuales esperados',
  high_risk_industries: 'Relación con industrias de alto riesgo',
  is_nbfi_vasp: 'Es entidad financiera no bancaria o proveedor de activos virtuales',
  business_legal_history: 'Antecedentes legales de la empresa',
  pep_status: 'Personas expuestas políticamente',
  additional_info: 'Información adicional',
  transaction_countries: 'Países con los que opera',
  representative_first_name: 'Nombre del representante',
  representative_last_name: 'Apellido del representante',
  representative_title: 'Cargo del representante',
  representative_date_of_birth: 'Fecha de nacimiento del representante',
  representative_birth_date: 'Fecha de nacimiento del representante',
  'associated_persons:first_name': 'Beneficiarios: nombre',
  'associated_persons:last_name': 'Beneficiarios: apellido',
  'associated_persons:email': 'Beneficiarios: correo',
  'associated_persons:birth_date': 'Beneficiarios: fecha de nacimiento',
  'associated_persons:nationality': 'Beneficiarios: nacionalidad',
  'associated_persons:occupation': 'Beneficiarios: ocupación',
  'associated_persons:gender': 'Beneficiarios: género',
  'associated_persons:phone_number': 'Beneficiarios: teléfono',
  'associated_persons:residential_address': 'Beneficiarios: dirección de residencia',
  'associated_persons:country_of_birth': 'Beneficiarios: país de nacimiento',
  'associated_persons:document_country': 'Beneficiarios: país del documento',
  'associated_persons:has_ownership': 'Beneficiarios: participación',
  'associated_persons:has_control': 'Beneficiarios: control',
  'associated_persons:is_signer': 'Beneficiarios: firma',
  'associated_persons:politically_exposed': 'Beneficiarios: persona expuesta políticamente',
  associated_persons: 'Beneficiarios finales',
  documents: 'Documentos de la empresa',
};

/**
 * Datos que el proveedor puede pedir y el asistente todavía no captura. Se nombran para que el
 * operador sepa que no es un campo que se le haya pasado por alto (G-28, D3).
 */
const NOT_CAPTURED = new Set(['transaction_countries', 'expected_monthly_payments', 'physical_address']);

export function pendingFieldLabel(field: string): PendingFieldLabel {
  const exact = LABELS[field];
  const root = field.split(':')[0];
  const label = exact ?? LABELS[root] ?? null;
  return { field, label, capturable: !NOT_CAPTURED.has(root) };
}
