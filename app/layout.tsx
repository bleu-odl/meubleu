import type { Metadata } from "next";
import { Inter } from "next/font/google"; 
import "./globals.css";
import { Sidebar } from "../components/Sidebar";
import { Header } from "../components/Header";

const inter = Inter({ 
  subsets: ["latin"],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: "Finance SaaS",
  description: "Gestão financeira inteligente",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.className} antialiased bg-[#09090b] text-zinc-100`}>
        <div className="flex min-h-screen">
          
          <Sidebar />

          <main className="flex-1 flex flex-col md:ml-[240px] transition-all duration-300 ease-in-out">
            
            <Header />

            <div className="flex-1 overflow-x-hidden">
              {children}
            </div>
            
          </main>
          
        </div>
      </body>
    </html>
  );
}