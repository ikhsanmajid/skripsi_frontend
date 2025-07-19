import api from "@/lib/axios"

import { type User } from "../../types/user"

export const fetchUsers = async (url: string) => {
    try {
        const { data } = await api.get(url)
        return {
            data: data.data as User[],
            total: data.count,
        }
    } catch (error) {
        console.error("Gagal memuat User:", error)
        throw new Error("Gagal memuat data User.")
    }
}

export const deleteUser = async (id: number) => {
    const response = await api.delete(`/users/delete/${id}`);
    return response
}