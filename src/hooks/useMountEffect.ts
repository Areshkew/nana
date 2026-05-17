// Original: N/A — project infrastructure hook
// Description: The one place useEffect is allowed, for true mount-time external sync only.
// Status: ✅ Completed

import { useEffect } from 'react'

export function useMountEffect(effect: () => void | (() => void)) {
  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(effect, [])
}
