import { useEffect } from 'react'
import type { ReactNode } from 'react'

type Props = {
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  width?: string
}

export default function Modal({ title, subtitle, onClose, children, footer, width = 'max-w-md' }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/75 p-4" onClick={onClose}>
      <div
        role="dialog"
        onClick={e => e.stopPropagation()}
        className={`flex max-h-[90dvh] w-full ${width} flex-col overflow-hidden rounded-xl bg-[#313338] text-gray-100 shadow-2xl`}
      >
        <div className="px-6 pb-2 pt-6 text-center">
          <h2 className="text-2xl font-bold text-white">{title}</h2>
          {subtitle && <p className="mt-2 text-sm text-gray-400">{subtitle}</p>}
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>
        {footer && <div className="flex items-center justify-end gap-3 bg-[#2b2d31] px-6 py-4">{footer}</div>}
      </div>
    </div>
  )
}