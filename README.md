![PACKPROOF — Diwali 2026](./assets/diwali-banner.svg)

<p align="center"><a href="https://akhilalladi-code.github.io/diwali-universe/"><strong>🪔 Explore Diwali Universe 2026 · Interactive celebration ↗</strong></a></p>

# PackProof — Creative Pack Preflight

**A local-first quality checker for creative asset handoffs.** Inspect an exported image pack before it goes to a client, social channel, campaign folder or web team. PackProof checks exact pixel dimensions, allowed formats, your file-size budget, temporary filenames, duplicate names and identical file content — then reports which required outputs are still missing.

> **Privacy by design:** images are decoded and inspected in your browser. PackProof does not upload artwork, use an API, require an account or persist the files. Clearing the session or closing the tab discards the in-memory inspection data.

## Why PackProof?

Creative teams often review a design visually but discover delivery mistakes later: a story export is the wrong size, a thumbnail is missing, a file is too large for the agreed budget, or a folder contains duplicate/temporary exports. PackProof adds a repeatable technical preflight step without replacing a designer's visual review.

## Features

- **Three delivery profiles:** Social Launch Pack, Creator Video Pack and Web Launch Pack.
- **Custom checklist:** add named requirements with exact pixel dimensions.
- **Batch inspection:** add multiple PNG, JPEG, WebP or AVIF images at once.
- **Exact dimension matching:** see which required output each image satisfies; near matches are not silently accepted.
- **Format and size policy:** choose accepted formats and set a per-asset file-size budget.
- **Naming checks:** flag common temporary names such as `final-final`, `copy`, `untitled` and `screenshot`.
- **Duplicate detection:** detect repeated filenames and SHA-256-identical files (hashing is skipped for files larger than 20 MB).
- **Coverage report:** identify required dimensions that have not been supplied.
- **Portable reports:** export asset results as CSV or a structured JSON report.
- **Responsive, keyboard-friendly interface** with no runtime dependencies.

## Quick start

Requirements: Node.js 18 or newer.

```bash
git clone https://github.com/akhilalladi-code/packproof.git
cd packproof
npm run dev
```

Open [http://localhost:4178](http://localhost:4178).

You can also open `index.html` through a local static server. A local server is recommended for JavaScript modules and browser security compatibility.

## How to use

1. Choose a delivery profile or select **Custom checklist**.
2. Set the maximum file size per asset and choose the formats your handoff accepts.
3. For a custom checklist, add each required output name and exact width/height in pixels.
4. Drop your exported images into the workspace or browse for multiple files.
5. Review the file status and the required-output coverage list.
6. Remove incorrect files, add corrected exports, and export the JSON or CSV report.

A file is marked as matching a requirement only when its pixel dimensions are exact. A file can match a required size and still be flagged for a format or size-policy failure. Multiple files may satisfy the same requirement.

## Built-in delivery profiles

| Profile | Required outputs |
| --- | --- |
| Social launch pack | Instagram portrait 1080×1350; Instagram square 1080×1080; Story/Reel 1080×1920; LinkedIn landscape 1200×627; YouTube thumbnail 1280×720 |
| Creator video pack | YouTube thumbnail 1280×720; YouTube channel banner 2560×1440; Short-form cover 1080×1920 |
| Web launch pack | Open Graph 1200×630; desktop hero 1920×1080; square preview 1200×1200; app/brand icon 512×512 |

These are configurable starter checklists, not claims that every platform's current publishing rules are identical. Confirm current channel specifications and client requirements before delivery.

## Quality checks

```bash
npm test
npm run check
```

The project uses Node's built-in test runner; no test framework or production dependency installation is required.

## Privacy and limitations

- No artwork is sent to a server. The app has no backend and makes no network requests for image processing.
- Image decoding depends on browser support. If a browser cannot decode a selected AVIF or other file, PackProof reports that the file could not be inspected rather than guessing its dimensions.
- SHA-256 hashing is performed only for files up to 20 MB to avoid reading very large files into memory. Larger files still receive dimension, format, size and filename checks.
- Exact pixel matching does not evaluate composition, safe areas, text legibility, color profile, print bleed, embedded fonts or visual quality.
- The maximum-size value is a project/team budget chosen by the user. It is not a platform upload limit.
- Inspection data exists only in the current page session. Export a report if you need a record.

## Project structure

```text
packproof/
├── .github/workflows/ci.yml  # GitHub Actions quality checks
├── index.html                # Accessible application shell
├── src/
│   ├── app.js                # Browser file inspection and interface
│   ├── core.js               # Testable validation and report logic
│   └── styles.css            # Responsive visual system
├── tests/core.test.js        # Node built-in tests
├── scripts/check.mjs         # HTML structure check
├── server.mjs                # Dependency-free local server
├── package.json
├── LICENSE
└── README.md
```

## Roadmap

- [ ] Save and load reusable custom delivery profiles as JSON.
- [ ] Optional folder-structure and naming-convention rules.
- [ ] PDF contact sheet for visual review of the export pack.
- [ ] Additional configurable print-delivery presets (including bleed and DPI metadata checks).

Roadmap items are proposals and are not implemented in this MVP.

## License

MIT. See [LICENSE](./LICENSE).
