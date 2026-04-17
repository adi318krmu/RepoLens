# 🚀 AI GitHub Analyzer

An intelligent backend system that analyzes GitHub repositories and provides **structured feedback, scoring, and improvement suggestions** using AI.

---

## 🧠 Problem Statement

Developers upload projects on GitHub but often lack **clear, actionable feedback** on:

* Code quality
* Project structure
* Best practices
* Interview readiness

Existing tools focus on metrics like stars or commits, but **do not evaluate code quality in depth**.

---

## 💡 Solution

AI GitHub Analyzer is a backend application that:

* Fetches repository data using GitHub API
* Uses AI to analyze README and project structure
* Applies a custom scoring system
* Stores analysis history for users

👉 It provides **quantitative + qualitative evaluation** of projects.

---

## ⚙️ Tech Stack

### Backend

* Node.js
* Express.js

### Database

* MongoDB
* Mongoose

### Authentication

* JWT (JSON Web Tokens)
* bcrypt (password hashing)

### APIs

* GitHub REST API
* AI Integration (Gemini / OpenAI - pluggable)

---

## 🚀 Features

### 🔐 Authentication

* User Signup & Login
* Secure password hashing with bcrypt
* JWT-based authentication

---

### 📊 Repository Analysis

* Accept GitHub repo URL
* Fetch:

  * README
  * File structure
  * Metadata

---

### 🤖 AI-Powered Insights

* Code quality evaluation
* Readability analysis
* Best practices detection

---

### 🧠 Scoring Engine (Core Feature)

Custom weighted scoring system:

* Code Quality → 40%
* Readability → 20%
* Best Practices → 20%
* Documentation → 20%

👉 Generates final score + status:

* Excellent
* Good
* Average
* Poor

---

### 📈 History Tracking

* Stores past analyses
* User-specific history
* Sorted by latest

---

### 🛡️ Security

* Password hashing (bcrypt)
* Protected routes using JWT
* Input validation
* Rate limiting

---

## 🧩 System Flow

1. User logs in
2. Sends GitHub repository URL
3. Backend fetches repo data (GitHub API)
4. AI analyzes content
5. Scoring engine calculates final score
6. Result stored in MongoDB
7. Response sent to user

---

## 📡 API Endpoints

### 🔐 Auth Routes

```
POST /auth/signup
POST /auth/login
GET /auth/profile
```

---

### 📊 Analysis Routes

```
POST /api/analyze
GET /api/analyze/history
```

---

## 🧪 Example Request

### Analyze Repository

```
POST /api/analyze
```

```json
{
  "repoUrl": "https://github.com/facebook/react"
}
```

---

## 📦 Example Response

```json
{
  "success": true,
  "score": 7.5,
  "status": "Good (Interview Ready)",
  "analysis": {
    "codeQuality": 7,
    "readability": 8,
    "bestPractices": 6,
    "documentation": 7
  }
}
```

---

## 🛠️ Installation & Setup

### 1. Clone the repo

```
git clone https://github.com/your-username/ai-github-analyzer.git
cd ai-github-analyzer
```

---

### 2. Install dependencies

```
npm install
```

---

### 3. Setup environment variables

Create `.env` file:

```
PORT=3000
MONGO_URI=your_mongodb_connection
JWT_SECRET=your_secret_key
GEMINI_API_KEY=your_api_key
```

---

### 4. Run the server

```
npm run dev
```

---

## 🌐 Deployment

* Deployed on Render
* MongoDB Atlas for database

---

## 🔥 Key Highlights

* Combines AI + custom scoring logic
* Not just an AI wrapper — includes evaluation system
* Modular backend architecture
* Scalable and production-ready design

---

## 🎯 Future Improvements

* Repository comparison feature
* Resume analysis integration
* Frontend dashboard (React)
* Advanced AI evaluation

---

## 👨‍💻 Author

**Aditya Singh**
Backend Developer

---

## ⭐ Contributing

Feel free to fork this repo and submit pull requests.

---

## 📜 License

This project is licensed under the MIT License.
