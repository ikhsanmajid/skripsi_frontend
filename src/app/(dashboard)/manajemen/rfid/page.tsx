import { auth } from "@/app/auth";
import { redirect } from "next/navigation"
import RfidPage from "./HalamanRFID";

export default async function Dashboard() {
    const session = await auth()

    if (!session) redirect("/")
        
    return <RfidPage/>
}