/// <reference types="vite/client" />

interface Window {
  fbq: (...args: unknown[]) => void;
  _fbq: unknown;
}
