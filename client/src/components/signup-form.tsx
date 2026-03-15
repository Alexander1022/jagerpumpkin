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
import { getOrCreateClientIdentity } from "@/api/crypto"

interface SignupResponse {
  message: string
}

const PROHIBITED_ACTIVITIES = [
  "Promote, facilitate, or support illegal activities, including but not limited to terrorism, organized crime, fraud, or the distribution of illegal materials.",
  "Threaten, harass, or abuse individuals or groups, including content that promotes violence, harassment, intimidation, or discrimination.",
  "Encourage or facilitate harm, including the planning or coordination of violence or other dangerous activities.",
  "Contain malicious software or harmful code, including viruses, malware, or attempts to compromise systems or networks.",
  "Violate the privacy or rights of others, including unauthorized sharing of personal information or impersonation of another person.",
  "Exploit or harm minors, including any content involving abuse or exploitation.",
  "Interfere with or disrupt the operation of the service, including attempts to bypass security measures, overload infrastructure, or gain unauthorized access to accounts or data.",
]

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const navigate = useNavigate()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [acceptedTerms, setAcceptedTerms] = useState(false)
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

    if (!acceptedTerms) {
      setError("You must accept the Acceptable Use terms to create an account.")
      return
    }

    setIsSubmitting(true)

    try {
      const identity = await getOrCreateClientIdentity()

      await apiClient.post<SignupResponse>("/api/auth/signup", {
        username: username.trim(),
        password,
        public_key: identity.publicKeyPem,
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
              <Field>
                <FieldLabel>Terms and Conditions</FieldLabel>
                <div className="max-h-56 overflow-y-auto rounded-md border bg-muted/20 p-3 text-sm text-muted-foreground">
                  <p>
                    By using this service, you agree to use the platform only
                    for lawful purposes and in a manner that does not violate
                    the rights or safety of others. You agree that you will not
                    use the service to create, store, transmit, or distribute
                    content or messages that:
                  </p>
                  <ul className="mt-2 list-disc space-y-2 pl-5">
                    {PROHIBITED_ACTIVITIES.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  <p className="mt-3">
                    The service provider reserves the right to suspend or
                    terminate access to the platform for any user who violates
                    these terms or whose use of the service presents a risk to
                    other users, the public, or the integrity of the platform.
                  </p>
                  <p className="mt-2">
                    Users are solely responsible for the content they transmit
                    or store through the service and for ensuring their
                    activities comply with all applicable laws and regulations.
                  </p>
                </div>
              </Field>
              <Field orientation="horizontal" className="items-start gap-3">
                <Input
                  id="accept-terms"
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(event) => setAcceptedTerms(event.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0"
                />
                <FieldLabel htmlFor="accept-terms" className="font-normal">
                  I have read and agree to the Acceptable Use and Prohibited
                  Activities terms.
                </FieldLabel>
              </Field>
              {error ? (
                <FieldDescription className="text-center text-red-600">
                  {error}
                </FieldDescription>
              ) : null}
              <Field>
                <Button type="submit" disabled={isSubmitting || !acceptedTerms}>
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
