import { useState, type ReactNode } from 'react'

import { Sheet } from './Sheet'

export type ConfirmRequest = {
  title: string
  message: ReactNode
  confirmLabel: string
  danger?: boolean
  action: () => Promise<unknown> | void
}

function ConfirmDialog({ request, onClose }: { request: ConfirmRequest | null; onClose: () => void }) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const close = () => {
    setError(null)
    onClose()
  }
  const confirm = async () => {
    if (!request) return
    setPending(true)
    setError(null)
    try {
      await request.action()
      close()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setPending(false)
    }
  }

  return (
    <Sheet open={request !== null} onClose={close} title={request?.title ?? ''}>
      {request && (
        <div className="stack">
          <p className="muted pre">{request.message}</p>
          {error && <p className="error">{error}</p>}
          <div className="actions row-end">
            <button className="ghost" onClick={close} disabled={pending} data-autofocus={request.danger || undefined}>
              Cancel
            </button>
            <button
              className={request.danger ? 'danger confirm-button' : 'primary'}
              onClick={confirm}
              disabled={pending}
              data-autofocus={!request.danger || undefined}
            >
              {pending ? 'Working…' : request.confirmLabel}
            </button>
          </div>
        </div>
      )}
    </Sheet>
  )
}

export function useConfirm() {
  const [request, setRequest] = useState<ConfirmRequest | null>(null)
  const dialog = <ConfirmDialog request={request} onClose={() => setRequest(null)} />
  return [dialog, setRequest] as const
}
