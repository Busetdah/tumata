
const DEFAULT_MAPPINGS = [
  { folder: "Programs",       extensions: ["exe", "msi", "bat", "cmd", "appimage", "dmg", "pkg", "deb", "rpm", "appx", "appxbundle", "msix", "snap", "flatpak"] },
  { folder: "Apps",           extensions: ["apk", "aab", "xapk", "ipa"] },
  { folder: "SketchUp",       extensions: ["skp", "skb", "layout"] },
  { folder: "3D",             extensions: ["blend", "blend1", "max", "c4d", "fbx", "obj", "stl", "dae", "gltf", "glb", "dwg", "dxf", "step", "stp", "iges", "igs", "3ds", "ma", "mb", "lwo", "lws", "usd", "usdc", "usda", "usdz"] },
  { folder: "Design",         extensions: ["psd", "psb", "ai", "eps", "sketch", "fig", "xd", "indd", "idml", "cdr", "afdesign", "afphoto", "afpub", "procreate", "kra", "clip", "csp"] },
  { folder: "Video Projects", extensions: ["prproj", "aep", "drp", "veg", "fcpbundle", "kdenlive", "mlt"] },
  { folder: "Audio Projects", extensions: ["flp", "als", "logicx", "logic", "aup", "aup3", "ptx", "rpp", "band", "ses", "reapeaks"] },
  { folder: "Music",          extensions: ["mp3", "opus", "wav", "flac", "m4a", "aac", "ogg", "wma", "mid", "midi", "aiff", "alac"] },
  { folder: "Videos",         extensions: ["mp4", "mkv", "avi", "mov", "webm", "wmv", "m4v", "flv", "mpeg", "mpg", "ts", "m2ts", "vob", "ogv"] },
  { folder: "Pictures",       extensions: ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg", "ico", "tiff", "tif", "heic", "heif", "raw", "dng", "cr2", "cr3", "nef", "arw", "orf", "rw2", "avif"] },
  { folder: "eBooks",         extensions: ["epub", "mobi", "azw", "azw3", "azw4", "fb2", "lit", "djvu", "kfx"] },
  { folder: "Documents",      extensions: ["pdf", "docx", "doc", "xlsx", "xls", "pptx", "ppt", "txt", "rtf", "odt", "ods", "odp", "csv", "tsv", "pages", "numbers", "key", "md", "markdown", "tex"] },
  { folder: "Archives",       extensions: ["zip", "rar", "7z", "tar", "gz", "bz2", "xz", "tgz", "tbz", "tbz2", "txz", "zst", "lzh", "ace", "cab"] },
  { folder: "Disk Images",    extensions: ["iso", "img", "vhd", "vhdx", "vmdk", "qcow2", "vdi"] },
  { folder: "Code",           extensions: ["py", "ipynb", "js", "ts", "tsx", "jsx", "html", "htm", "css", "scss", "sass", "less", "c", "cpp", "cc", "cxx", "h", "hpp", "cs", "java", "kt", "kts", "swift", "go", "rs", "rb", "php", "sql", "sh", "ps1", "lua", "dart", "json", "yaml", "yml", "xml", "toml", "ini", "conf"] },
  { folder: "Fonts",          extensions: ["ttf", "otf", "woff", "woff2", "eot"] },
  { folder: "Subtitles",      extensions: ["srt", "vtt", "ass", "ssa", "sub", "idx", "smi"] },
  { folder: "Torrents",       extensions: ["torrent"] }
];

const DEFAULT_SETTINGS = {
  enabled: true,
  conflictAction: "uniquify",
  mappings: DEFAULT_MAPPINGS,
  routedCount: 0
};


function getBaseName(filename) {
  const lastSlash = Math.max(filename.lastIndexOf("/"), filename.lastIndexOf("\\"));
  return lastSlash >= 0 ? filename.substring(lastSlash + 1) : filename;
}

function getExtension(filename) {
  const base = getBaseName(filename);
  const idx = base.lastIndexOf(".");
  if (idx <= 0) return "";
  return base.substring(idx + 1).toLowerCase();
}

function sanitizeFolder(folder) {
  if (!folder) return "";
  return String(folder)
    .replace(/[\\\/]+/g, "/")
    .replace(/^\/+|\/+$/g, "")
    .replace(/\.\.+/g, ".")
    .trim();
}

async function getSettings() {
  const stored = await chrome.storage.sync.get([
    "enabled", "conflictAction", "mappings"
  ]);
  return {
    enabled: stored.enabled !== false,
    conflictAction: stored.conflictAction || DEFAULT_SETTINGS.conflictAction,
    mappings: Array.isArray(stored.mappings) && stored.mappings.length > 0
      ? stored.mappings
      : DEFAULT_MAPPINGS
  };
}

async function bumpRoutedCount() {
  const { routedCount = 0 } = await chrome.storage.local.get("routedCount");
  await chrome.storage.local.set({ routedCount: routedCount + 1 });
}

function findFolderForExtension(mappings, ext) {
  if (!ext) return null;
  for (const m of mappings) {
    if (!m || !Array.isArray(m.extensions)) continue;
    for (const e of m.extensions) {
      if (String(e).toLowerCase().replace(/^\./, "") === ext) {
        return sanitizeFolder(m.folder);
      }
    }
  }
  return null;
}


chrome.runtime.onInstalled.addListener(async () => {
  const stored = await chrome.storage.sync.get(["enabled", "conflictAction", "mappings"]);
  const patch = {};
  if (typeof stored.enabled === "undefined")        patch.enabled = DEFAULT_SETTINGS.enabled;
  if (typeof stored.conflictAction === "undefined") patch.conflictAction = DEFAULT_SETTINGS.conflictAction;
  if (!Array.isArray(stored.mappings) || stored.mappings.length === 0) {
    patch.mappings = DEFAULT_MAPPINGS;
  }
  if (Object.keys(patch).length > 0) {
    await chrome.storage.sync.set(patch);
  }
});


chrome.downloads.onDeterminingFilename.addListener((item, suggest) => {
  (async () => {
    try {
      const settings = await getSettings();
      if (!settings.enabled) {
        suggest();
        return;
      }

      const baseName = getBaseName(item.filename);
      const ext = getExtension(baseName);
      const folder = findFolderForExtension(settings.mappings, ext);

      if (!folder) {
        suggest();
        return;
      }

      const newPath = `${folder}/${baseName}`;
      suggest({ filename: newPath, conflictAction: settings.conflictAction });

      bumpRoutedCount().catch(() => {});
    } catch (err) {
      console.error("[Tumata] error:", err);
      try { suggest(); } catch (_) {  }
    }
  })();
  return true;
});
