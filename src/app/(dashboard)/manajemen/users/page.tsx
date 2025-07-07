import { auth } from "@/app/auth";
import { redirect } from "next/navigation"
import UsersPage from "./HalamanUsers";

export default async function Dashboard() {
    const session = await auth()

    if (!session) redirect("/")
        
    return <UsersPage/>
}