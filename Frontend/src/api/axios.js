import axios from "axios";

const axiosInstance = axios.create({
  baseURL: import.meta.env.PROD 
    ? "/api"
    : "http://localhost:4500/api",
  withCredentials: true,
});

export default axiosInstance;