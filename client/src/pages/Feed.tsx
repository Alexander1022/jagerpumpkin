import { getAllMessages, getCurrentUserIdFromToken } from "@/api/crypto"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/context/AuthContext"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"

interface ConversationItem {
  id: number
  username: string
  lastMessageAt: string
  lastMessageId: number
  messageCount: number
}

const formatTimestamp = (value: string) => {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return "Unknown time"
  }

  return date.toLocaleString(undefined, { timeZone: "UTC" }) + " UTC"
}

const Feed = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [conversations, setConversations] = useState<ConversationItem[]>([])

  const loadConversations = useCallback(async () => {
    const currentUserId = getCurrentUserIdFromToken()

    if (!currentUserId || !user) {
      setConversations([])
      setIsLoading(false)
      navigate("/login", { replace: true })
      return
    }

    setIsLoading(true)

    try {
      const allMessages = await getAllMessages()
      const map = new Map<number, ConversationItem>()

      for (const message of allMessages) {
        const isSender = message.sender_id === currentUserId
        const isRecipient = message.recipient_id === currentUserId

        if (!isSender && !isRecipient) continue

        const otherUserId = isSender ? message.recipient_id : message.sender_id
        const otherUsername = isSender
          ? message.recipient_username
          : message.sender_username

        const existing = map.get(otherUserId)
        const nextTimestamp = new Date(message.created_at).getTime()
        const prevTimestamp = existing
          ? new Date(existing.lastMessageAt).getTime()
          : Number.NEGATIVE_INFINITY

        if (!existing) {
          map.set(otherUserId, {
            id: otherUserId,
            username: otherUsername,
            lastMessageAt: message.created_at,
            lastMessageId: message.message_id,
            messageCount: 1,
          })
          continue
        }

        const shouldReplace =
          (Number.isFinite(nextTimestamp) &&
            Number.isFinite(prevTimestamp) &&
            nextTimestamp >= prevTimestamp) ||
          (!Number.isFinite(prevTimestamp) && Number.isFinite(nextTimestamp)) ||
          (!Number.isFinite(nextTimestamp) &&
            !Number.isFinite(prevTimestamp) &&
            message.message_id > existing.lastMessageId)

        map.set(otherUserId, {
          ...existing,
          username: otherUsername,
          lastMessageAt: shouldReplace
            ? message.created_at
            : existing.lastMessageAt,
          lastMessageId: shouldReplace
            ? message.message_id
            : existing.lastMessageId,
          messageCount: existing.messageCount + 1,
        })
      }

      const ordered = [...map.values()].sort((a, b) => {
        const aTime = new Date(a.lastMessageAt).getTime()
        const bTime = new Date(b.lastMessageAt).getTime()

        if (Number.isNaN(aTime) || Number.isNaN(bTime) || aTime === bTime) {
          return b.lastMessageId - a.lastMessageId
        }

        return bTime - aTime
      })

      setConversations(ordered)
    } catch {
      setConversations([])
    } finally {
      setIsLoading(false)
    }
  }, [navigate, user])

  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  const filteredConversations = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return conversations

    return conversations.filter((item) =>
      item.username.toLowerCase().includes(query)
    )
  }, [conversations, search])

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-4 md:px-6 md:py-6">
      <Card className="bg-linear-to-b from-background to-muted/20">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-xl">Your Chats</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                loadConversations()
              }}
              disabled={isLoading}
            >
              {isLoading ? "Syncing..." : "Refresh"}
            </Button>
          </div>
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by username..."
            className="mt-2"
          />
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Loading conversations...
            </p>
          ) : filteredConversations.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No conversations yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {filteredConversations.map((item) => (
                <li key={item.id}>
                  <Link to={`/chat/${item.id}`} className="block">
                    <Card
                      size="sm"
                      className="border transition-colors hover:bg-muted/40"
                    >
                      <CardContent className="flex items-center justify-between gap-3 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {item.username}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.messageCount} messages · last activity{" "}
                            {formatTimestamp(item.lastMessageAt)}
                          </p>
                        </div>
                        <span className="shrink-0 text-xs font-medium text-primary">
                          Open chat
                        </span>
                      </CardContent>
                    </Card>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default Feed
