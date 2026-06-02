import axios from "axios";

const configuredBaseURL = import.meta.env.VITE_API_BASE_URL?.trim();

const axiosInstance = axios.create({
  baseURL: configuredBaseURL || (import.meta.env.PROD ? "/api" : "http://localhost:5000/api"),
  withCredentials: true,
});

export default axiosInstance;
