import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Jride App",
  description: "Production build with Tailwind configured correctly"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
