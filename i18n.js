
(function () {
  const STRINGS = {
    en: {
      docTitleOptions: "Tumata — Settings",
      docTitlePopup: "Tumata",

      headerH1: "Tumata",
      headerSubHtml:
        "Automatically routes every download into a <code>Downloads/&lt;category&gt;/</code> subfolder based on its file extension.",

      enableLabel: "Enable extension",
      enableHint:
        "Disable this temporarily without uninstalling the extension.",
      conflictLabel:
        "When the destination folder already contains a file with the same name",
      conflictUniquify: "Auto-rename to \"name (1).ext\" (recommended)",
      conflictOverwrite: "Overwrite the existing file",
      conflictPrompt: "Ask me each time",
      langLabel: "Display language",
      langHint:
        "Language used for this settings page and the toolbar popup.",

      mappingsH2: "Extension → subfolder mappings",
      addRowBtn: "+ Add row",
      resetBtn: "Reset to defaults",
      mappingsHintHtml:
        "Subfolders are created inside your <code>Downloads</code> folder — Chrome does not allow extensions to write outside Downloads. Leave the subfolder field empty or click delete to disable a row.",
      thFolder: "Subfolder",
      thExtensions: "Extensions (comma-separated, no dots required)",
      placeholderFolder: "e.g. Music",
      placeholderExtensions: "mp3, opus, flac",
      deleteBtn: "Delete",

      backupH2: "Backup / Restore",
      backupHint:
        "Export every setting to a JSON file, or import a previously exported file.",
      exportBtn: "Export to JSON",
      importBtn: "Import from JSON",

      statsSuffix: "files have been organized since installation.",
      resetStatsBtn: "Reset counter",

      statusSaved: "Saved automatically",
      statusExported: "Configuration exported",
      statusImported: "Configuration imported",
      statusImportFailed: "Import failed:",
      statusCounterReset: "Counter reset",
      statusLanguageChanged: "Language changed",

      confirmReset:
        "Reset every mapping to its default value? Your customisations will be lost.",

      errMappingsArray: "The 'mappings' field must be an array.",

      popupBrand: "Tumata",
      popupStatusOn: "Active",
      popupStatusOff: "Disabled",
      popupToggleLabel: "Active",
      popupStatsSuffix: "files organized",
      popupOpenSettings: "Settings & mappings",

      creditMadeBy: "Made by"
    },

    id: {
      docTitleOptions: "Tumata — Pengaturan",
      docTitlePopup: "Tumata",

      headerH1: "Tumata",
      headerSubHtml:
        "Mengarahkan setiap unduhan ke subfolder <code>Downloads/&lt;kategori&gt;/</code> secara otomatis berdasarkan ekstensi berkasnya.",

      enableLabel: "Aktifkan ekstensi",
      enableHint:
        "Nonaktifkan sementara tanpa harus mencopot ekstensi.",
      conflictLabel:
        "Jika folder tujuan sudah memuat berkas dengan nama yang sama",
      conflictUniquify: "Ganti nama otomatis menjadi \"nama (1).ext\" (disarankan)",
      conflictOverwrite: "Timpa berkas yang lama",
      conflictPrompt: "Tanyakan setiap kali",
      langLabel: "Bahasa tampilan",
      langHint:
        "Bahasa yang digunakan untuk halaman pengaturan dan popup pada bilah alat.",

      mappingsH2: "Pemetaan ekstensi → subfolder",
      addRowBtn: "+ Tambah baris",
      resetBtn: "Kembalikan ke default",
      mappingsHintHtml:
        "Subfolder dibuat di dalam folder <code>Downloads</code> Anda — Chrome tidak mengizinkan ekstensi menyimpan berkas di luar folder Downloads. Kosongkan kolom subfolder atau klik tombol hapus untuk menonaktifkan suatu baris.",
      thFolder: "Subfolder",
      thExtensions: "Ekstensi (pisahkan dengan koma, tanpa tanda titik)",
      placeholderFolder: "mis. Music",
      placeholderExtensions: "mp3, opus, flac",
      deleteBtn: "Hapus",

      backupH2: "Cadangan / Pemulihan",
      backupHint:
        "Ekspor seluruh pengaturan ke berkas JSON, atau impor dari berkas yang sebelumnya telah diekspor.",
      exportBtn: "Ekspor ke JSON",
      importBtn: "Impor dari JSON",

      statsSuffix: "berkas telah dirapikan sejak ekstensi terpasang.",
      resetStatsBtn: "Setel ulang penghitung",

      statusSaved: "Tersimpan otomatis",
      statusExported: "Konfigurasi berhasil diekspor",
      statusImported: "Konfigurasi berhasil diimpor",
      statusImportFailed: "Impor gagal:",
      statusCounterReset: "Penghitung disetel ulang",
      statusLanguageChanged: "Bahasa diubah",

      confirmReset:
        "Kembalikan seluruh pemetaan ke nilai default? Penyesuaian Anda akan hilang.",

      errMappingsArray: "Kolom 'mappings' harus berupa larik (array).",

      popupBrand: "Tumata",
      popupStatusOn: "Aktif",
      popupStatusOff: "Nonaktif",
      popupToggleLabel: "Aktif",
      popupStatsSuffix: "berkas telah dirapikan",
      popupOpenSettings: "Pengaturan & pemetaan",

      creditMadeBy: "Dibuat oleh"
    }
  };

  const AVAILABLE = ["id", "en"];

  let currentLang = "en";

  function detectDefault() {
    try {
      const ui = (chrome.i18n && chrome.i18n.getUILanguage
        ? chrome.i18n.getUILanguage()
        : (navigator.language || "en")).toLowerCase();
      return ui.startsWith("id") ? "id" : "en";
    } catch (_) {
      return "en";
    }
  }

  async function init() {
    const stored = await chrome.storage.sync.get("language");
    if (stored && stored.language && STRINGS[stored.language]) {
      currentLang = stored.language;
    } else {
      currentLang = detectDefault();
    }
  }

  function t(key) {
    const table = STRINGS[currentLang] || STRINGS.en;
    if (key in table) return table[key];
    return STRINGS.en[key] != null ? STRINGS.en[key] : key;
  }

  function getLanguage() {
    return currentLang;
  }

  async function setLanguage(lang) {
    if (!STRINGS[lang]) throw new Error("Unsupported language: " + lang);
    currentLang = lang;
    await chrome.storage.sync.set({ language: lang });
  }

  function applyToDocument(root) {
    const r = root || document;

    for (const el of r.querySelectorAll("[data-i18n]")) {
      el.textContent = t(el.dataset.i18n);
    }
    for (const el of r.querySelectorAll("[data-i18n-html]")) {
      el.innerHTML = t(el.dataset.i18nHtml);
    }
    for (const el of r.querySelectorAll("[data-i18n-placeholder]")) {
      el.placeholder = t(el.dataset.i18nPlaceholder);
    }
    for (const el of r.querySelectorAll("[data-i18n-title]")) {
      el.title = t(el.dataset.i18nTitle);
    }
    for (const el of r.querySelectorAll("[data-i18n-aria-label]")) {
      el.setAttribute("aria-label", t(el.dataset.i18nAriaLabel));
    }

    const titleKey = document.documentElement.dataset.i18nTitle;
    if (titleKey) document.title = t(titleKey);
  }

  globalThis.i18n = {
    init,
    t,
    getLanguage,
    setLanguage,
    applyToDocument,
    AVAILABLE
  };
})();
