import { auth } from "@/app/auth";
import { redirect } from "next/navigation"
import RoomsPage from "./HalamanRooms";

export default async function Dashboard() {
    const session = await auth()

    if (!session) redirect("/")
        
    return <RoomsPage/>
}