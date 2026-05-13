package com.sj64noorquran;

import android.os.Bundle;
import android.view.Window;
import android.view.WindowManager;
import android.graphics.Color;
import androidx.activity.OnBackPressedCallback;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // ── Register custom local Capacitor plugins ────────────────────────────────
        // @CapacitorPlugin auto-discovery applies only to npm-installed plugins.
        // Project-local Kotlin plugins MUST be registered here BEFORE super.onCreate().
        registerPlugin(NativeTTSPlugin.class);

        super.onCreate(savedInstanceState);

        // ── Back-button override ───────────────────────────────────────────────────
        // Capacitor's BridgeActivity (via super) registers an OnBackPressedCallback
        // that fires the JS "backButton" event AND ALSO calls webView.goBack() /
        // finish().  That double-action means our JS window.history.back() + the
        // native goBack() each pop one history entry, exhausting the stack and
        // closing the app immediately on any non-root screen.
        //
        // Fix: add our own callback AFTER super.onCreate() — LIFO dispatch means
        // ours runs first. We fire ONLY the JS event; useAndroidBack.ts owns every
        // navigation decision. Capacitor's default callback is never reached.
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
                // No super / default call — JS handler manages all navigation.
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
