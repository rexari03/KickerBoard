import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppHeader } from "./app-header";
import "./globals.css";

export const metadata: Metadata = {
  title: "KickerBoard",
  description: "Smart scoreboard for foosball matches"
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="de">
      <body className="bg-[#f5f7f2] text-[#172018] antialiased">
        <AppHeader />
        {children}
      </body>
    </html>
  );
}
