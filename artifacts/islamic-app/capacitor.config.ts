import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.sj64noorquran",
  appName: "Noor Quran",
  webDir: "dist/public",
  // IMPORTANT: @capacitor-community/admob is a devDependency but its native
  // Android module is commented out in android/app/build.gradle (disabled
  // for startup stability testing). `npx cap sync` auto-discovers plugins
  // from devDependencies regardless of gradle wiring, so without this
  // allowlist it emits an AdMob entry in capacitor.plugins.json that has no
  // compiled class. PluginManager.loadPluginClasses() on Android does
  // Class.forName() for every entry in one loop and throws on the FIRST
  // ClassNotFoundException, discarding the entire plugin list — silently
  // breaking every auto-discovered plugin (Share, Browser, Filesystem,
  // Haptics, Network, SplashScreen, StatusBar), not just AdMob.
  // `includePlugins` restricts sync to only the plugins actually compiled
  // into the native build. If AdMob's gradle module is re-enabled, add
  // "@capacitor-community/admob" back to this list.
  includePlugins: [
    "@capacitor/app",
    "@capacitor/browser",
    "@capacitor/filesystem",
    "@capacitor/haptics",
    "@capacitor/local-notifications",
    "@capacitor/network",
    "@capacitor/share",
    "@capacitor/splash-screen",
    "@capacitor/status-bar",
    "@capacitor-community/speech-recognition",
    "capacitor-native-settings",
  ],
  server: {
    androidScheme: "https",
    cleartext: false,
  },
  android: {
    buildOptions: {
      keystorePath: "noor-quran-release.keystore",
      keystoreAlias: "noor-quran",
    },
    backgroundColor: "#071a0e",
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: true, // enabled for speech-recognition diagnostics
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      launchFadeOutDuration: 400,
      backgroundColor: "#071a0e",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: "Dark",
      backgroundColor: "#071a0e",
      overlaysWebView: false,
    },
    LocalNotifications: {
      smallIcon: "ic_stat_noor",
      iconColor: "#1a5c38",
      // No sound: "default" — Android resolves named sounds from res/raw/ which doesn't have "default.ogg"
    },
    App: {
      backgroundColor: "#071a0e",
    },
    Keyboard: {
      resize: "body",
      style: "dark",
    },
    // AdMob: { ... }  — DISABLED for startup stability testing
  },
};

export default config;
