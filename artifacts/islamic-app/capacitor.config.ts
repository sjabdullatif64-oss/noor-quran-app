import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.sj64noorquran",
  appName: "Noor Quran",
  webDir: "dist/public",
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
    webContentsDebuggingEnabled: false,
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
      sound: "default",
    },
    App: {
      backgroundColor: "#071a0e",
    },
    Keyboard: {
      resize: "body",
      style: "dark",
    },
    AdMob: {
      // App ID is declared in AndroidManifest.xml (required)
      // Initialization is done in native-init.ts via AdMob.initialize()
      initializeForTesting: false,
    },
  },
};

export default config;
