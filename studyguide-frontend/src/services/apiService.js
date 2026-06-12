import axios, { API_URL } from '../api/axiosInstance'

// ─── Documents ──────────────────────────────────────────────────────────
export async function uploadDocument(file) {
  const form = new FormData()
  form.append('file', file)
  const { data } = await axios.post('/api/documents', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export async function listDocuments() {
  const { data } = await axios.get('/api/documents')
  return data
}

export async function getDocument(docId) {
  const { data } = await axios.get(`/api/documents/${docId}`)
  return data
}

export async function getTopics(docId) {
  const { data } = await axios.get(`/api/documents/${docId}/topics`)
  return data
}

export async function deleteDocument(docId) {
  await axios.delete(`/api/documents/${docId}`)
}

// ─── Topic meta ─────────────────────────────────────────────────────────
export async function getTopic(topicId) {
  const { data } = await axios.get(`/api/topics/${topicId}`)
  return data
}

// ─── Study tools ────────────────────────────────────────────────────────
export async function getSummary(topicId) {
  const { data } = await axios.get(`/api/topics/${topicId}/summary`)
  return data
}

export async function getFlashcards(topicId) {
  const { data } = await axios.get(`/api/topics/${topicId}/flashcards`)
  return data
}

export async function generateMoreFlashcards(topicId) {
  const { data } = await axios.post(`/api/topics/${topicId}/flashcards/more`)
  return data
}

export async function getQuiz(topicId) {
  const { data } = await axios.get(`/api/topics/${topicId}/quiz`)
  return data
}

export async function generateMoreQuiz(topicId) {
  const { data } = await axios.post(`/api/topics/${topicId}/quiz/more`)
  return data
}

export async function scoreQuiz(topicId, answers) {
  const { data } = await axios.post(`/api/topics/${topicId}/quiz/score`, { answers })
  return data
}

// ─── Streaming chat (fetch + ReadableStream, parses SSE) ─────────────────
// onEvent receives { type, ... } objects: 'sources' | 'token' | 'done' | 'error'
export async function streamChat(topicId, question, onEvent, signal) {
  const res = await fetch(`${API_URL}/api/topics/${topicId}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
    signal,
  })
  if (!res.ok || !res.body) {
    throw new Error(`Chat request failed (${res.status})`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const parts = buffer.split('\n\n')
    buffer = parts.pop() || ''
    for (const part of parts) {
      const line = part.trim()
      if (!line.startsWith('data:')) continue
      try {
        onEvent(JSON.parse(line.slice(5).trim()))
      } catch {
        /* ignore malformed frame */
      }
    }
  }
}
