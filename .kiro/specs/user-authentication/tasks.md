# User Authentication — Implementation Tasks

## Tasks

- [ ] 1. **Database setup**
  - Create Prisma schema for `User` and `VerificationToken` models
  - Write and run initial migration
  - Seed a test user for local development

- [ ] 2. **Password utilities**
  - Implement `hashPassword(plain: string): Promise<string>` using bcrypt (cost 12)
  - Implement `verifyPassword(plain: string, hash: string): Promise<boolean>`
  - Unit test both functions

- [ ] 3. **JWT utilities**
  - Generate RS256 key pair and store in environment variables
  - Implement `signAccessToken(payload): string`
  - Implement `verifyAccessToken(token): Payload | null`
  - Unit test token signing and verification

- [ ] 4. **Refresh token store (Redis)**
  - Implement `createRefreshToken(userId): Promise<string>`
  - Implement `rotateRefreshToken(oldTokenId): Promise<string>`
  - Implement `revokeRefreshToken(tokenId): Promise<void>`
  - Implement `revokeAllRefreshTokens(userId): Promise<void>`

- [ ] 5. **Registration endpoint** (`POST /api/v1/auth/register`)
  - Validate request body with Zod schema
  - Check for duplicate email
  - Hash password and create user
  - Generate and store verification token
  - Send verification email (use email service stub for now)
  - Return `201` with user id

- [ ] 6. **Email verification endpoint** (`POST /api/v1/auth/verify-email`)
  - Validate token, check expiry
  - Mark user as verified
  - Return `200`

- [ ] 7. **Login endpoint** (`POST /api/v1/auth/login`)
  - Apply rate limiting middleware
  - Validate credentials
  - Check email verified
  - Issue access + refresh tokens
  - Return `200` with tokens

- [ ] 8. **Token refresh endpoint** (`POST /api/v1/auth/refresh`)
  - Validate refresh token from Redis
  - Rotate token
  - Return new access token

- [ ] 9. **Logout endpoints**
  - `POST /api/v1/auth/logout` — revoke single refresh token
  - `POST /api/v1/auth/logout-all` — revoke all tokens for user

- [ ] 10. **Password reset flow**
  - `POST /api/v1/auth/forgot-password` — generate reset token, send email
  - `POST /api/v1/auth/reset-password` — validate token, update password, revoke all refresh tokens

- [ ] 11. **Integration tests**
  - Happy path: register → verify → login → refresh → logout
  - Error cases: duplicate email, wrong password, expired token, rate limit

- [ ] 12. **Documentation**
  - Update OpenAPI spec with all auth endpoints
  - Add environment variable documentation to README
