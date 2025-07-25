import React, { Suspense } from "react"
import LoginForm from "./LoginPage"

export default function Login() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginForm />
    </Suspense>
  )
}