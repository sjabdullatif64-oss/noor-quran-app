package com.sj64noorquran;

  import android.os.Bundle;
  import android.view.Window;
  import android.view.WindowManager;
  import android.graphics.Color;
  import androidx.core.splashscreen.SplashScreen;
  import androidx.core.view.WindowCompat;
  import androidx.core.view.WindowInsetsControllerCompat;
  import com.getcapacitor.BridgeActivity;
  import com.capacitorjs.plugins.app.AppPlugin;
  import com.capacitorjs.plugins.localnotifications.LocalNotificationsPlugin;

  public class MainActivity extends BridgeActivity {

      @Override
      public void onCreate(Bundle savedInstanceState) {
          // ── Android 12+ Splash Screen API ─────────────────────────────────────────
          // installSplashScreen() MUST be called before super.onCreate() / setContentView().
          SplashScreen.installSplashScreen(this);

          // ── Register Capacitor plugins ─────────────────────────────────────────────
          // Explicit registration bypasses capacitor.plugins.json auto-discovery.
          // cap sync regenerates capacitor.plugins.json from devDependencies on CI and
          // can drop plugins; registerPlugin() here guarantees they are always loaded
          // regardless of what cap sync does to capacitor.plugins.json.
          // @capacitor/app — MUST be explicit: cap sync drops devDependency plugins
          // from capacitor.plugins.json on CI, so AppPlugin.load() (which registers
          // the OnBackPressedCallback) would never run → back button closes the app.
          registerPlugin(AppPlugin.class);
          registerPlugin(LocalNotificationsPlugin.class);
          // Project-local Kotlin plugins also registered here (not in plugins.json).
          registerPlugin(NativeTTSPlugin.class);

          super.onCreate(savedInstanceState);

          // ── Back-button ────────────────────────────────────────────────────────────
          // NO custom OnBackPressedCallback here.
          // @capacitor/app AppPlugin registers its own OnBackPressedCallback during
          // super.onCreate(). When JS has App.addListener("backButton") registered,
          // AppPlugin.hasListeners() is true and it calls notifyListeners("backButton")
          // so the JS handler in useAndroidBack.ts receives every back press.
          // Adding a second callback here would win (last-registered = highest priority)
          // and would fire bridge.triggerJSEvent() into a different channel that
          // App.addListener() never sees — causing the button to appear fully blocked.

          Window window = getWindow();

          // Full edge-to-edge: app draws behind status bar and nav bar
          WindowCompat.setDecorFitsSystemWindows(window, false);

          // Transparent system bars
          window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS);
          window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_NAVIGATION);
          window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
          window.setStatusBarColor(Color.parseColor("#071a0e"));
          window.setNavigationBarColor(Color.parseColor("#071a0e"));

          // White icons on dark background
          WindowInsetsControllerCompat controller =
              new WindowInsetsControllerCompat(window, window.getDecorView());
          controller.setAppearanceLightStatusBars(false);
          controller.setAppearanceLightNavigationBars(false);

          // Keep screen on during Quran recitation / prayer times
          window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
      }
  }
  
