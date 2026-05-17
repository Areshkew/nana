// Original: Native macOS traffic light buttons (system-provided)
// Description: Platform-adaptive window controls — routes to macOS traffic lights or Windows/Linux caption buttons.
// Status: ✅ Completed

import { useState } from 'react'
import { useMountEffect } from '../hooks/useMountEffect'
import { MacTrafficLights } from './MacTrafficLights'
import { WinCaptionButtons } from './WinCaptionButtons'

export function WindowControls(): JSX.Element {
  const [platform, setPlatform] = useState<string>('win32')

  useMountEffect(() => {
    void window.electronAPI.platform().then(setPlatform)
  })

  if (platform === 'darwin') {
    return <MacTrafficLights />
  }

  return <WinCaptionButtons />
}
