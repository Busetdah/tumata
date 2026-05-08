
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

const $enabled        = document.getElementById("enabled");
const $conflictAction = document.getElementById("conflictAction");
const $tableBody      = document.querySelector("#mappings tbody");
const $addRow         = document.getElementById("addRow");
const $reset          = document.getElementById("reset");
const $exportBtn      = document.getElementById("export");
const $importBtn      = document.getElementById("import");
const $importFile     = document.getElementById("importFile");
const $routedCount    = document.getElementById("routedCount");
const $resetStats     = document.getElementById("resetStats");
const $status         = document.getElementById("status");

function flash(msg, isError = false) {
  $status.textContent = msg;
  $status.classList.toggle("error", isError);
  $status.classList.add("show");
  clearTimeout(flash._t);
  flash._t = setTimeout(() => $status.classList.remove("show"), 1600);
}

function makeRow(folder = "", extensions = []) {
  const tr = document.createElement("tr");

  const tdFolder = document.createElement("td");
  const inFolder = document.createElement("input");
  inFolder.type = "text";
  inFolder.placeholder = "e.g. Music";
  inFolder.value = folder;
  inFolder.addEventListener("input", queueSave);
  tdFolder.appendChild(inFolder);

  const tdExts = document.createElement("td");
  const inExts = document.createElement("input");
  inExts.type = "text";
  inExts.placeholder = "mp3, opus, flac";
  inExts.value = extensions.join(", ");
  inExts.addEventListener("input", queueSave);
  tdExts.appendChild(inExts);

  const tdDel = document.createElement("td");
  const btnDel = document.createElement("button");
  btnDel.className = "btn danger small";
  btnDel.textContent = "Delete";
  btnDel.addEventListener("click", () => {
    tr.remove();
    queueSave();
  });
  tdDel.appendChild(btnDel);

  tr.append(tdFolder, tdExts, tdDel);
  return tr;
}

function readMappingsFromTable() {
  const out = [];
  for (const tr of $tableBody.querySelectorAll("tr")) {
    const [folderInput, extsInput] = tr.querySelectorAll("input[type=text]");
    const folder = folderInput.value.trim();
    const exts = extsInput.value
      .split(/[,\s]+/)
      .map(s => s.trim().replace(/^\./, "").toLowerCase())
      .filter(Boolean);
    if (!folder || exts.length === 0) continue;
    out.push({ folder, extensions: exts });
  }
  return out;
}

function renderMappings(mappings) {
  $tableBody.innerHTML = "";
  for (const m of mappings) {
    $tableBody.appendChild(makeRow(m.folder, m.extensions));
  }
}

let _saveTimer = null;
function queueSave() {
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(save, 250);
}

async function save() {
  const mappings = readMappingsFromTable();
  await chrome.storage.sync.set({
    enabled: $enabled.checked,
    conflictAction: $conflictAction.value,
    mappings
  });
  flash("Saved automatically");
}

async function load() {
  const stored = await chrome.storage.sync.get(["enabled", "conflictAction", "mappings"]);
  $enabled.checked = stored.enabled !== false;
  $conflictAction.value = stored.conflictAction || "uniquify";
  const mappings = Array.isArray(stored.mappings) && stored.mappings.length > 0
    ? stored.mappings
    : DEFAULT_MAPPINGS;
  renderMappings(mappings);

  const local = await chrome.storage.local.get("routedCount");
  $routedCount.textContent = String(local.routedCount || 0);
}


$enabled.addEventListener("change", queueSave);
$conflictAction.addEventListener("change", queueSave);

$addRow.addEventListener("click", () => {
  const tr = makeRow("", []);
  $tableBody.appendChild(tr);
  tr.querySelector("input[type=text]").focus();
});

$reset.addEventListener("click", async () => {
  if (!confirm("Reset every mapping to its default value? Your customisations will be lost.")) return;
  renderMappings(DEFAULT_MAPPINGS);
  $enabled.checked = true;
  $conflictAction.value = "uniquify";
  await save();
});

$exportBtn.addEventListener("click", async () => {
  const stored = await chrome.storage.sync.get(["enabled", "conflictAction", "mappings"]);
  const blob = new Blob([JSON.stringify(stored, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "tumata-config.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  flash("Configuration exported");
});

$importBtn.addEventListener("click", () => $importFile.click());
$importFile.addEventListener("change", async (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    if (!Array.isArray(data.mappings)) throw new Error("The 'mappings' field must be an array.");
    await chrome.storage.sync.set({
      enabled: data.enabled !== false,
      conflictAction: data.conflictAction || "uniquify",
      mappings: data.mappings
    });
    await load();
    flash("Configuration imported");
  } catch (err) {
    flash("Import failed: " + err.message, true);
  } finally {
    $importFile.value = "";
  }
});

$resetStats.addEventListener("click", async () => {
  await chrome.storage.local.set({ routedCount: 0 });
  $routedCount.textContent = "0";
  flash("Counter reset");
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.routedCount) {
    $routedCount.textContent = String(changes.routedCount.newValue || 0);
  }
});

load();
