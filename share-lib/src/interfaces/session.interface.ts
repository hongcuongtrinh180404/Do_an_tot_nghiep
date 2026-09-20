export interface ISession {
  id: string;
  userId: string;
  refreshTokenHash: string;
  previousRefreshTokenHash?: string | null;
  hashRotatedAt?: Date | string | null;
  expiresAt: Date | string;
  isRevoked: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}
