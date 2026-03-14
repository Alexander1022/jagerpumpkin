import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { isAxiosError } from "axios"
import { useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import apiClient from "@/api/client"
import { useAuth } from "@/context/AuthContext"

interface LoginResponse {
  token: string
}

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fromPath =
    (location.state as { from?: { pathname?: string } } | null)?.from
      ?.pathname ?? "/feed"

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isSubmitting) return

    setError(null)
    setIsSubmitting(true)

    try {
      const response = await apiClient.post<LoginResponse>("/api/auth/login", {
        username: username.trim(),
        password,
      })

      await login(response.data.token)
      navigate(fromPath, { replace: true })
    } catch (error) {
      if (isAxiosError(error)) {
        const status = error.response?.status

        if (!error.response) {
          setError("Cannot reach server right now. Please try again later.")
        } else if (status === 401 || status === 400) {
          setError("Invalid credentials. Please try again.")
        } else if (status === 429) {
          setError("Too many login attempts. Please wait and try again.")
        } else if (status && status >= 500) {
          setError("Server error. Please try again later.")
        } else {
          setError("Login failed. Please try again.")
        }
      } else {
        setError("Login failed. Please try again.")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Welcome back</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="username">Username</FieldLabel>
                <Input
                  id="username"
                  type="text"
                  placeholder="ivan_ivanov"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  required
                />
              </Field>
              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </Field>
              {error ? (
                <FieldDescription className="text-center text-red-600">
                  {error}
                </FieldDescription>
              ) : null}
              <Field>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Logging in..." : "Login"}
                </Button>
                <FieldDescription className="text-center">
                  Don&apos;t have an account?{" "}
                  <Link to="/register">Sign up</Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
