import { auth } from "../../auth";
import { redirect } from "next/navigation"
import HalamanDashboard from "./HalamanDashboard";

export default async function Dashboard() {
    const session = await auth()

    if (!session) redirect("/")
        
    return <HalamanDashboard/>
}