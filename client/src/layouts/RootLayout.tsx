import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu"
import { Outlet, Link, useNavigate } from "react-router-dom"

import { useAuth } from "../context/AuthContext"

export default function RootLayout() {
  const { user, logout, isLoading } = useAuth()
  const navigate = useNavigate()

  if (isLoading) return <div>Loading...</div>

  const handleLogout = () => {
    logout()
    navigate("/", { replace: true })
  }

  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-3 py-3 sm:px-6">
          <Link to="/" className="text-sm font-semibold tracking-wide">
            TaraTOR
          </Link>

          {!user ? (
            <div className="flex items-center gap-2">
              <Link
                to="/register"
                className="inline-flex h-9 items-center justify-center rounded-md border px-3 text-sm font-medium transition-colors hover:bg-muted"
              >
                Sign Up
              </Link>
              <Link
                to="/login"
                className="inline-flex h-9 items-center justify-center rounded-md bg-foreground px-3 text-sm font-medium text-background transition-opacity hover:opacity-90"
              >
                Sign In
              </Link>
            </div>
          ) : (
            <NavigationMenu viewport={false}>
              <NavigationMenuList>
                <NavigationMenuItem>
                  <NavigationMenuTrigger>{user.username}</NavigationMenuTrigger>
                  <NavigationMenuContent className="right-0 left-auto w-40">
                    <ul className="grid w-full gap-1 p-2">
                      <li>
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 rounded-lg p-2 text-left text-sm transition-all outline-none hover:bg-muted"
                          onClick={handleLogout}
                        >
                          Logout
                        </button>
                      </li>
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
          )}
        </div>
      </header>

      <main className="w-full px-3 py-3">
        <Outlet />
      </main>
    </div>
  )
}
