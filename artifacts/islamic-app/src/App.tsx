import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { I18nProvider } from "@/lib/i18n-context";
import { NotificationPrompt } from "@/components/notification-prompt";
import NotFound from "@/pages/not-found";
import { Layout } from "@/components/layout";
import { useAndroidBack } from "@/hooks/useAndroidBack";
import { Home } from "@/pages/home";
import { Quran } from "@/pages/quran";
import { SurahReader } from "@/pages/surah";
import { PrayerTimes } from "@/pages/prayer-times";
import { Bookmarks } from "@/pages/bookmarks";
import { Qibla } from "@/pages/qibla";
import { More } from "@/pages/more";
import { Favorites } from "@/pages/favorites";
import { Tasbeeh } from "@/pages/tasbeeh";
import { Settings } from "@/pages/settings";
import { IslamicGifts } from "@/pages/islamic-gifts";
import { Downloads } from "@/pages/downloads";
import { Notifications } from "@/pages/notifications";
import { About } from "@/pages/about";
import { PrivacyPolicy } from "@/pages/privacy-policy";
import { TermsOfService } from "@/pages/terms-of-service";
import { AccountDeletion } from "@/pages/account-deletion";
import { Updates } from "@/pages/updates";
import { Writing } from "@/pages/writing";
import { IslamicCalendar } from "@/pages/islamic-calendar";
import { AzanSettings } from "@/pages/azan-settings";
import { Marketplace } from "@/pages/marketplace";
import { AdminProducts } from "@/pages/admin-products";
import { JuzReader } from "@/pages/juz-reader";
import { Teacher } from "@/pages/teacher";
import { TeacherLesson } from "@/pages/teacher-lesson";
import { TeacherPractice } from "@/pages/teacher-practice";
import { WelcomeCampaignGate } from "@/components/welcome-campaign-gate";
import { useEffect } from "react";
import { AI_TEACHER_ENABLED } from "@/lib/teacher-config";
import { ensureRegistered, reportAyahComplete } from "@/lib/user";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      retry: 2,
    },
  },
});

function AndroidBackHandler() {
  useAndroidBack();
  return null;
}

function NoorInitializer() {
  useEffect(() => {
    // Register device silently on first open — idempotent
    ensureRegistered().catch(() => {});

    // Listen for ayah-both-done events dispatched by surah reader
    // Awards 1 coin per unique ayah when BOTH arabic + translation audio complete
    function onAyahDone(e: Event) {
      const detail = (e as CustomEvent<{ surahNumber: number; ayahNumber: number }>).detail;
      if (detail?.surahNumber && detail?.ayahNumber) {
        reportAyahComplete(detail.surahNumber, detail.ayahNumber).catch(() => {});
      }
    }
    window.addEventListener("noor:ayah-both-done", onAyahDone);
    return () => window.removeEventListener("noor:ayah-both-done", onAyahDone);
  }, []);
  return null;
}

function RedirectHome() {
  const [, setLocation] = useLocation();
  useEffect(() => setLocation("/", { replace: true }), [setLocation]);
  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/quran" component={Quran} />
      <Route path="/quran/:number" component={SurahReader} />
      <Route path="/prayer-times" component={PrayerTimes} />
      <Route path="/bookmarks" component={Bookmarks} />
      <Route path="/qibla" component={Qibla} />
      <Route path="/more" component={More} />
      <Route path="/favorites" component={Favorites} />
      <Route path="/tasbeeh" component={Tasbeeh} />
      <Route path="/settings" component={Settings} />
      <Route path="/islamic-gifts" component={IslamicGifts} />
      <Route path="/downloads" component={Downloads} />
      <Route path="/notifications" component={Notifications} />
      <Route path="/about" component={About} />
      <Route path="/privacy-policy" component={PrivacyPolicy} />
      <Route path="/terms-of-service" component={TermsOfService} />
      <Route path="/account-deletion" component={AccountDeletion} />
      <Route path="/updates" component={Updates} />
      <Route path="/writing" component={Writing} />
      <Route path="/islamic-calendar" component={IslamicCalendar} />
      <Route path="/azan-settings" component={AzanSettings} />
      <Route path="/marketplace" component={Marketplace} />
      <Route path="/admin-products" component={AdminProducts} />
      <Route path="/juz/:number" component={JuzReader} />
      {AI_TEACHER_ENABLED ? (
        <>
          <Route path="/teacher/practice/:id" component={TeacherLesson} />
          <Route path="/teacher/practice" component={TeacherPractice} />
          <Route path="/teacher/lesson/:id" component={TeacherLesson} />
          <Route path="/teacher" component={Teacher} />
        </>
      ) : (
        <>
          <Route path="/teacher/practice/:id" component={RedirectHome} />
          <Route path="/teacher/practice" component={RedirectHome} />
          <Route path="/teacher/lesson/:id" component={RedirectHome} />
          <Route path="/teacher" component={RedirectHome} />
        </>
      )}

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <I18nProvider>
      <ThemeProvider defaultTheme="dark">
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <AndroidBackHandler />
              <NoorInitializer />

              <WelcomeCampaignGate>
                <Layout>
                  <Router />
                </Layout>
              </WelcomeCampaignGate>

              <NotificationPrompt />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </I18nProvider>
  );
}

export default App;
