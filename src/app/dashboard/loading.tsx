import { LoadingSpinner } from '@/components/ui/loading-spinner'
import React from 'react'

function Loading() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner />
    </main>
  )
}

export default Loading