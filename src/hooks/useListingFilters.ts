import { useState } from 'react'

export function useListingFilters() {
  const [filters, setFilters] = useState({})
  return { filters, setFilters }
}
