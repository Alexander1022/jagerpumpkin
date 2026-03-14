import { createBrowserRouter } from "react-router"
import { ProtectedRoute } from "./ProtectedRoute"
import { PublicRoute } from "./PublicRoute"
import RootLayout from "@/layouts/RootLayout"
import LandingPage from "@/pages/LandingPage"
import Register from "@/pages/Register"
import Login from "@/pages/Login"
import Feed from "@/pages/Feed"
import Cucumber from "@/pages/Cucumber"

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      {
        element: <PublicRoute />,
        children: [
          { path: "/", element: <LandingPage /> },
          { path: "login", element: <Login /> },
          { path: "register", element: <Register /> },
        ],
      },
      {
        element: <ProtectedRoute />,
        children: [
            { path: "feed", element: <Feed /> },
            { path: "chat/:id", element: <Cucumber /> }
        ]
      }
    ],
  },
])
