import axios, { AxiosError } from "axios"
import { getSession, signOut } from "next-auth/react"

const api = axios.create({
    baseURL: `${process.env.NEXT_PUBLIC_APIENDPOINT_URL!}/api/v1/`,
    headers: {
        "Content-Type": "application/json",
    },
    withCredentials: true,
})

// Interceptor untuk menambahkan token ke setiap request
api.interceptors.request.use(async (config) => {
    const session = await getSession()
    if (session?.user?.access_token) {
        config.headers.Authorization = `Bearer ${session.user.access_token}`
    }
    return config
},
    (error) => Promise.reject(error)
)


// [PERBAIKAN] Interceptor untuk menangani respons dari API
// Flag untuk mencegah redirect berulang kali jika beberapa API call gagal bersamaan
let isRedirecting = false;

api.interceptors.response.use(
    // Jika respons sukses (status 2xx), langsung kembalikan responsnya
    (response) => response,
    
    // Jika respons error, tangani di sini
    (error: AxiosError) => {
        // Cek apakah error berasal dari respons server dan statusnya 401
        if (error.response?.status === 401) {
            
            // Hanya proses jika belum ada proses redirect yang berjalan
            if (!isRedirecting) {
                isRedirecting = true; // Set flag untuk menandakan proses redirect dimulai

                // Tampilkan pesan di konsol untuk debugging
                console.error("Sesi berakhir atau token tidak valid. Mengarahkan ke halaman login...");

                // Lakukan sign out dari NextAuth untuk membersihkan session di sisi klien
                signOut({
                    redirect: false, // Jangan redirect otomatis dari NextAuth
                }).then(() => {
                    // Redirect manual ke halaman login dengan query parameter
                    window.location.href = '/login?code=session_expired';
                });
            }
        }
        
        // Kembalikan error agar bisa ditangani lebih lanjut jika perlu (misalnya di dalam komponen)
        return Promise.reject(error);
    }
);


export default api
