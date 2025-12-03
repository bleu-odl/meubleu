import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "../components/Sidebar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Finance SaaS",
  description: "Controle financeiro simples",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <div className="flex min-h-screen bg-[#F8FAFC]"> {/* Fundo global levemente cinza */}
          
          <Sidebar />

          {/* MARGEM FIXA DE 240px (Tamanho da Sidebar) */}
          <main className="flex-1 md:ml-[240px] transition-all duration-300 ease-in-out">
            {children}
          </main>
          
        </div>
      </body>
    </html>
  );
}