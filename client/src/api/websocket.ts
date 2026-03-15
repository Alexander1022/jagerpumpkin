import apiClient from "@/api/client"

interface WebSocketPayload {
  type?: string
  sender_id?: number
}

type WebSocketListener = (payload: WebSocketPayload) => void

const ACCESS_TOKEN_STORAGE_KEY = "access_token"

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

class RealtimeWebSocketManager {
  private socket: WebSocket | null = null
  private reconnectTimer: number | null = null
  private reconnectAttempt = 0
  private shouldReconnect = false
  private userId: number | null = null
  private listeners = new Set<WebSocketListener>()

  subscribe(listener: WebSocketListener) {
    this.listeners.add(listener)

    return () => {
      this.listeners.delete(listener)
    }
  }

  start(userId: number) {
    if (!Number.isInteger(userId) || userId <= 0) {
      return
    }

    const isSameUser = this.userId === userId
    this.userId = userId
    this.shouldReconnect = true

    if (
      isSameUser &&
      this.socket &&
      (this.socket.readyState === WebSocket.OPEN ||
        this.socket.readyState === WebSocket.CONNECTING)
    ) {
      return
    }

    if (this.socket && this.socket.readyState !== WebSocket.CLOSED) {
      this.socket.close()
    }

    this.clearReconnectTimer()
    void this.connect()
  }

  stop() {
    this.shouldReconnect = false
    this.userId = null
    this.reconnectAttempt = 0
    this.clearReconnectTimer()

    if (this.socket && this.socket.readyState !== WebSocket.CLOSED) {
      this.socket.close()
    }

    this.socket = null
  }

  private clearReconnectTimer() {
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }

  private scheduleReconnect() {
    if (!this.shouldReconnect || !this.userId) {
      return
    }

    const delay = Math.min(1000 * 2 ** this.reconnectAttempt, 8000)
    this.reconnectAttempt += 1

    this.clearReconnectTimer()
    this.reconnectTimer = window.setTimeout(() => {
      void this.connect()
    }, delay)
  }

  private async ensureAccessToken() {
    try {
      await apiClient.get("/api/auth/me")
    } catch {}

    return window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)
  }

  private async connect() {
    if (!this.shouldReconnect || !this.userId) {
      return
    }

    if (
      this.socket &&
      (this.socket.readyState === WebSocket.OPEN ||
        this.socket.readyState === WebSocket.CONNECTING)
    ) {
      return
    }

    const token = await this.ensureAccessToken()

    if (!this.shouldReconnect || !this.userId) {
      return
    }

    if (!token) {
      this.scheduleReconnect()
      return
    }

    const wsUrl = buildWebSocketUrl(import.meta.env.VITE_API_URL, this.userId, token)
    const ws = new WebSocket(wsUrl)
    this.socket = ws

    ws.onopen = () => {
      this.reconnectAttempt = 0
    }

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as WebSocketPayload

        this.listeners.forEach((listener) => {
          listener(payload)
        })
      } catch {}
    }

    ws.onerror = () => {
      ws.close()
    }

    ws.onclose = () => {
      if (!this.shouldReconnect) {
        return
      }

      this.scheduleReconnect()
    }
  }
}

const manager = new RealtimeWebSocketManager()

export const startWebSocketConnection = (userId: number) => {
  manager.start(userId)
}

export const stopWebSocketConnection = () => {
  manager.stop()
}

export const subscribeToWebSocketEvents = (listener: WebSocketListener) => {
  return manager.subscribe(listener)
}
