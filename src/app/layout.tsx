import 'bootstrap/dist/css/bootstrap.min.css';
import type { Metadata } from "next";
import NextAuthProvider from './NextAuthProvider';

export const metadata: Metadata = {
  title: "DoorLock Manager",
  description: "Aplikasi manajemen user door lock",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <NextAuthProvider>
          {children}
        </NextAuthProvider>
      </body>
    </html>
  );
}
