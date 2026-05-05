// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest'
import { RemoveFolderModal } from './RemoveFolderModal'

const mockApi = {
  listUsbDevices: vi.fn().mockResolvedValue([]),
  getDeviceInfo: vi.fn().mockResolvedValue({ total: 32e9, free: 16e9, used: 16e9 }),
  getFilesystem: vi.fn().mockResolvedValue('exfat'),
  getSyncedItems: vi.fn().mockResolvedValue([]),
  analyzeDiff: vi.fn().mockResolvedValue({ success: true, items: [] }),
  estimateSize: vi.fn().mockResolvedValue({ trackCount: 0, totalBytes: 0, formatBreakdown: {} }),
  startSync2: vi.fn().mockResolvedValue({ success: true, tracksCopied: 10, tracksSkipped: 5, errors: [] }),
  removeItems: vi.fn().mockResolvedValue({ removed: 0, errors: [] }),
  cancelSync: vi.fn().mockResolvedValue({ cancelled: true }),
  onSyncProgress: vi.fn().mockReturnValue(() => {}),
  getDeviceSyncInfo: vi.fn().mockResolvedValue(null),
  selectFolder: vi.fn().mockResolvedValue('/mnt/usb'),
  saveSession: vi.fn().mockResolvedValue({ success: true }),
  loadSession: vi.fn().mockResolvedValue(null),
  clearSession: vi.fn().mockResolvedValue(undefined),
}
beforeAll(() => { Object.defineProperty(window, 'api', { value: mockApi, writable: true }) })
afterEach(() => { vi.resetAllMocks() })

const defaultProps = {
  name: 'My Music',
  path: '/mnt/my-music',
  onCancel: vi.fn(),
  onConfirm: vi.fn(),
}

describe('RemoveFolderModal', () => {
  // 1. checkbox "delete files" changes confirm button text
  it('changes confirm button text based on checkbox state', async () => {
    const user = userEvent.setup({ delay: null })
    render(<RemoveFolderModal {...defaultProps} />)
    // Initially shows "Remove folder"
    expect(screen.getByText('Remove folder')).toBeInTheDocument()
    // Check the checkbox
    const checkbox = screen.getByRole('checkbox')
    await user.click(checkbox)
    // Now shows "Remove and delete files"
    expect(screen.getByText('Remove and delete files')).toBeInTheDocument()
  })

  // 2. confirm without checkbox: onConfirm(false)
  it('calls onConfirm with false when confirmed without deleting files', async () => {
    const user = userEvent.setup({ delay: null })
    render(<RemoveFolderModal {...defaultProps} />)
    const confirmButton = screen.getByText('Remove folder')
    await user.click(confirmButton)
    expect(defaultProps.onConfirm).toHaveBeenCalledWith(false)
  })

  // 3. confirm with checkbox: onConfirm(true)
  it('calls onConfirm with true when confirmed with delete files option', async () => {
    const user = userEvent.setup({ delay: null })
    render(<RemoveFolderModal {...defaultProps} />)
    // Check the checkbox
    const checkbox = screen.getByRole('checkbox')
    await user.click(checkbox)
    // Click confirm
    const confirmButton = screen.getByText('Remove and delete files')
    await user.click(confirmButton)
    expect(defaultProps.onConfirm).toHaveBeenCalledWith(true)
  })
})
