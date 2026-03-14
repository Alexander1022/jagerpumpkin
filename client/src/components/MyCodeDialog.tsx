import { useEffect, useState } from "react"
import QRCode from "qrcode"

import apiClient from "@/api/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

interface ConnectionCodeResponse {
  connection_code: string
}

export default function MyCodeDialog() {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [code, setCode] = useState<string | null>(null)
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null)
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">(
    "idle"
  )

  useEffect(() => {
    if (!isOpen) return

    let cancelled = false

    const loadCode = async () => {
      const response = await apiClient.get<ConnectionCodeResponse>(
        "/api/connections/code"
      )
      const connectionCode = response.data.connection_code

      // Направих го SVG, защото TOR блокира canvas елементи заради fingerprint защита :)
      // Thanks, TOR
      const svgString = await QRCode.toString(connectionCode, {
        type: "svg",
        errorCorrectionLevel: "H",
        width: 256,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
      })

      const svgDataUrl = `data:image/svg+xml;base64,${btoa(svgString)}`

      if (!cancelled) {
        setCode(connectionCode)
        setQrImageUrl(svgDataUrl)
      }
    }

    void loadCode()

    return () => {
      cancelled = true
    }
  }, [isOpen])

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

  const handleCopy = async () => {
    if (!code) return

    try {
      await navigator.clipboard.writeText(code)
      setCopyState("copied")
    } catch {
      setCopyState("failed")
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="default"
        size="sm"
        onClick={() => {
          setIsOpen(true)
        }}
      >
        My Code
      </Button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md bg-card">
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-xl">My Code</CardTitle>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsOpen(false)
                  }}
                >
                  Close
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {isLoading ? (
                <p className="text-sm text-muted-foreground">
                  Loading your code...
                </p>
              ) : code ? (
                <>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Share this code or let a friend scan your QR code.
                    </p>
                    <Input value={code} readOnly />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleCopy}
                    >
                      {copyState === "copied"
                        ? "Copied"
                        : copyState === "failed"
                          ? "Copy failed"
                          : "Copy my code"}
                    </Button>
                  </div>

                  {qrImageUrl ? (
                    <div className="flex justify-center rounded-lg border bg-background p-3">
                      <img
                        src={qrImageUrl}
                        alt="QR code for your connection code"
                        className="h-64 w-64 rounded-sm bg-white p-1"
                        style={{ imageRendering: "pixelated" }}
                      />
                    </div>
                  ) : null}
                </>
              ) : (
                <p className="text-sm text-destructive">
                  Could not load your code right now. Please try again.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </>
  )
}
