import { useState, useCallback } from 'react'

interface Toast {
  id: string
  title?: string
  description?: string
  variant?: 'default' | 'destructive'
  duration?: number
}

interface ToastFunction {
  (props: Omit<Toast, 'id'>): void
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast: ToastFunction = useCallback((props) => {
    const id = Math.random().toString(36).substring(2, 9)
    const newToast = { ...props, id }
    
    setToasts(prev => [...prev, newToast])
    
    // Mostrar en consola (puedes reemplazar con tu librería de toast preferida)
    console.log(`Toast: ${props.title} - ${props.description}`)
    
    // Auto-remove después de duración especificada
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, props.duration || 5000)
  }, [])

  return { toast, toasts }
}