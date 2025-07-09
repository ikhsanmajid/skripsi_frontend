import { auth } from "@/app/auth";
import { redirect } from "next/navigation";
import UserCreatePage from "./UserCreatePage";

export default async function HalamanTambahUser() {
    const data = await auth()

    if (data?.user.role !== "ADMIN") {
        redirect("/manajemen/users")
    }

    return <UserCreatePage />
}