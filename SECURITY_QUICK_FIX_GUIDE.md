# Matripuntos Security Audit — Quick Fix Guide

**Generated:** 2026-06-13  
**Priority:** Address critical findings immediately

---

## Critical Fixes (Fix This Week)

### 1. Remove Hardcoded Demo Credentials

**Files:** `/archive/DEMO_SCRIPT.js`

```bash
# Option A: Delete the file entirely
rm archive/DEMO_SCRIPT.js

# Option B: Move to untracked folder
mkdir -p ~/Private
mv archive/DEMO_SCRIPT.js ~/Private/DEMO_SCRIPT.js
```

**For local development**, use environment variables instead:

```bash
# .env.local (never commit)
DEMO_EMAIL1=alice@test.com
DEMO_PASSWORD1=your-secure-password-here
DEMO_EMAIL2=bob@test.com
DEMO_PASSWORD2=your-secure-password-here
```

```javascript
// In script
const email1 = process.env.DEMO_EMAIL1;
const password1 = process.env.DEMO_PASSWORD1;
```

---

### 2. Fix Database Seed File

**File:** `/src/backend/seed.js`

**Before:**
```javascript
data: { secretKey: 'test-secret-123', ... }
// ...
console.log(`\nCredentials:\nUser 1: ${user1.email} (Alice)\nPassword: password123`);
```

**After:**
```javascript
import crypto from 'crypto';

data: { 
  secretKey: crypto.randomBytes(32).toString('hex'),
  ...
}

// Remove the password console.log entirely
console.log('✅ Seed complete. Test data loaded.');
```

**Add guard:**
```javascript
if (process.env.NODE_ENV === 'production') {
  throw new Error('Seed script cannot run in production');
}
```

---

### 3. Fix WebSocket Security

**File:** `/scripts/helper.js`

**Before:**
```javascript
ws.onmessage = (msg) => {
  const data = JSON.parse(msg.data);
  if (data.type === 'reload') {
    window.location.reload();  // UNSAFE
  }
};
```

**After:**
```javascript
ws.onmessage = (msg) => {
  try {
    const data = JSON.parse(msg.data);
    
    // Rate-limit reloads
    const now = Date.now();
    if (now - lastReloadAt < 5000) {  // Throttle to 5s
      return;
    }
    
    // Validate message has required fields
    if (!data.type || !data.nonce) {
      console.warn('[WS] Invalid message format');
      return;
    }
    
    // Check for replay
    if (recentNonces.has(data.nonce)) {
      console.warn('[WS] Replay detected');
      return;
    }
    recentNonces.add(data.nonce);
    
    if (data.type === 'reload') {
      lastReloadAt = now;
      window.location.reload();
    }
  } catch (err) {
    console.error('[WS] Message parse error:', err);
  }
};

let lastReloadAt = 0;
const recentNonces = new Set();
```

---

### 4. Fix E2E Test Credentials

**File:** `/e2e/helpers/createCouple.ts`

**Before:**
```typescript
const password = 'pwd12345'
```

**After:**
```typescript
import crypto from 'crypto';

function generateTestPassword(): string {
  return crypto.randomBytes(12).toString('hex');  // 24-char random
}

export async function createCouple(...) {
  // ...
  const password = generateTestPassword();  // Unique per run
  // ...
}
```

---

## High Priority Fixes (Fix This Month)

### 5. Increase JWT Secret Requirements

**File:** `/src/backend/src/services/authService.ts`

**Before:**
```typescript
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET env var must be set and at least 32 characters long')
}
```

**After:**
```typescript
if (!JWT_SECRET || JWT_SECRET.length < 64) {
  throw new Error('JWT_SECRET must be at least 64 characters. Generate with: openssl rand -base64 48')
}

// Add entropy check
function checkEntropy(secret: string): boolean {
  const unique = new Set(secret).size;
  return unique >= 16;  // At least 16 unique characters
}

if (!checkEntropy(JWT_SECRET)) {
  throw new Error('JWT_SECRET has insufficient entropy')
}
```

**Generate new secret:**
```bash
openssl rand -base64 48
# Example output: Xk9mL2pQr5vW1aB3cD7eF6gH8iJ9kL0mN1oP2qR3sT4uV5wX6yZ7aB8cD9eF0gH
```

---

### 6. Move Tokens to HttpOnly Cookies

**Backend:** `/src/backend/src/routes/authRoutes.ts`

```typescript
// After successful login, set secure cookie
res.cookie('auth_token', accessToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'Strict',
  maxAge: 7 * 24 * 60 * 60 * 1000,  // 7 days
  path: '/api',
});

// Return refresh token for rotation
res.json({
  user: { ... },
  // No token in body; it's in the cookie
});
```

**Frontend:** `/src/frontend/src/services/api/http.ts`

```typescript
// Remove localStorage.setItem('auth_token', token)
// Browser automatically sends auth_token cookie with requests

setToken(token: string) {
  this.token = token;
  // No longer store in localStorage
}

// For refresh token (also in httpOnly cookie):
getToken(): string | null {
  // Return from memory only (cookie sent automatically by browser)
  return this.token;
}
```

