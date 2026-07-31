import React, { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, BarChart2, ShieldCheck, Cpu, Code2, FileText } from "lucide-react";
import Button from "../components/Button";

const LandingPage = () => {
  const [activeMock, setActiveMock] = useState("repo");

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15, delayChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease: "easeOut" } },
  };

  const features = [
    {
      icon: Cpu,
      title: "AI-Powered Analysis",
      description: "Uses advanced generative AI models to review your README, file structure, code files, and resume content.",
    },
    {
      icon: BarChart2,
      title: "Custom Scoring Engines",
      description: "Generates multi-dimensional quantitative scores on code documentation, best practices, style, and ATS metrics.",
    },
    {
      icon: ShieldCheck,
      title: "Career & Tech Gap Analysis",
      description: "Scans for missing configurations, CI/CD scripts, testing structures, security configurations, and key ATS keywords.",
    },
    {
      icon: Code2,
      title: "Double History Archives",
      description: "Access structured logs of your scanned repositories and resume profiles to monitor improvements and readiness.",
    },
  ];

  const steps = [
    {
      num: "01",
      title: "Submit URL or Profile",
      description: "Provide the public link to your project repository or upload your resume (PDF/Text) in seconds.",
    },
    {
      num: "02",
      title: "AI Analysis Sweep",
      description: "Our weighted evaluation models scan your materials against modern developer requirements and role target profiles.",
    },
    {
      num: "03",
      title: "Receive Grading Reports",
      description: "Get detailed compatibility scores, strengths, gaps, missing keywords, and actionable growth paths.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#0F172A] relative overflow-hidden flex flex-col text-slate-200">
      {/* Background Decorative Mesh Gradients */}
      <div className="absolute top-0 left-0 w-full h-[600px] bg-gradient-to-b from-indigo-500/10 via-purple-500/5 to-transparent pointer-events-none blur-3xl" />
      <div className="absolute top-[20%] right-[10%] w-[300px] h-[300px] bg-indigo-500/10 rounded-full pointer-events-none blur-3xl" />
      <div className="absolute top-[50%] left-[5%] w-[400px] h-[400px] bg-purple-500/10 rounded-full pointer-events-none blur-3xl animate-pulse" />

      {/* Header / Nav */}
      <nav className="relative z-10 max-w-7xl mx-auto w-full px-6 h-20 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-display font-bold text-xl text-white">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <span className="font-extrabold text-base">R</span>
          </div>
          <span className="font-display">RepoLens</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link to="/login" className="text-sm font-semibold hover:text-white transition-colors">
            Log In
          </Link>
          <Link to="/signup">
            <Button size="sm" variant="primary">
              Get Started
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 flex-1 max-w-7xl mx-auto w-full px-6 pt-16 pb-24 flex flex-col lg:flex-row items-center gap-16">
        {/* Hero Left */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex-1 text-center lg:text-left"
        >
          <motion.div
            variants={itemVariants}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/50 mb-6"
          >
            <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-ping animate-pulse" />
            <span className="text-xs text-slate-300 font-semibold">AI Repo & Resume Analyzers are Live</span>
          </motion.div>

          <motion.h1
            variants={itemVariants}
            className="text-4xl sm:text-5xl lg:text-6xl font-extrabold font-display leading-[1.15] text-white tracking-tight"
          >
            Grade GitHub Repos & <br />
            Resumes with{" "}
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              AI Power
            </span>
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="mt-6 text-base sm:text-lg text-slate-400 max-w-xl mx-auto lg:mx-0 leading-relaxed font-sans"
          >
            Get code quality ratings for GitHub projects and ATS scoring match ratings for resumes instantly. Boost your career portfolio and interview readiness with actionable, AI-driven guidance.
          </motion.p>

          <motion.div
            variants={itemVariants}
            className="mt-8 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4"
          >
            <Link to="/signup" className="w-full sm:w-auto">
              <Button variant="primary" size="lg" className="w-full" icon={<ArrowRight className="w-4 h-4" />}>
                Analyze Repository
              </Button>
            </Link>
            <Link to="/signup" className="w-full sm:w-auto">
              <Button variant="outline" size="lg" className="w-full" icon={<FileText className="w-4 h-4" />}>
                Analyze Resume
              </Button>
            </Link>
          </motion.div>
        </motion.div>

        {/* Hero Right: Mockup */}
        <motion.div
          initial={{ opacity: 0, x: 50, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className="flex-1 w-full relative group"
        >
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 opacity-20 blur-xl group-hover:opacity-30 transition duration-1000" />
          <div className="relative bg-[#1E293B] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            {/* Window bar */}
            <div className="h-10 bg-slate-900 border-b border-slate-800/80 px-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
              </div>
              <div className="flex bg-slate-950/80 rounded-lg p-0.5 border border-slate-800">
                <button
                  onClick={() => setActiveMock("repo")}
                  className={`px-3 py-1 rounded-md text-[10px] font-bold font-mono transition-all cursor-pointer ${
                    activeMock === "repo"
                      ? "bg-indigo-600 text-white shadow"
                      : "text-slate-500 hover:text-slate-350 hover:text-slate-300"
                  }`}
                >
                  github-analysis.json
                </button>
                <button
                  onClick={() => setActiveMock("resume")}
                  className={`px-3 py-1 rounded-md text-[10px] font-bold font-mono transition-all cursor-pointer ${
                    activeMock === "resume"
                      ? "bg-indigo-600 text-white shadow"
                      : "text-slate-500 hover:text-slate-350 hover:text-slate-300"
                  }`}
                >
                  resume-ats-grading.json
                </button>
              </div>
            </div>

            {/* Editor Terminal */}
            <AnimatePresence mode="wait">
              {activeMock === "repo" ? (
                <motion.div
                  key="repo-mock"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.2 }}
                  className="p-6 font-mono text-xs text-slate-400 space-y-3 leading-relaxed overflow-x-auto h-[240px]"
                >
                  <p className="text-slate-500"># Analysis request triggered for: facebook/react</p>
                  <p className="text-indigo-400">$ npx repolens-cli analyze facebook/react</p>
                  <p className="text-slate-300">✓ Repository contents downloaded successfully (523 files reviewed)</p>
                  <p className="text-slate-300">✓ Executing AI structural analyzer across 4 weighted components...</p>
                  <p className="text-emerald-400">✓ Score calculated: 8.9 / 10.0 (Status: Excellent)</p>
                  <div className="mt-4 border-t border-slate-850 pt-4 text-[11px] grid grid-cols-2 gap-2 text-slate-350 text-slate-300">
                    <div>Code Quality: <span className="text-indigo-400 font-bold">9.0</span></div>
                    <div>Readability: <span className="text-indigo-400 font-bold">8.5</span></div>
                    <div>Best Practices: <span className="text-indigo-400 font-bold">9.5</span></div>
                    <div>Documentation: <span className="text-indigo-400 font-bold">8.8</span></div>
                  </div>
                  <p className="text-yellow-400 pt-2 font-medium">Suggestions: Add automated code coverage badges to README</p>
                </motion.div>
              ) : (
                <motion.div
                  key="resume-mock"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.2 }}
                  className="p-6 font-mono text-xs text-slate-400 space-y-3 leading-relaxed overflow-x-auto h-[240px]"
                >
                  <p className="text-slate-500"># ATS matching request triggered for: resume.pdf</p>
                  <p className="text-indigo-400">$ npx repolens-cli match-resume --role "MERN Stack Developer"</p>
                  <p className="text-slate-300">✓ Extracted text profile successfully (1248 words read)</p>
                  <p className="text-slate-300">✓ Scanning alignment matching across target requirements...</p>
                  <p className="text-emerald-400">✓ ATS Score calculated: 82% (Status: Highly Eligible)</p>
                  <div className="mt-4 border-t border-slate-850 pt-4 text-[11px] grid grid-cols-2 gap-2 text-slate-355 text-slate-300">
                    <div>Verdict: <span className="text-indigo-400 font-bold">Shortlisted</span></div>
                    <div>Eligibility: <span className="text-indigo-400 font-bold">Highly Eligible</span></div>
                    <div>Strengths: <span className="text-indigo-400 font-bold">3 found</span></div>
                    <div>Weaknesses: <span className="text-indigo-400 font-bold">1 found</span></div>
                  </div>
                  <p className="text-yellow-400 pt-2 font-medium">Suggestions: Add TypeScript & Docker keywords explicitly to skills</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </main>

      {/* Features Section */}
      <section className="relative z-10 border-t border-slate-900 bg-[#0A0F1D]/80 py-24 px-6">
        <div className="max-w-7xl mx-auto w-full">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-extrabold text-white font-display">
              Built for Modern Software Engineering & Recruiting
            </h2>
            <p className="mt-4 text-slate-400">
              Stop guessing if your repositories look professional and your resume matches. RepoLens gives you comprehensive, structured insights automatically.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feat, idx) => {
              const IconComp = feat.icon;
              return (
                <div
                  key={idx}
                  className="bg-[#1E293B] border border-slate-800/80 rounded-xl p-6 hover:border-indigo-500/50 transition-all duration-300 group shadow-lg glow-card"
                >
                  <div className="w-12 h-12 rounded-lg bg-indigo-500/10 flex items-center justify-center mb-6 group-hover:bg-indigo-650 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <IconComp className="w-6 h-6 text-indigo-400 group-hover:text-white transition-colors" />
                  </div>
                  <h3 className="text-lg font-bold text-white font-display mb-2">{feat.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{feat.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works Section */}
      <section className="relative z-10 py-24 px-6 max-w-7xl mx-auto w-full">
        <div className="text-center max-w-2xl mx-auto mb-20">
          <h2 className="text-3xl font-extrabold text-white font-display">How RepoLens Evaluates</h2>
          <p className="mt-4 text-slate-400">Analyze any repository or resume file in seconds with our optimized three-step pipeline.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 relative">
          {steps.map((step, idx) => (
            <div key={idx} className="relative flex flex-col items-center text-center px-4">
              <div className="w-16 h-16 rounded-full bg-slate-900 border-2 border-slate-800 flex items-center justify-center font-display font-black text-xl text-indigo-400 mb-6 shadow-xl relative z-10">
                {step.num}
              </div>
              <h3 className="text-xl font-bold text-white mb-3 font-display">{step.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed max-w-xs">{step.description}</p>

              {idx < 2 && (
                <div className="hidden lg:block absolute top-8 left-[65%] w-full h-[2px] bg-gradient-to-r from-indigo-500/20 to-transparent pointer-events-none" />
              )}
            </div>
          ))}
        </div>
      </section>


      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-900 bg-[#080D1A] py-12 px-6 mt-auto">
        <div className="max-w-7xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 text-slate-400">
            <div className="w-6 h-6 rounded-md bg-indigo-600 flex items-center justify-center text-white text-xs font-bold font-display">R</div>
            <span className="font-display font-semibold text-sm">RepoLens</span>
            <span className="text-xs text-slate-600">© 2026. All rights reserved.</span>
          </div>

          <div className="flex items-center gap-6 text-xs text-slate-500">
            <a href="#" className="hover:text-slate-300">Privacy Policy</a>
            <a href="#" className="hover:text-slate-300">Terms of Service</a>
            <a href="#" className="hover:text-slate-305 hover:text-slate-300">Contact Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
