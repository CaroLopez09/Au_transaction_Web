/** POST /api/auth/login → LoginUseCase.LoginResult */
export interface LoginResultDto {
  accessToken: string;
  expiresIn: number;
  email: string;
  role: string;
  tenantId: string;
  tenantName?: string;
}

/** GET /api/auth/me → AuthController.me */
export interface MeDto {
  userId: string;
  email: string;
  tenantId: string;
  role: string;
}
