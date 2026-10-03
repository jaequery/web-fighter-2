import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Web Fighter II",
  description: "A Street Fighter II–style arcade fighter in the browser. Ryu vs Ken.",
};

export const viewport: Viewport = {
  themeColor: "#07081a",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
