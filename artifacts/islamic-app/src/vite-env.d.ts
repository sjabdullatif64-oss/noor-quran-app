/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_COMMIT_SHA?: string;
  readonly VITE_BUILD_VERSION?: string;
  readonly VITE_BUILD_CODE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
