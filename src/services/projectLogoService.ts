// Original: Muxy/Services/ProjectLogoStorage.swift (read path)
// Description: Service to load project logo data URLs with in-memory cache.
// Status: 🚧 In progress

const cache = new Map<string, string>()

export function getLogoDataUrl(logoFilename: string | null | undefined): string | null {
  if (!logoFilename) return null
  return cache.get(logoFilename) ?? null
}

export async function loadLogoDataUrl(logoFilename: string): Promise<string | null> {
  const cached = cache.get(logoFilename)
  if (cached) return cached

  const dataUrl = await window.electronAPI.readLogo(logoFilename)
  if (dataUrl) {
    cache.set(logoFilename, dataUrl)
  }
  return dataUrl
}

export function invalidateLogoCache(logoFilename: string | null | undefined): void {
  if (logoFilename) {
    cache.delete(logoFilename)
  }
}
