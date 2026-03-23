import React from 'react'

export default function Modal({ children }: { children: React.ReactNode }) {
  return <div className="modal">{children}</div>
}
