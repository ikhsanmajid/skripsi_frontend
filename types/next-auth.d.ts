import 'next-auth';
import 'next-auth/jwt';
import { DefaultJWT } from 'next-auth/jwt';

// Deklarasikan tipe untuk properti yang Anda tambahkan ke objek JWT
declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    id: number;
    username: string;
    role: string;
    is_active: boolean;
    access_token: string;
    expires_at: string;
  }
}

// Deklarasikan tipe untuk properti yang Anda tambahkan ke objek Session
declare module 'next-auth' {
  interface Session {
    user: {
      id: number;
      username: string;
      role: string;
      is_active: boolean;
      access_token: string;
      expires_at: string;
    } & DefaultSession['user']; // Gabungkan dengan tipe user default jika masih dibutuhkan
  }

  // Perluas juga tipe User untuk mencocokkan apa yang dikembalikan dari `authorize`
  interface User {
    id: string; // authorize mengembalikan string, jwt mengubahnya jadi number
    username: string;
    role: string;
    is_active?: boolean; // Jadikan opsional jika tidak selalu ada
    access_token: string;
    expires_at: string;
  }
}