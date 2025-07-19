import api from "@/lib/axios";

import { type Room } from "../../types/room";

export const fetchRooms = async (url: string): Promise<{ data: Room[]; total: number }> => {
    try {
        const { data } = await api.get(url)
        return {
            data: data.data,
            total: data.count,
        }
    } catch (error) {
        console.error("Gagal memuat ruangan:", error)
        throw error
    }
}

export const deleteRoom = async (roomId: number) => {
    const response = await api.delete(`/rooms/delete/${roomId}`)
    return response
}