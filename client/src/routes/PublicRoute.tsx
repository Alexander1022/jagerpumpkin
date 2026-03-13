import { useAuth } from "@/context/AuthContext"
import { Outlet, Navigate } from "react-router-dom"

export const PublicRoute = () => {
  const { user } = useAuth()
  if (user) return <Navigate to="/feed" replace />
  return <Outlet />
}
