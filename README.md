<<<<<<< HEAD
# SpiroMint
=======
# SpiroMint

Browser-only spirograph lab that turns any mp3/wav into math art. Upload audio, extract RMS / spectral centroid / tempo, render a multi-rotor spirograph on `<canvas>`, download PNG + metadata, optionally push both to IPFS, then mint through your own contract straight from the browser.

https://`<your-user>`.github.io/spiro-mint/ (set once Pages is enabled)

## Quick start

```bash
npm install
npm run dev
```

Open the printed Vite URL, upload audio, and click **Analyze & Render**. Use the tempo slider if you want to override the automatically detected BPM (Tempo detection falls back to 120 BPM with a warning when peaks can’t be found).

## Features

- Audio-feature extraction (Meyda + MusicTempo) with browser `AudioContext`.
- Multi-rotor spirograph renderer + PNG preview.
- Manual tempo override: slider 50–200 BPM, optional fallback warning.
- Export buttons: download `spiro.png` and `metadata.json` (includes attributes + raw feature arrays for reproducibility).
- Optional IPFS flow using your own [web3.storage](https://web3.storage) or Pinata JWT token — never stored anywhere, runs entirely client-side.
- Optional mint connector using your wallet (ethers v6): connect MetaMask, select chain (Base Sepolia by default), paste contract + choose `mintTo` or `safeMint`, then send the transaction with any token URI (prefills with the newly pinned metadata).
- “Next steps” panel outlining manual upload flows for OpenSea / Zora / Manifold if you prefer marketplace minting.

## Deploy to GitHub Pages

1. Update `vite.config.js`’s `base` if you rename the repo.
2. Push to `main`. The included GitHub Actions workflow (`.github/workflows/deploy.yml`) builds the Vite site and publishes it to Pages automatically (Settings → Pages → Source: “GitHub Actions”).
3. The `npm run build` script also copies `dist/index.html` to `dist/404.html` so the SPA works with GitHub Pages’ fallback routing.

To deploy manually, run `npm run build`, push the `dist/` assets to a `gh-pages` branch, and enable Pages from that branch.

## IPFS & Mint flow

1. After rendering, click **Export metadata** if you want a local copy.
2. Paste your web3.storage or Pinata JWT token into the IPFS section and click **Upload to IPFS**. The UI will display both the `ipfs://` URIs and public gateway links for reference.
3. Connect your wallet, choose the target chain + contract, pick `mintTo` or `safeMint`, provide the token URI (defaults to the pinned metadata), and click **Mint NFT**. Transaction hash + explorer link will be shown once the wallet confirms.

No secrets are ever hard-coded or sent to a backend — everything runs in the browser.

## Scripts

- `npm run dev` – Vite dev server
- `npm run build` – Production build + SPA fallback copy
- `npm run preview` – Preview the production build locally

## License

MIT
>>>>>>> 43dde4e (init: spiro-mint web app (pages-ready))
