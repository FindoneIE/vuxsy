import React from 'react'

export default function MarketplaceCategoryPage({ params }: { params: { category: string } }) {
  return <div>Marketplace category: {params.category}</div>
}
