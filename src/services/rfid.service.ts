import api from "@/lib/axios";
import { type Rfid } from "../../types/rfid";

export const fetchRfids = async (url: string) => {
    try {
        const { data } = await api.get(url)
        return {
            data: data.data as Rfid[],
            total: data.count,
        }
    } catch (error) {
        console.error("Gagal memuat RFID:", error)
        throw new Error("Gagal memuat data RFID.")
    }
}

export const deleteRfid = async (id: number) => {
    const response = await api.delete(`/rfid/delete/${id}`)
    return response
}