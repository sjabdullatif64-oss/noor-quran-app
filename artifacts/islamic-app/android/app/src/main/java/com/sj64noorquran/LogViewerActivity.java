package com.sj64noorquran;

import android.app.Activity;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.graphics.Typeface;
import android.os.Bundle;
import android.view.Gravity;
import android.view.ViewGroup.LayoutParams;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

/**
 * TEMPORARY DIAGNOSTIC LAUNCHER.
 *
 * This is the entry point of the app during crash investigation.
 * It shows two buttons every time:
 *   [Open Main App]   — starts MainActivity (may crash)
 *   [Show Startup Log] — shows last saved startup log
 *
 * After tapping "Open Main App" and the app crashes:
 *   1. Close the app completely.
 *   2. Reopen the app — LogViewerActivity loads again.
 *   3. Tap "Show Startup Log" to see the last startup steps.
 *   4. Tap "Share Log" to send the log.
 *
 * Plain Activity — NO theme — all UI in code — cannot crash itself.
 */
public class LogViewerActivity extends Activity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // ── Root layout ──────────────────────────────────────────────────────
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(0xFF0D1A0F);
        setContentView(root);

        // ── Title ────────────────────────────────────────────────────────────
        TextView title = new TextView(this);
        title.setText("Noor Quran — Diagnostic");
        title.setTextColor(0xFF88FFAA);
        title.setTextSize(20);
        title.setTypeface(Typeface.DEFAULT_BOLD);
        title.setGravity(Gravity.CENTER);
        title.setPadding(dp(16), dp(48), dp(16), dp(8));
        root.addView(title);

        TextView version = new TextView(this);
        version.setText("Build #122  |  v1.0.11  |  tap a button below");
        version.setTextColor(0xFF556655);
        version.setTextSize(11);
        version.setGravity(Gravity.CENTER);
        version.setPadding(dp(16), 0, dp(16), dp(32));
        root.addView(version);

        // ── Primary action buttons ────────────────────────────────────────────
        Button openAppBtn = makePrimaryBtn("▶  Open Main App");
        openAppBtn.setOnClickListener(v -> {
            Intent i = new Intent(this, MainActivity.class);
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(i);
            // Do NOT finish — user can come back here after crash
        });
        root.addView(openAppBtn, wideParams(dp(16), dp(8)));

        // ── Divider ───────────────────────────────────────────────────────────
        TextView divider = new TextView(this);
        divider.setText("── saved startup log ──");
        divider.setTextColor(0xFF334433);
        divider.setTextSize(11);
        divider.setGravity(Gravity.CENTER);
        divider.setPadding(0, dp(24), 0, dp(8));
        root.addView(divider);

        // ── Log status label ──────────────────────────────────────────────────
        SharedPreferences prefs =
            getSharedPreferences(MainApplication.PREF_DIAG, MODE_PRIVATE);
        final String log = prefs.getString(MainApplication.KEY_PREV_LOG, null);

        TextView statusTv = new TextView(this);
        if (log != null) {
            // Count lines to give a hint
            int lines = log.split("\n").length;
            statusTv.setText("✅  Log found: " + lines + " lines  (from last crashed launch)");
            statusTv.setTextColor(0xFF00DD66);
        } else {
            statusTv.setText("⬜  No log yet — tap Open Main App first, then reopen after crash");
            statusTv.setTextColor(0xFF777777);
        }
        statusTv.setTextSize(12);
        statusTv.setGravity(Gravity.CENTER);
        statusTv.setPadding(dp(16), dp(4), dp(16), dp(12));
        root.addView(statusTv);

        // ── Show log / share / clear row ──────────────────────────────────────
        LinearLayout logRow = new LinearLayout(this);
        logRow.setOrientation(LinearLayout.HORIZONTAL);
        logRow.setGravity(Gravity.CENTER);
        logRow.setPadding(dp(8), 0, dp(8), dp(8));

        Button showBtn = makeSecondaryBtn("Show Log");
        showBtn.setEnabled(log != null);
        showBtn.setAlpha(log != null ? 1f : 0.35f);
        showBtn.setOnClickListener(v -> showLogScreen(log, prefs));

        Button shareBtn = makeSecondaryBtn("Share Log");
        shareBtn.setEnabled(log != null);
        shareBtn.setAlpha(log != null ? 1f : 0.35f);
        shareBtn.setOnClickListener(v -> {
            Intent i = new Intent(Intent.ACTION_SEND);
            i.setType("text/plain");
            i.putExtra(Intent.EXTRA_TEXT, log);
            i.putExtra(Intent.EXTRA_SUBJECT, "Noor Quran Startup Log");
            startActivity(Intent.createChooser(i, "Share startup log"));
        });

        Button clearBtn = makeSecondaryBtn("Clear Log");
        clearBtn.setEnabled(log != null);
        clearBtn.setAlpha(log != null ? 1f : 0.35f);
        clearBtn.setOnClickListener(v -> {
            prefs.edit().remove(MainApplication.KEY_PREV_LOG).commit();
            StartupLog.reset();
            Toast.makeText(this, "Log cleared", Toast.LENGTH_SHORT).show();
            recreate();
        });

        LinearLayout.LayoutParams bp = new LinearLayout.LayoutParams(0, LayoutParams.WRAP_CONTENT, 1f);
        bp.setMargins(dp(4), 0, dp(4), 0);
        showBtn.setLayoutParams(bp);
        shareBtn.setLayoutParams(new LinearLayout.LayoutParams(bp));
        clearBtn.setLayoutParams(new LinearLayout.LayoutParams(bp));
        logRow.addView(showBtn);
        logRow.addView(shareBtn);
        logRow.addView(clearBtn);
        root.addView(logRow, new LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT));
    }

    /** Opens a full-screen view of the startup log text. */
    private void showLogScreen(String log, SharedPreferences prefs) {
        LinearLayout root2 = new LinearLayout(this);
        root2.setOrientation(LinearLayout.VERTICAL);
        root2.setBackgroundColor(0xFF0D0D0D);
        setContentView(root2);

        TextView title = new TextView(this);
        title.setText("Startup Log");
        title.setTextColor(0xFFFF5555);
        title.setTextSize(16);
        title.setTypeface(Typeface.DEFAULT_BOLD);
        title.setPadding(dp(16), dp(40), dp(16), dp(4));
        root2.addView(title);

        ScrollView scroll = new ScrollView(this);
        scroll.setLayoutParams(new LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, 0, 1f));
        scroll.setBackgroundColor(0xFF111111);

        TextView tv = new TextView(this);
        tv.setText(log != null ? log : "(empty)");
        tv.setTextColor(0xFF00FF88);
        tv.setTextSize(10f);
        tv.setTypeface(Typeface.MONOSPACE);
        tv.setPadding(dp(10), dp(10), dp(10), dp(10));
        scroll.addView(tv);
        root2.addView(scroll);

        // Bottom buttons
        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setGravity(Gravity.CENTER);
        row.setPadding(dp(8), dp(8), dp(8), dp(20));
        row.setBackgroundColor(0xFF111111);

        Button copyBtn = makeSecondaryBtn("Copy");
        copyBtn.setOnClickListener(v -> {
            ClipboardManager cm = (ClipboardManager) getSystemService(CLIPBOARD_SERVICE);
            if (cm != null) cm.setPrimaryClip(ClipData.newPlainText("NoorLog", log != null ? log : ""));
            Toast.makeText(this, "Copied!", Toast.LENGTH_SHORT).show();
        });

        Button shareBtn2 = makeSecondaryBtn("Share");
        shareBtn2.setOnClickListener(v -> {
            Intent i = new Intent(Intent.ACTION_SEND);
            i.setType("text/plain");
            i.putExtra(Intent.EXTRA_TEXT, log);
            i.putExtra(Intent.EXTRA_SUBJECT, "Noor Quran Startup Log");
            startActivity(Intent.createChooser(i, "Share"));
        });

        Button backBtn = makeSecondaryBtn("← Back");
        backBtn.setOnClickListener(v -> recreate());

        LinearLayout.LayoutParams bp = new LinearLayout.LayoutParams(0, LayoutParams.WRAP_CONTENT, 1f);
        bp.setMargins(dp(4), 0, dp(4), 0);
        copyBtn.setLayoutParams(bp);
        shareBtn2.setLayoutParams(new LinearLayout.LayoutParams(bp));
        backBtn.setLayoutParams(new LinearLayout.LayoutParams(bp));
        row.addView(copyBtn);
        row.addView(shareBtn2);
        row.addView(backBtn);
        root2.addView(row);

        scroll.post(() -> scroll.fullScroll(ScrollView.FOCUS_DOWN));
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private Button makePrimaryBtn(String text) {
        Button b = new Button(this);
        b.setText(text);
        b.setTextColor(Color.WHITE);
        b.setBackgroundColor(0xFF1A5C38);
        b.setTextSize(16);
        b.setPadding(dp(16), dp(16), dp(16), dp(16));
        return b;
    }

    private Button makeSecondaryBtn(String text) {
        Button b = new Button(this);
        b.setText(text);
        b.setTextColor(Color.WHITE);
        b.setBackgroundColor(0xFF2A3A2A);
        b.setTextSize(12);
        return b;
    }

    private LinearLayout.LayoutParams wideParams(int hMargin, int vMargin) {
        LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(
            LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT);
        p.setMargins(hMargin, vMargin, hMargin, vMargin);
        return p;
    }

    private int dp(int dp) {
        return Math.round(dp * getResources().getDisplayMetrics().density);
    }
}
