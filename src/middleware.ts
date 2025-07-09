import { NextResponse } from 'next/server'
import { auth } from "@/app/auth"

export default auth((req) => {
    if (!req.auth) {

        const loginUrl = new URL(`/login?next=${encodeURIComponent(req.nextUrl.pathname)}`, req.nextUrl.origin)

        return NextResponse.redirect(loginUrl)
    }

    return NextResponse.next()
})

// Konfigurasi matcher tetap sama
export const config = {
    matcher: ["/manajemen/:path*", "/home"],
}