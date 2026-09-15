import { InjectionToken } from '@angular/core';
import { parseRole } from '../permissions/role';
import { Session } from './session';

const STORAGE_KEY = 'au.session';

/**
 * Copia de la sesión en sessionStorage: sobrevive a recargas y muere al cerrar la pestaña.
 * Nunca localStorage. Solo guarda el JWT propio del BFF; ningún secreto del proveedor existe en el front.
 */
export interface SessionPersistence {
  read(): Session | null;
  write(session: Session): void;
  clear(): void;
}

export const SESSION_PERSISTENCE = new InjectionToken<SessionPersistence>('SESSION_PERSISTENCE', {
  providedIn: 'root',
  factory: () => browserSessionPersistence(globalThis.sessionStorage),
});

export function browserSessionPersistence(storage: Storage | undefined): SessionPersistence {
  return {
    read() {
      try {
        const raw = storage?.getItem(STORAGE_KEY);
        return raw ? parseStoredSession(JSON.parse(raw)) : null;
      } catch {
        return null;
      }
    },
    write(session) {
      try {
        storage?.setItem(STORAGE_KEY, JSON.stringify(session));
      } catch {
        // Almacenamiento bloqueado: la sesión sigue viva en memoria hasta recargar.
      }
    },
    clear() {
      try {
        storage?.removeItem(STORAGE_KEY);
      } catch {
        // Nada que limpiar si el almacenamiento no está disponible.
      }
    },
  };
}

function parseStoredSession(value: unknown): Session | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const operator = record['operator'] as Record<string, unknown> | undefined;
  if (
    typeof record['accessToken'] !== 'string' ||
    typeof record['expiresAt'] !== 'number' ||
    !operator ||
    typeof operator['userId'] !== 'string' ||
    typeof operator['email'] !== 'string' ||
    typeof operator['tenantId'] !== 'string'
  ) {
    return null;
  }
  return {
    accessToken: record['accessToken'],
    expiresAt: record['expiresAt'],
    tenantName: typeof record['tenantName'] === 'string' ? record['tenantName'] : null,
    operator: {
      userId: operator['userId'],
      email: operator['email'],
      tenantId: operator['tenantId'],
      role: parseRole(typeof operator['role'] === 'string' ? operator['role'] : null),
    },
  };
}
