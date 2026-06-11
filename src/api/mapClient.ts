import axios from 'axios'

const mapClient = axios.create({
  baseURL: import.meta.env.VITE_MAP_URL ?? 'http://localhost:8080',
})

mapClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export default mapClient
