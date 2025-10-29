import "./globals.css";

export const metadata = {
  title: "Prompt→Image Hub",
  description: "Multi‑AI image generator dashboard",
};

export default function RootLayout({ children }) {
  return (
    <html lang="bn">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
