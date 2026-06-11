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
 * Crash-safe startup log viewer.
 *
 * - Extends plain Activity (NOT AppCompat / BridgeActivity)
 * - 100% code-only UI — no XML layouts, no theme required
 * - Reads startup log saved in SharedPreferences by MainApplication
 * - Shown automatically on next launch after a crash
 */
public class LogViewerActivity extends Activity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        SharedPreferences prefs =
            getSharedPreferences(MainApplication.PREF_DIAG, MODE_PRIVATE);
        final String log = prefs.getString(MainApplication.KEY_PREV_LOG,
            "(no startup log found — this may be the first launch, or the log was cleared)");

        // ── Root layout ──────────────────────────────────────────────────────
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(0xFF0D0D0D);
        setContentView(root);

        // ── Header ──────────────────────────────────────────────────────────
        TextView title = new TextView(this);
        title.setText("Noor Quran — Startup Crash Log");
        title.setTextColor(0xFFFF5555);
        title.setTextSize(17);
        title.setTypeface(Typeface.DEFAULT_BOLD);
        title.setPadding(dp(16), dp(40), dp(16), dp(4));
        root.addView(title);

        TextView sub = new TextView(this);
        sub.setText("Steps completed before last crash:");
        sub.setTextColor(0xFFAAAAAA);
        sub.setTextSize(12);
        sub.setPadding(dp(16), 0, dp(16), dp(8));
        root.addView(sub);

        // ── Scrollable log ───────────────────────────────────────────────────
        ScrollView scroll = new ScrollView(this);
        LinearLayout.LayoutParams sp = new LinearLayout.LayoutParams(
            LayoutParams.MATCH_PARENT, 0, 1f);
        scroll.setLayoutParams(sp);
        scroll.setBackgroundColor(0xFF1A1A1A);

        TextView logTv = new TextView(this);
        logTv.setText(log);
        logTv.setTextColor(0xFF00FF88);
        logTv.setTextSize(10.5f);
        logTv.setTypeface(Typeface.MONOSPACE);
        logTv.setPadding(dp(12), dp(12), dp(12), dp(12));
        scroll.addView(logTv);
        root.addView(scroll);

        // ── Buttons ──────────────────────────────────────────────────────────
        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setGravity(Gravity.CENTER);
        row.setPadding(dp(8), dp(12), dp(8), dp(24));
        row.setBackgroundColor(0xFF111111);

        Button copyBtn = makeBtn("Copy Log", 0xFF1A5C38);
        copyBtn.setOnClickListener(v -> {
            ClipboardManager cm = (ClipboardManager) getSystemService(CLIPBOARD_SERVICE);
            if (cm != null) cm.setPrimaryClip(ClipData.newPlainText("NoorLog", log));
            Toast.makeText(this, "Copied to clipboard", Toast.LENGTH_SHORT).show();
        });

        Button shareBtn = makeBtn("Share Log", 0xFF1A5C38);
        shareBtn.setOnClickListener(v -> {
            Intent i = new Intent(Intent.ACTION_SEND);
            i.setType("text/plain");
            i.putExtra(Intent.EXTRA_TEXT, log);
            i.putExtra(Intent.EXTRA_SUBJECT, "Noor Quran Startup Log");
            startActivity(Intent.createChooser(i, "Share log"));
        });

        Button launchBtn = makeBtn("Clear & Try Again", 0xFF6B0000);
        launchBtn.setOnClickListener(v -> {
            prefs.edit().remove(MainApplication.KEY_PREV_LOG).commit();
            StartupLog.reset();
            Intent i = new Intent(this, MainActivity.class);
            i.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(i);
            finish();
        });

        LinearLayout.LayoutParams bp = new LinearLayout.LayoutParams(0, LayoutParams.WRAP_CONTENT, 1f);
        bp.setMargins(dp(4), 0, dp(4), 0);
        copyBtn.setLayoutParams(bp);
        shareBtn.setLayoutParams(new LinearLayout.LayoutParams(bp));
        launchBtn.setLayoutParams(new LinearLayout.LayoutParams(bp));

        row.addView(copyBtn);
        row.addView(shareBtn);
        row.addView(launchBtn);
        root.addView(row);

        // Scroll to bottom so last step is visible
        scroll.post(() -> scroll.fullScroll(ScrollView.FOCUS_DOWN));
    }

    private Button makeBtn(String text, int color) {
        Button b = new Button(this);
        b.setText(text);
        b.setTextColor(Color.WHITE);
        b.setBackgroundColor(color);
        b.setTextSize(11);
        return b;
    }

    private int dp(int dp) {
        return Math.round(dp * getResources().getDisplayMetrics().density);
    }
}
