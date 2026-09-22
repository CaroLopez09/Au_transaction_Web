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

/**
 * Industrias: slugs de subsector NAICS del proveedor (reference/users/values#business_industry, 93 valores,
 * consultado 15-sep-2026). Ordenadas por etiqueta para el selector.
 */
export const INDUSTRIES: readonly Option[] = [
  { value: 'public_administration', label: 'Administración pública' },
  { value: 'warehousing_storage', label: 'Almacenamiento' },
  { value: 'accommodation', label: 'Alojamiento' },
  { value: 'rental_leasing_services', label: 'Alquiler y arrendamiento' },
  { value: 'lessors_nonfinancial_intangible_assets', label: 'Arrendamiento de activos intangibles no financieros' },
  { value: 'performing_arts_spectator_sports', label: 'Artes escénicas y espectáculos deportivos' },
  { value: 'social_assistance', label: 'Asistencia social' },
  { value: 'ambulatory_health_care_services', label: 'Atención médica ambulatoria' },
  { value: 'monetary_authorities_central_bank', label: 'Autoridades monetarias y banca central' },
  { value: 'beverage_tobacco_product_manufacturing', label: 'Bebidas y tabaco' },
  { value: 'motion_picture_sound_recording_industries', label: 'Cine y grabación de sonido' },
  { value: 'merchant_wholesalers_durable_goods', label: 'Comercio al por mayor de bienes duraderos' },
  { value: 'merchant_wholesalers_nondurable_goods', label: 'Comercio al por mayor de bienes no duraderos' },
  { value: 'nonstore_retailers', label: 'Comercio sin tienda física (en línea, catálogo)' },
  { value: 'apparel_manufacturing', label: 'Confección de prendas de vestir' },
  { value: 'construction_of_buildings', label: 'Construcción de edificaciones' },
  { value: 'specialty_trade_contractors', label: 'Contratistas especializados de construcción' },
  { value: 'leather_allied_product_manufacturing', label: 'Cuero y productos afines' },
  { value: 'sporting_goods_hobby_book_music_stores', label: 'Deportes, pasatiempos, libros y música' },
  { value: 'petroleum_coal_products_manufacturing', label: 'Derivados del petróleo y del carbón' },
  { value: 'management_of_companies', label: 'Dirección de empresas (holdings)' },
  { value: 'publishing_industries', label: 'Edición y publicación' },
  { value: 'amusement_gambling_recreation_industries', label: 'Entretenimiento, juegos de azar y recreación' },
  { value: 'computer_electronic_product_manufacturing', label: 'Equipos de cómputo y electrónicos' },
  { value: 'transportation_equipment_manufacturing', label: 'Equipos de transporte' },
  {
    value: 'electrical_equipment_appliance_component_manufacturing',
    label: 'Equipos, aparatos y componentes eléctricos',
  },
  { value: 'gasoline_stations', label: 'Estaciones de gasolina' },
  { value: 'oil_gas_extraction', label: 'Extracción de petróleo y gas' },
  { value: 'funds_trusts_other_financial_vehicles', label: 'Fondos, fideicomisos y otros vehículos financieros' },
  { value: 'textile_mills', label: 'Fábricas textiles' },
  { value: 'waste_management_remediation_services', label: 'Gestión de residuos y remediación' },
  { value: 'private_households', label: 'Hogares privados' },
  { value: 'hospitals', label: 'Hospitales' },
  { value: 'printing_related_support_activities', label: 'Impresión y actividades conexas' },
  { value: 'food_manufacturing', label: 'Industria alimentaria' },
  { value: 'paper_manufacturing', label: 'Industria del papel' },
  { value: 'chemical_manufacturing', label: 'Industria química' },
  { value: 'real_estate', label: 'Inmobiliarias' },
  { value: 'credit_intermediation_related_activities', label: 'Intermediación crediticia' },
  { value: 'machinery_manufacturing', label: 'Maquinaria' },
  { value: 'building_material_garden_equipment_supplies_dealers', label: 'Materiales de construcción y jardinería' },
  { value: 'couriers_messengers', label: 'Mensajería y paquetería' },
  {
    value: 'wholesale_electronic_markets_agents_brokers',
    label: 'Mercados mayoristas electrónicos, agentes y corredores',
  },
  { value: 'primary_metal_manufacturing', label: 'Metales básicos' },
  { value: 'mining_except_oil_gas', label: 'Minería (excepto petróleo y gas)' },
  { value: 'furniture_related_product_manufacturing', label: 'Muebles y productos relacionados' },
  { value: 'museums_historical_sites', label: 'Museos y sitios históricos' },
  { value: 'heavy_civil_engineering_construction', label: 'Obras de ingeniería civil' },
  {
    value: 'religious_grantmaking_civic_professional_organizations',
    label: 'Organizaciones religiosas, cívicas y profesionales',
  },
  { value: 'miscellaneous_manufacturing', label: 'Otras industrias manufactureras' },
  { value: 'miscellaneous_store_retailers', label: 'Otros comercios al por menor' },
  { value: 'other_information_services', label: 'Otros servicios de información' },
  { value: 'fishing_hunting_trapping', label: 'Pesca, caza y captura' },
  { value: 'plastics_rubber_products_manufacturing', label: 'Plásticos y caucho' },
  { value: 'data_processing_hosting_related_services', label: 'Procesamiento de datos y alojamiento' },
  { value: 'crop_production', label: 'Producción agrícola' },
  { value: 'animal_production', label: 'Producción pecuaria' },
  { value: 'wood_product_manufacturing', label: 'Productos de madera' },
  { value: 'fabricated_metal_product_manufacturing', label: 'Productos metálicos' },
  { value: 'nonmetallic_mineral_product_manufacturing', label: 'Productos minerales no metálicos' },
  { value: 'textile_product_mills', label: 'Productos textiles' },
  { value: 'internet_publishing_broadcasting', label: 'Publicación y difusión por internet' },
  { value: 'broadcasting', label: 'Radio y televisión' },
  { value: 'repair_maintenance', label: 'Reparación y mantenimiento' },
  { value: 'nursing_residential_care_facilities', label: 'Residencias y cuidado asistido' },
  { value: 'food_services_drinking_places', label: 'Restaurantes y bares' },
  { value: 'health_personal_care_stores', label: 'Salud y cuidado personal' },
  { value: 'insurance_carriers_related_activities', label: 'Seguros y actividades conexas' },
  { value: 'postal_service', label: 'Servicio postal' },
  { value: 'administrative_support_services', label: 'Servicios administrativos y de apoyo' },
  { value: 'support_activities_agriculture_forestry', label: 'Servicios de apoyo a la agricultura y silvicultura' },
  { value: 'support_activities_mining', label: 'Servicios de apoyo a la minería' },
  { value: 'support_activities_transportation', label: 'Servicios de apoyo al transporte' },
  { value: 'educational_services', label: 'Servicios educativos' },
  { value: 'personal_laundry_services', label: 'Servicios personales y lavandería' },
  { value: 'professional_scientific_technical', label: 'Servicios profesionales, científicos y técnicos' },
  { value: 'utilities', label: 'Servicios públicos (energía, agua, gas)' },
  { value: 'forestry_logging', label: 'Silvicultura y tala' },
  { value: 'telecommunications', label: 'Telecomunicaciones' },
  { value: 'food_beverage_stores', label: 'Tiendas de alimentos y bebidas' },
  { value: 'electronics_appliance_stores', label: 'Tiendas de electrónica y electrodomésticos' },
  { value: 'general_merchandise_stores', label: 'Tiendas de mercancía general' },
  { value: 'furniture_home_furnishings_stores', label: 'Tiendas de muebles y hogar' },
  { value: 'clothing_accessories_stores', label: 'Tiendas de ropa y accesorios' },
  { value: 'air_transportation', label: 'Transporte aéreo' },
  { value: 'truck_transportation', label: 'Transporte de carga por carretera' },
  { value: 'rail_transportation', label: 'Transporte ferroviario' },
  { value: 'water_transportation', label: 'Transporte marítimo y fluvial' },
  { value: 'pipeline_transportation', label: 'Transporte por ductos' },
  { value: 'transit_ground_passenger_transportation', label: 'Transporte terrestre de pasajeros' },
  { value: 'scenic_sightseeing_transportation', label: 'Transporte turístico' },
  {
    value: 'securities_commodity_contracts_financial_investments',
    label: 'Valores, materias primas e inversiones financieras',
  },
  { value: 'motor_vehicle_parts_dealers', label: 'Vehículos y autopartes' },
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
  /** Solo para empresas constituidas en EE. UU. (el proveedor: EIN «do NOT send for non-US businesses»). */
  readonly usOnly?: boolean;
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
    informationType: 'board_minutes',
    fileRole: 'file_board_minutes',
    label: 'Acta de junta',
    help: 'El acta de la junta que autoriza abrir la cuenta.',
    hasNumber: false,
  },
  {
    informationType: 'portfolio_statement',
    fileRole: 'file_portfolio_statement',
    label: 'Extracto de portafolio',
    help: 'Un extracto reciente de las inversiones o cuentas de la empresa. El proveedor lo pide para cuentas en EE. UU.',
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
    usOnly: true,
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

/** Registros que aplican a la empresa según su país de constitución (ISO-3; vacío mientras no se sepa). */
export function companyRecordsFor(formationCountry: string): readonly CompanyRecord[] {
  const country = formationCountry.trim().toUpperCase();
  const outsideUs = /^[A-Z]{3}$/.test(country) && country !== 'USA';
  return outsideUs ? COMPANY_RECORDS.filter((record) => !record.usOnly) : COMPANY_RECORDS;
}
