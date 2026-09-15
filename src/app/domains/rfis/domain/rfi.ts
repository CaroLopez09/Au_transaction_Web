import { Observable } from 'rxjs';

export type RfiStatus = 'PENDING' | 'ANSWERED' | 'RESOLVED' | 'NOT_RESOLVED' | 'WITHDRAWN' | 'UNKNOWN';

/** answer_type documentados por el proveedor (docs.kirafin.ai/reference/rfis/values). */
export type AnswerType =
  | 'text_short'
  | 'text_long'
  | 'number'
  | 'date'
  | 'boolean'
  | 'choice'
  | 'identifier'
  | 'document'
  | 'ubo_link'
  | 'unknown';

export interface RfiDocument {
  readonly id: string;
  readonly fileName: string | null;
  readonly mimeType: string | null;
  readonly sizeBytes: number | null;
  readonly uploadedAt: Date | null;
}

/** answer_spec normalizado; solo las claves documentadas, el resto se ignora. */
export interface AnswerSpec {
  readonly maxLength: number | null;
  readonly format: string | null;
  readonly min: number | null;
  readonly max: number | null;
  readonly unit: string | null;
  readonly minAge: number | null;
  readonly options: readonly string[];
  readonly mimeTypes: readonly string[];
  readonly maxFiles: number | null;
  readonly url: string | null;
  /** ubo_link sin `url`: el enlace se acuña bajo demanda con estos identificadores. */
  readonly applicantId: string | null;
}

export interface RfiItem {
  readonly id: string;
  readonly prompt: string | null;
  readonly answerType: AnswerType;
  readonly rawAnswerType: string | null;
  readonly spec: AnswerSpec;
  readonly status: 'pending' | 'answered' | 'unknown';
  readonly answerValue: string | number | boolean | null;
  readonly documents: readonly RfiDocument[];
  readonly reviewNote: string | null;
}

export interface RfiBlocking {
  readonly type: 'transfer' | 'virtual_account_deposit' | 'unknown';
  readonly providerResourceId: string | null;
  readonly payoutId: string | null;
  readonly depositId: string | null;
}

export interface Rfi {
  readonly id: string;
  readonly providerRfiId: string | null;
  readonly status: RfiStatus;
  readonly rawStatus: string;
  /** expired, rejected o withdrawn cuando cerró sin resolverse. */
  readonly resolutionReason: string | null;
  readonly open: boolean;
  readonly overdue: boolean;
  readonly dueDate: Date | null;
  readonly totalItems: number;
  readonly pendingItems: number;
  readonly items: readonly RfiItem[];
  readonly blocking: RfiBlocking | null;
  readonly createdAt: Date | null;
}

export type AnswerValue = string | number | boolean;

export interface ItemAnswer {
  readonly itemId: string;
  readonly value: AnswerValue;
}

export interface TemporaryLink {
  readonly url: string;
  readonly expiresAt: Date | null;
}

/** Límites de AnswerRfiService: 20 archivos por ítem y 30 MB por archivo, salvo que el ítem diga menos. */
export const MAX_FILES_PER_ITEM = 20;
export const MAX_FILE_BYTES = 30 * 1024 * 1024;
export const DEFAULT_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/heic', 'image/webp'];

/** Tipos que se responden con un valor en el PATCH por lote. */
export function answersWithValue(item: RfiItem): boolean {
  return !['document', 'ubo_link', 'unknown'].includes(item.answerType);
}

/** Validación de un archivo contra el ítem, antes de subirlo (misma regla que el BFF). */
export function fileProblem(item: RfiItem, file: { name: string; type: string; size: number }): string | null {
  const allowed = item.spec.mimeTypes.length ? item.spec.mimeTypes : DEFAULT_MIME_TYPES;
  if (file.size === 0) {
    return `${file.name} está vacío.`;
  }
  if (file.size > MAX_FILE_BYTES) {
    return `${file.name} supera los 30 MB por archivo.`;
  }
  if (!allowed.includes(file.type.toLowerCase())) {
    return `${file.name}: tipo no admitido. Permitidos: ${allowed.join(', ')}.`;
  }
  return null;
}

export function maxFilesFor(item: RfiItem): number {
  return item.spec.maxFiles ? Math.min(item.spec.maxFiles, MAX_FILES_PER_ITEM) : MAX_FILES_PER_ITEM;
}

export abstract class RfiRepository {
  abstract list(onlyOpen: boolean): Observable<readonly Rfi[]>;
  abstract get(id: string): Observable<Rfi>;
  abstract sync(): Observable<readonly Rfi[]>;
  abstract refresh(id: string): Observable<Rfi>;
  abstract answer(id: string, answers: readonly ItemAnswer[]): Observable<Rfi>;
  abstract uploadDocuments(id: string, itemId: string, files: readonly File[]): Observable<Rfi>;
  abstract removeDocument(id: string, itemId: string, documentId: string): Observable<Rfi>;
  abstract documentLink(id: string, itemId: string, documentId: string): Observable<TemporaryLink>;
  /** POST /api/rfis/{id}/items/{itemId}/ubo-link — enlace de verificación de un beneficiario (~1 h). */
  abstract ownerVerificationLink(id: string, itemId: string): Observable<TemporaryLink>;
}
