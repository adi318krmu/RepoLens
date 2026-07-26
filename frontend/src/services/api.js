import axios from "axios";

const getApiBaseUrl = () => {
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "[::1]" ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("10.") ||
      hostname.startsWith("172.")
    ) {
      return "http://localhost:3000";
    }
  }
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  return "https://repolens-backend-rgkk.onrender.com";
};

const API_BASE_URL = getApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor to attach JWT token to headers automatically
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const authAPI = {
  signup: async (name, email, password) => {
    const response = await api.post("/auth/signup", { name, email, password });
    return response.data;
  },
  login: async (email, password) => {
    const response = await api.post("/auth/login", { email, password });
    return response.data;
  },
  getProfile: async () => {
    const response = await api.get("/auth/profile");
    return response.data;
  },
  updateProfilePicture: async (profilePicture) => {
    const response = await api.put("/auth/profile/picture", { profilePicture });
    return response.data;
  },
  removeProfilePicture: async () => {
    const response = await api.delete("/auth/profile/picture");
    return response.data;
  },
  verifyEmail: async (email, otp) => {
    const response = await api.post("/auth/verify-email", { email, otp });
    return response.data;
  },
  resendOTP: async (email) => {
    const response = await api.post("/auth/resend-otp", { email });
    return response.data;
  },
  forgotPassword: async (email) => {
    const response = await api.post("/auth/forgot-password", { email });
    return response.data;
  },
  verifyResetOTP: async (email, otp) => {
    const response = await api.post("/auth/verify-reset-otp", { email, otp });
    return response.data;
  },
  resetPassword: async (email, otp, newPassword) => {
    const response = await api.post("/auth/reset-password", { email, otp, newPassword });
    return response.data;
  },
};

export const analysisAPI = {
  analyze: async (repoUrl) => {
    const response = await api.post("/api/analysis", { repoUrl });
    return response.data;
  },
  getHistory: async () => {
    const response = await api.get("/api/analysis/history");
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/api/analysis/${id}`);
    return response.data;
  },
};

export const resumeAPI = {
  analyze: async (formData) => {
    const isFormData = formData instanceof FormData;
    const response = await api.post("/api/resume/analyze", formData, {
      headers: {
        "Content-Type": isFormData ? "multipart/form-data" : "application/json",
      },
    });
    return response.data;
  },
  getHistory: async () => {
    const response = await api.get("/api/resume/history");
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/api/resume/${id}`);
    return response.data;
  },
};

export default api;