---

### 7. Add Input Validation

**File:** `/src/backend/src/schemas/authSchemas.ts`

```typescript
export const loginSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .min(5, 'Email too short')
    .max(254, 'Email too long'),  // RFC 5321
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long'),
});

export const signupSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .max(254, 'Email too long'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long'),
  name: z.string()
    .min(2, 'Name too short')
    .max(100, 'Name too long'),  // ← Add max
});
```

---

### 8. Validate File Uploads

**File:** `/src/backend/src/routes/taskProof.ts`

```typescript
import { fileTypeFromBuffer } from 'file-type';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024;  // 5 MB

router.post('/:logId/proof', authMiddleware, async (req, res) => {
  // Validate Content-Type header
  const contentType = req.get('Content-Type');
  if (!ALLOWED_TYPES.includes(contentType || '')) {
    return res.status(400).json({ error: 'Invalid image type' });
  }

  // Validate Content-Length header
  const size = parseInt(req.get('Content-Length') || '0', 10);
  if (size > MAX_SIZE) {
    return res.status(413).json({ error: 'Image too large (max 5 MB)' });
  }

  // Get buffer and validate magic bytes
  const buffer = await req.buffer();
  const type = await fileTypeFromBuffer(buffer);
  
  if (!type || !ALLOWED_TYPES.includes(type.mime)) {
    return res.status(400).json({ error: 'Invalid image content' });
  }

  // Now safe to upload
  const url = await uploadImage(buffer, type.ext);
  await prisma.taskLog.update({
    where: { id: logId },
    data: { proofImageUrl: url },
  });
});
```

**Install dependency:**
```bash
npm install file-type
```

---

### 9. Encrypt Google OAuth Tokens

**File:** `/src/backend/src/routes/googleCalendarOauth.ts`

```typescript
import crypto from 'crypto';

const ENCRYPTION_KEY = crypto.scryptSync(
  process.env.ENCRYPTION_KEY_PASSPHRASE || 'default',
  'salt',
  32
);

function encryptToken(token: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(token, 'utf-8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

function decryptToken(encrypted: string): string {
  const [iv, tag, ciphertext] = encrypted.split(':');
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    ENCRYPTION_KEY,
    Buffer.from(iv, 'hex')
  );
  decipher.setAuthTag(Buffer.from(tag, 'hex'));
  let decrypted = decipher.update(ciphertext, 'hex', 'utf-8');
  decrypted += decipher.final('utf-8');
  return decrypted;
}

// In OAuth callback:
router.post('/callback', async (req, res) => {
  const googleToken = req.body.code;
  const encryptedToken = encryptToken(googleToken);
  
  await prisma.googleCalendarSync.update({
    where: { userId },
    data: { refreshToken: encryptedToken },  // Now encrypted
  });
});
```

---

### 10. Add Rate-Limiting to Auth Endpoints

**File:** `/src/backend/src/server.ts`

```typescript
import rateLimit from 'express-rate-limit';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 5,  // 5 failed attempts
  skip: () => process.env.NODE_ENV === 'test',
  message: 'Too many login attempts. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 hour
  max: 3,  // 3 sign-ups per hour per IP
  skip: () => process.env.NODE_ENV === 'test',
  message: 'Too many sign-ups. Please try again later.',
});

// Mount on routes:
app.post('/api/auth/login', loginLimiter, authRoutes);
app.post('/api/auth/signup', signupLimiter, authRoutes);
```

---

## Verification Checklist

After implementing fixes, verify:

```bash
# 1. No hardcoded credentials in git history
git log --all --full-history -p | grep -i "password\|secret\|token" | head -5
# Should return EMPTY

# 2. Run security audit
npm audit

# 3. Type-check
npm run type-check

# 4. Lint
npm run lint

# 5. Run tests
npm test

# 6. Generate new JWT_SECRET
openssl rand -base64 48
# Update .env with new value
```

---

## Testing Security Fixes

### Test Rate-Limiting

```bash
# Make 6 login requests in quick succession
for i in {1..6}; do
  curl -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"test"}'
  echo "Request $i"
done

# 6th request should get 429 Too Many Requests
```

### Test Token Expiration

```typescript
// Verify JWT expires after configured time
const token = generateToken(userId, coupleId);
const decoded = jwt.verify(token, JWT_SECRET);
console.log(decoded.exp);  // Should show expiry timestamp
```

### Test File Upload Validation

```bash
# Create test file with wrong magic bytes
echo "FAKE JPEG DATA" > fake.jpg

# Try to upload
curl -X POST http://localhost:3000/api/task-logs/123/proof \
  -H "Authorization: Bearer TOKEN" \
  -F "file=@fake.jpg"

# Should get 400 "Invalid image content"
```

---

## References

- [OWASP Top 10](https://owasp.org/Top10/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8949)
- [NIST Password Guidelines](https://pages.nist.gov/800-63-3/sp800-63b.html)
- [Express Security](https://expressjs.com/en/advanced/best-practice-security.html)

---

## Questions?

Refer to the full audit report: `/COMPREHENSIVE_SECURITY_AUDIT.md`
