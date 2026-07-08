# 🚀 RepoLens - AI-Powered GitHub Repository & Resume ATS Analyzer

RepoLens is a full-stack dashboard application that evaluates a developer's GitHub repositories and resume profiles using AI to identify code quality metrics, best practices gaps, interview readiness, and ATS keyword optimization.

RepoLens combines AI evaluation models with a custom weighted scoring engine, providing developers with actionable suggestions to make their portfolios production-ready and optimize their resumes for candidate selection.

---

## ⚙️ Core Technology Stack

RepoLens is designed with a modern decoupled stack:

### Frontend
- **Framework**: React.js (via Vite)
- **Styling**: Tailwind CSS & Lucide Icons
- **Animation**: Framer Motion
- **Chart Visualizations**: Custom SVG circular gauges and responsive CSS bar/trend trackers

### Backend
- **Server**: Node.js & Express.js
- **File Upload**: Multer (In-memory buffering)
- **Resume Parsing**: pdf2json (Buffer extraction)

### Database & Authentication
- **Database**: MongoDB & Mongoose (with JSON file-based database fallback when offline)
- **Authentication**: JSON Web Tokens (JWT) & bcrypt password hashing

### Artificial Intelligence Integration
- **Hugging Face Serverless Inference**: Primary engine for Resume ATS analysis (utilizing state-of-the-art chat models like `Qwen/Qwen2.5-72B-Instruct`)
- **Google Gemini Pro**: Primary engine for Repository code review and secondary fallback for resume analysis
- **Offline Fallback Engine**: Local NLP parser logic to output structured assessments if external AI networks are unreachable

---

## 💡 Key Features

### 🔐 1. Secure Authentication & Protected Sessions
- Complete signup, login, profile loading, and logout session handling.
- Secure, stateless JWT auth headers. Tokens are cached in local storage and automatically attached via Axios interceptors.
- bcrypt password encryption at the Mongoose database schema level.

### 📊 2. AI GitHub Repository Analyzer
- **Automatic Metadata Scraping**: Queries the GitHub API to fetch README files, file structures, and repo details.
- **Custom Scoring Engine**: Applies a weighted grading scheme across four core vectors:
  - Code Quality (40%)
  - Readability (20%)
  - Best Practices (20%)
  - Documentation (20%)
- **Actionable AI Feedback**: Pinpoints code issues, identifies strengths, and outputs practical recommendations.

### 📄 3. Intelligent Resume ATS Analyzer
- **Dual Submission Methods**: Upload raw PDF/text resume files or paste resume text directly.
- **ATS Compatibility Score**: Computes compatibility scores (0-100) aligned with target roles, companies, and requirements.
- **Keyword Gap Analysis**: Highlights matched keywords and outputs lists of high-impact missing ATS keywords.
- **Detailed Recruiter Insights**: Highlights strengths, weaknesses, overall selection verdicts, and concrete improvement steps.

### 📈 4. Dashboard & Scanning Histories
- Overall scan trend charts, average score track indicators, and repo performance lists.
- Separate record history archives for both GitHub repos and Resumes, enabling quick review loading.

---

## 🚦 Core API Endpoints

### Auth Endpoints (`/auth`)
- `POST /auth/signup` - Register a new account
- `POST /auth/login` - Verify password and retrieve JWT session token
- `GET /auth/profile` - Load authenticated user details (Protected)

### Repo Analysis Endpoints (`/api/analysis`)
- `POST /api/analysis` - Analyze a new public GitHub repository (Protected)
- `GET /api/analysis/history` - Retrieve repository scan history (Protected)
- `GET /api/analysis/:id` - Fetch details of a specific past repo scan (Protected)

### Resume Analyzer Endpoints (`/api/resume`)
- `POST /api/resume/analyze` - Process file uploads or raw text, run ATS check, and save reports (Protected)
- `GET /api/resume/history` - Retrieve resume scan history (Protected)
- `GET /api/resume/:id` - Fetch details of a specific past resume ATS report (Protected)

---

## 🛠️ Installation & Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/adi318krmu/RepoLens.git
cd RepoLens
```

### 2. Configure Environment Variables
Create a `.env` file in the `backend/` directory:
```env
PORT=3000
MONGODB_URL=your_mongodb_connection_uri
JWT_SECRET=your_jwt_signature_key
GEMINI_API_KEY=your_gemini_api_key
HF_TOKEN=your_huggingface_api_token
```

Create a `.env` file in the `frontend/` directory:
```env
VITE_API_BASE_URL=http://localhost:3000
```

### 3. Install Dependencies
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 4. Run Development Servers
```bash
# Run backend server
cd backend
npm run dev

# Run frontend client
cd ../frontend
npm run dev
```
Open `http://localhost:5173` in your browser to experience RepoLens.
