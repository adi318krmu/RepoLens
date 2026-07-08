import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

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
