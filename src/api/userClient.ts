import axios from 'axios'

const userClient = axios.create({
  baseURL: import.meta.env.VITE_USER_URL ?? 'http://localhost:8081',
})

userClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export default userClient
