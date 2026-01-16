"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

export function Toaster() {
  const { toasts } = useToast()
  const [container, setContainer] = useState<HTMLElement | null>(null)

  useEffect(() => {
    // Find or create the toast container
    let toastContainer = document.getElementById('toast-container')
    if (!toastContainer) {
      toastContainer = document.createElement('div')
      toastContainer.id = 'toast-container'
      toastContainer.className = 'fixed inset-0 pointer-events-none z-[99999] isolate'
      document.body.appendChild(toastContainer)
    }
    setContainer(toastContainer)
  }, [])

  const toasterContent = (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )

  // Use portal to render into dedicated toast container
  if (!container) {
    return null
  }

  return createPortal(toasterContent, container)
}
