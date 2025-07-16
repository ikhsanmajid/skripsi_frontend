import { NextResponse } from 'next/server'
import { auth } from "@/app/auth"
import axios, { AxiosError } from 'axios'

export default auth((req) => {
    if (!req.auth) {

        const loginUrl = new URL(`/login?next=${encodeURIComponent(req.nextUrl.pathname)}`, req.nextUrl.origin)

        return NextResponse.redirect(loginUrl)
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    axios.get(`${process.env.NEXT_PUBLIC_APIENDPOINT_URL! as string}`).then(res => {
        return NextResponse.next()
    }).catch(e => {
        if (e instanceof AxiosError) {
            const serverOffline = new URL(`/server-offline?next=${encodeURIComponent(req.nextUrl.pathname)}`, req.nextUrl.origin)
            return NextResponse.redirect(serverOffline)
        }
    })

    return NextResponse.next()
})

// Konfigurasi matcher tetap sama
export const config = {
    matcher: ["/manajemen/:path*", "/home", "/access-log"],
}