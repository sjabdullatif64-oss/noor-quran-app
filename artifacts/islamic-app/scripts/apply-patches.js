#!/usr/bin/env node
/**
 * apply-patches.js — run automatically via package.json "postinstall"
 *
 * Copies tracked patched source files over the originals in node_modules
 * after every `pnpm install`. This is necessary because node_modules is
 * gitignored, so changes there are not persisted across installs.
 *
 * Current patches:
 *
 * 1. @capacitor-community/speech-recognition@7.0.1 — SpeechRecognition.java
 *    Root cause: the plugin's load() calls SpeechRecognizer.createSpeechRecognizer()
 *    via bridge.getWebView().post(), posting to the Android UI/main thread.
 *    On Android 13+ the IPC service-binding can stall the UI thread for several
 *    seconds.  The WebView JS engine also runs on the UI thread, so during this
 *    stall bridge.eval() result-delivery and JS setTimeout / Promise microtasks
 *    never fire — checkPermissions() hangs indefinitely with no escape.
 *    Fix: remove createSpeechRecognizer() from load() (lazy init in
 *    beginListening() already covers it) + override checkPermissions() with
 *    @PluginMethod only to eliminate Capacitor 8 @PermissionCallback ambiguity.
 */

import { copyFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const APP_DIR = join(__dirname, '..');

const patches = [
  {
    src:  join(APP_DIR, 'android-patches', 'SpeechRecognition.java'),
    dest: join(
      APP_DIR,
      'node_modules',
      '@capacitor-community',
      'speech-recognition',
      'android',
      'src',
      'main',
      'java',
      'com',
      'getcapacitor',
      'community',
      'speechrecognition',
      'SpeechRecognition.java',
    ),
    label: '@capacitor-community/speech-recognition: SpeechRecognition.java',
  },
];

let allOk = true;
for (const { src, dest, label } of patches) {
  if (!existsSync(src)) {
    console.warn(`[apply-patches] SKIP — patch source not found: ${src}`);
    continue;
  }
  if (!existsSync(dest)) {
    console.warn(`[apply-patches] SKIP — patch destination not found: ${dest}`);
    continue;
  }
  try {
    copyFileSync(src, dest);
    console.log(`[apply-patches] OK   — ${label}`);
  } catch (err) {
    console.error(`[apply-patches] FAIL — ${label}: ${err.message}`);
    allOk = false;
  }
}

if (!allOk) process.exit(1);
