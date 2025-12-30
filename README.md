# FAP NextGen 🏥

**Advanced Family Adoption Programme Management Systems for Medical Education (CBME)**

A production-grade, offline-first progressive web application (PWA) designed for MBBS students to manage their community medicine fieldwork. Built on valid clinical guidelines and powered by modern cloud infrastructure.

[![Deployed on Vercel](https://img.shields.io/badge/Deployed-Live-success?style=for-the-badge&logo=vercel)](https://fap-nextgen-app.vercel.app)
[![Supabase](https://img.shields.io/badge/Backend-Supabase-green?style=for-the-badge&logo=supabase)](https://supabase.com)
[![React](https://img.shields.io/badge/Frontend-React%2018-blue?style=for-the-badge&logo=react)](https://react.dev)

---

## 🌟 Key Features

### 🔐 Enterprise-Grade Security
- **Supabase Authentication**: Secure email/password login with session persistence.
- **Row Level Security (RLS)**: Strict database policies ensuring students access only their own data.
- **Role-Based Access**: Distinctions between Student, Teacher, and Admin roles.

### 📱 Mobile-First & Offline-Ready
- **Smart Upload System**: 
  - **Desktop**: Direct high-speed uploads to Supabase Storage using signed URLs.
  - **Mobile**: Innovative **"Base64 Bypass"** technology that tunnels files through the database connection to overcome mobile network/carrier restrictions.
- **Responsive Design**: Fully optimized UI for field usage on tablets and smartphones.

### 🤖 AI Medical Coach
- **Real-time Feedback**: Integrated Gemini AI (via OpenRouter) analyzes student reflections.
- **Gibbs Reflective Cycle**: Structured guidance through Description, Feelings, Evaluation, Analysis, Conclusion, and Action Plan.
- **Contextual Tips**: Provides medical advice based on reflection content (e.g., vaccination schedules, hygiene practices).

### 👨‍👩‍👧‍👦 Comprehensive Family Health
- **Family Folder**: Digital version of the standard Family Adoption folder.
- **Socio-Economic Scales**: Auto-calculation of **BG Prasad (2024)** and **Udai Pareek** scales.
- **Health Tracking**: Longitudinal tracking of family members' health status, immunizations, and chronic conditions.

### 🏥 Community Diagnosis
- **Village Profiling**: 43-point comprehensive mapping of demographics, infrastructure, and health resources.
- **Interactive Dashboard**: Visualizing community health indicators and disease burden.

### 📚 Clinical Knowledge Base
- **8+ Clinical Guidelines**: Built-in reference for ANC, PNC, IMNCI, TB-DOTS, NCDs, and more.
- **Offline Access**: Critical guidelines available even without internet.

---

## 🛠️ Technology Stack

| Component | Technology | Description |
|-----------|------------|-------------|
| **Frontend** | React 18 + Vite | High-performance SPA architecture |
| **Styling** | Vanilla CSS + Framer Motion | Lightweight, smooth animations |
| **Backend** | Supabase (PostgreSQL) | Relational database with real-time capabilities |
| **Auth** | Supabase Auth | JWT-based secure authentication |
| **Storage** | Supabase Storage + Hybrid DB | Dual-strategy file management |
| **AI** | Google Gemini (via OpenRouter) | Natural language processing for education |
| **Hosting** | Vercel | Global edge network deployment |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Supabase Project (Free tier works)
- OpenRouter API Key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/hssling/FAP_Nextgen_App.git
   cd FAP_Nextgen_App
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment**
   Create a `.env` file in the root directory:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_OPENROUTER_API_KEY=your_openrouter_key
   ```

4. **Run Locally**
   ```bash
   npm run dev
   ```

---

## 📂 Project Structure

```bash
src/
├── components/     # Reusable UI (Cards, Forms, Layouts)
├── contexts/       # Global State (Auth, Theme)
├── data/           # Static Clinical Guidelines & Schemas
├── pages/          # Main Application Routes
│   ├── Dashboard.jsx      # Analytics & Overview
│   ├── Families.jsx       # Family Listing & Management
│   ├── FamilyDetails.jsx  # In-depth Family Record
│   ├── Reflections.jsx    # AI-Integrated Journaling
│   └── Community.jsx      # Village Profile Mapping
├── services/       # API Connectors (Supabase, AI)
└── utils/          # Helpers (Calculators, Formatters)
```

---

## 🩺 Clinical Resources Included

1.  **Antenatal Care (ANC)**: Guidelines for pregnancy visits and risk assessment.
2.  **Universal Immunization**: Interactive vaccination schedules.
3.  **NCD Screening**: Protocols for Hypertension, Diabetes, and Cancer screening.
4.  **IMNCI**: Integrated Management of Neonatal and Childhood Illnesses.
5.  **TB-DOTS**: Tuberculosis screening and treatment algorithms.
6.  **Family Planning**: Contraceptive method counseling guide.
7.  **Nutrition**: Dietary assessment and counseling.
8.  **Mental Health**: Screening for depression and anxiety.

---

## 👥 Authors & Contributors

**Dr. Siddalingaiah H S**
*Associate Professor, Dept. of Community Medicine*
*Sri Siddhartha Institute of Medical Sciences & Research Centre (SIMS & RC)*

Developed as a digital innovation for the Competency-Based Medical Education (CBME) curriculum in India.

---

## 📄 License

This project is open-source under the MIT License.
Designed for educational use in medical colleges.
