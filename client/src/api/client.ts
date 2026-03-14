import axios from "axios"

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
})

let authToken: string | null = null

export const setAuthToken = (token: string) => {
  authToken = token
}

export const clearAuthToken = () => {
  authToken = null
}

export const hasAuthToken = () => authToken !== null

apiClient.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`
  }
  return config
})

export default apiClient
