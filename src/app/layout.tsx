import "./globals.css";
import Header from "@/components/layout/Header";
import MobileSubheader from "@/components/layout/MobileSubheader";
import { AuthProvider } from "@/components/auth/AuthProvider";
import PageContainer from "@/components/layout/PageContainer";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <Header />
          <MobileSubheader />
          <PageContainer as="main">{children}</PageContainer>
        </AuthProvider>
      </body>
    </html>
  );
}