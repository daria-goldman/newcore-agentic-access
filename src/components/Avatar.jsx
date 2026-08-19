import React from 'react'

// A stand in for the admin's own picture, so a sent request reads as coming from a person.
export default function Avatar({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true">
      <circle cx="14" cy="14" r="14" fill="#e6f4ff" />
      <circle cx="14" cy="11" r="4.6" fill="#1677ff" />
      <path d="M4.6 25.2c1.4-4.6 5-7 9.4-7s8 2.4 9.4 7A14 14 0 0 1 4.6 25.2Z" fill="#1677ff" />
    </svg>
  )
}
