import { toDate } from '../../../shared/utilities/dates';
import { AnswerSpec, AnswerType, Rfi, RfiDocument, RfiItem, RfiStatus } from '../domain/rfi';
import { RfiViewDto } from './rfi.dto';

const ANSWER_TYPES: readonly AnswerType[] = [
  'text_short',
  'text_long',
  'number',
  'date',
  'boolean',
  'choice',
  'identifier',
  'document',
  'ubo_link',
];

export function toRfi(dto: RfiViewDto): Rfi {
  const status = dto.status?.trim().toUpperCase().replace('-', '_') ?? '';
  const blockingType = dto.blocking?.type?.trim().toLowerCase();
  return {
    id: dto.id,
    providerRfiId: dto.kiraRfiId ?? null,
    status: (['PENDING', 'ANSWERED', 'RESOLVED', 'NOT_RESOLVED', 'WITHDRAWN'].includes(status)
      ? status
      : 'UNKNOWN') as RfiStatus,
    rawStatus: dto.status,
    resolutionReason: dto.resolutionReason ?? null,
    open: dto.open,
    overdue: dto.overdue,
    dueDate: toDate(dto.dueDate),
    totalItems: dto.totalItems,
    pendingItems: dto.pendingItems,
    items: (dto.items ?? []).map(toItem).filter((item): item is RfiItem => item !== null),
    blocking: dto.blocking
      ? {
          type: blockingType === 'transfer' || blockingType === 'virtual_account_deposit' ? blockingType : 'unknown',
          providerResourceId: dto.blocking.kiraResourceId ?? null,
          payoutId: dto.blocking.payoutId ?? null,
          depositId: dto.blocking.depositId ?? null,
        }
      : null,
    createdAt: toDate(dto.createdAt),
  };
}

/** Lectura defensiva de un ítem del proveedor: un ítem sin `item_id` no se puede responder y se omite. */
export function toItem(raw: Record<string, unknown>): RfiItem | null {
  const id = str(raw['item_id']);
  if (!id) {
    return null;
  }
  const rawType = str(raw['answer_type']);
  const type = (ANSWER_TYPES as readonly string[]).includes(rawType?.toLowerCase() ?? '')
    ? (rawType!.toLowerCase() as AnswerType)
    : 'unknown';
  const status = str(raw['status'])?.toLowerCase();
  const value = raw['answer_value'];
  return {
    id,
    prompt: str(raw['prompt']) ?? str(raw['label']),
    answerType: type,
    rawAnswerType: rawType,
    spec: toSpec(raw['answer_spec']),
    status: status === 'pending' || status === 'answered' ? status : 'unknown',
    answerValue: typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' ? value : null,
    documents: Array.isArray(raw['documents'])
      ? raw['documents'].map(toDocument).filter((doc): doc is RfiDocument => doc !== null)
      : [],
    reviewNote: str(raw['review_note']),
  };
}

function toSpec(raw: unknown): AnswerSpec {
  const spec = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
  return {
    maxLength: num(spec['max_length']),
    format: str(spec['format']),
    min: num(spec['min']),
    max: num(spec['max']),
    unit: str(spec['unit']),
    minAge: num(spec['min_age']),
    options: Array.isArray(spec['options']) ? spec['options'].filter((o): o is string => typeof o === 'string') : [],
    mimeTypes: Array.isArray(spec['mime_types'])
      ? spec['mime_types'].filter((m): m is string => typeof m === 'string').map((m) => m.toLowerCase())
      : [],
    maxFiles: num(spec['max_files']),
    url: str(spec['url']),
    applicantId: str(spec['applicant_id']),
  };
}

/** El proveedor documenta `document_id`/`file_name`; se aceptan también `id`/`name`. */
function toDocument(raw: unknown): RfiDocument | null {
  if (typeof raw !== 'object' || raw === null) {
    return null;
  }
  const doc = raw as Record<string, unknown>;
  const id = str(doc['document_id']) ?? str(doc['id']);
  return id
    ? {
        id,
        fileName: str(doc['file_name']) ?? str(doc['name']),
        mimeType: str(doc['mime_type']),
        sizeBytes: num(doc['size_bytes']),
        uploadedAt: toDate(str(doc['uploaded_at'])),
      }
    : null;
}

function str(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}
