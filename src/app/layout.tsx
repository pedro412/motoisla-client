import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import type { ReactNode } from "react";

import { AppProviders } from "@/providers/app-providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "MotoIsla Client",
  description: "Frontend operativo para MotoIsla",
};

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  display: "swap",
  variable: "--font-roboto",
});

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="es">
      <body className={roboto.variable}>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
