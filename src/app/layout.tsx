import "./globals.css";
import { AuthProvider } from "@/components/auth/AuthProvider";
import AppShell from "@/components/layout/AppShell";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { SavedListingsProvider } from "@/components/listings/SavedListingsProvider";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <ToastProvider>
            <SavedListingsProvider>
              <AppShell>{children}</AppShell>
            </SavedListingsProvider>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}