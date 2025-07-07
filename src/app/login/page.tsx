import { auth } from "../auth";
import { redirect } from "next/navigation"
import LoginForm from "./LoginForm";

export default async function Login() {
    const session = await auth()

    if (session) redirect("/")
        
    return <LoginForm/>
}