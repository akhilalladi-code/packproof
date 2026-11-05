# Publishing PackProof to GitHub

The source tree and a real local Git commit are ready. To publish under `akhilalladi-code`, create an empty repository named `packproof` (do not initialize it with a README, license or `.gitignore`) and push the `main` branch.

## Option A — GitHub CLI

From a clone of this project:

```bash
gh auth login
gh repo create akhilalladi-code/packproof --public --source=. --remote=origin --push
```

## Option B — GitHub website

1. Create `https://github.com/new` with owner `akhilalladi-code` and repository name `packproof`.
2. Keep it empty; do not add starter files.
3. In this project folder, run:

```bash
git remote add origin https://github.com/akhilalladi-code/packproof.git
git push -u origin main
```

The included Git bundle preserves the initial commit and can be cloned with `git clone creative-pack-preflight.bundle packproof`.
