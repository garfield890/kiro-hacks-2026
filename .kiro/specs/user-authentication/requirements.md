# User Authentication — Requirements

## Overview
Implement a secure user authentication system supporting email/password login and JWT-based session management.

## Requirements

### Functional Requirements

1. **User Registration**
   - Users can register with a unique email address and a password
   - Passwords must be at least 8 characters and include at least one uppercase letter, one number, and one special character
   - On successful registration, a verification email is sent
   - Duplicate email addresses are rejected with a clear error message

2. **Email Verification**
   - A time-limited (24h) verification token is sent to the user's email on registration
   - Users must verify their email before they can log in
   - Users can request a new verification email if the token expires

3. **Login**
   - Users log in with email and password
   - On success, a short-lived JWT access token (15 min) and a long-lived refresh token (7 days) are returned
   - Failed login attempts are rate-limited (max 5 attempts per 15 minutes per IP)
   - Unverified accounts cannot log in

4. **Token Refresh**
   - Clients can exchange a valid refresh token for a new access token
   - Refresh tokens are rotated on each use (old token invalidated)
   - Refresh tokens are stored server-side and can be revoked

5. **Logout**
   - Logging out invalidates the current refresh token
   - Optionally, users can log out of all devices (invalidate all refresh tokens)

6. **Password Reset**
   - Users can request a password reset via email
   - Reset tokens expire after 1 hour
   - After reset, all existing refresh tokens are invalidated

### Non-Functional Requirements

- Passwords are hashed using bcrypt (cost factor ≥ 12)
- All auth endpoints are served over HTTPS only
- Tokens are signed with RS256 (asymmetric keys)
- Auth events (login, logout, failed attempts) are logged for audit purposes
- P99 latency for login endpoint < 300ms

## Out of Scope
- OAuth / social login (planned for v2)
- Multi-factor authentication (planned for v2)
- SSO / SAML
