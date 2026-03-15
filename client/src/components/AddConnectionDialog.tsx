import { useEffect, useState } from "react"
import axios from "axios"

import apiClient from "@/api/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

interface AddConnectionDialogProps {
  onConnectionAdded?: () => void | Promise<void>
}

const CONNECTION_ERROR_DETAILS = new Set([
  "User with this code not found",
  "Cannot connect to yourself",
  "Already connected",
])

export default function AddConnectionDialog({
  onConnectionAdded,
}: AddConnectionDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [code, setCode] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false)
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [isOpen])

  const resetState = () => {
    setCode("")
    setIsSubmitting(false)
    setErrorMessage(null)
    setSuccessMessage(null)
  }

  const handleClose = () => {
    setIsOpen(false)
    resetState()
  }

  const handleSubmit = async () => {
    const trimmed = code.trim()
    if (!trimmed || isSubmitting) return

    setIsSubmitting(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const payload: { connection_code: string } = {
        connection_code: trimmed,
      }

      await apiClient.post("/api/connections/add", payload)

      setSuccessMessage("Connection added")

      if (onConnectionAdded) {
        await onConnectionAdded()
      }

      setCode("")
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status
        const detail = error.response?.data?.detail

        if (
          typeof detail === "string" &&
          CONNECTION_ERROR_DETAILS.has(detail)
        ) {
          if (status) {
            setErrorMessage(`${detail}`)
          } else {
            setErrorMessage(detail)
          }
        } else if (typeof detail === "string" && detail.length > 0) {
          setErrorMessage(status ? `${detail}` : detail)
        } else if (status) {
          setErrorMessage(`Request failed with status ${status}`)
        } else {
          setErrorMessage("Could not add connection")
        }
      } else {
        setErrorMessage("Could not add connection")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => {
          setIsOpen(true)
        }}
      >
        Add Connection
      </Button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md bg-card">
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-xl">Add Connection</CardTitle>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleClose}
                >
                  Close
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Paste a friend&apos;s connection code to add them.
              </p>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  placeholder="Connection code"
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault()
                      void handleSubmit()
                    }
                  }}
                />

                <Button
                  type="button"
                  onClick={() => {
                    void handleSubmit()
                  }}
                  disabled={isSubmitting || !code.trim()}
                >
                  {isSubmitting ? "Adding..." : "Add"}
                </Button>
              </div>

              {errorMessage ? (
                <p className="text-sm text-destructive">{errorMessage}</p>
              ) : null}

              {successMessage ? (
                <p className="text-sm text-emerald-600 dark:text-emerald-400">
                  {successMessage}
                </p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </>
  )
}
