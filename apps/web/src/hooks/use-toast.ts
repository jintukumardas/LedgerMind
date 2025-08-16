import * as React from "react"

export interface Toast {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactElement
  variant?: "default" | "destructive"
}

type Toast_ = Omit<Toast, "id">

const toastState = {
  toasts: [] as Toast[],
  listeners: [] as Array<(toasts: Toast[]) => void>,
}

function addToast(toast: Toast) {
  toastState.toasts.push(toast)
  toastState.listeners.forEach(listener => listener([...toastState.toasts]))
  
  // Auto dismiss after 5 seconds
  setTimeout(() => {
    dismissToast(toast.id)
  }, 5000)
}

function dismissToast(id: string) {
  toastState.toasts = toastState.toasts.filter(t => t.id !== id)
  toastState.listeners.forEach(listener => listener([...toastState.toasts]))
}

function toast({ ...props }: Toast_) {
  const id = Math.random().toString()
  const newToast: Toast = { id, ...props }
  addToast(newToast)
  
  return {
    id,
    dismiss: () => dismissToast(id),
    update: (updates: Partial<Toast_>) => {
      const index = toastState.toasts.findIndex(t => t.id === id)
      if (index > -1) {
        toastState.toasts[index] = { ...toastState.toasts[index], ...updates }
        toastState.listeners.forEach(listener => listener([...toastState.toasts]))
      }
    },
  }
}

function useToast() {
  const [toasts, setToasts] = React.useState<Toast[]>([])
  
  React.useEffect(() => {
    const listener = (newToasts: Toast[]) => setToasts(newToasts)
    toastState.listeners.push(listener)
    
    return () => {
      const index = toastState.listeners.indexOf(listener)
      if (index > -1) {
        toastState.listeners.splice(index, 1)
      }
    }
  }, [])
  
  return {
    toasts,
    toast,
    dismiss: dismissToast,
  }
}

// Utility functions for common toast types
toast.success = (title: string, description?: string) => {
  return toast({ title, description, variant: "default" })
}

toast.error = (title: string, description?: string) => {
  return toast({ title, description, variant: "destructive" })
}

export { useToast, toast }