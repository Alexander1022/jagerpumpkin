import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import apiClient from "@/api/client"
import { isAxiosError } from "axios"
import { toast } from "sonner"

interface SignupResponse {
  message: string
}

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const navigate = useNavigate()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isSubmitting) return

    setError(null)

    if (username.trim().length < 3) {
      setError("Username must be at least 3 characters long.")
      return
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.")
      return
    }

    if (password !== confirmPassword) {
      setError("Password and confirm password must match.")
      return
    }

    setIsSubmitting(true)

    try {
      await apiClient.post<SignupResponse>("/api/auth/signup", {
        username: username.trim(),
        password,
        public_key: "",
      })

      toast.success("Account created successfully. You can now log in.")
      navigate("/login", { replace: true })
    } catch (err) {
      if (isAxiosError(err)) {
        const status = err.response?.status
        const detailRaw = err.response?.data?.detail
        const detail = typeof detailRaw === "string" ? detailRaw : ""
        const nicknameTaken =
          status === 409 || /taken|exists|already/i.test(detail)

        if (!err.response) {
          setError("Cannot reach server right now. Please try again later.")
        } else if (nicknameTaken) {
          setError("This nickname is already taken. Please choose another one.")
        } else if (status && status >= 500) {
          setError("Server is currently unavailable. Please try again later.")
        } else if (detail) {
          setError(detail)
        } else {
          setError("Signup failed. Please try again.")
        }
      } else {
        setError("Signup failed. Please try again.")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Create your account</CardTitle>
          <CardDescription>
            We just need username and password to create your account.
          </CardDescription>
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
                <Field className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel htmlFor="password">Password</FieldLabel>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      required
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="confirm-password">
                      Confirm Password
                    </FieldLabel>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(event) =>
                        setConfirmPassword(event.target.value)
                      }
                      required
                    />
                  </Field>
                </Field>
                <FieldDescription>
                  Must be at least 8 characters long.
                </FieldDescription>
              </Field>
              {error ? (
                <FieldDescription className="text-center text-red-600">
                  {error}
                </FieldDescription>
              ) : null}
              <Field>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Creating account..." : "Create Account"}
                </Button>
                <FieldDescription className="text-center">
                  Already have an account? <Link to="/login">Sign in</Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
