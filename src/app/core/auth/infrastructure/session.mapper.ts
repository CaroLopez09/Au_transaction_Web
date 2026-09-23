import { parseRole } from '../../permissions/role';
import { Operator } from '../session';
import { SessionGrant, SignInResult } from '../session.repository';
import { LoginResultDto, MeDto } from './session.dto';

export function toSignInResult(dto: LoginResultDto): SignInResult {
  if (dto.identityChallenge && dto.identityUserId) {
    return {
      kind: 'identity',
      challenge: dto.identityChallenge,
      userId: dto.identityUserId,
      expiresInSeconds: dto.expiresIn,
    };
  }
  if (dto.passwordChangeChallenge) {
    return { kind: 'password-change', challenge: dto.passwordChangeChallenge, expiresInSeconds: dto.expiresIn };
  }
  if (dto.mfaChallenge) {
    return {
      kind: 'mfa',
      challenge: dto.mfaChallenge,
      setupRequired: dto.mfaSetupRequired === true,
      expiresInSeconds: dto.expiresIn,
    };
  }
  return { kind: 'session', ...toSessionGrant(dto) };
}

export function toSessionGrant(dto: LoginResultDto): SessionGrant {
  if (!dto.accessToken) {
    throw new Error('El BFF no devolvió sesión.');
  }
  return { accessToken: dto.accessToken, expiresInSeconds: dto.expiresIn, tenantName: dto.tenantName ?? null };
}

export function toOperator(dto: MeDto): Operator {
  return {
    userId: dto.userId,
    email: dto.email,
    tenantId: dto.tenantId,
    role: parseRole(dto.role),
    mfaEnabled: dto.mfaEnabled === true,
    mfaEnforced: dto.mfaEnforced === true,
  };
}
