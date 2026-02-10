import axios from "axios";

const axiosInstance = axios.create({
  baseURL: import.meta.env.PROD 
    ? "https://mediraksha-1-0.onrender.com/api"
    : "http://localhost:4500/api",
  withCredentials: true,
});

export default axiosInstance;