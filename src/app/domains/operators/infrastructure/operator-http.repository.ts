import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { APP_CONFIG } from '../../../core/configuration/app-config';
import { parseRole } from '../../../core/permissions/role';
import { CreateOperator, Operator, OperatorRepository } from '../domain/operator';

/** application/tenant/OperatorView (non_null: lo nulo no llega). */
interface OperatorViewDto {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  role: string;
  roleDescription?: string;
  status: string;
  active: boolean;
  mfaEnabled: boolean;
  identityStatus?: string;
}

@Injectable()
export class OperatorHttpRepository extends OperatorRepository {
  private readonly http = inject(HttpClient);
  private readonly url = `${inject(APP_CONFIG).apiBaseUrl}/operators`;

  list(): Observable<readonly Operator[]> {
    return this.http.get<OperatorViewDto[]>(this.url).pipe(map((dtos) => dtos.map(toOperator)));
  }

  create(command: CreateOperator): Observable<Operator> {
    return this.http.post<OperatorViewDto>(this.url, command).pipe(map(toOperator));
  }

  suspend(id: string): Observable<Operator> {
    return this.http.delete<OperatorViewDto>(`${this.url}/${encodeURIComponent(id)}`).pipe(map(toOperator));
  }
}

export function toOperator(dto: OperatorViewDto): Operator {
  return {
    id: dto.id,
    email: dto.email,
    firstName: dto.firstName ?? null,
    lastName: dto.lastName ?? null,
    // fullName del BFF es la unión de nombre y apellido; sin ellos queda el correo, que siempre está.
    fullName: dto.fullName?.trim() ? dto.fullName : dto.email,
    role: parseRole(dto.role),
    roleDescription: dto.roleDescription ?? null,
    status: dto.status,
    active: dto.active,
    mfaEnabled: dto.mfaEnabled,
    identityStatus: dto.identityStatus ?? 'PENDING_DOCUMENTS',
  };
}
