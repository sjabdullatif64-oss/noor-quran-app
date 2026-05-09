import React from "react";
import { Link, useLocation } from "wouter";
import { Book, Bookmark, Compass, Home as HomeIcon, Moon, Navigation, Sun } from "lucide-react";
import { useTheme } from "./theme-provider";
import { Button } from "./ui/button";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { theme, setTheme } = useTheme();

  const isQibla = location === "/qibla";

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row bg-background">
      {/* Mobile top bar — hidden on qibla page (it has its own dark header) */}
      {!isQibla && (
        <div className="md:hidden flex items-center justify-between px-5 py-3 border-b border-border bg-card">
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
      )}

      {/* Desktop Sidebar */}
      <div className="hidden md:flex w-64 flex-col border-r border-border bg-card p-6 shrink-0">
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

        <nav className="flex flex-col gap-1 flex-1">
          <NavItem href="/" icon={<HomeIcon className="w-5 h-5" />} label="Home" active={location === "/"} />
          <NavItem href="/quran" icon={<Book className="w-5 h-5" />} label="Quran" active={location === "/quran" || location.startsWith("/quran/")} />
          <NavItem href="/prayer-times" icon={<Compass className="w-5 h-5" />} label="Prayer Times" active={location === "/prayer-times"} />
          <NavItem href="/qibla" icon={<Navigation className="w-5 h-5" />} label="Al Haram Direction" active={location === "/qibla"} />
          <NavItem href="/bookmarks" icon={<Bookmark className="w-5 h-5" />} label="Bookmarks" active={location === "/bookmarks"} />
        </nav>

        <div className="mt-auto text-xs text-muted-foreground">
          May peace be upon you.
        </div>
      </div>

      {/* Main content */}
      <main className={`flex-1 flex flex-col min-h-0 overflow-y-auto ${isQibla ? "bg-[#0a1628]" : ""}`}>
        <div className={isQibla ? "w-full" : "flex-1 w-full max-w-5xl mx-auto p-4 md:p-8"}>
          {children}
        </div>
      </main>

      {/* Mobile bottom navigation — 4 tabs as requested */}
      <div
        className={`md:hidden flex items-center justify-around px-2 py-2 border-t sticky bottom-0 z-20 ${
          isQibla
            ? "border-amber-900/40 bg-[#091529]"
            : "border-border bg-card"
        }`}
      >
        <MobileNavItem
          href="/"
          icon={<HomeIcon className="w-5 h-5" />}
          label="Home"
          active={location === "/"}
          qiblaTheme={isQibla}
        />
        <MobileNavItem
          href="/quran"
          icon={<Book className="w-5 h-5" />}
          label="Quran"
          active={location === "/quran" || location.startsWith("/quran/")}
          qiblaTheme={isQibla}
        />
        <MobileNavItem
          href="/prayer-times"
          icon={<Compass className="w-5 h-5" />}
          label="Prayers"
          active={location === "/prayer-times"}
          qiblaTheme={isQibla}
        />
        <MobileNavItem
          href="/qibla"
          icon={<Navigation className="w-5 h-5" />}
          label="Qibla"
          active={location === "/qibla"}
          qiblaTheme={isQibla}
        />
      </div>
    </div>
  );
}

function NavItem({
  href,
  icon,
  label,
  active,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-foreground hover:bg-muted"
      }`}
      data-testid={`link-nav-${label.toLowerCase().replace(/\s+/g, "-")}`}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}

function MobileNavItem({
  href,
  icon,
  label,
  active,
  qiblaTheme,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
  qiblaTheme: boolean;
}) {
  const activeClass = qiblaTheme ? "text-amber-400" : "text-primary";
  const inactiveClass = qiblaTheme
    ? "text-amber-900/60 hover:text-amber-500/80"
    : "text-muted-foreground hover:text-foreground";

  return (
    <Link
      href={href}
      className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl transition-all ${
        active ? activeClass : inactiveClass
      }`}
      data-testid={`link-mobilenav-${label.toLowerCase()}`}
    >
      {icon}
      <span className="text-[10px] font-medium">{label}</span>
    </Link>
  );
}
