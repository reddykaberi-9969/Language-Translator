/**
 * Fluentia — Translation API Configuration
 * ----------------------------------------
 * Set your API credentials here. Never commit real keys to public repos.
 *
 * Providers:
 *   - "microsoft" → Azure AI Translator (recommended for production)
 *   - "google"    → Google Cloud Translation API v2
 *   - "mymemory"  → Free demo API (no key, rate-limited; works in Live Server)
 */

window.CONFIG = {
  /** Active provider: "microsoft" | "google" | "mymemory" */
  provider: "mymemory",

  microsoft: {
    subscriptionKey: "",
    region: "eastus",
    endpoint: "https://api.cognitive.microsofttranslator.com",
  },

  google: {
    apiKey: "",
    endpoint: "https://translation.googleapis.com/language/translate/v2",
  },

  /** MyMemory — no key required; suitable for local development */
  mymemory: {
    endpoint: "https://api.mymemory.translated.net/get",
  },

  maxCharacters: 5000,
  historyLimit: 20,
};
