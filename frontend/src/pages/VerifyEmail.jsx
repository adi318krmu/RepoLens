import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { authAPI } from "../services/api";
import Button from "../components/Button";
import { Mail, CheckCircle2, AlertTriangle, ArrowRight, ShieldCheck } from "lucide-react";

const VerifyEmail = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const emailParam = searchParams.get("email") || "";

  const [email, setEmail] = useState(emailParam);
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Resend OTP countdown state
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!email || !otp) {
      return setError("Email and 6-digit OTP code are required");
    }
    if (otp.length !== 6 || isNaN(Number(otp))) {
      return setError("OTP must be a 6-digit number");
    }

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const response = await authAPI.verifyEmail(email, otp);
      setLoading(false);
      if (response.success) {
        setSuccess(response.message || "Email verified successfully!");
        setTimeout(() => {
          navigate("/login");
        }, 2500);
      } else {
        setError(response.message || "Verification failed");
      }
    } catch (err) {
      setLoading(false);
      setError(err.response?.data?.message || "Invalid or expired OTP");
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    if (!email) {
      return setError("Please provide your email address to resend OTP");
    }

    setError("");
    setSuccess("");
    setCooldown(60);

    try {
      const response = await authAPI.resendOTP(email);
      if (response.success) {
        setSuccess("A new verification code has been sent to your email!");
      } else {
        setError(response.message || "Failed to resend code");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to resend verification code");
      setCooldown(0); // reset cooldown if request fails
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] relative flex items-center justify-center p-4">
      {/* Background blur */}
      <div className="absolute top-[20%] left-[20%] w-[300px] h-[300px] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[20%] right-[20%] w-[300px] h-[300px] bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-[#1E293B] border border-slate-800 rounded-2xl p-8 shadow-2xl relative z-10 glow-card">
        {/* Title */}
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex items-center gap-2 font-display font-bold text-2xl text-white mb-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white text-base font-extrabold shadow-md">
              <span>R</span>
            </div>
            <span className="font-display">RepoLens</span>
          </Link>
          <h2 className="text-xl font-bold text-white font-display">Verify your email</h2>
          <p className="text-xs text-slate-400 mt-1">Please enter the 6-digit OTP code sent to your email</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold rounded-lg flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Alert */}
        {success && (
          <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-lg flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">Email Address</label>
            <div className="relative flex items-center">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 pointer-events-none" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-9 pr-4 py-2.5 bg-slate-900 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-300 placeholder-slate-600 rounded-lg text-sm transition-all focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">6-Digit Code</label>
            <div className="relative flex items-center">
              <ShieldCheck className="w-4 h-4 text-slate-500 absolute left-3 pointer-events-none" />
              <input
                type="text"
                required
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Enter 6-digit OTP"
                className="w-full pl-9 pr-4 py-2.5 bg-slate-900 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-300 placeholder-slate-600 rounded-lg text-sm tracking-[4px] font-bold focus:outline-none"
              />
            </div>
          </div>

          <Button type="submit" variant="primary" className="w-full py-2.5 mt-2 cursor-pointer" isLoading={loading}>
            Verify Account
          </Button>
        </form>

        {/* Resend and Login Links */}
        <div className="flex flex-col items-center gap-4 mt-6">
          <button
            type="button"
            disabled={cooldown > 0}
            onClick={handleResend}
            className={`text-xs font-semibold focus:outline-none transition-colors ${
              cooldown > 0 ? "text-slate-500 cursor-not-allowed" : "text-indigo-400 hover:text-indigo-300 cursor-pointer"
            }`}
          >
            {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend Verification Code"}
          </button>

          <p className="text-xs text-slate-400">
            Back to{" "}
            <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-semibold inline-flex items-center gap-0.5">
              Log in <ArrowRight className="w-3 h-3" />
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
