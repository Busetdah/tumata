
const $enabled     = document.getElementById("enabled");
const $status      = document.getElementById("status");
const $routedCount = document.getElementById("routedCount");
const $openOptions = document.getElementById("openOptions");

function paintStatus(enabled) {
  $status.textContent = enabled ? "Active" : "Disabled";
  $status.classList.toggle("on", enabled);
}

async function load() {
  const sync  = await chrome.storage.sync.get(["enabled"]);
  const local = await chrome.storage.local.get(["routedCount"]);
  const enabled = sync.enabled !== false;
  $enabled.checked = enabled;
  paintStatus(enabled);
  $routedCount.textContent = String(local.routedCount || 0);
}

$enabled.addEventListener("change", async () => {
  await chrome.storage.sync.set({ enabled: $enabled.checked });
  paintStatus($enabled.checked);
});

$openOptions.addEventListener("click", () => {
  if (chrome.runtime.openOptionsPage) {
    chrome.runtime.openOptionsPage();
  } else {
    window.open(chrome.runtime.getURL("options.html"));
  }
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.routedCount) {
    $routedCount.textContent = String(changes.routedCount.newValue || 0);
  }
  if (area === "sync" && changes.enabled) {
    const v = changes.enabled.newValue !== false;
    $enabled.checked = v;
    paintStatus(v);
  }
});

load();
