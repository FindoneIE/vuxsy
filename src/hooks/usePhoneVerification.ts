import { useState } from 'react'

export function usePhoneVerification() {
  const [verified, setVerified] = useState(false)
  return { verified, setVerified }
}
