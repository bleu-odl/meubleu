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
        <div className="flex min-h-screen bg-gray-50">
          
          {/* A Sidebar agora tem a classe 'peer' interna */}
          <Sidebar />

          {/* O Main reage ao hover da Sidebar */}
          <main className="flex-1 md:ml-20 peer-hover:md:ml-64 transition-all duration-300 ease-in-out">
            {children}
          </main>
          
        </div>
      </body>
    </html>
  );
}