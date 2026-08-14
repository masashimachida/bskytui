import { useEffect } from 'react'

export interface StatusMessage {
  text: string
  error: boolean
  notice: boolean
}

export function useStatusMessage(
  onStatusChange: (message: StatusMessage | null) => void,
  status: string | undefined,
  error: string | undefined,
  notice = false,
) {
  useEffect(() => {
    const text = error ?? status
    onStatusChange(text ? { text, error: !!error, notice: !error && notice } : null)
    return () => onStatusChange(null)
  }, [status, error, notice, onStatusChange])
}
