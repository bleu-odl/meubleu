import type { Metadata } from "next";
import { Inter } from "next/font/google"; // 1. Importando a fonte
import "./globals.css";
import { Sidebar } from "../components/Sidebar";

// 2. Configurando a fonte
const inter = Inter({ 
  subsets: ["latin"],
  weight: ['300', '400', '500', '600', '700'], // Carrega os pesos mais usados
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
      {/* 3. Aplicando a fonte no BODY */}
      <body className={`${inter.className} antialiased bg-[#1E1F2B] text-slate-100`}>
        <div className="flex min-h-screen">
          
          <Sidebar />

          <main className="flex-1 md:ml-[240px] transition-all duration-300 ease-in-out">
            {children}
          </main>
          
        </div>
      </body>
    </html>
  );
}