import { toDocumentsForm } from '../infrastructure/onboarding-http.repository';
import { kybFilesProblem, requiresBackSide } from './kyb-catalog';
import {
  activityGaps,
  companyGaps,
  EMPTY_DRAFT,
  normalizeDraft,
  OnboardingDraft,
  ownersGaps,
  pendingByStep,
  registrationGaps,
  toProfile,
} from './onboarding-draft';
import { OnboardingStatus } from './onboarding-status';

const fixtureDraft = (): OnboardingDraft => ({
  ...EMPTY_DRAFT,
  company: {
    ...EMPTY_DRAFT.company,
    business_legal_name: ' Juriscop S.A.S. ',
    email: 'finanzas@juriscop.co',
    business_type: 'corporation',
    formation_date: '2019-04-02',
    formation_country: 'col',
    registered_address: {
      ...EMPTY_DRAFT.company.registered_address,
      street_line_1: 'Cra 7 # 71-21',
      city: 'Bogotá',
      country: 'col',
    },
  },
  activity: {
    ...EMPTY_DRAFT.activity,
    source_of_funds: 'sales_of_goods_and_services',
    has_material_intermediary_ownership: 'false',
  },
});

describe('borrador de vinculación', () => {
  it('proyecta solo campos con valor, con los nombres y códigos que espera el proveedor', () => {
    expect(toProfile(fixtureDraft())).toEqual({
      business_legal_name: 'Juriscop S.A.S.',
      email: 'finanzas@juriscop.co',
      business_type: 'corporation',
      formation_date: '2019-04-02',
      formation_country: 'COL',
      registered_address: { street_line_1: 'Cra 7 # 71-21', city: 'Bogotá', country: 'COL' },
      source_of_funds: 'sales_of_goods_and_services',
      has_material_intermediary_ownership: false,
    });
    expect(toProfile(EMPTY_DRAFT)).toEqual({});
  });

  it('lee borradores viejos, parciales o con basura sin romper', () => {
    const draft = normalizeDraft({
      company: { business_legal_name: 'X', desconocido: 'y', phone: 123 },
      activity: 'no es objeto',
      documents: { business_formation: { fileNames: ['acta.pdf', 7], uploadedAt: '2026-09-14T10:00:00Z' }, roto: {} },
    });
    expect(draft.company.business_legal_name).toBe('X');
    expect(draft.company.phone).toBe('');
    expect('desconocido' in draft.company).toBe(false);
    expect(draft.activity).toEqual(EMPTY_DRAFT.activity);
    expect(draft.company.registered_address).toEqual(EMPTY_DRAFT.company.registered_address);
    expect(draft.documents).toEqual({
      business_formation: { fileNames: ['acta.pdf'], uploadedAt: '2026-09-14T10:00:00Z' },
    });
  });

  it('para crear el expediente exige razón social, correo y origen de fondos (POST /api/onboarding)', () => {
    expect(registrationGaps(EMPTY_DRAFT)).toEqual(['Razón social', 'Correo de la empresa', 'Origen de los fondos']);
    expect(registrationGaps(fixtureDraft())).toEqual([]);
  });

  it('indica qué falta por paso y valida formatos', () => {
    const company = { ...fixtureDraft().company, phone: '300 123' };
    expect(companyGaps(company)).toEqual(['Teléfono en formato internacional']);
    expect(companyGaps({ ...company, phone: '+573001234567', formation_country: 'CO' })).toEqual([
      'País de constitución',
    ]);
    expect(activityGaps(fixtureDraft().activity)).toContain('Propósito de la cuenta');
  });

  it('beneficiarios: al menos uno, un beneficiario final y correo para cada persona', () => {
    expect(ownersGaps(null)).toEqual(['Al menos un beneficiario final']);
    const member = { email: null } as never;
    expect(
      ownersGaps({ members: [member], totalOwnership: 120, hasBeneficialOwner: false, livenessComplete: false }),
    ).toEqual([
      'Una persona con participación declarada de al menos 5 %',
      'La participación no puede superar el 100 %',
      'Correo de cada beneficiario',
    ]);
  });

  it('agrupa lo que pide el proveedor por paso del asistente', () => {
    const status = {
      pendingFields: [
        'business_type',
        'associated_persons:has_ownership',
        'file_proof_of_address',
        'source_of_funds',
        'representative_title',
        'algo_nuevo',
      ],
    } as unknown as OnboardingStatus;
    expect(pendingByStep(status)).toEqual({
      company: ['business_type'],
      activity: ['source_of_funds'],
      representative: ['representative_title'],
      owners: ['associated_persons:has_ownership'],
      documents: ['file_proof_of_address'],
      review: ['algo_nuevo'],
    });
  });
});

describe('documentos KYB', () => {
  const file = (name: string, type: string, size: number) => ({ name, type, size });

  it('aplica los límites del BFF: JPEG/PNG/PDF, 10 archivos, 7 MB en total', () => {
    expect(kybFilesProblem([])).toBe('Adjunta al menos un archivo.');
    expect(kybFilesProblem([file('a.gif', 'image/gif', 10)])).toContain('JPEG, PNG o PDF');
    expect(kybFilesProblem(Array.from({ length: 11 }, (_, i) => file(`${i}.pdf`, 'application/pdf', 10)))).toContain(
      '10 archivos',
    );
    expect(
      kybFilesProblem([
        file('a.pdf', 'application/pdf', 4 * 1024 * 1024),
        file('b.pdf', 'application/pdf', 4 * 1024 * 1024),
      ]),
    ).toContain('7 MB');
    expect(kybFilesProblem([file('a.pdf', 'application/pdf', 1024)])).toBeNull();
  });

  it('el reverso es obligatorio salvo en pasaporte y visa', () => {
    expect(requiresBackSide('national_id')).toBe(true);
    expect(requiresBackSide('passport')).toBe(false);
    expect(requiresBackSide('visa')).toBe(false);
  });

  it('arma el multipart con files y types emparejados por orden', () => {
    const front = new File(['a'], 'frente.png', { type: 'image/png' });
    const selfie = new File(['b'], 'selfie.png', { type: 'image/png' });
    const form = toDocumentsForm({
      informationType: 'passport',
      issuingCountry: 'col',
      number: ' AB123 ',
      expiration: null,
      files: [
        { role: 'front', file: front },
        { role: 'selfie', file: selfie },
      ],
    });
    expect(form.get('informationType')).toBe('passport');
    expect(form.get('issuingCountry')).toBe('COL');
    expect(form.get('number')).toBe('AB123');
    expect(form.has('expiration')).toBe(false);
    expect(form.getAll('types')).toEqual(['front', 'selfie']);
    expect((form.getAll('files') as File[]).map((f) => f.name)).toEqual(['frente.png', 'selfie.png']);
  });
});
