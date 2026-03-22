import { useEffect, useState } from 'react'
import { GradientMusicIcon } from './GradientMusicIcon'

interface AboutModalProps {
  onClose: () => void
}

export function AboutModal({ onClose }: AboutModalProps): JSX.Element {
  const [version, setVersion] = useState<string>('')
  const [reporting, setReporting] = useState(false)

  useEffect(() => {
    window.api.getVersion().then(setVersion).catch(() => {})
  }, [])

  const handleReportBug = async (): Promise<void> => {
    setReporting(true)
    try {
      await window.api.reportBug()
    } finally {
      setReporting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        data-testid="about-modal"
        className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <GradientMusicIcon className="w-8 h-8" />
          <div>
            <h2 className="text-lg font-semibold">JellyTunes</h2>
            {version && <p className="text-xs text-zinc-500">v{version}</p>}
          </div>
        </div>

        <p className="text-sm text-zinc-400 mb-6">
          Sync music from your Jellyfin server to portable devices.
        </p>

        <div className="space-y-2">
          <button
            data-testid="report-bug-button"
            onClick={handleReportBug}
            disabled={reporting}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 rounded-lg transition-colors"
          >
            {reporting ? 'Opening…' : 'Report a Bug'}
          </button>

          <a
            href="#"
            onClick={e => { e.preventDefault(); window.open('https://github.com/oriaflow-labs/jellytunes') }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            View on GitHub
          </a>
        </div>

        <button
          data-testid="about-close-button"
          onClick={onClose}
          className="mt-4 w-full px-4 py-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  )
}
