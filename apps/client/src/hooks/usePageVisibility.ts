import { useEffect, useState } from 'react'

/** `true` khi tab đang hiển thị (user đang “nhìn” trang). */
export function usePageVisibility(): boolean {
  const [visible, setVisible] = useState(
    () => typeof document !== 'undefined' && document.visibilityState === 'visible'
  )

  useEffect(() => {
    const onChange = () => setVisible(document.visibilityState === 'visible')
    document.addEventListener('visibilitychange', onChange)
    return () => document.removeEventListener('visibilitychange', onChange)
  }, [])

  return visible
}
