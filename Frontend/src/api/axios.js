import axios from "axios";

const axiosInstance = axios.create({
  // In production the frontend is served by the backend on the same origin,
  // so a relative path works. In dev, Vite runs on :5173 and the API is on :5000.
  baseURL: import.meta.env.PROD ? "/api" : "http://localhost:5000/api",
  withCredentials: true,
});

export default axiosInstance;