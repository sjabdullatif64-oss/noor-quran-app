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
        StartupLog.step("MAIN_ACTIVITY_ON_CREATE_START");

        // ── Show log viewer if previous launch crashed ───────────────────────
        // Check BEFORE doing anything that could crash (super, plugins, etc.)
        SharedPreferences diag =
            getSharedPreferences(MainApplication.PREF_DIAG, MODE_PRIVATE);
        if (diag.contains(MainApplication.KEY_PREV_LOG)) {
            StartupLog.step("MAIN_ACTIVITY_REDIRECTING_TO_LOG_VIEWER");
            Intent i = new Intent(this, LogViewerActivity.class);
            i.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
            startActivity(i);
            finish();
            return;
        }

        // ── Register custom plugins BEFORE super.onCreate() ──────────────────
        StartupLog.step("REGISTER_PLUGIN_NativeTTS_START");
        registerPlugin(NativeTTSPlugin.class);
        StartupLog.step("REGISTER_PLUGIN_NativeTTS_DONE");

        StartupLog.step("REGISTER_PLUGIN_AzanPlugin_START");
        registerPlugin(AzanPlugin.class);
        StartupLog.step("REGISTER_PLUGIN_AzanPlugin_DONE");

        // ── BridgeActivity.onCreate() ─────────────────────────────────────────
        // Initialises Capacitor Bridge, WebView, and all plugins.
        // Wrapped in try-catch: if this crashes we save the log and show it.
        StartupLog.step("SUPER_ON_CREATE_START");
        try {
            super.onCreate(savedInstanceState);
        } catch (Throwable t) {
            StringWriter sw = new StringWriter(4096);
            t.printStackTrace(new PrintWriter(sw));
            StartupLog.step("SUPER_ON_CREATE_CRASHED: "
                + t.getClass().getSimpleName() + ": " + t.getMessage());
            // Truncate stack to fit in one log line
            String stack = sw.toString().replace("\n", " | ");
            StartupLog.step("STACK: " + stack.substring(0, Math.min(800, stack.length())));

            // Save log and redirect to LogViewerActivity
            String log = StartupLog.read();
            if (log != null) {
                getSharedPreferences(MainApplication.PREF_DIAG, MODE_PRIVATE)
                    .edit().putString(MainApplication.KEY_PREV_LOG, log).commit();
            }
            try {
                Intent i = new Intent(this, LogViewerActivity.class);
                i.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(i);
            } catch (Throwable ignored) {}
            finish();
            return;
        }
        StartupLog.step("SUPER_ON_CREATE_DONE");

        // ── Back button: WebView history → then close ─────────────────────────
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
        StartupLog.step("WINDOW_STYLING_START");
        try {
            Window w = getWindow();
            WindowCompat.setDecorFitsSystemWindows(w, false);
            w.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS);
            w.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_NAVIGATION);
            w.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
            w.setStatusBarColor(Color.parseColor("#071a0e"));
            w.setNavigationBarColor(Color.parseColor("#071a0e"));
            WindowInsetsControllerCompat ctrl =
                new WindowInsetsControllerCompat(w, w.getDecorView());
            ctrl.setAppearanceLightStatusBars(false);
            ctrl.setAppearanceLightNavigationBars(false);
            w.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        } catch (Throwable t) {
            StartupLog.step("WINDOW_STYLING_FAILED: " + t.getMessage());
        }

        StartupLog.step("MAIN_ACTIVITY_ON_CREATE_COMPLETE");
        StartupLog.markOK();
    }
}
