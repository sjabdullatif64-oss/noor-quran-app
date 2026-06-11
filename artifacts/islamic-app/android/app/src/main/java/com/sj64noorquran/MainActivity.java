package com.sj64noorquran;

  import android.os.Bundle;
  import android.view.Window;
  import android.view.WindowManager;
  import android.graphics.Color;
  import androidx.activity.OnBackPressedCallback;
  import androidx.core.splashscreen.SplashScreen;
  import androidx.core.view.WindowCompat;
  import androidx.core.view.WindowInsetsControllerCompat;
  import com.getcapacitor.BridgeActivity;
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
          registerPlugin(LocalNotificationsPlugin.class);
          // Project-local Kotlin plugins also registered here (not in plugins.json).
          registerPlugin(NativeTTSPlugin.class);

          super.onCreate(savedInstanceState);

          // ── Back-button override ───────────────────────────────────────────────────
          // Fires ONLY the JS "backButton" event; useAndroidBack.ts owns all navigation.
          getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
              @Override
              public void handleOnBackPressed() {
                  if (bridge != null) {
                      boolean canGoBack = bridge.getWebView().canGoBack();
                      bridge.triggerJSEvent(
                          "backButton",
                          "window",
                          "{\"canGoBack\":" + canGoBack + "}"
                      );
                  }
              }
          });

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
  
