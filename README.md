# Tumata

<p align="center">
  <img src="icon.svg" width="312" height="312" alt="Tumata logo">
</p>

> *Tumata* is Javanese for "neatly arranged, in order".

Tumata is a small extension for Chromium-based browsers that auto-organises every download into a `Downloads/<category>/` subfolder based on the file extension. Once it is installed you do not have to think about it: download a `.mp3`, find it in `Downloads/Music/`; download a `.skp`, find it in `Downloads/SketchUp/`; download an `.iso`, find it in `Downloads/Disk Images/`.

The extension is intentionally tiny: routing logic, a settings page, a toolbar popup, and the unit tests that keep them honest. Manifest V3 service worker, no bundler, no remote fetches, no bundled fonts.

## Install (unpacked)

1. Download or clone this repository, or extract the [release](https://github.com/Busetdah/tumata/releases) zip.
2. Open the **Extensions** page in your Chromium-based browser.
3. Toggle **Developer mode** on.
4. Click **Load unpacked** and pick the folder containing `manifest.json`.
5. Tumata's icon appears in the toolbar.

The folder must stay where it is the browser loads the extension from disk every time it starts, so move and forget puts it in a confused state.

## Quick tutorial

1. Open the **Extensions** page in any Chromium-based browser.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Choose the `tumata` folder, the one containing `manifest.json`.
5. Keep Tumata active from the toolbar popup.
6. Download a file as usual. Tumata routes it into the matching `Downloads/<category>/` folder.

Example:

```text
song.opus       -> Downloads/Music/song.opus
archive.zip     -> Downloads/Archives/archive.zip
project.skp     -> Downloads/SketchUp/project.skp
installer.exe   -> Downloads/Programs/installer.exe
```

## Daily use

Tumata works silently from the moment it is loaded. Nothing has to be configured for the defaults to be useful.

- **Toolbar popup** — quick on/off switch and a counter showing how many files the extension has organised since installation.
- **Settings page** (popup → "Pengaturan & pemetaan" / "Settings & mappings") — full editor for the extension→subfolder map, language toggle (Bahasa Indonesia / English), conflict-resolution mode, JSON backup/restore, and a reset-to-defaults button.

Settings sync across devices through the browser's synced extension storage; the routed-files counter stays local.

## Default categories

| Subfolder         | File types                                                          |
| ----------------- | ------------------------------------------------------------------- |
| `Programs/`       | `exe msi bat cmd appimage dmg pkg deb rpm appx msix snap flatpak`   |
| `Apps/`           | `apk aab xapk ipa`                                                  |
| `SketchUp/`       | `skp skb layout`                                                    |
| `3D/`             | `blend max c4d fbx obj stl dae gltf glb dwg dxf step ma mb usd …`   |
| `Design/`         | `psd ai eps sketch fig xd indd cdr afdesign procreate kra clip …`   |
| `Video Projects/` | `prproj aep drp veg fcpbundle kdenlive mlt`                         |
| `Audio Projects/` | `flp als logicx aup ptx rpp band ses reapeaks`                      |
| `Music/`          | `mp3 opus wav flac m4a aac ogg wma mid aiff alac`                   |
| `Videos/`         | `mp4 mkv avi mov webm wmv m4v flv mpeg ts m2ts vob ogv`             |
| `Pictures/`       | `jpg png gif webp bmp svg ico tiff heic raw dng cr2 cr3 nef arw …`  |
| `eBooks/`         | `epub mobi azw azw3 fb2 lit djvu kfx`                               |
| `Documents/`      | `pdf docx xlsx pptx txt rtf odt ods csv pages numbers key md …`     |
| `Archives/`       | `zip rar 7z tar gz bz2 xz tgz tbz zst lzh ace cab`                  |
| `Disk Images/`    | `iso img vhd vhdx vmdk qcow2 vdi`                                   |
| `Code/`           | `py ipynb js ts html css c cpp h java kt swift go rs rb php sql …`  |
| `Fonts/`          | `ttf otf woff woff2 eot`                                            |
| `Subtitles/`      | `srt vtt ass ssa sub idx smi`                                       |
| `Torrents/`       | `torrent`                                                           |

Add, rename, or remove rows on the settings page; restore defaults with one click. Subfolders are always created relative to your `Downloads` folder — that is a Chromium extension security limit, not a Tumata limit.

## Limits worth knowing

- **Chromium-based browsers only.** Other browsers and desktop download managers may bypass the downloads extension API Tumata uses. For those, the companion PowerShell + Scheduled Task script in `../organize-downloads/` is a better fit.
- **Tumata never moves a file out of `Downloads/`.** The Chromium extension sandbox does not give write access outside the user's Downloads folder.
- **Existing files are never touched.** Tumata only intercepts new downloads, never reorganises what is already on disk.

## Project layout

```text
tumata-ext/
├─ manifest.json
├─ background.js
├─ options.html / .js / .css
├─ popup.html   / .js / .css
├─ i18n.js
├─ icon.svg
├─ icons/16,32,48,128.png
└─ tests/test-routing.js
```

## Running the tests

The routing logic is plain ES2020, so it runs unchanged on Node:

```bash
node tests/test-routing.js
=== 35 passed, 0 failed ===
```

The tests stub the extension API namespace the service worker touches, then assert the suggested filename for every default category, plus edge cases: multi-dot names like `data.tar.gz`, hidden files, custom mappings, sanitised slashes, and the disabled state.

## Credits & license

Made by [github.com/busetdah](https://github.com/busetdah).

The extension code is provided as-is — feel free to fork, tweak, and rename to your heart's content.
