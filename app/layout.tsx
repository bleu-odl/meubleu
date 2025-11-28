import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "../components/Sidebar"; // Importamos nosso componente

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
        <div className="flex min-h-screen bg-gray-50">
          
          {/* A Sidebar fica fixa na esquerda (e se esconde no Login) */}
          <Sidebar />

          {/* O conteúdo principal (suas páginas) fica na direita */}
          {/* A margem esquerda (md:ml-64) cria o espaço para a barra não ficar por cima */}
          <main className="flex-1 md:ml-64">
            {children}
          </main>
          
        </div>
      </body>
    </html>
  );
}