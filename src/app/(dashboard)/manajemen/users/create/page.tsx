import { auth } from "@/app/auth";
import { redirect } from "next/navigation"
import CreateUserPage from "./HalamanAdd";

export default async function Dashboard() {
    const session = await auth()

    if (!session) redirect("/")
        
    return <CreateUserPage/>
}