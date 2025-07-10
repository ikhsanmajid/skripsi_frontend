import { auth } from "@/app/auth";
import { redirect } from "next/navigation";
import UserLoginCreatePage from "./UserLoginCreatePage";

export default async function HalamanTambahUser() {
    const data = await auth()

    if (data?.user.role !== "ADMIN") {
        redirect("/manajemen/users-login")
    }

    return <UserLoginCreatePage />
}