import { parseRole } from '../../permissions/role';
import { Operator } from '../session';
import { SignInResult } from '../session.repository';
import { LoginResultDto, MeDto } from './session.dto';

export function toSignInResult(dto: LoginResultDto): SignInResult {
  return {
    accessToken: dto.accessToken,
    expiresInSeconds: dto.expiresIn,
    tenantName: dto.tenantName ?? null,
  };
}

export function toOperator(dto: MeDto): Operator {
  return {
    userId: dto.userId,
    email: dto.email,
    tenantId: dto.tenantId,
    role: parseRole(dto.role),
  };
}
