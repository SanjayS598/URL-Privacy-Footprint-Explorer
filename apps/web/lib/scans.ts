// Utility functions for managing user's scan IDs in localStorage

const SCANS_KEY = 'privacy_explorer_scans'

export interface UserScan {
  id: string
  url: string
  createdAt: string
}

export const getScanIds = (): string[] => {
  if (typeof window === 'undefined') return []
  
  try {
    const scans = localStorage.getItem(SCANS_KEY)
    if (!scans) return []
    
    const parsed: UserScan[] = JSON.parse(scans)
    return parsed.map(s => s.id)
  } catch {
    return []
  }
}

export const getUserScans = (): UserScan[] => {
  if (typeof window === 'undefined') return []
  
  try {
    const scans = localStorage.getItem(SCANS_KEY)
    if (!scans) return []
    return JSON.parse(scans)
  } catch {
    return []
  }
}

export const addScan = (id: string, url: string): void => {
  if (typeof window === 'undefined') return
  
  try {
    const scans = getUserScans()
    
    // Check if already exists
    if (scans.some(s => s.id === id)) return
    
    scans.push({
      id,
      url,
      createdAt: new Date().toISOString()
    })
    
    localStorage.setItem(SCANS_KEY, JSON.stringify(scans))
  } catch (error) {
    console.error('Failed to save scan:', error)
  }
}

export const removeScan = (id: string): void => {
  if (typeof window === 'undefined') return
  
  try {
    const scans = getUserScans()
    const filtered = scans.filter(s => s.id !== id)
    localStorage.setItem(SCANS_KEY, JSON.stringify(filtered))
  } catch (error) {
    console.error('Failed to remove scan:', error)
  }
}

export const hasScan = (id: string): boolean => {
  return getScanIds().includes(id)
}

export const clearAllScans = (): void => {
  if (typeof window === 'undefined') return
  localStorage.removeItem(SCANS_KEY)
}
