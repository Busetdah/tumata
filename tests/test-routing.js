
const fs = require("fs");
const path = require("path");
const vm = require("vm");

function makeChromeMock(initialSync = {}) {
  const syncStore  = { ...initialSync };
  const localStore = {};
  const onInstalledListeners = [];
  let onDeterminingFilenameListener = null;

  return {
    chrome: {
      storage: {
        sync: {
          async get(keys) {
            if (typeof keys === "string") return { [keys]: syncStore[keys] };
            const out = {};
            for (const k of keys) out[k] = syncStore[k];
            return out;
          },
          async set(obj) { Object.assign(syncStore, obj); }
        },
        local: {
          async get(keys) {
            if (typeof keys === "string") return { [keys]: localStore[keys] };
            const out = {};
            const list = Array.isArray(keys) ? keys : Object.keys(keys);
            for (const k of list) out[k] = localStore[k];
            return out;
          },
          async set(obj) { Object.assign(localStore, obj); }
        },
        onChanged: { addListener() {} }
      },
      runtime: {
        onInstalled: { addListener: fn => onInstalledListeners.push(fn) }
      },
      downloads: {
        onDeterminingFilename: {
          addListener: fn => { onDeterminingFilenameListener = fn; }
        }
      }
    },
    syncStore,
    localStore,
    fireOnInstalled: () => Promise.all(onInstalledListeners.map(f => f())),
    getListener: () => onDeterminingFilenameListener
  };
}

function loadBackground(initial = {}) {
  const code = fs.readFileSync(
    path.join(__dirname, "..", "background.js"), "utf8"
  );
  const harness = makeChromeMock(initial);
  const ctx = {
    chrome: harness.chrome,
    console,
    setTimeout, clearTimeout
  };
  vm.createContext(ctx);
  vm.runInContext(code, ctx, { filename: "background.js" });
  return harness;
}

let passed = 0, failed = 0;
function eq(actual, expected, msg) {
  const a = JSON.stringify(actual), b = JSON.stringify(expected);
  if (a === b) { passed++; console.log(`  PASS  ${msg}`); }
  else         { failed++; console.log(`  FAIL  ${msg}\n    expected ${b}\n    got      ${a}`); }
}

async function test(name, fn) {
  console.log(`\n# ${name}`);
  await fn();
}

function invokeListener(harness, item) {
  return new Promise((resolve) => {
    let captured = "NOT_CALLED";
    const suggest = (arg) => { captured = arg === undefined ? null : arg; };
    const ret = harness.getListener()(item, suggest);
    setTimeout(() => resolve({ captured, returnedTrue: ret === true }), 20);
  });
}

