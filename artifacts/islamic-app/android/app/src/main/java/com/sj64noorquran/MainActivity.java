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
  import com.capacitorjs.plugins.share.SharePlugin;
  import com.capacitorjs.plugins.network.NetworkPlugin;
  import com.getcapacitor.community.speechrecognition.SpeechRecognition;
  import nl.raphael.settings.NativeSettingsPlugin;

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
          // Share is explicitly registered as defense-in-depth: a single bad
          // entry anywhere in capacitor.plugins.json (e.g. a devDependency
          // plugin whose native module isn't actually compiled in, such as
          // AdMob when its gradle module is disabled) makes
          // PluginManager.loadPluginClasses() throw on Class.forName() and
          // silently discards the ENTIRE auto-discovered plugin list —
          // breaking Share along with every other non-explicitly-registered
          // plugin. See capacitor.config.ts includePlugins for the primary
          // fix (keeping the JSON in sync with what's actually compiled).
          registerPlugin(SharePlugin.class);
          // Network — explicit registration so Network.getStatus() is always
          // reachable. If the plugin is only auto-discovered and plugins.json
          // ever drifts (e.g. a stale AdMob entry causing loadPluginClasses()
          // to abort), this call can hang.
          registerPlugin(NetworkPlugin.class);
          // SpeechRecognition — explicit registration keeps the Teacher mic
          // flow available even if generated plugin metadata drifts.
          registerPlugin(SpeechRecognition.class);
          // NativeSettings — explicit registration (same defense-in-depth as Share).
          registerPlugin(NativeSettingsPlugin.class);
          // Project-local Kotlin/Java plugins also registered here (not in plugins.json).
          // AzanPlugin is a project-local native plugin (android/app/src, not an npm
          // package), so cap sync never discovers it — without this explicit call every
          // Azan.* JS bridge call silently falls back to a no-op web stub and no prayer
          // alarms are ever scheduled natively.
          registerPlugin(NativeTTSPlugin.class);
          registerPlugin(AzanPlugin.class);

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
  
