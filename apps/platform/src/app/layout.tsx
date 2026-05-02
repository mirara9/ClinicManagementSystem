import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "UsrahMedic Platform",
  description: "Clinic management platform foundation for UsrahMedic"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
