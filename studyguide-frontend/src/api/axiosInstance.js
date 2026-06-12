import axios from 'axios'

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const axiosInstance = axios.create({
  baseURL: API_URL,
})

export default axiosInstance
