'use client'
import { usePathname } from 'next/navigation'

export function useActivePath() {
  const pathname = usePathname()
  
  const checkActivePath = (path: string) => {
    if (path === '/' && pathname !== '/dashboard') return false
    if (path === '/dashboard' && pathname === path) return true
    return path !== '/dashboard' && pathname.startsWith(path)
  }
  
  return checkActivePath
}
