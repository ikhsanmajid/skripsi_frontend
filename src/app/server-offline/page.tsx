import React, { Suspense } from "react"
import ServerOffline from "./ServerOfflinePage"

export default function Offline() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ServerOffline />
    </Suspense>
  )
}