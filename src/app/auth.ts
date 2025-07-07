import axios from "axios"
import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { CredentialsSignin } from "next-auth"

const apiURI = process.env.NEXT_PUBLIC_APIENDPOINT_URL!

class InvalidLoginError extends CredentialsSignin {
    code = "Username atau Password salah"
}

export const { handlers, signIn, signOut, auth } = NextAuth({
    session: {
        strategy: "jwt",
        maxAge: 60 * 60 * 2,
    },
    providers: [
        Credentials({
            credentials: {
                username: {},
                password: {}
            },
            authorize: async (credentials) => {

                const user = await axios.post(`${apiURI}/login`,
                    {
                        username: credentials?.username,
                        password: credentials?.password
                    }, {
                    headers: { "Content-Type": "application/json" },

                })

                //console.log("data axios", user)

                const isOk = (user.status == 200 && user.data.status == "success") ? true : false

                if (isOk) {
                    return {
                        id: user.data.user.id,
                        username: user.data.user.username,
                        role: user.data.user.role,
                        access_token: user.data.access_token
                    }
                }

                if (user.data.status == "error") {
                    throw new InvalidLoginError()
                }

                return null
            }
        })
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = Number(user.id!);
                token.access_token = user.access_token;
                token.username = user.username!;
                token.is_active = user.is_active!;
                token.role = user.role!;
            }

            return token
        },
        async session({ session, token }) {
            if (!token || !token.access_token) {
                throw new Error("Token Expired")
            }

            if (session.user) {
                session.user.access_token = String(token.access_token);
                session.user.id = token.id
                session.user.username = token.username;
                session.user.role = token.role;
                session.user.is_active = token.is_active;
            }

            return session
        },
        async redirect({ url, baseUrl }) {
            return url.startsWith(baseUrl) ? url : baseUrl + '/login';
        }
    },
    pages: {
        signIn: "/login"
    }
})