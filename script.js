/**
 * Fluentia — Language Translation Tool
 * Modular vanilla JS with async translation providers
 */

(function () {
  "use strict";

  const cfg = window.CONFIG;
  const STORAGE_KEYS = {
    theme: "fluentia_theme",
    history: "fluentia_history",
  };

  const LANG_LABELS = {
    auto: "Auto Detect",
    en: "English",
    hi: "Hindi",
    fr: "French",
    es: "Spanish",
    de: "German",
  };

  /** DOM references */
  const els = {
    html: document.documentElement,
    themeToggle: document.getElementById("themeToggle"),
    sourceLang: document.getElementById("sourceLang"),
    targetLang: document.getElementById("targetLang"),
    sourceText: document.getElementById("sourceText"),
    outputText: document.getElementById("outputText"),
    charCount: document.getElementById("charCount"),
    translateBtn: document.getElementById("translateBtn"),
    swapBtn: document.getElementById("swapBtn"),
    copyBtn: document.getElementById("copyBtn"),
    speakBtn: document.getElementById("speakBtn"),
    downloadBtn: document.getElementById("downloadBtn"),
    historyList: document.getElementById("historyList"),
    clearHistoryBtn: document.getElementById("clearHistoryBtn"),
    toastContainer: document.getElementById("toastContainer"),
  };

  let currentTranslation = "";
  let isTranslating = false;
  let speechUtterance = null;

  // ---------------------------------------------------------------------------
  // Initialization
  // ---------------------------------------------------------------------------

  function init() {
    initTheme();
    initCharCounter();
    bindEvents();
    renderHistory();
    updateOutputActions();
  }

  function initTheme() {
    const saved = localStorage.getItem(STORAGE_KEYS.theme);
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const theme = saved || (prefersDark ? "dark" : "light");
    applyTheme(theme);
    els.themeToggle.checked = theme === "dark";
  }

  function applyTheme(theme) {
    els.html.setAttribute("data-theme", theme);
    localStorage.setItem(STORAGE_KEYS.theme, theme);
  }

  function initCharCounter() {
    updateCharCount();
  }

  function bindEvents() {
    els.themeToggle.addEventListener("change", () => {
      applyTheme(els.themeToggle.checked ? "dark" : "light");
    });

    els.sourceText.addEventListener("input", updateCharCount);
    els.translateBtn.addEventListener("click", handleTranslate);
    els.swapBtn.addEventListener("click", handleSwapLanguages);
    els.copyBtn.addEventListener("click", copyTranslation);
    els.downloadBtn.addEventListener("click", downloadTranslation);
    els.speakBtn.addEventListener("click", toggleSpeech);
    els.clearHistoryBtn.addEventListener("click", clearHistory);

    els.sourceText.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleTranslate();
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "c") {
        e.preventDefault();
        copyTranslation();
      }
    });

    els.outputText.addEventListener("keydown", (e) => {
      if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === "c") {
        const selected = window.getSelection()?.toString();
        if (!selected && currentTranslation) {
          e.preventDefault();
          copyTranslation();
        }
      }
    });

    els.sourceLang.addEventListener("change", onSourceLangChange);
  }

  function onSourceLangChange() {
    if (els.sourceLang.value === "auto" && els.targetLang.value === "auto") {
      els.targetLang.value = "en";
    }
  }

  // ---------------------------------------------------------------------------
  // Character counter
  // ---------------------------------------------------------------------------

  function updateCharCount() {
    const len = els.sourceText.value.length;
    const max = cfg.maxCharacters;
    els.charCount.textContent = `Characters: ${len} / ${max}`;
    els.charCount.classList.remove("char-count--warn", "char-count--limit");
    if (len >= max) {
      els.charCount.classList.add("char-count--limit");
    } else if (len >= max * 0.9) {
      els.charCount.classList.add("char-count--warn");
    }
  }

  // ---------------------------------------------------------------------------
  // Translation flow
  // ---------------------------------------------------------------------------

  async function handleTranslate() {
    const text = els.sourceText.value.trim();
    if (!text) {
      showToast("Please enter text to translate", "error");
      return;
    }

    if (els.sourceLang.value !== "auto" && els.sourceLang.value === els.targetLang.value) {
      showToast("Source and target languages must differ", "error");
      return;
    }

    if (isTranslating) return;

    isTranslating = true;
    setLoadingState(true);

    try {
      const source = els.sourceLang.value;
      const target = els.targetLang.value;
      let resolvedSource = source;

      if (source === "auto") {
        resolvedSource = await detectLanguage(text);
        showToast(`Detected: ${LANG_LABELS[resolvedSource] || resolvedSource}`, "success", 2000);
      }

      const translated = await translateText(text, resolvedSource, target);
      currentTranslation = translated;
      setOutput(translated);
      updateOutputActions();
      addToHistory({
        source: resolvedSource,
        target,
        sourceText: text,
        translatedText: translated,
        timestamp: Date.now(),
      });
      showToast("Translation complete", "success", 2000);
    } catch (err) {
      console.error(err);
      setOutput("");
      currentTranslation = "";
      updateOutputActions();
      showToast(err.message || "Translation failed. Check your API configuration.", "error");
    } finally {
      isTranslating = false;
      setLoadingState(false);
    }
  }

  function setLoadingState(loading) {
    els.translateBtn.disabled = loading;
    els.translateBtn.classList.toggle("is-loading", loading);

    if (loading) {
      els.outputText.classList.add("is-loading");
      els.outputText.innerHTML = `
        <div class="output-loader">
          <div class="spinner" role="status" aria-label="Translating"></div>
          <span>Translating…</span>
        </div>`;
    } else {
      els.outputText.classList.remove("is-loading");
    }
  }

  function setOutput(text) {
    els.outputText.classList.toggle("has-content", Boolean(text));
    if (text) {
      els.outputText.textContent = text;
    } else {
      els.outputText.innerHTML = '<span class="output-placeholder">Your translation will appear here...</span>';
      els.outputText.classList.remove("has-content");
    }
  }

  function updateOutputActions() {
    const hasText = Boolean(currentTranslation);
    els.copyBtn.disabled = !hasText;
    els.downloadBtn.disabled = !hasText;
    els.speakBtn.disabled = !hasText;
  }

  // ---------------------------------------------------------------------------
  // API providers
  // ---------------------------------------------------------------------------

  /**
   * Routes translation to the configured provider
   */
  async function translateText(text, sourceLang, targetLang) {
    const provider = cfg.provider;

    switch (provider) {
      case "microsoft":
        return translateMicrosoft(text, sourceLang, targetLang);
      case "google":
        return translateGoogle(text, sourceLang, targetLang);
      case "mymemory":
        return translateMyMemory(text, sourceLang, targetLang);
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }

  async function translateMicrosoft(text, sourceLang, targetLang) {
    const { subscriptionKey, region, endpoint } = cfg.microsoft;
    if (!subscriptionKey) {
      throw new Error("Microsoft Translator API key is missing in config.js");
    }

    const url = new URL(`${endpoint}/translate`);
    url.searchParams.set("api-version", "3.0");
    url.searchParams.set("to", targetLang);
    if (sourceLang && sourceLang !== "auto") {
      url.searchParams.set("from", sourceLang);
    }

    const response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": subscriptionKey,
        "Ocp-Apim-Subscription-Region": region,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([{ Text: text }]),
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(parseApiError(response.status, errBody, "Microsoft Translator"));
    }

    const data = await response.json();
    return data[0]?.translations?.[0]?.text ?? "";
  }

  async function translateGoogle(text, sourceLang, targetLang) {
    const { apiKey, endpoint } = cfg.google;
    if (!apiKey) {
      throw new Error("Google Translate API key is missing in config.js");
    }

    const url = new URL(endpoint);
    url.searchParams.set("key", apiKey);

    const body = {
      q: text,
      target: targetLang,
      format: "text",
    };
    if (sourceLang && sourceLang !== "auto") {
      body.source = sourceLang;
    }

    const response = await fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(parseApiError(response.status, errBody, "Google Translate"));
    }

    const data = await response.json();
    return data?.data?.translations?.[0]?.translatedText ?? "";
  }

  /**
   * MyMemory — free tier for local development (no API key)
   */
  async function translateMyMemory(text, sourceLang, targetLang) {
    const from = sourceLang === "auto" ? "en" : sourceLang;
    const url = new URL(cfg.mymemory.endpoint);
    url.searchParams.set("q", text);
    url.searchParams.set("langpair", `${from}|${targetLang}`);

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`MyMemory API error (${response.status})`);
    }

    const data = await response.json();
    if (data.responseStatus !== 200) {
      throw new Error(data.responseDetails || "MyMemory translation failed");
    }

    return data.responseData?.translatedText ?? "";
  }

  /**
   * Language detection (Microsoft or heuristic for demo)
   */
  async function detectLanguage(text) {
    if (cfg.provider === "microsoft" && cfg.microsoft.subscriptionKey) {
      return detectMicrosoft(text);
    }
    if (cfg.provider === "google" && cfg.google.apiKey) {
      return detectGoogle(text);
    }
    return detectHeuristic(text);
  }

  async function detectMicrosoft(text) {
    const { subscriptionKey, region, endpoint } = cfg.microsoft;
    const url = `${endpoint}/detect?api-version=3.0`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": subscriptionKey,
        "Ocp-Apim-Subscription-Region": region,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([{ Text: text }]),
    });

    if (!response.ok) {
      return detectHeuristic(text);
    }

    const data = await response.json();
    return data[0]?.language ?? "en";
  }

  async function detectGoogle(text) {
    const { apiKey } = cfg.google;
    const url = `https://translation.googleapis.com/language/translate/v2/detect?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: text }),
    });

    if (!response.ok) {
      return detectHeuristic(text);
    }

    const data = await response.json();
    return data?.data?.detections?.[0]?.[0]?.language ?? "en";
  }

  /** Simple Unicode-range heuristic when no detect API is available */
  function detectHeuristic(text) {
    if (/[\u0900-\u097F]/.test(text)) return "hi";
    if (/[\u0400-\u04FF]/.test(text)) return "ru";
    if (/[\u4E00-\u9FFF]/.test(text)) return "zh";
    if (/[äöüßÄÖÜ]/.test(text) || /\b(der|die|das|und|ist)\b/i.test(text)) return "de";
    if (/[àâçéèêëîïôùûü]/.test(text) || /\b(le|la|les|est|une)\b/i.test(text)) return "fr";
    if (/[ñáéíóúü¿¡]/.test(text) || /\b(el|la|los|que|por)\b/i.test(text)) return "es";
    return "en";
  }

  function parseApiError(status, body, service) {
    try {
      const json = JSON.parse(body);
      const msg = json.error?.message || json.message || body;
      return `${service} error (${status}): ${msg}`;
    } catch {
      return `${service} error (${status})`;
    }
  }

  // ---------------------------------------------------------------------------
  // Swap languages
  // ---------------------------------------------------------------------------

  function handleSwapLanguages() {
    const source = els.sourceLang;
    const target = els.targetLang;

    if (source.value === "auto") {
      showToast("Select a source language before swapping", "error");
      return;
    }

    els.swapBtn.classList.add("swapping");
    setTimeout(() => els.swapBtn.classList.remove("swapping"), 500);

    const tempLang = source.value;
    source.value = target.value;
    target.value = tempLang;

    const tempText = els.sourceText.value;
    els.sourceText.value = currentTranslation || "";
    if (currentTranslation) {
      setOutput(tempText);
      currentTranslation = tempText;
    }
    updateCharCount();
    updateOutputActions();
  }

  // ---------------------------------------------------------------------------
  // Copy, download, speech
  // ---------------------------------------------------------------------------

  async function copyTranslation() {
    if (!currentTranslation) {
      showToast("Nothing to copy", "error");
      return;
    }

    try {
      await navigator.clipboard.writeText(currentTranslation);
      showToast("Copied successfully", "success");
    } catch {
      showToast("Failed to copy to clipboard", "error");
    }
  }

  function downloadTranslation() {
    if (!currentTranslation) return;

    const blob = new Blob([currentTranslation], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fluentia-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("Download started", "success", 2000);
  }

  function toggleSpeech() {
    if (!currentTranslation || !window.speechSynthesis) {
      showToast("Text-to-speech is not supported in this browser", "error");
      return;
    }

    if (els.speakBtn.classList.contains("is-speaking")) {
      window.speechSynthesis.cancel();
      els.speakBtn.classList.remove("is-speaking");
      return;
    }

    window.speechSynthesis.cancel();
    speechUtterance = new SpeechSynthesisUtterance(currentTranslation);
    speechUtterance.lang = mapLangToBCP47(els.targetLang.value);

    speechUtterance.onend = () => els.speakBtn.classList.remove("is-speaking");
    speechUtterance.onerror = () => els.speakBtn.classList.remove("is-speaking");

    els.speakBtn.classList.add("is-speaking");
    window.speechSynthesis.speak(speechUtterance);
  }

  function mapLangToBCP47(code) {
    const map = { en: "en-US", hi: "hi-IN", fr: "fr-FR", es: "es-ES", de: "de-DE" };
    return map[code] || code;
  }

  // ---------------------------------------------------------------------------
  // History (localStorage)
  // ---------------------------------------------------------------------------

  function getHistory() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.history) || "[]");
    } catch {
      return [];
    }
  }

  function saveHistory(items) {
    localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(items));
  }

  function addToHistory(entry) {
    let items = getHistory();
    items.unshift(entry);
    items = items.slice(0, cfg.historyLimit);
    saveHistory(items);
    renderHistory();
  }

  function renderHistory() {
    const items = getHistory();

    if (!items.length) {
      els.historyList.innerHTML =
        '<p class="history-empty">No translations yet. Your recent work will show up here.</p>';
      return;
    }

    els.historyList.innerHTML = items
      .map(
        (item) => `
      <article class="history-card" data-id="${item.timestamp}" tabindex="0" role="button">
        <div class="history-card__langs">${escapeHtml(LANG_LABELS[item.source] || item.source)} → ${escapeHtml(LANG_LABELS[item.target] || item.target)}</div>
        <p class="history-card__source">${escapeHtml(truncate(item.sourceText, 120))}</p>
        <p class="history-card__target">${escapeHtml(truncate(item.translatedText, 120))}</p>
        <time class="history-card__time">${formatTime(item.timestamp)}</time>
      </article>`
      )
      .join("");

    els.historyList.querySelectorAll(".history-card").forEach((card) => {
      const id = Number(card.dataset.id);
      const item = items.find((i) => i.timestamp === id);
      const activate = () => loadHistoryItem(item);
      card.addEventListener("click", activate);
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          activate();
        }
      });
    });
  }

  function loadHistoryItem(item) {
    if (!item) return;
    els.sourceLang.value = item.source === "auto" ? "auto" : item.source;
    els.targetLang.value = item.target;
    els.sourceText.value = item.sourceText;
    currentTranslation = item.translatedText;
    setOutput(item.translatedText);
    updateCharCount();
    updateOutputActions();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function clearHistory() {
    saveHistory([]);
    renderHistory();
    showToast("History cleared", "success", 2000);
  }

  // ---------------------------------------------------------------------------
  // Toast notifications
  // ---------------------------------------------------------------------------

  function showToast(message, type = "success", duration = 3200) {
    const toast = document.createElement("div");
    toast.className = `toast toast--${type}`;
    toast.setAttribute("role", "alert");
    toast.textContent = message;
    els.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.add("toast--out");
      toast.addEventListener("animationend", () => toast.remove());
    }, duration);
  }

  // ---------------------------------------------------------------------------
  // Utilities
  // ---------------------------------------------------------------------------

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function truncate(str, max) {
    if (str.length <= max) return str;
    return `${str.slice(0, max)}…`;
  }

  function formatTime(ts) {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(ts));
  }

  document.addEventListener("DOMContentLoaded", init);
})();
