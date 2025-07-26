import { fetcher } from "@/lib/fetcher"
import useSWR, { mutate } from "swr"
import { useEffect, useState } from "react"
import api from "@/lib/axios"

export const getServerTime = () => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { data, error, isLoading } = useSWR("/time", fetcher)

    return {
        time: data,
        isLoading,
        isError: error,
        refresh: () => mutate("/time")
    }
}

export const useRoom = () => {
    const { data, error, isLoading } = useSWR("/rooms/count", fetcher)

    return {
        data,
        isLoading,
        isError: error,
        refresh: () => mutate("/rooms/count")
    }
}

export const useUser = () => {
    const { data, error, isLoading } = useSWR("/users/count", fetcher)

    return {
        data,
        isLoading,
        isError: error,
        refresh: () => mutate("/users/count")
    }
}

export const useLastTenAccess = () => {
    const { data, error, isLoading } = useSWR("/access-log", fetcher)

    return {
        data,
        isLoading,
        isError: error,
        refresh: () => mutate("/access-log")
    }
}

export function useAccessLogImages(fileNames: string[]) {
    const [imageUrls, setImageUrls] = useState<Record<string, string | null>>({})

    useEffect(() => {
        fileNames.forEach(async (fileName) => {
            if (!fileName || imageUrls[fileName]) return

            try {
                const response = await api.get(`access-log/image/${fileName}`, {
                    responseType: "blob",
                })
                const url = URL.createObjectURL(response.data)
                setImageUrls((prev) => ({ ...prev, [fileName]: url }))
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            } catch (err) {
                console.error("Gagal mengambil gambar untuk", fileName)
                setImageUrls((prev) => ({ ...prev, [fileName]: null }))
            }
        })
    }, [fileNames, imageUrls])

    return imageUrls
}