package com.sj64noorquran;

import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.os.Bundle;
import android.view.Window;
import android.view.WindowManager;
import androidx.activity.OnBackPressedCallback;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

import java.io.PrintWriter;
import java.io.StringWriter;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        MainApplication.crumb(this, "M1_mainActivity_onCreate_start");

        // ── Register custom plugins BEFORE super.onCreate() ──────────────────
        MainApplication.crumb(this, "M2_registerPlugin_NativeTTS");
        registerPlugin(NativeTTSPlugin.class);

        MainApplication.crumb(this, "M3_registerPlugin_Azan");
        registerPlugin(AzanPlugin.class);

        // ── BridgeActivity.onCreate() — initialises Bridge, WebView, plugins ─
        // This is where nearly all startup crashes occur.
        // The try-catch logs the crash AND saves a breadcrumb for next launch.
        MainApplication.crumb(this, "M4_super_onCreate_start");
        try {
            super.onCreate(savedInstanceState);
        } catch (Throwable t) {
            MainApplication.crumb(this, "M5_super_onCreate_CRASHED");
            saveCrashAndShow(t, "BridgeActivity.onCreate()");
            return;
        }
        MainApplication.crumb(this, "M6_super_onCreate_done");

        // ── Back-button: navigate WebView history, then close app ────────────
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (bridge != null && bridge.getWebView() != null
                        && bridge.getWebView().canGoBack()) {
                    bridge.getWebView().goBack();
                } else {
                    finish();
                }
            }
        });

        // ── System bar styling ────────────────────────────────────────────────
        MainApplication.crumb(this, "M7_windowStyling_start");
        try {
            Window window = getWindow();
            WindowCompat.setDecorFitsSystemWindows(window, false);
            window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS);
            window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_NAVIGATION);
            window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
            window.setStatusBarColor(Color.parseColor("#071a0e"));
            window.setNavigationBarColor(Color.parseColor("#071a0e"));

            WindowInsetsControllerCompat controller =
                new WindowInsetsControllerCompat(window, window.getDecorView());
            controller.setAppearanceLightStatusBars(false);
            controller.setAppearanceLightNavigationBars(false);

            window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        } catch (Throwable t) {
            MainApplication.crumb(this, "M8_windowStyling_CRASHED");
            // non-critical — log but continue
            android.util.Log.w("NoorCrash", "Window styling failed", t);
        }

        MainApplication.crumb(this, "M9_onCreate_complete");
    }

    private void saveCrashAndShow(Throwable t, String context) {
        StringWriter sw = new StringWriter(4096);
        t.printStackTrace(new PrintWriter(sw));

        // Read last breadcrumb so we know how far startup got
        String crumb = "(unknown)";
        try {
            crumb = getSharedPreferences("noor_debug", MODE_PRIVATE)
                        .getString("last_crumb", "(none)");
        } catch (Throwable ignored) {}

        String report = "=== NOOR QURAN CRASH REPORT ===\n"
            + "Context  : " + context + "\n"
            + "Last crumb: " + crumb + "\n"
            + "Exception: " + t.getClass().getName() + "\n"
            + "Message  : " + t.getMessage() + "\n\n"
            + "Full stack trace:\n"
            + sw.toString();

        // Persist synchronously — process dies immediately after
        getSharedPreferences("noor_debug", MODE_PRIVATE)
            .edit().putString("crash", report).commit();

        // Write to external file so user can read via file manager
        CrashHandler.writeCrashFile(this, report);

        // Launch CrashActivity — it shows the report on-screen
        try {
            Intent intent = new Intent(this, CrashActivity.class);
            intent.putExtra("trace", report);
            intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            startActivity(intent);
        } catch (Throwable ignored) {}
        finish();
    }
}
