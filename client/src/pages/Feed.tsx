import { getCurrentUserIdFromToken } from "@/api/crypto"
import apiClient from "@/api/client"
import { subscribeToWebSocketEvents } from "@/api/websocket"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import AddConnectionDialog from "@/components/AddConnectionDialog"
import MyCodeDialog from "@/components/MyCodeDialog"
import { useAuth } from "@/context/AuthContext"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"

interface ConversationItem {
  id: number
  username: string
  connectedAt: string
}

interface ConnectionItemResponse {
  friend_id: number
  friend_username: string
  created_at: string
}

interface ConnectionsResponse {
  connections: ConnectionItemResponse[]
}

interface UserStatusResponseItem {
  user_id: number
  timestamp: string
}

interface UsersStatusResponse {
  users_status: Record<string, UserStatusResponseItem>
}

const sortConversations = (items: ConversationItem[]) => {
  return [...items].sort((a, b) => {
    const aTime = new Date(a.connectedAt).getTime()
    const bTime = new Date(b.connectedAt).getTime()

    if (Number.isNaN(aTime) || Number.isNaN(bTime) || aTime === bTime) {
      return a.username.localeCompare(b.username)
    }

    return bTime - aTime
  })
}

const getAvatarFallback = (username: string) => {
  const cleaned = username.trim()
  if (!cleaned) return "??"

  const parts = cleaned
    .split(/\s+/)
    .map((part) => part.replace(/[^a-zA-Z0-9]/g, ""))
    .filter(Boolean)

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  }

  const single = parts[0] ?? cleaned.replace(/[^a-zA-Z0-9]/g, "")
  return single.slice(0, 2).toUpperCase() || "??"
}

const Feed = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [conversations, setConversations] = useState<ConversationItem[]>([])
  const [conversationToDelete, setConversationToDelete] =
    useState<ConversationItem | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [onlineUserIds, setOnlineUserIds] = useState<Set<number>>(new Set())

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
      const response =
        await apiClient.get<ConnectionsResponse>("/api/connections")

      const ordered = response.data.connections
        .map((connection) => ({
          id: connection.friend_id,
          username: connection.friend_username,
          connectedAt: connection.created_at,
        }))

      const sorted = sortConversations(ordered)

      setConversations(sorted)
    } catch {
      setConversations([])
    } finally {
      setIsLoading(false)
    }
  }, [navigate, user])

  const loadOnlineStatuses = useCallback(async () => {
    try {
      const response =
        await apiClient.get<UsersStatusResponse>("/api/users/status")
      const usersStatus = response.data.users_status ?? {}
      const onlineIds = Object.values(usersStatus)
        .map((item) => item.user_id)
        .filter((id): id is number => Number.isInteger(id))

      setOnlineUserIds(new Set(onlineIds))
    } catch {
      // Ignore transient status fetch errors and keep current presence state.
    }
  }, [])

  const refreshFeedData = useCallback(async () => {
    await Promise.all([loadConversations(), loadOnlineStatuses()])
  }, [loadConversations, loadOnlineStatuses])

  useEffect(() => {
    void refreshFeedData()
  }, [refreshFeedData])

  useEffect(() => {
    const unsubscribe = subscribeToWebSocketEvents((payload) => {
      if (payload.type === "CONNECTIONS_UPDATED") {
        if (
          payload.action === "added" &&
          Number.isInteger(payload.friend_id) &&
          typeof payload.friend_username === "string" &&
          typeof payload.connected_at === "string"
        ) {
          const friendId = payload.friend_id as number
          const friendUsername = payload.friend_username
          const connectedAt = payload.connected_at

          setConversations((prev) => {
            const filtered = prev.filter((item) => item.id !== friendId)
            filtered.unshift({
              id: friendId,
              username: friendUsername,
              connectedAt,
            })
            return sortConversations(filtered)
          })
          return
        }

        if (payload.action === "removed" && Number.isInteger(payload.friend_id)) {
          setConversations((prev) =>
            prev.filter((item) => item.id !== (payload.friend_id as number))
          )
          setOnlineUserIds((prev) => {
            const next = new Set(prev)
            next.delete(payload.friend_id as number)
            return next
          })
          return
        }

        void refreshFeedData()
        return
      }

      if (payload.type === "PRESENCE_SNAPSHOT") {
        const ids = Array.isArray(payload.online_user_ids)
          ? payload.online_user_ids.filter((id): id is number =>
              Number.isInteger(id)
            )
          : []

        setOnlineUserIds(new Set(ids))
        return
      }

      if (
        payload.type === "PRESENCE_ONLINE" &&
        Number.isInteger(payload.user_id)
      ) {
        setOnlineUserIds((prev) => {
          const next = new Set(prev)
          next.add(payload.user_id as number)
          return next
        })
        return
      }

      if (
        payload.type === "PRESENCE_OFFLINE" &&
        Number.isInteger(payload.user_id)
      ) {
        setOnlineUserIds((prev) => {
          const next = new Set(prev)
          next.delete(payload.user_id as number)
          return next
        })
      }
    })

    return () => {
      unsubscribe()
    }
  }, [refreshFeedData])

  const filteredConversations = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return conversations

    return conversations.filter((item) =>
      item.username.toLowerCase().includes(query)
    )
  }, [conversations, search])

  const closeDeleteDialog = () => {
    if (isDeleting) return
    setConversationToDelete(null)
    setDeleteError(null)
  }

  const confirmDeleteConnection = async () => {
    if (!conversationToDelete || isDeleting) return

    setIsDeleting(true)
    setDeleteError(null)

    try {
      await apiClient.delete(`/api/connections/${conversationToDelete.id}`)
      setConversationToDelete(null)
      await refreshFeedData()
    } catch {
      setDeleteError("Could not delete connection")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-4 md:px-6 md:py-6">
      <Card className="bg-linear-to-b from-background to-muted/20">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-xl">Your Chats</CardTitle>
            <div className="flex items-center gap-2">
              <AddConnectionDialog
                onConnectionAdded={() => {
                  void refreshFeedData()
                }}
              />
              <MyCodeDialog />
            </div>
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
              {filteredConversations.map((item) => {
                const isOnline = onlineUserIds.has(item.id)

                return (
                  <li key={item.id}>
                    <Card
                      size="sm"
                      className="border transition-colors hover:bg-muted/40"
                    >
                      <CardContent className="flex items-center justify-between gap-3 py-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <Avatar>
                            <AvatarFallback>
                              {getAvatarFallback(item.username)}
                            </AvatarFallback>
                          </Avatar>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {item.username}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              <span className="inline-flex items-center gap-1">
                                <span
                                  className={`h-2 w-2 rounded-full ${
                                    isOnline
                                      ? "bg-emerald-500"
                                      : "bg-muted-foreground/40"
                                  }`}
                                />
                                {isOnline ? "Online" : "Offline"}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          <Button
                            asChild
                            type="button"
                            variant="outline"
                            size="sm"
                          >
                            <Link to={`/chat/${item.id}`}>Open chat</Link>
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              setDeleteError(null)
                              setConversationToDelete(item)
                            }}
                          >
                            Delete
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {conversationToDelete ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md bg-card">
            <CardHeader>
              <CardTitle className="text-xl">Delete connection?</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to remove {conversationToDelete.username}{" "}
                from your connections?
              </p>

              {deleteError ? (
                <p className="text-sm text-destructive">{deleteError}</p>
              ) : null}

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeDeleteDialog}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => {
                    void confirmDeleteConnection()
                  }}
                  disabled={isDeleting}
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  )
}

export default Feed
