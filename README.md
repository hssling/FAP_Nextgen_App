# FAP NextGen 🏥

**Modern Web Application for MBBS Family Adoption Programme**

A comprehensive digital platform for medical students to manage their Family Adoption Programme (FAP) fieldwork, featuring health tracking, clinical guidelines, AI-assisted reflections, and community health planning.

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black)](https://vercel.com)
[![React](https://img.shields.io/badge/React-18-blue)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-7-purple)](https://vitejs.dev/)

---

## ✨ Features

### 📊 **Dashboard**
- Quick statistics overview
- Recent activity feed
- Smooth animations with Framer Motion

### 👨‍👩‍👧‍👦 **Family Management**
- Adopt and track multiple families
- Comprehensive member profiles
- Visit logging with dynamic forms
- Socio-economic data collection

### 🗺️ **Community Health Profile**
- **43-field comprehensive village mapping**
- Demographics (population breakdown by age/gender)
- Human Resources (ASHA, ANM, Anganwadi workers)
- Infrastructure (cold chain, immunization facilities)
- Annual Planning (vaccine requirements, FP commodities, IEC materials)
- Health Status (coverage indicators, disease burden)
- Organized in 6 tabbed sections

### 📚 **Clinical Resources**
- **8 comprehensive clinical guidelines**:
  1. Antenatal Care (ANC)
  2. Universal Immunization Schedule
  3. NCD Screening
  4. IMNCI (Sick Child Assessment)
  5. Family Planning Methods
  6. TB-DOTS Guidelines
  7. Mental Health
  8. Nutrition Guidelines
- Search and filter functionality
- Quick reference for fieldwork

### 📝 **Reflections with AI Coach**
- Journal entries with phase tracking
- AI-powered feedback on reflections
- Keyword-based analysis
- Family linkage

### 📄 **Reports & Analytics**
- Logbook generation
- Data export capabilities

---

## 🚀 Tech Stack

- **Frontend**: React 18
- **Routing**: React Router DOM
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Database**: IndexedDB (idb)
- **Build Tool**: Vite
- **Deployment**: Vercel

---

## 📦 Installation

### Prerequisites
- Node.js 16+ 
- npm or yarn

### Setup

```bash
# Clone the repository
git clone https://github.com/hssling/FAP_Nextgen_App.git

# Navigate to project directory
cd FAP_Nextgen_App

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173/`

---

## 🏗️ Project Structure

```
FAP_NextGen/
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── DynamicForm.jsx
│   │   ├── Layout.jsx
│   │   └── ErrorBoundary.jsx
│   ├── pages/            # Page components
│   │   ├── Dashboard.jsx
│   │   ├── Families.jsx
│   │   ├── FamilyDetails.jsx
│   │   ├── MemberDetails.jsx
│   │   ├── Community.jsx
│   │   ├── Reflections.jsx
│   │   ├── Resources.jsx
│   │   └── Reports.jsx
│   ├── contexts/         # React contexts
│   │   └── AuthContext.jsx
│   ├── services/         # Business logic
│   │   ├── db.js        # IndexedDB operations
│   │   └── analytics.js
│   ├── data/            # Static data
│   │   ├── forms/
│   │   │   └── registry.json  # Form schemas
│   │   └── resources/
│   │       └── clinical_guidelines.json
│   ├── App.jsx          # Main app component
│   ├── index.css        # Global styles
│   └── main.jsx         # Entry point
├── public/              # Static assets
├── .gitignore
├── package.json
├── vite.config.js
├── README.md
└── DEPLOYMENT_GUIDE.md
```

---

## 📱 Key Features in Detail

### Community Profile (Village Mapping)
Comprehensive 43-field data collection covering:
- **Demography**: Population distribution, pregnant women, lactating mothers
- **HR Mapping**: ASHA, ANM, Anganwadi workers
- **Infrastructure**: Cold chain facilities, vaccine storage
- **Services**: VHND frequency, FP methods, immunization sessions
- **Coverage**: ANC, institutional delivery, immunization percentages
- **Disease Burden**: High-risk areas, endemic diseases, NCD burden
- **Annual Planning**: Vaccine/FP requirements, IEC materials, action plans

### Clinical Resources
Evidence-based guidelines for:
- Maternal health (ANC, danger signs, birth preparedness)
- Child health (immunization, IMNCI, nutrition)
- NCDs (screening for HTN, diabetes, cancers)
- Communicable diseases (TB-DOTS)
- Mental health (depression, anxiety, suicide risk)
- Reproductive health (family planning methods)

### AI Coach (Reflections)
- Analyzes reflection content for keywords
- Provides context-aware feedback
- Covers topics: diet, trust, sanitation, hygiene, immunization, etc.
- Saves feedback with reflection for future reference

---

## 🎨 Design Philosophy

- **Modern UI**: Clean, professional interface with smooth animations
- **Responsive**: Works on desktop, tablet, and mobile
- **Offline-First**: IndexedDB for local data persistence
- **Evidence-Based**: Clinical guidelines aligned with WHO/MOHFW standards
- **Student-Centric**: Designed for ease of use during fieldwork

---

## 🔐 Authentication

Currently supports:
- **Student Role**: Full access to all features
- **Teacher Role**: Mentee dashboard (expandable)

Login credentials are stored in localStorage (upgrade to JWT recommended for production).

---

## 💾 Data Storage

All data is stored locally using **IndexedDB**:
- **families**: Family records
- **members**: Individual member data
- **visits**: Visit logs and assessments
- **villages**: Community profiles
- **reflections**: Journal entries

**Privacy**: No data leaves the user's browser.

---

## 🚀 Deployment

### Deploy to Vercel

1. **Push to GitHub**:
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/hssling/FAP_Nextgen_App.git
git push -u origin main
```

2. **Deploy via Vercel CLI**:
```bash
npm install -g vercel
vercel login
vercel --prod
```

Or connect your GitHub repo to Vercel Dashboard for automatic deployments.

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for detailed instructions.

---

## 📊 Statistics

- **Pages**: 10+
- **Components**: 15+
- **Form Schemas**: 10+
- **Clinical Guidelines**: 8 topics, 50+ sections, 200+ points
- **Village Profile Fields**: 43
- **Database Stores**: 5

---

## 🎓 Educational Value

Aligns with **CBME (Competency-Based Medical Education)** objectives:
- Clinical skills development
- Evidence-based practice
- Community diagnosis
- Health education
- Reflective practice
- Professional documentation

---

## 🛠️ Development

### Available Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Adding New Features

1. **New Page**: Create in `src/pages/`, add route in `App.jsx`
2. **New Form**: Add schema to `src/data/forms/registry.json`
3. **New Guideline**: Add to `src/data/resources/clinical_guidelines.json`
4. **New Component**: Create in `src/components/`

---

## 🐛 Known Issues & Limitations

- Authentication is basic (localStorage-based)
- No backend/server (all data local)
- No data sync across devices
- No multi-user collaboration

**Future Enhancements**:
- Backend API integration
- Cloud data sync
- Advanced analytics
- Multimedia support (images, videos)
- Offline PWA capabilities

---

## 📝 License

This project is developed for educational purposes as part of the MBBS curriculum.

---

## 👥 Contributors

- **Developer**: Dr Siddalingaiah H S
- **Institution**: SIMSRH Tumkur
- **Purpose**: MBBS Family Adoption Programme

---

## 📞 Support

For issues or questions:
- Create an issue on GitHub
- Contact: hssling@yahoo.com

---

## 🙏 Acknowledgments

- WHO Guidelines
- Ministry of Health and Family Welfare (MOHFW), India
- National Health Mission (NHM)
- Medical Council of India (MCI) / National Medical Commission (NMC)

---

## 📅 Version History

### v1.0.0 (December 2025)
- ✅ Complete family and member management
- ✅ Comprehensive community health profile (43 fields)
- ✅ Clinical resources (8 guidelines)
- ✅ AI-assisted reflections
- ✅ Smooth animations throughout
- ✅ Responsive design
- ✅ IndexedDB data persistence

---

**Built with ❤️ for medical students**

**Live Demo**: https://fap-nextgen-fr67iaxtl-hsslings-projects.vercel.app/

**GitHub**: https://github.com/hssling/FAP_Nextgen_App
