# Environment Variables Setup Checklist

## Status: Review and Complete

You've added keys to `fastapi/.env`. Now complete the setup for both environments.

---

## 1. Supabase Keys (Required for Both)

Get these from your Supabase project dashboard → Settings → API:

```
Project URL:        https://xxxxxxxxxxxx.supabase.co
anon public key:    eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role key:   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 2. FastAPI Environment (`fastapi/.env`)

**Current status:** ✅ File exists

**Required keys:**
```bash
# Supabase
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# AI Providers
NVIDIA_NIM_API_KEY=nvapi-...
GROQ_API_KEY=gsk_...
GEMINI_API_KEY=AIza...

# Service Security
FASTAPI_SECRET_KEY=generate-with-openssl-rand-hex-32
ALLOWED_ORIGINS=http://localhost:3000

# Runtime
ENVIRONMENT=development
```

**Action items:**
- [ ] Replace `xxxxxxxxxxxx` with your actual Supabase project URL
- [ ] Replace `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` with your actual service_role key
- [ ] Replace `nvapi-...` with your NVIDIA NIM API key
- [ ] Replace `gsk_...` with your Groq API key
- [ ] Replace `AIza...` with your Gemini API key
- [ ] Generate FASTAPI_SECRET_KEY: `openssl rand -hex 32`

---

## 3. Next.js Environment (`.env.local`)

**Current status:** ✅ File created (needs values)

**Required keys:**
```bash
# Supabase (Public - safe for browser)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Supabase (Server-side only - NEVER prefix with NEXT_PUBLIC_)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000

# FastAPI Internal Communication
FASTAPI_INTERNAL_URL=http://localhost:8000
FASTAPI_SECRET_KEY=generate-with-openssl-rand-hex-32
```

**Action items:**
- [ ] Replace `xxxxxxxxxxxx` with your Supabase project URL
- [ ] Replace anon key placeholder with your actual anon public key
- [ ] Replace service_role key placeholder with your actual service_role key
- [ ] Generate FASTAPI_SECRET_KEY (same value as in `fastapi/.env`)

---

## 4. AI Provider API Keys

### NVIDIA NIM
- Sign up: https://build.nvidia.com/
- Navigate to: API Catalog → Get API Key
- Format: `nvapi-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### Groq
- Sign up: https://console.groq.com/
- Navigate to: API Keys → Create API Key
- Format: `gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### Gemini (Google AI Studio)
- Sign up: https://aistudio.google.com/
- Navigate to: Get API Key
- Format: `AIzaxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

---

## 5. Security Checklist

**CRITICAL - Verify before proceeding:**

- [ ] `.gitignore` exists and includes:
  - `.env`
  - `.env.local`
  - `fastapi/.env`

- [ ] Run this command to verify no secrets in git:
  ```bash
  git status
  ```
  **Expected:** `.env` and `.env.local` should NOT appear in untracked files

- [ ] Run this command to check for exposed secrets:
  ```bash
  grep -r "nvapi-\|gsk_\|AIza" --include="*.ts" --include="*.tsx" src/ || echo "No secrets found - GOOD"
  ```
  **Expected:** "No secrets found - GOOD"

- [ ] Verify NEXT_PUBLIC_ prefix usage:
  - ✅ NEXT_PUBLIC_SUPABASE_URL (safe for browser)
  - ✅ NEXT_PUBLIC_SUPABASE_ANON_KEY (safe for browser)
  - ✅ NEXT_PUBLIC_APP_URL (safe for browser)
  - ❌ SUPABASE_SERVICE_ROLE_KEY (NO NEXT_PUBLIC_ prefix - server only)
  - ❌ FASTAPI_SECRET_KEY (NO NEXT_PUBLIC_ prefix - server only)

---

## 6. Generate FASTAPI_SECRET_KEY

Run this command to generate a secure secret:

```bash
openssl rand -hex 32
```

Copy the output and use it for `FASTAPI_SECRET_KEY` in **both** files:
- `fastapi/.env`
- `.env.local`

**Important:** Use the **same value** in both files.

---

## 7. Verification Commands

After filling in all values, verify the setup:

### Check FastAPI can load config:
```bash
cd fastapi
python -c "from config import SUPABASE_URL, NVIDIA_NIM_API_KEY, GROQ_API_KEY; print('FastAPI config loaded successfully')"
```

### Check Next.js can load config:
```bash
node -e "console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT SET')"
```

---

## 8. Common Mistakes to Avoid

❌ **DO NOT:**
- Commit `.env` or `.env.local` files to git
- Use `NEXT_PUBLIC_` prefix for service_role key
- Share API keys in screenshots or logs
- Use the same API keys in production and development (use separate keys)

✅ **DO:**
- Keep `.env` files in `.gitignore`
- Use `NEXT_PUBLIC_` only for values safe to expose in browser
- Rotate API keys if accidentally exposed
- Use different Supabase projects for dev/staging/production

---

## 9. Next Steps After Completion

Once all environment variables are set:

1. ✅ Database schema executed (001_phase1_complete.sql)
2. ✅ Verification queries passed (002_verification_queries.sql)
3. ⏳ Environment variables configured (this checklist)
4. ⏳ Ready to proceed to next task

**Wait for confirmation before moving to the next task.**

---

## Quick Reference

**Supabase Dashboard:**
- URL: https://supabase.com/dashboard/project/[your-project-id]
- API Keys: Settings → API
- Database: Database → SQL Editor
- Storage: Storage → Buckets

**AI Provider Dashboards:**
- NVIDIA NIM: https://build.nvidia.com/
- Groq: https://console.groq.com/
- Gemini: https://aistudio.google.com/

---

**Status:** Review this checklist and confirm all items are complete before proceeding.
