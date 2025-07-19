import { fetcher } from "@/lib/fetcher"
import useSWR, { mutate } from "swr"

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