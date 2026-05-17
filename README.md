# FinSight — AI-Powered Financial Intelligence

**Automate receipt processing with computer vision and LLMs**

[![Status](https://img.shields.io/badge/status-MVP%20Complete-success)]()
[![Phase](https://img.shields.io/badge/phase-1%20of%205-blue)]()
[![License](https://img.shields.io/badge/license-MIT-green)]()

---

## 🎯 What is FinSight?

FinSight eliminates manual expense tracking by using AI to automatically extract transaction data from receipt images and categorize expenses intelligently.

**Upload receipt → AI extracts data → AI categorizes → Saves to database → Shows in dashboard**

### Key Features

- ✅ **Zero Manual Entry**: Upload receipt photo, AI does the rest
- ✅ **Intelligent Categorization**: LLM assigns transactions to 12 categories
- ✅ **Progressive Intelligence**: Features unlock as you upload more receipts
- ✅ **Indian Market Optimized**: Recognizes Swiggy, Zomato, Big Bazaar, etc.
- ✅ **Real-time Processing**: See results in seconds
- ✅ **Secure & Private**: Row-level security, encrypted storage

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Python 3.11+
- Supabase account
- API keys: NVIDIA NIM, Groq

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/finsight.git
cd finsight
```

### 2. Setup Environment Variables

**Frontend (.env.local):**
```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
FASTAPI_INTERNAL_URL=http://localhost:8000
FASTAPI_SECRET_KEY=your-secret-key
```

**Backend (fastapi/.env):**
```bash
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NVIDIA_NIM_API_KEY=your-nvidia-key
GROQ_API_KEY=your-groq-key
FASTAPI_SECRET_KEY=your-secret-key
ALLOWED_ORIGINS=http://localhost:3000
ENVIRONMENT=development
```

### 3. Setup Database

1. Go to Supabase Dashboard → SQL Editor
2. Run `supabase/migrations/001_phase1_complete.sql`
3. Create storage bucket named `receipts` with public access

### 4. Install Dependencies

**Frontend:**
```bash
npm install
```

**Backend:**
```bash
cd fastapi
pip install -r requirements.txt
```

### 5. Run Servers

**Terminal 1 (Backend):**
```bash
cd fastapi
uvicorn main:app --reload
# Runs on http://localhost:8000
```

**Terminal 2 (Frontend):**
```bash
npm run dev
# Runs on http://localhost:3000
```

### 6. Test

1. Open http://localhost:3000
2. Sign up / Login
3. Upload a receipt image
4. See AI-extracted data in dashboard

---

## 🏗️ Architecture

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────┐
│   Next.js Frontend          │
│   - Auth (Supabase)         │
│   - Upload Modal            │
│   - Dashboard               │
└──────┬──────────────────────┘
       │
       ▼
┌─────────────────────────────┐
│   FastAPI Backend           │
│   - Middleware (CORS, Auth) │
│   - /analyze/receipt        │
└──────┬──────────────────────┘
       │
       ▼
┌─────────────────────────────┐
│   AI Pipeline               │
│   1. NVIDIA NIM (OCR)       │
│   2. Groq (Categorization)  │
│   3. Database Write         │
│   4. Update Status          │
│   5. Increment Count        │
└──────┬──────────────────────┘
       │
       ▼
┌─────────────────────────────┐
│   Supabase (PostgreSQL)     │
│   - profiles                │
│   - receipts                │
│   - transactions            │
└─────────────────────────────┘
```

---

## 📁 Project Structure

```
finsight/
├── fastapi/                    # Backend (Python)
│   ├── main.py                 # FastAPI app
│   ├── config.py               # Environment config
│   ├── ai_clients/             # NVIDIA NIM, Groq
│   ├── db/                     # Supabase client
│   └── pipeline/               # Orchestrator
├── src/                        # Frontend (Next.js)
│   ├── app/
│   │   ├── (dashboard)/        # Dashboard page
│   │   ├── api/                # API routes
│   │   └── auth/               # Login/signup
│   ├── components/             # React components
│   └── lib/                    # Utilities
├── supabase/
│   └── migrations/             # Database schema
├── docs/                       # Documentation
└── README.md                   # This file
```

---

## 🛠️ Tech Stack

**Frontend:**
- Next.js 14.2 (App Router)
- TypeScript
- Tailwind CSS
- Framer Motion
- Supabase Auth

**Backend:**
- FastAPI (Python)
- Uvicorn (ASGI)
- httpx (async HTTP)
- Supabase Python SDK

**AI Models:**
- NVIDIA NIM: Llama 3.2 90B Vision (OCR)
- Groq: Llama 3.3 70B Versatile (Categorization)

**Database:**
- Supabase (PostgreSQL 15)
- Row Level Security (RLS)
- Supabase Storage

---

## 📊 Features

### ✅ Phase 1 (MVP) — Complete

- [x] User authentication (email/password)
- [x] Receipt upload (drag-and-drop)
- [x] AI OCR extraction (merchant, amount, date, currency)
- [x] AI categorization (12 categories)
- [x] Database persistence
- [x] Dashboard (KPI cards, transaction feed)
- [x] Progressive intelligence (feature unlocking)
- [x] Free tier limits (25 receipts)

### 🚧 Phase 2 (Planned)

- [ ] Charts & graphs (spending over time, category breakdown)
- [ ] AI insights generation
- [ ] Anomaly detection
- [ ] Subscription detection
- [ ] Export data (CSV, PDF)

### 🔮 Phase 3+ (Future)

- [ ] Tax estimation
- [ ] Budget recommendations
- [ ] Multi-currency support
- [ ] Team collaboration
- [ ] Mobile app

---

## 🧪 Testing

### Health Check
```bash
curl http://localhost:8000/health
```

### Upload Receipt (requires auth)
```bash
curl -X POST http://localhost:3000/api/receipts/upload \
  -H "Cookie: sb-access-token=YOUR_TOKEN" \
  -F "file=@receipt.jpg"
```

---

## 📚 Documentation

- **[Quick Start Guide](PROJECT_GUIDE_FOR_CLAUDE.md)** — For AI assistants (Claude, ChatGPT)
- **[Architecture Diagram](ARCHITECTURE_DIAGRAM.md)** — System design
- **[Interview Prep](INTERVIEW_PREP_GUIDE.md)** — Project explanation guide
- **[Avkalan Strategy](AVKALAN_INTERVIEW_STRATEGY.md)** — Interview-specific prep

---

## 🤝 Contributing

This is a personal project for learning and portfolio purposes. Not accepting contributions at this time.

---

## 📝 License

MIT License - See LICENSE file for details

---

## 👤 Author

**Your Name**
- Portfolio: [your-portfolio.com](https://your-portfolio.com)
- LinkedIn: [linkedin.com/in/yourname](https://linkedin.com/in/yourname)
- Email: your.email@example.com

---

## 🙏 Acknowledgments

- **NVIDIA NIM** for OCR API
- **Groq** for fast LLM inference
- **Supabase** for backend infrastructure
- **Vercel** for Next.js hosting (planned)
- **Railway** for FastAPI hosting (planned)

---

## 📈 Project Status

**Current Phase**: MVP Complete (Phase 1)  
**Last Updated**: January 2025  
**Status**: ✅ Production-ready for demo/portfolio

---

**Built with ❤️ for the Avkalan.ai AI Intern interview**
