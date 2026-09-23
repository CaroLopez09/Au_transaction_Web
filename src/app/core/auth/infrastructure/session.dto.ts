/** POST /api/auth/login → LoginUseCase.LoginResult */
export interface LoginResultDto {
  /** Ausente cuando la respuesta es un reto de segundo factor. */
  accessToken?: string;
  expiresIn: number;
  email: string;
  role?: string;
  tenantId?: string;
  tenantName?: string;
  mfaChallenge?: string;
  mfaRequired?: boolean;
  mfaSetupRequired?: boolean;
  identityChallenge?: string;
  identityUserId?: string;
  passwordChangeChallenge?: string;
}

/** POST /api/auth/mfa/setup → MfaService.MfaSetup */
export interface MfaSetupDto {
  secret: string;
  otpauthUri: string;
}

/** GET /api/auth/me → AuthController.me */
export interface MeDto {
  userId: string;
  email: string;
  tenantId: string;
  tenantName?: string;
  role: string;
  mfaEnabled: boolean;
  mfaEnforced: boolean;
}
