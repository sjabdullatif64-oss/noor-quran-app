import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import NotFound from "@/pages/not-found";
import { Layout } from "@/components/layout";

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

const queryClient = new QueryClient();

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
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="light">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Layout>
              <Router />
            </Layout>
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
