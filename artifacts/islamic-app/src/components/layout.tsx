import React from "react";
import { Link, useLocation } from "wouter";
import { Book, Compass, Home as HomeIcon, Moon, Sun } from "lucide-react";
import { useTheme } from "./theme-provider";
import { Button } from "./ui/button";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { theme, setTheme } = useTheme();

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row bg-background">
      {/* Mobile Nav */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-border bg-card">
        <h1 className="text-xl font-bold font-serif text-primary">Noor</h1>
        <Button
          variant="ghost"
          size="icon"
          data-testid="button-theme-toggle-mobile"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </Button>
      </div>

      {/* Sidebar */}
      <div className="hidden md:flex w-64 flex-col border-r border-border bg-card p-6">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold font-serif text-primary">Noor</h1>
          <Button
            variant="ghost"
            size="icon"
            data-testid="button-theme-toggle-desktop"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </Button>
        </div>

        <nav className="flex flex-col gap-2 flex-1">
          <NavItem href="/" icon={<HomeIcon className="w-5 h-5" />} label="Home" active={location === "/"} />
          <NavItem href="/quran" icon={<Book className="w-5 h-5" />} label="Quran" active={location === "/quran" || location.startsWith("/quran/")} />
          <NavItem href="/prayer-times" icon={<Compass className="w-5 h-5" />} label="Prayer Times" active={location === "/prayer-times"} />
        </nav>
        
        <div className="mt-auto text-xs text-muted-foreground">
          May peace be upon you.
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-0 overflow-y-auto">
        <div className="flex-1 w-full max-w-5xl mx-auto p-4 md:p-8">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <div className="md:hidden flex items-center justify-around p-3 border-t border-border bg-card sticky bottom-0 z-10">
        <MobileNavItem href="/" icon={<HomeIcon className="w-6 h-6" />} active={location === "/"} />
        <MobileNavItem href="/quran" icon={<Book className="w-6 h-6" />} active={location === "/quran" || location.startsWith("/quran/")} />
        <MobileNavItem href="/prayer-times" icon={<Compass className="w-6 h-6" />} active={location === "/prayer-times"} />
      </div>
    </div>
  );
}

function NavItem({ href, icon, label, active }: { href: string; icon: React.ReactNode; label: string; active: boolean }) {
  return (
    <Link href={href} className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${active ? "bg-primary text-primary-foreground font-medium shadow-sm" : "text-foreground hover:bg-muted"}`} data-testid={`link-nav-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      {icon}
      <span>{label}</span>
    </Link>
  );
}

function MobileNavItem({ href, icon, active }: { href: string; icon: React.ReactNode; active: boolean }) {
  return (
    <Link href={href} className={`p-3 rounded-full transition-colors ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`} data-testid={`link-mobilenav`}>
      {icon}
    </Link>
  );
}