package com.sj64noorquran;

import android.app.Activity;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.graphics.Typeface;
import android.os.Bundle;
import android.view.Gravity;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

/**
 * Crash display activity.
 *
 * Deliberately extends plain Activity (NOT AppCompatActivity) and builds its
 * entire UI in code so it works even if the app theme or AppCompat is the
 * crash cause.
 *
 * Theme is set programmatically (no XML theme) for maximum compatibility.
 *
 * How to get the crash report without ADB:
 *  1. This screen shows it directly — tap "Copy" then paste in WhatsApp/email
 *  2. File: Android/data/com.sj64noorquran/files/crash_report.txt
 *     Open any file manager → navigate to that path → open with text viewer
 */
public final class CrashActivity extends Activity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // ── Get crash report ───────────────────────────────────────────────────
        String trace = getIntent().getStringExtra("trace");
        if (trace == null || trace.isEmpty()) {
            trace = getSharedPreferences("noor_debug", MODE_PRIVATE)
                        .getString("crash", "(no crash data found — check\nAndroid/data/com.sj64noorquran/files/crash_report.txt)");
        }
        // Keep in SharedPreferences — user might need to re-open
        // (We clear it only after user explicitly dismisses)

        final String finalTrace = trace;

        // ── Build UI purely in code — no XML, no theme dependency ────────────
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(0xFF0d1a10);
        root.setPadding(28, 72, 28, 28);

        // Title
        TextView title = new TextView(this);
        title.setText("Noor Quran — Crash Report");
        title.setTextColor(0xFFFF5555);
        title.setTextSize(18);
        title.setTypeface(null, Typeface.BOLD);
        title.setPadding(0, 0, 0, 8);
        root.addView(title);

        // Instructions
        TextView hint = new TextView(this);
        hint.setText("Tap COPY then share via WhatsApp/Email with the developer.\n"
                   + "File also saved at:\nAndroid/data/com.sj64noorquran/files/crash_report.txt");
        hint.setTextColor(0xFFAAAAFF);
        hint.setTextSize(12);
        hint.setPadding(0, 0, 0, 16);
        root.addView(hint);

        // Button row
        LinearLayout buttons = new LinearLayout(this);
        buttons.setOrientation(LinearLayout.HORIZONTAL);
        buttons.setPadding(0, 0, 0, 12);

        Button copy = makeButton("Copy to Clipboard");
        copy.setOnClickListener(v -> {
            try {
                ClipboardManager cm = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
                if (cm != null) cm.setPrimaryClip(ClipData.newPlainText("noor_crash", finalTrace));
                Toast.makeText(this, "Copied! Share with developer.", Toast.LENGTH_LONG).show();
            } catch (Throwable ignored) {}
        });
        buttons.addView(copy);

        Button share = makeButton("Share…");
        share.setPadding(24, 0, 24, 0);
        share.setOnClickListener(v -> {
            try {
                Intent i = new Intent(Intent.ACTION_SEND);
                i.setType("text/plain");
                i.putExtra(Intent.EXTRA_SUBJECT, "Noor Quran crash report");
                i.putExtra(Intent.EXTRA_TEXT, finalTrace);
                startActivity(Intent.createChooser(i, "Share crash report"));
            } catch (Throwable ignored) {}
        });
        LinearLayout.LayoutParams sp =
            new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT);
        sp.leftMargin = 16;
        share.setLayoutParams(sp);
        buttons.addView(share);

        Button dismiss = makeButton("Dismiss");
        dismiss.setOnClickListener(v -> {
            getSharedPreferences("noor_debug", MODE_PRIVATE).edit().remove("crash").apply();
            finish();
        });
        LinearLayout.LayoutParams dp =
            new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT);
        dp.leftMargin = 16;
        dismiss.setLayoutParams(dp);
        buttons.addView(dismiss);

        root.addView(buttons);

        // Stack trace
        ScrollView sv = new ScrollView(this);
        LinearLayout.LayoutParams svp =
            new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, 0, 1f);
        sv.setLayoutParams(svp);
        sv.setBackgroundColor(0xFF0a1a0d);

        TextView tv = new TextView(this);
        tv.setText(finalTrace);
        tv.setTextColor(0xFFCCFFCC);
        tv.setTextSize(10f);
        tv.setTypeface(Typeface.MONOSPACE);
        tv.setPadding(16, 16, 16, 16);
        tv.setGravity(Gravity.START | Gravity.TOP);
        tv.setTextIsSelectable(true);
        sv.addView(tv);
        root.addView(sv);

        setContentView(root);
    }

    private Button makeButton(String label) {
        Button b = new Button(this);
        b.setText(label);
        b.setTextColor(0xFFFFFFFF);
        b.setBackgroundColor(0xFF1a5c38);
        b.setPadding(24, 12, 24, 12);
        return b;
    }
}
