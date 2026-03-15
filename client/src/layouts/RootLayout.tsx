import { Outlet, Link, useNavigate } from "react-router-dom"
import { ChevronDownIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-2 px-3 py-3 sm:gap-4 sm:px-6">
          <Link to="/" className="shrink-0 text-sm font-semibold tracking-wide sm:text-base">
            TaraTOR
          </Link>

          {!user ? (
            <div className="flex items-center gap-2">
              <Link
                to="/register"
                className="inline-flex h-8 items-center justify-center rounded-md border px-2.5 text-xs font-medium transition-colors hover:bg-muted sm:h-9 sm:px-3 sm:text-sm"
              >
                Sign Up
              </Link>
              <Link
                to="/login"
                className="inline-flex h-8 items-center justify-center rounded-md bg-foreground px-2.5 text-xs font-medium text-background transition-opacity hover:opacity-90 sm:h-9 sm:px-3 sm:text-sm"
              >
                Sign In
              </Link>
            </div>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="group h-9 min-w-0 max-w-44 px-3 sm:max-w-56"
                >
                  <span className="truncate">{user.username}</span>
                  <ChevronDownIcon
                    className="size-3 transition-transform group-data-[state=open]:rotate-180"
                    aria-hidden="true"
                  />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={handleLogout}>Logout</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </header>

      <main className="w-full px-3 py-3 sm:px-4">
        <Outlet />
      </main>
    </div>
  )
}
