import apiClient from "@/api/client"

const AES_KEY_STORAGE_KEY = "session_aes_key"

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

const pemToSpki = (pem: string) => {
  const body = pem
    .replace("-----BEGIN PUBLIC KEY-----", "")
    .replace("-----END PUBLIC KEY-----", "")
    .replace(/\s+/g, "")

  return fromBase64(body).buffer
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
