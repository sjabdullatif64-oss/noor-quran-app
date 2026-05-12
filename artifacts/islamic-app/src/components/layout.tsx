import React from "react";
import { Link, useLocation } from "wouter";
import {
  Book, Bookmark, Compass, Home as HomeIcon,
  Moon, Navigation, Sun, MoreHorizontal, Heart, Hash, Gift, Download, Settings, Bell,
} from "lucide-react";
import { useTheme } from "./theme-provider";
import { Button } from "./ui/button";
import { useI18n } from "@/lib/i18n-context";

const MORE_PATHS = ["/more", "/qibla", "/favorites", "/tasbeeh", "/settings", "/islamic-gifts", "/downloads", "/notifications", "/about", "/privacy-policy", "/updates", "/writing", "/islamic-calendar"];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { theme, setTheme } = useTheme();
  const { t } = useI18n();

  const isDarkPage = ["/qibla", "/more", "/favorites", "/tasbeeh", "/settings", "/islamic-gifts", "/downloads", "/notifications", "/about", "/privacy-policy", "/updates", "/writing", "/islamic-calendar", "/prayer-times"].includes(location);
  const isMoreActive = MORE_PATHS.some((p) => location.startsWith(p));

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row bg-background">
      {/* Mobile top bar — hidden on dark-themed pages */}
      {!isDarkPage && (
        <div className="md:hidden flex items-center justify-between px-5 py-3 border-b border-border bg-card">
          <div className="flex items-center gap-2">
            <img src="/icon-48.png" alt="Noor Quran" className="w-8 h-8 rounded-lg object-cover" />
            <h1 className="text-xl font-bold font-serif text-primary">Noor Quran</h1>
          </div>
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
          <div className="flex items-center gap-2.5">
            <img src="/icon-48.png" alt="Noor Quran" className="w-9 h-9 rounded-xl object-cover shadow-sm" />
            <h1 className="text-2xl font-bold font-serif text-primary">Noor Quran</h1>
          </div>
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
          <NavItem href="/" icon={<HomeIcon className="w-5 h-5" />} label={t("nav_home")} active={location === "/"} />
          <NavItem href="/quran" icon={<Book className="w-5 h-5" />} label={t("nav_quran")} active={location === "/quran" || location.startsWith("/quran/")} />
          <NavItem href="/prayer-times" icon={<Compass className="w-5 h-5" />} label={t("nav_prayers")} active={location === "/prayer-times"} />

          <div className="mt-2 mb-1 px-2">
            <p className="text-xs text-muted-foreground/60 uppercase tracking-wider font-medium">{t("nav_more_section")}</p>
          </div>
          <NavItem href="/qibla" icon={<Navigation className="w-5 h-5" />} label={t("nav_al_haram")} active={location === "/qibla"} />
          <NavItem href="/favorites" icon={<Heart className="w-5 h-5" />} label={t("nav_favorites")} active={location === "/favorites"} />
          <NavItem href="/tasbeeh" icon={<Hash className="w-5 h-5" />} label={t("nav_tasbeeh")} active={location === "/tasbeeh"} />
          <NavItem href="/bookmarks" icon={<Bookmark className="w-5 h-5" />} label={t("nav_bookmarks")} active={location === "/bookmarks"} />
          <NavItem href="/islamic-gifts" icon={<Gift className="w-5 h-5" />} label={t("nav_islamic_gifts")} active={location === "/islamic-gifts"} />
          <NavItem href="/downloads" icon={<Download className="w-5 h-5" />} label={t("nav_downloads")} active={location === "/downloads"} />
          <NavItem href="/notifications" icon={<Bell className="w-5 h-5" />} label={t("nav_notifications")} active={location === "/notifications"} />
          <NavItem href="/settings" icon={<Settings className="w-5 h-5" />} label={t("nav_settings")} active={location === "/settings"} />
        </nav>

        <div className="mt-auto text-xs text-muted-foreground">{t("nav_peace")}</div>
      </div>

      {/* Main content */}
      <main className={`flex-1 flex flex-col min-h-0 overflow-y-auto ${isDarkPage ? "" : ""}`}>
        <div className={isDarkPage ? "w-full" : "flex-1 w-full max-w-5xl mx-auto p-4 md:p-8"}>
          {children}
        </div>
      </main>

      {/* Mobile bottom navigation — 4 tabs */}
      <div
        className={`md:hidden flex items-center justify-around px-1 py-2 border-t sticky bottom-0 z-20 ${
          isDarkPage
            ? "border-emerald-950 bg-[#071a0e]"
            : "border-border bg-card"
        }`}
      >
        <MobileNavItem href="/" icon={<HomeIcon className="w-5 h-5" />} label={t("nav_home")}
          active={location === "/"} dark={isDarkPage} testId="home" />
        <MobileNavItem href="/quran" icon={<Book className="w-5 h-5" />} label={t("nav_quran")}
          active={location === "/quran" || location.startsWith("/quran/")} dark={isDarkPage} testId="quran" />
        <MobileNavItem href="/prayer-times" icon={<Compass className="w-5 h-5" />} label={t("nav_prayers")}
          active={location === "/prayer-times"} dark={isDarkPage} testId="prayers" />
        <MobileNavItem href="/more" icon={<MoreHorizontal className="w-5 h-5" />} label={t("nav_more")}
          active={isMoreActive} dark={isDarkPage} testId="more" />
      </div>
    </div>
  );
}

function NavItem({ href, icon, label, active }: { href: string; icon: React.ReactNode; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all font-medium text-sm ${
        active ? "bg-primary text-primary-foreground shadow-sm" : "text-foreground hover:bg-muted"
      }`}
      data-testid={`link-nav-${label.toLowerCase().replace(/\s+/g, "-")}`}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}

function MobileNavItem({ href, icon, label, active, dark, testId }: {
  href: string; icon: React.ReactNode; label: string; active: boolean; dark: boolean; testId: string;
}) {
  const activeClass = dark ? "text-emerald-400" : "text-primary";
  const inactiveClass = dark ? "text-emerald-900 hover:text-emerald-700" : "text-muted-foreground hover:text-foreground";

  return (
    <Link
      href={href}
      className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all ${active ? activeClass : inactiveClass}`}
      data-testid={`link-mobilenav-${testId}`}
    >
      {icon}
      <span className="text-[10px] font-medium">{label}</span>
    </Link>
  );
}
