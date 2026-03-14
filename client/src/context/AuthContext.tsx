import {
  clearAuthToken,
  hasAuthToken,
  setAuthToken,
} from "@/api/client"
import apiClient from "@/api/client"
import axios from "axios"
import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react"

interface User {
  username: string
}

interface AuthContextType {
  user: User | null
  login: (token: string) => Promise<void>
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchProfile = async () => {
    try {
      if (!hasAuthToken()) {
        setIsLoading(false)
        return
      }

      const response = await apiClient.get<User>("/api/auth/me")
      setUser(response.data)
    } catch (error) {
      console.error("Failed to fetch user profile:", error)

      if (axios.isAxiosError(error) && error.response?.status === 401) {
        logout()
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchProfile()
  }, [])

  const login = async (token: string) => {
    setAuthToken(token)
    await fetchProfile()
  }

  const logout = () => {
    setUser(null)
    clearAuthToken()
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {!isLoading && children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used within an AuthProvider")
  return context
}