(async () => {

  await test("default mappings: mp3 routes to Music/", async () => {
    const h = loadBackground();
    await h.fireOnInstalled();
    const { captured, returnedTrue } =
      await invokeListener(h, { filename: "song.mp3" });
    eq(returnedTrue, true, "listener returns true (async channel)");
    eq(captured, { filename: "Music/song.mp3", conflictAction: "uniquify" },
       "mp3 -> Music/song.mp3 with uniquify");
  });

  await test("exe routes to Programs/", async () => {
    const h = loadBackground();
    const r = await invokeListener(h, { filename: "installer.exe" });
    eq(r.captured, { filename: "Programs/installer.exe", conflictAction: "uniquify" },
       "exe -> Programs/installer.exe");
  });

  await test("jpg routes to Pictures/", async () => {
    const h = loadBackground();
    const r = await invokeListener(h, { filename: "photo.JPG" });
    eq(r.captured, { filename: "Pictures/photo.JPG", conflictAction: "uniquify" },
       "case-insensitive ext, original filename preserved");
  });

  await test("zip routes to Archives/", async () => {
    const h = loadBackground();
    const r = await invokeListener(h, { filename: "release.zip" });
    eq(r.captured, { filename: "Archives/release.zip", conflictAction: "uniquify" },
       "zip -> Archives/release.zip");
  });

  await test("multi-dot filenames pick last extension", async () => {
    const h = loadBackground();
    const r = await invokeListener(h, { filename: "data.tar.gz" });
    eq(r.captured, { filename: "Archives/data.tar.gz", conflictAction: "uniquify" },
       "data.tar.gz -> Archives (gz matches)");
  });

  await test("input with subdir is normalized to basename", async () => {
    const h = loadBackground();
    const r = await invokeListener(h, { filename: "weird/dir/song.mp3" });
    eq(r.captured, { filename: "Music/song.mp3", conflictAction: "uniquify" },
       "subdir prefix is stripped before routing");
  });

  await test("unmapped extension passes through (no suggestion)", async () => {
    const h = loadBackground();
    const r = await invokeListener(h, { filename: "notes.xyzunknown" });
    eq(r.captured, null, "suggest() called with no args (Chrome default location)");
  });

  await test("file with no extension passes through", async () => {
    const h = loadBackground();
    const r = await invokeListener(h, { filename: "README" });
    eq(r.captured, null, "no extension -> no rerouting");
  });

  await test("hidden file (.env) passes through", async () => {
    const h = loadBackground();
    const r = await invokeListener(h, { filename: ".env" });
    eq(r.captured, null, "leading-dot file is treated as no extension");
  });

  await test("disabled state passes through", async () => {
    const h = loadBackground({ enabled: false });
    const r = await invokeListener(h, { filename: "song.mp3" });
    eq(r.captured, null, "when enabled=false, no rerouting even for mapped types");
  });

  await test("conflictAction is forwarded", async () => {
    const h = loadBackground({ conflictAction: "overwrite" });
    const r = await invokeListener(h, { filename: "song.mp3" });
    eq(r.captured, { filename: "Music/song.mp3", conflictAction: "overwrite" },
       "user setting passes through to suggest()");
  });

  await test("custom mapping wins over defaults", async () => {
    const h = loadBackground({
      mappings: [
        { folder: "MyMusic", extensions: ["mp3"] },
        { folder: "MyZips",  extensions: ["zip"] }
      ]
    });
    const r1 = await invokeListener(h, { filename: "x.mp3" });
    const r2 = await invokeListener(h, { filename: "x.zip" });
    const r3 = await invokeListener(h, { filename: "x.exe" });
    eq(r1.captured, { filename: "MyMusic/x.mp3", conflictAction: "uniquify" },
       "mp3 -> custom MyMusic");
    eq(r2.captured, { filename: "MyZips/x.zip", conflictAction: "uniquify" },
       "zip -> custom MyZips");
    eq(r3.captured, null, "exe not in custom map -> passes through");
  });

  await test("folder names with backslashes / extra slashes are sanitized", async () => {
    const h = loadBackground({
      mappings: [{ folder: "//Sub\\Music//", extensions: ["mp3"] }]
    });
    const r = await invokeListener(h, { filename: "song.mp3" });
    eq(r.captured, { filename: "Sub/Music/song.mp3", conflictAction: "uniquify" },
       "leading/trailing slashes stripped, backslashes normalized");
  });

  await test("ext entries with leading dot are accepted", async () => {
    const h = loadBackground({
      mappings: [{ folder: "Music", extensions: [".mp3", ".OPUS"] }]
    });
    const r = await invokeListener(h, { filename: "song.opus" });
    eq(r.captured, { filename: "Music/song.opus", conflictAction: "uniquify" },
       "leading dots and uppercase in mapping are tolerated");
  });

  await test("routedCount increments on a successful route", async () => {
    const h = loadBackground();
    await invokeListener(h, { filename: "a.mp3" });
    await invokeListener(h, { filename: "b.mp3" });
    await invokeListener(h, { filename: "c.unknown" });
    await new Promise(r => setTimeout(r, 30));
    eq(h.localStore.routedCount, 2, "counter increments only for routed files");
  });


  await test("psd routes to Design/", async () => {
    const h = loadBackground();
    const r = await invokeListener(h, { filename: "mockup.psd" });
    eq(r.captured, { filename: "Design/mockup.psd", conflictAction: "uniquify" },
       "psd -> Design/");
  });

  await test("ai (Illustrator) routes to Design/", async () => {
    const h = loadBackground();
    const r = await invokeListener(h, { filename: "logo.ai" });
    eq(r.captured, { filename: "Design/logo.ai", conflictAction: "uniquify" },
       "ai -> Design/");
  });

  await test("blend routes to 3D/", async () => {
    const h = loadBackground();
    const r = await invokeListener(h, { filename: "scene.blend" });
    eq(r.captured, { filename: "3D/scene.blend", conflictAction: "uniquify" },
       "blend -> 3D/");
  });

  await test("skp routes to SketchUp/", async () => {
    const h = loadBackground();
    const r = await invokeListener(h, { filename: "house.skp" });
    eq(r.captured, { filename: "SketchUp/house.skp", conflictAction: "uniquify" },
       "skp -> SketchUp/");
  });

  await test("stl routes to 3D/", async () => {
    const h = loadBackground();
    const r = await invokeListener(h, { filename: "part.stl" });
    eq(r.captured, { filename: "3D/part.stl", conflictAction: "uniquify" },
       "stl -> 3D/");
  });

  await test("apk routes to Apps/", async () => {
    const h = loadBackground();
    const r = await invokeListener(h, { filename: "myapp.apk" });
    eq(r.captured, { filename: "Apps/myapp.apk", conflictAction: "uniquify" },
       "apk -> Apps/");
  });

  await test("ipa routes to Apps/", async () => {
    const h = loadBackground();
    const r = await invokeListener(h, { filename: "ios-app.ipa" });
    eq(r.captured, { filename: "Apps/ios-app.ipa", conflictAction: "uniquify" },
       "ipa -> Apps/");
  });

  await test("srt routes to Subtitles/", async () => {
    const h = loadBackground();
    const r = await invokeListener(h, { filename: "movie.srt" });
    eq(r.captured, { filename: "Subtitles/movie.srt", conflictAction: "uniquify" },
       "srt -> Subtitles/");
  });

  await test("epub routes to eBooks/ (declared before Documents)", async () => {
    const h = loadBackground();
    const r = await invokeListener(h, { filename: "book.epub" });
    eq(r.captured, { filename: "eBooks/book.epub", conflictAction: "uniquify" },
       "epub -> eBooks/, not Documents/");
  });

  await test("pdf routes to Documents/", async () => {
    const h = loadBackground();
    const r = await invokeListener(h, { filename: "report.pdf" });
    eq(r.captured, { filename: "Documents/report.pdf", conflictAction: "uniquify" },
       "pdf -> Documents/");
  });

  await test("ttf routes to Fonts/", async () => {
    const h = loadBackground();
    const r = await invokeListener(h, { filename: "Inter.ttf" });
    eq(r.captured, { filename: "Fonts/Inter.ttf", conflictAction: "uniquify" },
       "ttf -> Fonts/");
  });

  await test("torrent routes to Torrents/", async () => {
    const h = loadBackground();
    const r = await invokeListener(h, { filename: "ubuntu.torrent" });
    eq(r.captured, { filename: "Torrents/ubuntu.torrent", conflictAction: "uniquify" },
       "torrent -> Torrents/");
  });

  await test("iso routes to Disk Images/", async () => {
    const h = loadBackground();
    const r = await invokeListener(h, { filename: "ubuntu-24.04.iso" });
    eq(r.captured, { filename: "Disk Images/ubuntu-24.04.iso", conflictAction: "uniquify" },
       "iso -> Disk Images/");
  });

  await test("py routes to Code/", async () => {
    const h = loadBackground();
    const r = await invokeListener(h, { filename: "script.py" });
    eq(r.captured, { filename: "Code/script.py", conflictAction: "uniquify" },
       "py -> Code/");
  });

  await test("prproj routes to Video Projects/", async () => {
    const h = loadBackground();
    const r = await invokeListener(h, { filename: "edit.prproj" });
    eq(r.captured, { filename: "Video Projects/edit.prproj", conflictAction: "uniquify" },
       "prproj -> 'Video Projects/' (with space)");
  });

  await test("flp routes to Audio Projects/", async () => {
    const h = loadBackground();
    const r = await invokeListener(h, { filename: "track.flp" });
    eq(r.captured, { filename: "Audio Projects/track.flp", conflictAction: "uniquify" },
       "flp -> 'Audio Projects/' (with space)");
  });

  await test("dmg routes to Programs/ (declared before Disk Images)", async () => {
    const h = loadBackground();
    const r = await invokeListener(h, { filename: "App.dmg" });
    eq(r.captured, { filename: "Programs/App.dmg", conflictAction: "uniquify" },
       "dmg -> Programs/, since dmg is mainly a Mac installer");
  });

  console.log(`\n=== ${passed} passed, ${failed} failed ===`);
  process.exit(failed === 0 ? 0 : 1);
})();
