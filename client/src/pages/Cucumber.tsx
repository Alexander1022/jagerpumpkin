import {
  decryptReceivedMessage,
  getAllMessages,
  getCurrentUserIdFromToken,
  sendEncryptedMessage,
} from "@/api/crypto"
import apiClient from "@/api/client"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"

interface DisplayMessage {
  message_id: number
  sender_id: number
  sender_username: string
  recipient_id: number
  recipient_username: string
  created_at: string
  plaintext: string
}

interface SentMessage {
  message_id: number
  sender_id: number
  sender_username: string
  recipient_id: number
  recipient_username: string
  created_at: string
  plaintext: string
}

interface ChatMessage {
  message_id: number
  sender_id: number
  sender_username: string
  recipient_id: number
  recipient_username: string
  created_at: string
  plaintext: string
  isOwn: boolean
}

interface SendMessageResponse {
  message_id: number
  sender_id: number
  recipient_id: number
  created_at: string
}

interface UserProfileResponse {
  user_id: number
  username: string
  created_at: string
}

interface MeResponse {
  user_id: number
  username: string
}

const formatTimestamp = (value: string) => {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString(undefined, { timeZone: "UTC" }) + " UTC"
}

const buildWebSocketUrl = (
  apiBaseUrl: string,
  userId: number,
  token: string
) => {
  let wsBase = apiBaseUrl.trim()

  if (wsBase.startsWith("https://")) {
    wsBase = `wss://${wsBase.slice("https://".length)}`
  } else if (wsBase.startsWith("http://")) {
    wsBase = `ws://${wsBase.slice("http://".length)}`
  }

  return `${wsBase}/api/websocket/${userId}?token=${encodeURIComponent(token)}`
}

