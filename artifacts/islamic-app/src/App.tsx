import { Switch, Route, Router as WouterRouter } from "wouter";
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
import { Updates } from "@/pages/updates";
import { Writing } from "@/pages/writing";
import { IslamicCalendar } from "@/pages/islamic-calendar";

import { MakkahLive } from "@/pages/makkah-live";
import { HadithPage } from "@/pages/hadith";
import { EmergencyDuas } from "@/pages/emergency-duas";
import { HabitTracker } from "@/pages/habit-tracker";
import { QuranGoals } from "@/pages/quran-goals";
import { KidsMode } from "@/pages/kids-mode";
import { QuranRadio } from "@/pages/quran-radio";
import { Discover } from "@/pages/discover";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      retry: 2,
    },
  },
});

function Router() {
  // Android hardware back-button — no-ops in browser
  useAndroidBack();

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
      <Route path="/updates" component={Updates} />
      <Route path="/writing" component={Writing} />
      <Route path="/islamic-calendar" component={IslamicCalendar} />

      <Route path="/makkah-live" component={MakkahLive} />
      <Route path="/hadith" component={HadithPage} />
      <Route path="/emergency-duas" component={EmergencyDuas} />
      <Route path="/habit-tracker" component={HabitTracker} />
      <Route path="/quran-goals" component={QuranGoals} />
      <Route path="/kids-mode" component={KidsMode} />
      <Route path="/quran-radio" component={QuranRadio} />
      <Route path="/discover" component={Discover} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <I18nProvider>
      <ThemeProvider defaultTheme="light">
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Layout>
                <Router />
              </Layout>
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
