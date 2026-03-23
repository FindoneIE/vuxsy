import React from 'react'

export default async function RequestsCategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  return <div>Requests category: {category}</div>
}
