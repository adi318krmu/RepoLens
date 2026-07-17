import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authAPI } from "../services/api";
import Button from "../components/Button";
import { Mail, ShieldCheck, Lock, Eye, EyeOff, AlertTriangle, CheckCircle2, ArrowLeft, ArrowRight } from "lucide-react";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [step, setStep] = useState(1); // 1 = Request OTP, 2 = Verify OTP & Reset
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  // Request Reset OTP
  const handleRequestOTP = async (e) => {
    e.preventDefault();
    if (!email) {
      return setError("Please provide your email address");
    }

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const response = await authAPI.forgotPassword(email);
      setLoading(false);
      if (response.success) {
        setSuccess(response.message || "Reset OTP sent to your email");
        setTimeout(() => {
          setSuccess("");
          setStep(2);
        }, 1500);
      } else {
        setError(response.message || "Failed to send reset OTP");
      }
    } catch (err) {
      setLoading(false);
      setError(err.response?.data?.message || "User not found or connection error");
    }
  };

  // Reset password using OTP
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!otp || !newPassword || !confirmPassword) {
      return setError("All fields are required");
    }
    if (newPassword.length < 6) {
      return setError("Password must be at least 6 characters");
    }
    if (newPassword !== confirmPassword) {
      return setError("Passwords do not match");
    }

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const response = await authAPI.resetPassword(email, otp, newPassword);
      setLoading(false);
      if (response.success) {
        setSuccess(response.message || "Password reset successful!");
        setTimeout(() => {
          navigate("/login");
        }, 2000);
      } else {
        setError(response.message || "Password reset failed");
      }
    } catch (err) {
      setLoading(false);
      setError(err.response?.data?.message || "Invalid or expired OTP");
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
          <h2 className="text-xl font-bold text-white font-display">
            {step === 1 ? "Forgot Password" : "Reset Password"}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {step === 1
              ? "Recover your account credentials"
              : "Verify OTP and set your new password"}
          </p>
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

        {/* Step 1: Send OTP Form */}
        {step === 1 && (
          <form onSubmit={handleRequestOTP} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Email Address</label>
              <div className="relative flex items-center">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-900 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-300 placeholder-slate-650 placeholder-slate-600 rounded-lg text-sm transition-all focus:outline-none"
                />
              </div>
            </div>

            <Button type="submit" variant="primary" className="w-full py-2.5 cursor-pointer" isLoading={loading}>
              Send Reset Code
            </Button>
          </form>
        )}

        {/* Step 2: Verify OTP & Reset Password Form */}
        {step === 2 && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">Reset OTP</label>
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

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">New Password</label>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 pointer-events-none" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="w-full pl-9 pr-10 py-2.5 bg-slate-900 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-300 placeholder-slate-600 rounded-lg text-sm focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-slate-500 hover:text-slate-300 transition-colors focus:outline-none cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">Confirm New Password</label>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 pointer-events-none" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full pl-9 pr-10 py-2.5 bg-slate-900 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-300 placeholder-slate-600 rounded-lg text-sm focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <Button
                type="button"
                variant="secondary"
                className="w-1/3 py-2.5 cursor-pointer"
                onClick={() => {
                  setError("");
                  setSuccess("");
                  setStep(1);
                }}
              >
                <ArrowLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              <Button type="submit" variant="primary" className="w-2/3 py-2.5 cursor-pointer" isLoading={loading}>
                Reset Password
              </Button>
            </div>
          </form>
        )}

        {/* Link back to login */}
        <div className="text-center mt-6">
          <Link
            to="/login"
            className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold inline-flex items-center gap-1 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Log in
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
