import axios from "axios"

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
})

const ACCESS_TOKEN_STORAGE_KEY = "access_token"
const REFRESH_TOKEN_STORAGE_KEY = "refresh_token"

const loadStoredToken = (key: string) => {
  if (typeof window === "undefined") return null

  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

let authToken: string | null = loadStoredToken(ACCESS_TOKEN_STORAGE_KEY)
let refreshToken: string | null = loadStoredToken(REFRESH_TOKEN_STORAGE_KEY)

interface RetryableRequestConfig {
  _retry?: boolean
  headers?: Record<string, string>
  url?: string
}

let refreshInFlight: Promise<string> | null = null

const isRefreshEndpoint = (url?: string) =>
  Boolean(url && url.includes("/api/auth/refresh"))

const requestNewAccessToken = async (): Promise<string> => {
  if (!refreshToken) {
    throw new Error("Missing refresh token")
  }

  if (!refreshInFlight) {
    refreshInFlight = axios
      .post(`${import.meta.env.VITE_API_URL}/api/auth/refresh`, {
        refresh_token: refreshToken,
      })
      .then((refreshResponse) => {
        const newAccessToken = refreshResponse.data.access_token as string
        const newRefreshToken =
          (refreshResponse.data.refresh_token as string | undefined) ??
          refreshToken ??
          undefined

        setAuthToken(newAccessToken, newRefreshToken)
        return newAccessToken
      })
      .finally(() => {
        refreshInFlight = null
      })
  }

  return refreshInFlight
}

export const setAuthToken = (token: string, refreshTokenValue?: string) => {
  authToken = token

  if (refreshTokenValue) {
    refreshToken = refreshTokenValue
  }

  if (typeof window !== "undefined") {
    window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token)

    if (refreshTokenValue) {
      window.localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshTokenValue)
    }
  }
}

export const clearAuthToken = () => {
  authToken = null
  refreshToken = null

  if (typeof window !== "undefined") {
    window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY)
    window.localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY)
  }
}

export const hasAuthToken = () => authToken !== null || refreshToken !== null

apiClient.interceptors.request.use(async (config) => {
  if (!authToken && refreshToken && !isRefreshEndpoint(config.url)) {
    try {
      await requestNewAccessToken()
    } catch {
      clearAuthToken()
    }
  }

  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status
    const detail = error.response?.data?.detail
    const originalRequest = error.config as RetryableRequestConfig | undefined

    if (!originalRequest) {
      return Promise.reject(error)
    }

    const isRefreshRequest = isRefreshEndpoint(originalRequest.url)
    const isInvalidAccessToken =
      detail === "Access token expired" ||
      detail === "Invalid token" ||
      detail === "Invalid token type"

    if (
      status === 401 &&
      isInvalidAccessToken &&
      !isRefreshRequest &&
      !originalRequest._retry &&
      refreshToken
    ) {
      originalRequest._retry = true

      try {
        const newAccessToken = await requestNewAccessToken()

        if (!originalRequest.headers) {
          originalRequest.headers = {}
        }
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`

        return apiClient(originalRequest)
      } catch (refreshError) {
        clearAuthToken()
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

export default apiClient
