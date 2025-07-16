/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react"

export const useDebounce = <T,>(value: T, delay: number): T => {
    const [debouncedValue, setDebouncedValue] = useState<T>(value)
    useEffect(() => {
        const handler = setTimeout(() => { setDebouncedValue(value) }, delay)
        return () => { clearTimeout(handler) }
    }, [value, delay])
    return debouncedValue
}

export const useDebounceFunc = <F extends (...args: any[]) => Promise<any>>(func: F, waitFor: number) => {
    let timeout: NodeJS.Timeout | null = null;
    return (...args: Parameters<F>): Promise<any> => {
        return new Promise(resolve => {
            if (timeout) clearTimeout(timeout);
            timeout = setTimeout(async () => resolve(await func(...args)), waitFor);
        });
    };
};