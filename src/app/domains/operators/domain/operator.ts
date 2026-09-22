import { Observable } from 'rxjs';
import { Role } from '../../../core/permissions/role';

/** Operador de la propia empresa (application/tenant/OperatorView del BFF). */
export interface Operator {
  readonly id: string;
  readonly email: string;
  readonly firstName: string | null;
  readonly lastName: string | null;
  readonly fullName: string;
  readonly role: Role | null;
  /** Texto del backend para el rol; se usa como respaldo si el rol no se reconoce. */
  readonly roleDescription: string | null;
  readonly status: string;
  readonly active: boolean;
  /** Segundo factor ya configurado por esa persona. El portal no puede activarlo por ella. */
  readonly mfaEnabled: boolean;
  /** Estado de validacion documental y facial, resuelto por el BFF. */
  readonly identityStatus: string;
}

/**
 * Roles que un administrador puede repartir (ManageOperatorsService.ASSIGNABLE).
 * PLATFORM_OPERATOR queda fuera a propósito: crearlo desde el portal sería escalar
 * privilegios fuera de la empresa, y el BFF lo rechaza con 422.
 */
export const ASSIGNABLE_ROLES = ['ADMIN', 'TREASURY_APPROVER'] as const satisfies readonly Role[];

export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

/** OperatorCommands.CreateOperator: la contraseña la fija quien da de alta y tiene 12 caracteres mínimo. */
export const MIN_PASSWORD_LENGTH = 12;

export interface CreateOperator {
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly password: string;
  readonly role: AssignableRole;
}

export abstract class OperatorRepository {
  /** GET /api/operators — Administración. */
  abstract list(): Observable<readonly Operator[]>;
  /** POST /api/operators — solo Administración. */
  abstract create(command: CreateOperator): Observable<Operator>;
  /** DELETE /api/operators/{id} — suspende, no borra: la persona sigue siendo actor de lo que firmó. */
  abstract suspend(id: string): Observable<Operator>;
  /** POST /api/operators/{id}/reactivate — revierte una desactivación. */
  abstract reactivate(id: string): Observable<Operator>;
  /** POST /api/operators/{id}/relaunch-identity — solo para identidades rechazadas. */
  abstract relaunchIdentity(id: string): Observable<Operator>;
}
