import { auth } from "./auth"
import { redirect } from "next/navigation"

export default async function Home() {
  const session = await auth()

  if (session == null) {
    redirect(`/login?next=${encodeURIComponent("/")}`)
  } else {
    redirect("/home")
  }
}