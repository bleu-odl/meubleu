import type { Metadata } from "next";
import { Inter } from "next/font/google"; 
import "./globals.css";
import { Sidebar } from "../components/Sidebar";
import { Header } from "../components/Header"; // 1. IMPORTAR HEADER

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
      <body className={`${inter.className} antialiased bg-[#1E1F2B] text-slate-100`}>
        <div className="flex min-h-screen">
          
          <Sidebar />

          {/* 2. ESTRUTURA FLEXÍVEL PARA O CONTEÚDO PRINCIPAL */}
          <main className="flex-1 flex flex-col md:ml-[240px] transition-all duration-300 ease-in-out">
            
            {/* Header fixo no topo */}
            <Header />

            {/* Conteúdo da página rolando abaixo do header */}
            <div className="flex-1 overflow-x-hidden">
              {children}
            </div>
            
          </main>
          
        </div>
      </body>
    </html>
  );
}