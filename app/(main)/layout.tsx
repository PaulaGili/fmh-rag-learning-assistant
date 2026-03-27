import { LanguageProvider } from "@/lib/LanguageContext";
import Navigation from "@/components/Navigation";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LanguageProvider>
      <div className="flex h-full flex-col">
        <Navigation />
        <main className="flex-1 overflow-hidden">{children}</main>
      </div>
    </LanguageProvider>
  );
}