export default function Cucumber() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [message, setMessage] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [messages, setMessages] = useState<DisplayMessage[]>([])
  const [sentMessages, setSentMessages] = useState<SentMessage[]>([])
  const [recipientUsername, setRecipientUsername] = useState<string | null>(
    null
  )
  const [isResolvingRecipient, setIsResolvingRecipient] = useState(true)

  const recipientId = Number(id)
  const canSend = Number.isInteger(recipientId) && recipientId > 0
  const currentUsername = user?.username ?? null
  const currentUserId = getCurrentUserIdFromToken()

  useEffect(() => {
    let cancelled = false

    const loadRecipientProfile = async () => {
      if (!canSend) {
        navigate("/feed", { replace: true })
        return
      }

      setRecipientUsername(null)
      setIsResolvingRecipient(true)

      try {
        const meResponse = await apiClient.get<MeResponse>("/api/auth/me")

        if (meResponse.data.user_id === recipientId) {
          if (!cancelled) {
            navigate("/feed", { replace: true })
          }
          return
        }

        const response = await apiClient.get<UserProfileResponse>(
          `/api/users/${recipientId}`
        )

        if (!cancelled) {
          setRecipientUsername(response.data.username)
        }
      } catch (error) {
        const status = (error as { response?: { status?: number } }).response
          ?.status

        if (!cancelled) {
          if (status === 404 || status === 422) {
            navigate("/feed", { replace: true })
          }
        }
      } finally {
        if (!cancelled) {
          setIsResolvingRecipient(false)
        }
      }
    }

    setSentMessages([])
    void loadRecipientProfile()

    return () => {
      cancelled = true
    }
  }, [canSend, navigate, recipientId])

  const loadMessages = useCallback(async () => {
    try {
      const all = await getAllMessages()

      if (currentUsername) {
        const received = all.filter(
          (item) =>
            item.recipient_username === currentUsername &&
            item.sender_id === recipientId
        )

        const decrypted = await Promise.all(
          received.map(async (item) => {
            try {
              const plaintext = await decryptReceivedMessage(item)
              return {
                message_id: item.message_id,
                sender_id: item.sender_id,
                sender_username: item.sender_username,
                recipient_id: item.recipient_id,
                recipient_username: item.recipient_username,
                created_at: item.created_at,
                plaintext,
                decryptOk: true,
              }
            } catch {
              return {
                message_id: item.message_id,
                sender_id: item.sender_id,
                sender_username: item.sender_username,
                recipient_id: item.recipient_id,
                recipient_username: item.recipient_username,
                created_at: item.created_at,
                plaintext: "[Unable to decrypt message]",
                decryptOk: false,
              }
            }
          })
        )

        setMessages(decrypted.map(({ decryptOk: _decryptOk, ...item }) => item))
      } else {
        setMessages([])
        setSentMessages([])
        navigate("/login", { replace: true })
      }
    } catch {
      setMessages([])
    }
  }, [currentUsername, navigate, recipientId])

  useEffect(() => {
    loadMessages()
  }, [loadMessages])

  useEffect(() => {
    if (!user || !currentUserId || !canSend) return

    let disposed = false
    let socket: WebSocket | null = null
    let reconnectTimer: number | null = null
    let reconnectAttempt = 0

    const clearReconnectTimer = () => {
      if (reconnectTimer !== null) {
        window.clearTimeout(reconnectTimer)
        reconnectTimer = null
      }
    }

    const scheduleReconnect = () => {
      if (disposed) return

      const delay = Math.min(1000 * 2 ** reconnectAttempt, 8000)
      reconnectAttempt += 1

      clearReconnectTimer()
      reconnectTimer = window.setTimeout(() => {
        void connect()
      }, delay)
    }

    const ensureAccessToken = async () => {
      try {
        await apiClient.get("/api/auth/me")
      } catch {}

      return window.localStorage.getItem("access_token")
    }

    const connect = async () => {
      if (disposed) return

      if (
        socket &&
        (socket.readyState === WebSocket.OPEN ||
          socket.readyState === WebSocket.CONNECTING)
      ) {
        return
      }

      const token = await ensureAccessToken()
      if (disposed) return

      if (!token) {
        scheduleReconnect()
        return
      }

      const wsUrl = buildWebSocketUrl(
        import.meta.env.VITE_API_URL,
        currentUserId,
        token
      )
      const ws = new WebSocket(wsUrl)
      socket = ws

      ws.onopen = () => {
        reconnectAttempt = 0
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as {
            type?: string
            sender_id?: number
          }

          if (
            data.type === "NEW_MESSAGE" &&
            Number(data.sender_id) === recipientId
          ) {
            void loadMessages()
          }
        } catch {}
      }

      ws.onerror = () => {
        ws.close()
      }

      ws.onclose = () => {
        if (disposed) return
        scheduleReconnect()
      }
    }

    void connect()

    return () => {
      disposed = true
      clearReconnectTimer()

      if (socket && socket.readyState !== WebSocket.CLOSED) {
        socket.close()
      }
    }
  }, [canSend, currentUserId, loadMessages, recipientId, user])

  const visibleMessages = useMemo<ChatMessage[]>(() => {
    const received = messages.map((item) => ({
      ...item,
      isOwn: false,
    }))

    const sent = sentMessages.map((item) => ({
      ...item,
      isOwn: true,
    }))

    return [...received, ...sent].sort((a, b) => {
      const timeA = new Date(a.created_at).getTime()
      const timeB = new Date(b.created_at).getTime()

      if (Number.isNaN(timeA) || Number.isNaN(timeB) || timeA === timeB) {
        return a.message_id - b.message_id
      }

      return timeA - timeB
    })
  }, [messages, sentMessages])

  const handleSend = async () => {
    if (
      !canSend ||
      !message.trim() ||
      isSending ||
      !currentUsername ||
      !recipientUsername
    ) {
      return
    }

    setIsSending(true)
    const rawMessage = message.trim()

    try {
      const response = await sendEncryptedMessage(recipientId, rawMessage)
      const payload = response.data as SendMessageResponse

      setSentMessages((prev) => [
        ...prev,
        {
          message_id: payload.message_id,
          sender_id: payload.sender_id,
          sender_username: currentUsername,
          recipient_id: payload.recipient_id,
          recipient_username: recipientUsername,
          created_at: payload.created_at,
          plaintext: rawMessage,
        },
      ])

      setMessage("")
      await loadMessages()
    } finally {
      setIsSending(false)
    }
  }

  if (isResolvingRecipient) {
    return (
      <div className="mx-auto flex h-[calc(100svh-7rem)] w-full max-w-3xl flex-col px-4 py-4 md:px-6 md:py-6">
        <Card className="h-full bg-linear-to-b from-background to-muted/20">
          <CardContent className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/25 border-t-primary" />
            <div>
              <p className="text-base font-medium">Opening secure chat...</p>
              <p className="text-sm text-muted-foreground">
                Tor may be slow, but it keeps your conversations private and secure.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto flex h-[calc(100svh-7rem)] w-full max-w-3xl flex-col px-4 py-4 md:px-6 md:py-6">
      <Card className="h-full bg-linear-to-b from-background to-muted/20">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-xl">
                {recipientUsername ? recipientUsername : "Encrypted Chat"}
              </CardTitle>
              <CardDescription>
                {recipientUsername
                  ? `End-to-end encrypted channel with ${recipientUsername}`
                  : `End-to-end encrypted channel with user ${id}`}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  navigate("/feed")
                }}
              >
                Back to feed
              </Button>
            </div>
          </div>
        </CardHeader>

        <Separator />

        <CardContent className="flex h-full min-h-0 flex-col gap-4 py-4">
          <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border bg-background/70 p-3">
            {visibleMessages.length === 0 ? (
              <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
                No messages yet.
              </div>
            ) : (
              <ul className="space-y-3">
                {visibleMessages.map((item) => (
                  <li
                    key={item.message_id}
                    className={
                      item.isOwn
                        ? "flex w-full justify-end"
                        : "flex w-full justify-start"
                    }
                  >
                    <div
                      className={
                        item.isOwn
                          ? "max-w-[85%] rounded-2xl rounded-br-sm border bg-primary px-3 py-2 text-sm text-primary-foreground shadow-xs"
                          : "max-w-[85%] rounded-2xl rounded-bl-sm border bg-muted px-3 py-2 text-sm shadow-xs"
                      }
                    >
                      <p
                        className={
                          item.isOwn
                            ? "mb-1 wrap-break-word text-primary-foreground"
                            : "mb-1 wrap-break-word text-foreground"
                        }
                      >
                        {item.plaintext}
                      </p>
                      <p
                        className={
                          item.isOwn
                            ? "text-[11px] text-primary-foreground/70"
                            : "text-[11px] text-muted-foreground"
                        }
                      >
                        {item.isOwn ? "you" : `from ${item.sender_username}`} at{" "}
                        {formatTimestamp(item.created_at)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-lg border bg-background/80 p-3">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Write an encrypted message..."
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault()
                    handleSend()
                  }
                }}
              />
              <Button
                type="button"
                onClick={handleSend}
                disabled={
                  !canSend || isSending || !message.trim() || !recipientUsername
                }
              >
                {isSending ? "Sending..." : "Send"}
              </Button>
            </div>
            {!canSend ? (
              <p className="mt-2 text-xs text-destructive">
                Invalid recipient id in route. Use /chat/&lt;userId&gt;.
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
