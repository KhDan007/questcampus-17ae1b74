# Password reset and complete EN/RU/KK localization

## Goal

Give password-account users a secure self-service password reset. Ensure every
product-owned visible string has an English, Russian, and Kazakh version.

## Scope

This change spans two repositories:

- `questcampus`: Convex password-reset persistence, HTTP endpoints, and reset
  email templates.
- `questcampus-17ae1b74`: reset-request and reset-password screens, auth-client
  calls, and frontend localization coverage.

Third-party content, user-authored text, university names, product names,
technical acronyms, and URL paths remain unchanged. Product-owned UI, email,
validation, and backend error text are localized.

## Password reset flow

1. User selects **Forgot password?** from sign-in and submits an email address.
2. Frontend calls `POST /api/auth/password-reset/request` with locale headers.
3. Backend returns one generic success response for every valid-shaped request.
   It never discloses whether an account exists or supports passwords.
4. Backend rate-limits by IP and normalized email. For an eligible password
   account, it generates a cryptographically random opaque token, stores only
   its SHA-256 hash with issued/expiry timestamps, and sends a localized email.
5. Email links to frontend `/reset-password?token=<opaque-token>`.
6. User chooses a new password. Frontend calls
   `POST /api/auth/password-reset/confirm` with token and password.
7. Backend validates token lifetime and single-use state, hashes password with
   current PBKDF2 settings, updates password credentials, then consumes every
   outstanding reset token for that user. It returns localized validation errors
   but never identifies account state.
8. Frontend shows success and directs user to sign in. Reset does not create a
   session or log out other sessions in this scope.

## Data and interfaces

Add a reset-token table keyed by token hash. Fields: `userId`, `tokenHash`,
`issuedAt`, `expiresAt`, `usedAt?`. Index token hash for confirmation and user
ID for invalidation. Token lifetime: one hour.

Add internal auth functions to find a password-capable user, store/consume a
token, and atomically update credentials. HTTP actions retain public input
validation, CORS, locale selection, error normalization, and throttling.

Add frontend auth-client methods `requestPasswordReset(email)` and
`confirmPasswordReset(token, password)`. Add routes for reset request and reset
confirmation. Sign-in gets a link to request reset.

## Localization design

Use `t(key)` for product-owned JSX text. Add matching values to EN, RU, and KK
dictionaries; do not rely on DOM literal replacement for new work. Localize
email subjects/bodies and backend `errorI18n` messages through existing locale
selection.

Audit all frontend TypeScript/TSX strings in rendered text and localizable
attributes. Exclude code, URLs, identifiers, external data, branded names, and
standard technical acronyms. Add a repeatable test/audit that fails when a
required RU or KK key is absent or equals its EN source string.

## Security and failure handling

- Use `crypto.getRandomValues` for opaque reset token generation.
- Store SHA-256 hash only; never log token or password.
- Uniform request response prevents account enumeration.
- Rate limit request route and bound input lengths before costly operations.
- Reject expired, used, malformed, or unknown tokens with one localized invalid
  link response.
- Consume token before final success. Send email best-effort only after token
  persistence; return generic success on mail-provider failure.

## Tests and acceptance criteria

Backend tests cover request non-enumeration, token hashing, expiry, one-time
use, password replacement, outstanding-token invalidation, and localized
errors. Frontend tests cover client requests and all dictionary key parity.

Acceptance:

- Password user receives reset email and can sign in using new password.
- Reused/expired reset link fails safely.
- Unknown and Google-only emails receive indistinguishable reset-request result.
- Reset screens, email, errors, and all product-owned UI render fully in EN,
  RU, and KK without English fallback in RU/KK.
