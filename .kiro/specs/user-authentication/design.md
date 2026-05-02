# User Authentication — Design

## Architecture

```
Client
  │
  ▼
API Gateway (rate limiting, HTTPS termination)
  │
  ▼
Auth Service (Express.js / TypeScript)
  │         │
  ▼         ▼
PostgreSQL  Redis
(users,     (refresh token store,
 tokens)     rate limit counters)
```

## Data Models

### User (PostgreSQL)
```sql
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  verified      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Verification Token (PostgreSQL)
```sql
CREATE TABLE verification_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ
);
```

### Refresh Token (Redis)
Key: `refresh:<tokenId>`  
Value: JSON `{ userId, createdAt, expiresAt }`  
TTL: 7 days

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/auth/register` | Register a new user |
| POST | `/api/v1/auth/verify-email` | Verify email with token |
| POST | `/api/v1/auth/resend-verification` | Resend verification email |
| POST | `/api/v1/auth/login` | Login, returns tokens |
| POST | `/api/v1/auth/refresh` | Refresh access token |
| POST | `/api/v1/auth/logout` | Logout (invalidate refresh token) |
| POST | `/api/v1/auth/logout-all` | Logout all devices |
| POST | `/api/v1/auth/forgot-password` | Request password reset |
| POST | `/api/v1/auth/reset-password` | Complete password reset |

## Token Strategy

- **Access token**: JWT signed with RS256, 15-minute TTL, contains `{ sub: userId, email, iat, exp }`
- **Refresh token**: Opaque UUID stored in Redis, 7-day TTL, rotated on use
- **Verification/reset tokens**: Opaque UUID, hashed before storage, short TTL

## Security Considerations

- bcrypt cost factor 12 for password hashing
- Constant-time comparison for token validation to prevent timing attacks
- Rate limiting via Redis sliding window on `/login` (5 req / 15 min / IP)
- Refresh token rotation prevents replay attacks
- All tokens invalidated on password reset
