import apiClient from "@/api/client"

const AES_KEY_STORAGE_KEY = "session_aes_key"
const CLIENT_PUBLIC_KEY_STORAGE_KEY = "client_public_key"
const CLIENT_PRIVATE_KEY_STORAGE_KEY = "client_private_key"
const ACCESS_TOKEN_STORAGE_KEY = "access_token"

export interface EncryptedMessageItem {
  message_id: number
  sender_id: number
  recipient_id: number
  encrypted_message: string
  encrypted_key: string
  iv: string
  created_at: string
}

interface MessageListResponse {
  messages: EncryptedMessageItem[]
}

const toBase64 = (input: ArrayBuffer | Uint8Array) => {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input)
  let binary = ""

  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i])
  }

  return window.btoa(binary)
}

const fromBase64 = (base64Value: string) => {
  const binary = window.atob(base64Value)
  const bytes = new Uint8Array(binary.length)

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }

  return bytes
}

const base64UrlToBase64 = (value: string) => {
  const padded = value.padEnd(value.length + ((4 - (value.length % 4)) % 4), "=")
  return padded.replace(/-/g, "+").replace(/_/g, "/")
}

const pemToSpki = (pem: string) => {
  const body = pem
    .replace("-----BEGIN PUBLIC KEY-----", "")
    .replace("-----END PUBLIC KEY-----", "")
    .replace(/\s+/g, "")

  return fromBase64(body).buffer
}

const pemToPkcs8 = (pem: string) => {
  const body = pem
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s+/g, "")

  return fromBase64(body).buffer
}

const toPem = (base64Value: string, label: "PUBLIC KEY" | "PRIVATE KEY") => {
  const chunked = base64Value.match(/.{1,64}/g)?.join("\n") ?? base64Value
  return `-----BEGIN ${label}-----\n${chunked}\n-----END ${label}-----`
}

const getOrCreateAesKey = () => {
  const existing = window.localStorage.getItem(AES_KEY_STORAGE_KEY)
  if (existing) {
    return fromBase64(existing)
  }

  const key = window.crypto.getRandomValues(new Uint8Array(32))
  window.localStorage.setItem(AES_KEY_STORAGE_KEY, toBase64(key))
  return key
}

const getServerPublicKey = async () => {
  const response = await apiClient.get<string>("/api/crypt/public_key")
  return response.data
}

const getStoredClientKeyPair = async () => {
  const publicKeyPem = window.localStorage.getItem(CLIENT_PUBLIC_KEY_STORAGE_KEY)
  const privateKeyPem = window.localStorage.getItem(CLIENT_PRIVATE_KEY_STORAGE_KEY)

  if (!publicKeyPem || !privateKeyPem) {
    return null
  }

  const publicKey = await window.crypto.subtle.importKey(
    "spki",
    pemToSpki(publicKeyPem),
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    true,
    ["encrypt"],
  )

  const privateKey = await window.crypto.subtle.importKey(
    "pkcs8",
    pemToPkcs8(privateKeyPem),
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    true,
    ["decrypt"],
  )

  return { publicKey, privateKey, publicKeyPem }
}

export const getOrCreateClientIdentity = async () => {
  const existingPair = await getStoredClientKeyPair()
  if (existingPair) {
    return existingPair
  }

  const generatedPair = await window.crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"],
  )

  const exportedPublic = await window.crypto.subtle.exportKey(
    "spki",
    generatedPair.publicKey,
  )
  const exportedPrivate = await window.crypto.subtle.exportKey(
    "pkcs8",
    generatedPair.privateKey,
  )

  const publicKeyPem = toPem(toBase64(exportedPublic), "PUBLIC KEY")
  const privateKeyPem = toPem(toBase64(exportedPrivate), "PRIVATE KEY")

  window.localStorage.setItem(CLIENT_PUBLIC_KEY_STORAGE_KEY, publicKeyPem)
  window.localStorage.setItem(CLIENT_PRIVATE_KEY_STORAGE_KEY, privateKeyPem)

  return {
    publicKey: generatedPair.publicKey,
    privateKey: generatedPair.privateKey,
    publicKeyPem,
  }
}

const getRecipientPublicKey = async (recipientId: number) => {
  const response = await apiClient.get<string>(`/api/crypt/public_key/${recipientId}`)
  return response.data
}

export const encryptMessageForRecipient = async (
  message: string,
  recipientPublicKeyPem: string,
) => {
  const textBytes = new TextEncoder().encode(message)
  const aesKey = await window.crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"],
  )

  const iv = window.crypto.getRandomValues(new Uint8Array(12))
  const encryptedMessage = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
    },
    aesKey,
    textBytes,
  )

  const rawAesKey = await window.crypto.subtle.exportKey("raw", aesKey)
  const recipientPublicKey = await window.crypto.subtle.importKey(
    "spki",
    pemToSpki(recipientPublicKeyPem),
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    false,
    ["encrypt"],
  )

  const encryptedAesKey = await window.crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    recipientPublicKey,
    rawAesKey,
  )

  return {
    encrypted_key: toBase64(encryptedAesKey),
    encrypted_message: toBase64(encryptedMessage),
    iv: toBase64(iv),
  }
}

export const decryptReceivedMessage = async (message: EncryptedMessageItem) => {
  const identity = await getStoredClientKeyPair()
  if (!identity) {
    throw new Error("Missing client private key")
  }

  const rawAesKey = await window.crypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    identity.privateKey,
    fromBase64(message.encrypted_key),
  )

  const aesKey = await window.crypto.subtle.importKey(
    "raw",
    rawAesKey,
    { name: "AES-GCM" },
    false,
    ["decrypt"],
  )

  const decrypted = await window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: fromBase64(message.iv),
    },
    aesKey,
    fromBase64(message.encrypted_message),
  )

  return new TextDecoder().decode(decrypted)
}

export const sendEncryptedMessage = async (recipientId: number, message: string) => {
  const recipientPublicKey = await getRecipientPublicKey(recipientId)
  const payload = await encryptMessageForRecipient(message, recipientPublicKey)

  return apiClient.post(`/api/cucumber/${recipientId}`, payload)
}

export const getCurrentUserIdFromToken = () => {
  const token = window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)
  if (!token) return null

  const parts = token.split(".")
  if (parts.length < 2) return null

  try {
    const payloadRaw = window.atob(base64UrlToBase64(parts[1]))
    const payload = JSON.parse(payloadRaw) as { sub?: string }
    const subValue = Number(payload.sub)

    if (!Number.isInteger(subValue) || subValue <= 0) return null
    return subValue
  } catch {
    return null
  }
}

export const getAllMessages = async () => {
  const response = await apiClient.get<MessageListResponse>("/api/cucumber/messages")
  return response.data.messages
}

export const exchangeSessionAesKey = async (clientId: string) => {
  const publicKeyPem = await getServerPublicKey()
  const importedPublicKey = await window.crypto.subtle.importKey(
    "spki",
    pemToSpki(publicKeyPem),
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    false,
    ["encrypt"]
  )

  const aesKey = getOrCreateAesKey()
  const encryptedKey = await window.crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    importedPublicKey,
    aesKey
  )

  await apiClient.post("/api/crypt/exchange_key", {
    client_id: clientId,
    encrypted_key: toBase64(encryptedKey),
  })
}
