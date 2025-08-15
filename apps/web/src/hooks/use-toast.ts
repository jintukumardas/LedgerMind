import * as React from "react"

export interface Toast {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactElement
  variant?: "default" | "destructive"
}

type Toast_ = Omit<Toast, "id">

function toast({ ...props }: Toast_) {
  console.log('Toast:', props.title, props.description)
  return {
    id: Math.random().toString(),
    dismiss: () => {},
    update: () => {},
  }
}

function useToast() {
  return {
    toasts: [],
    toast,
    dismiss: () => {},
  }
}

export { useToast, toast }