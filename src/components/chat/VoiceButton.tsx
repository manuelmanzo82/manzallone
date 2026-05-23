'use client'

import { useEffect, useRef, useState } from 'react'
import { Mic, Square } from 'lucide-react'
import { cn } from '@/lib/cn'

// Minimal Web Speech API typing — the browser-native interface isn't in lib.dom yet
interface SpeechRecognitionEvent {
  resultIndex: number
  results: ArrayLike<{
    isFinal: boolean
    0: { transcript: string }
  }>
}
interface SpeechRecognitionInstance {
  lang: string
  interimResults: boolean
  continuous: boolean
  onresult: ((e: SpeechRecognitionEvent) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}
type SpeechRecognitionCtor = new () => SpeechRecognitionInstance

interface Props {
  onTranscript: (text: string) => void
  disabled?: boolean
}

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export function VoiceButton({ onTranscript, disabled }: Props) {
  const [supported, setSupported] = useState(false)
  const [listening, setListening] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const transcriptRef = useRef('')

  useEffect(() => {
    setSupported(getRecognitionCtor() !== null)
  }, [])

  function start() {
    setError(null)
    const Ctor = getRecognitionCtor()
    if (!Ctor) {
      setError('Voce non supportata su questo browser')
      return
    }
    transcriptRef.current = ''
    const rec = new Ctor()
    rec.lang = 'it-IT'
    rec.interimResults = true
    rec.continuous = false
    rec.onresult = (event) => {
      let out = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        out += event.results[i][0].transcript
      }
      transcriptRef.current = out
    }
    rec.onerror = (e) => {
      const code = e.error
      const messages: Record<string, string> = {
        'not-allowed': 'Permesso microfono negato',
        'service-not-allowed': 'Permesso microfono negato',
        'no-speech': 'Non ho sentito nulla',
        network: 'Errore di rete',
      }
      setError(messages[code] ?? `Errore: ${code}`)
      setListening(false)
    }
    rec.onend = () => {
      setListening(false)
      const t = transcriptRef.current.trim()
      if (t) onTranscript(t)
    }
    recognitionRef.current = rec
    try {
      rec.start()
      setListening(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore avvio')
      setListening(false)
    }
  }

  function stop() {
    recognitionRef.current?.stop()
  }

  if (!supported) return null

  return (
    <div className="relative">
      <button
        type="button"
        onClick={listening ? stop : start}
        disabled={disabled}
        aria-label={listening ? 'Ferma registrazione voce' : 'Registra messaggio vocale'}
        className={cn(
          'inline-flex h-11 w-11 items-center justify-center rounded-full transition',
          listening
            ? 'animate-pulse bg-danger-500 text-white shadow-md'
            : 'bg-warm-100 text-warm-700 hover:bg-warm-200 dark:bg-warm-800 dark:text-warm-200 dark:hover:bg-warm-700',
          disabled && 'cursor-not-allowed opacity-50'
        )}
      >
        {listening ? <Square className="h-4 w-4" /> : <Mic className="h-5 w-5" />}
      </button>
      {error && (
        <div className="absolute bottom-full right-0 mb-2 whitespace-nowrap rounded-md bg-warm-900 px-2 py-1 text-xs text-white">
          {error}
        </div>
      )}
    </div>
  )
}
