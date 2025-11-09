import { useCallback, useEffect, useRef, useState } from "react";
import { BrowserProvider, Contract } from "ethers";
import { Web3Storage } from "web3.storage";
import Meyda from "meyda";
import MusicTempo from "music-tempo";
import "./App.css";

const CHAINS = [
  { id: 84532, label: "Base Sepolia", explorer: "https://sepolia.basescan.org" },
  { id: 11155111, label: "Ethereum Sepolia", explorer: "https://sepolia.etherscan.io" },
];

const ABI_MAP = {
  mintTo: ["function mintTo(address to, string uri) external payable"],
  safeMint: ["function safeMint(address to, string uri) public"],
};

const clamp01 = (x) => Math.max(0, Math.min(1, x));
const minmax = (arr) => {
  if (!arr.length) return arr;
  const mn = Math.min(...arr);
  const mx = Math.max(...arr);
  if (mx - mn < 1e-12) return arr.map(() => 0.5);
  return arr.map((v) => (v - mn) / (mx - mn));
};
const resample = (arr, count = 256) => {
  if (!arr.length) return Array(count).fill(0.5);
  const out = [];
  for (let i = 0; i < count; i++) {
    const t = (i * (arr.length - 1)) / (count - 1);
    const i0 = Math.floor(t);
    const i1 = Math.min(arr.length - 1, i0 + 1);
    const w = t - i0;
    out.push(arr[i0] * (1 - w) + arr[i1] * w);
  }
  return out;
};
const smoothMovingAverage = (arr, window = 5) => {
  if (!arr.length || window <= 1) return arr.slice();
  const half = Math.floor(window / 2);
  return arr.map((_, idx) => {
    const start = Math.max(0, idx - half);
    const end = Math.min(arr.length - 1, idx + half);
    let sum = 0;
    let count = 0;
    for (let i = start; i <= end; i++) {
      sum += arr[i];
      count += 1;
    }
    return sum / Math.max(1, count);
  });
};
const median = (arr) => {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) return (sorted[mid - 1] + sorted[mid]) / 2;
  return sorted[mid];
};
const getCanvasBlob = (canvas) =>
  new Promise((resolve, reject) => {
    if (!canvas) {
      reject(new Error("Canvas not ready"));
      return;
    }
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Could not create PNG"));
      } else {
        resolve(blob);
      }
    }, "image/png", 0.95);
  });
const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 500);
};

function drawSpiroOnCanvas(ctx, width, height, params) {
  const {
    tempo,
    rmsMean,
    centroidMean,
    series256,
    numRotors = 2,
    thetaTotalFactor = 60,
    step = 0.01,
    penRatioBase = 0.85,
  } = params;

  const tempoNorm = clamp01(tempo / 200);
  const loudStat = clamp01(rmsMean / 0.6);
  const brightStat = clamp01((centroidMean - 500) / 5500);

  const baseRadius = 380 * (0.9 + 0.2 * tempoNorm);
  let rotorScales = numRotors === 3 ? [0.48, 0.28, 0.14] : [0.4, 0.22];
  const tweak = 0.15 * (brightStat - 0.5);
  rotorScales = rotorScales.map((s) => Math.max(0.05, s * (1 + tweak)));
  const rotorModes = ["inside", "inside", "outside"];

  const rotors = [];
  let parentR = baseRadius;
  for (let i = 0; i < numRotors; i++) {
    const r = parentR * rotorScales[i];
    rotors.push([r, rotorModes[i]]);
    parentR = r;
  }

  const pLast = rotors[rotors.length - 1][0] * (penRatioBase * (0.85 + 0.3 * loudStat));
  const scale = (0.45 * Math.min(width, height)) / Math.max(1e-6, baseRadius);

  const rotorAngleRatio = (parentRadius, r, mode) =>
    mode === "outside" ? (parentRadius + r) / (r || 1e-9) : (parentRadius - r) / (r || 1e-9);
  const rotorCenter = (cx, cy, parentRadius, r, theta, mode) => {
    const d = mode === "outside" ? parentRadius + r : parentRadius - r;
    return [cx + d * Math.cos(theta), cy + d * Math.sin(theta)];
  };
  const penPoint = (theta) => {
    let cx = 0;
    let cy = 0;
    let parentRadius = baseRadius;
    let localTheta = theta;
    for (const [r, mode] of rotors) {
      const ratio = rotorAngleRatio(parentRadius, r, mode);
      const [nx, ny] = rotorCenter(cx, cy, parentRadius, r, localTheta, mode);
      cx = nx;
      cy = ny;
      parentRadius = r;
      localTheta = ratio * theta;
    }
    return [cx + pLast * Math.cos(localTheta), cy + pLast * Math.sin(localTheta)];
  };

  const thetaTotal = thetaTotalFactor * Math.PI;
  const steps = Math.max(2, Math.floor(thetaTotal / step));
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, width, height);
  ctx.lineCap = "round";

  const series = series256?.length
    ? series256
    : Array(256)
        .fill(0)
        .map((_, i) => 0.5 + 0.5 * Math.sin((2 * Math.PI * i) / 255));
  const sampleSeries = (i) => {
    const t = (i * (series.length - 1)) / Math.max(1, steps - 1);
    const i0 = Math.floor(t);
    const i1 = Math.min(series.length - 1, i0 + 1);
    const w = t - i0;
    return series[i0] * (1 - w) + series[i1] * w;
  };

  const project = (x, y) => [width / 2 + x * scale, height / 2 - y * scale];
  let [x0, y0] = project(...penPoint(0));

  const hueMin = 0.08;
  const hueMax = 0.85;
  const satMin = 0.55;
  const satMax = 0.95;
  const lwMin = 2;
  const lwMax = 6;

  for (let i = 1; i <= steps; i++) {
    const theta = i * step;
    const [x1p, y1p] = penPoint(theta);
    const [x1, y1] = project(x1p, y1p);
    const bright = sampleSeries(i);
    const loud = clamp01(0.6 * bright + 0.4 * loudStat);
    const hue = hueMin + (hueMax - hueMin) * bright;
    const sat = satMin + (satMax - satMin) * loud;
    const value = 1;
    const c = value * sat;
    const hp = hue * 6;
    const x = c * (1 - Math.abs((hp % 2) - 1));
    let r = 0;
    let g = 0;
    let b = 0;
    if (hp < 1) [r, g, b] = [c, x, 0];
    else if (hp < 2) [r, g, b] = [x, c, 0];
    else if (hp < 3) [r, g, b] = [0, c, x];
    else if (hp < 4) [r, g, b] = [0, x, c];
    else if (hp < 5) [r, g, b] = [x, 0, c];
    else [r, g, b] = [c, 0, x];
    const m = value - c;
    const color = `rgba(${Math.round((r + m) * 255)},${Math.round((g + m) * 255)},${Math.round((b + m) * 255)},0.85)`;

    ctx.strokeStyle = color;
    ctx.lineWidth = lwMin + (lwMax - lwMin) * loud;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    [x0, y0] = [x1, y1];
  }

  return {
    mapped: {
      R: Number(baseRadius.toFixed(3)),
      r: Number(rotors[0][0].toFixed(3)),
      p: Number(pLast.toFixed(3)),
      rotors: rotors.length,
    },
    mapped_params_extra: {
      num_rotors: numRotors,
      rotor_modes: rotors.map(([, mode]) => mode),
      rotor_radii: rotors.map(([rr]) => Number(rr.toFixed(3))),
    },
  };
}

async function analyzeFile(file, audioCtx) {
  const arrayBuffer = await file.arrayBuffer();
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  const channel = audioBuffer.getChannelData(0);

  const frameSize = 2048;
  const hopSize = 1024;
  const rms = [];
  const centroids = [];

  for (let i = 0; i + frameSize <= channel.length; i += hopSize) {
    const frame = channel.slice(i, i + frameSize);
    const features =
      Meyda.extract(["rms", "spectralCentroid"], frame, {
        bufferSize: frameSize,
        sampleRate: audioCtx.sampleRate,
      }) || {};
    rms.push(Math.max(0, features.rms || 0));
    centroids.push(Math.max(0, features.spectralCentroid || 0));
  }

  const onset = [];
  for (let i = 1; i < rms.length; i++) {
    onset.push(Math.max(0, rms[i] - rms[i - 1]));
  }
  const smoothedEnvelope = smoothMovingAverage(onset, 5);
  const normalizedEnvelope = minmax(smoothedEnvelope);

  let bpm = 120;
  let tempoFallback = false;
  const logFallback = (reason) => {
    if (!tempoFallback) {
      console.warn("Tempo estimation failed; fallback to 120 BPM", reason || "");
    }
    tempoFallback = true;
  };

  if (normalizedEnvelope.length > 8 && normalizedEnvelope.some((v) => v > 1e-4)) {
    try {
      const tempoAnalyser = new MusicTempo(
        normalizedEnvelope.map((value, i) => ({
          time: (i * hopSize) / audioCtx.sampleRate,
          weight: value,
        })),
      );
      if (Number.isFinite(tempoAnalyser?.tempo) && tempoAnalyser.tempo > 0) {
        bpm = tempoAnalyser.tempo;
      } else {
        logFallback("non-finite tempo");
      }
    } catch (error) {
      logFallback(error);
    }
  } else {
    logFallback("empty envelope");
  }

  const rmsMean = rms.reduce((sum, value) => sum + value, 0) / Math.max(1, rms.length);
  const centroidMean = centroids.reduce((sum, value) => sum + value, 0) / Math.max(1, centroids.length);
  const centroidMedian = median(centroids);
  const centroidSeries = resample(minmax(centroids), 256);

  return {
    bpm: Number(bpm.toFixed(2)),
    rmsMean: Number(rmsMean.toFixed(4)),
    centroidMean: Number(centroidMean.toFixed(2)),
    centroidMedian: Number(centroidMedian.toFixed(2)),
    centroidSeries,
    rmsSeries: rms,
    centroidSeriesRaw: centroids,
    envelope: normalizedEnvelope,
    frames: rms.length,
    duration: Number((channel.length / audioCtx.sampleRate).toFixed(2)),
    sampleRate: audioCtx.sampleRate,
    tempoFallback,
  };
}

const buildMetadataPayload = (analysis, renderInfo, tempoValue, options = {}) => {
  if (!analysis || !renderInfo) throw new Error("Analyze & render first.");
  const name = options.name || `SpiroMint #${String(analysis.frames || 1).padStart(4, "0")}`;
  return {
    name,
    description: "Music-driven spirograph generated in the browser.",
    image: options.imageUri || "spiro.png",
    attributes: [
      { trait_type: "bpm", value: Number(tempoValue.toFixed(2)) },
      { trait_type: "avg_rms", value: Number(analysis.rmsMean) },
      { trait_type: "centroid_med", value: Number(analysis.centroidMedian) },
    ],
    features: {
      bpm_auto: analysis.bpm,
      bpm_used: tempoValue,
      rms_mean: analysis.rmsMean,
      centroid_mean: analysis.centroidMean,
      centroid_median: analysis.centroidMedian,
      centroid_series_256: analysis.centroidSeries,
      rms_series: analysis.rmsSeries,
      centroid_series_raw: analysis.centroidSeriesRaw,
      envelope: analysis.envelope,
      duration: analysis.duration,
      sampleRate: analysis.sampleRate,
      frames: analysis.frames,
      mapped: renderInfo.mapped,
      rotor_details: renderInfo.mapped_params_extra,
    },
  };
};

export default function App() {
  const canvasRef = useRef(null);
  const walletRef = useRef({ provider: null, signer: null });
  const [file, setFile] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [renderInfo, setRenderInfo] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [status, setStatus] = useState("Idle");
  const [tempoWarning, setTempoWarning] = useState("");
  const [useManualTempo, setUseManualTempo] = useState(false);
  const [manualTempo, setManualTempo] = useState(120);
  const [ipfsToken, setIpfsToken] = useState("");
  const [ipfsStatus, setIpfsStatus] = useState("");
  const [ipfsResult, setIpfsResult] = useState(null);
  const [tokenUriInput, setTokenUriInput] = useState("");
  const [mintStatus, setMintStatus] = useState("");
  const [txInfo, setTxInfo] = useState(null);
  const [contractAddress, setContractAddress] = useState("");
  const [mintFunction, setMintFunction] = useState("mintTo");
  const [selectedChainId, setSelectedChainId] = useState(CHAINS[0].id);
  const [walletDetails, setWalletDetails] = useState({ address: "", chainId: null });

  const selectedChain = CHAINS.find((c) => c.id === selectedChainId) || CHAINS[0];
  const tempoLabel = useManualTempo ? manualTempo : analysis?.bpm || manualTempo;
  const chainMismatch = Boolean(
    walletDetails.chainId && selectedChainId && walletDetails.chainId !== selectedChainId,
  );

  const renderFromAnalysis = useCallback((data, tempoValue) => {
    if (!data || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const mapped = drawSpiroOnCanvas(ctx, canvas.width, canvas.height, {
      tempo: tempoValue,
      rmsMean: data.rmsMean,
      centroidMean: data.centroidMean,
      series256: data.centroidSeries,
      numRotors: 2,
    });
    setRenderInfo({ ...mapped, tempoUsed: tempoValue });
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
    }, "image/png", 0.95);
  }, []);

  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  useEffect(() => {
    if (!analysis) return;
    const tempoValue = useManualTempo ? manualTempo : analysis.bpm;
    renderFromAnalysis(analysis, tempoValue);
    if (analysis.tempoFallback) {
      setStatus("Auto tempo failed; using 120 BPM");
      setTempoWarning("Auto tempo failed; using 120 BPM. You can override with the slider.");
    } else {
      setStatus("Done!");
      setTempoWarning("");
    }
  }, [analysis, useManualTempo, manualTempo, renderFromAnalysis]);

  useEffect(() => {
    if (ipfsResult?.metadataUri) {
      setTokenUriInput(ipfsResult.metadataUri);
    }
  }, [ipfsResult]);

  const handleFileChange = (event) => {
    const nextFile = event.target.files?.[0] || null;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setAnalysis(null);
    setRenderInfo(null);
    setTempoWarning("");
    setIpfsResult(null);
    setTokenUriInput("");
    setTxInfo(null);
    setFile(nextFile);
    setStatus(nextFile ? "Ready to analyze" : "Idle");
  };

  const analyzeAndRender = async () => {
    if (!file) {
      alert("Please choose an audio file first.");
      return;
    }
    try {
      setStatus("Analyzing...");
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioCtx({ sampleRate: 22050 });
      if (audioCtx.state === "suspended") {
        await audioCtx.resume();
      }
      const feat = await analyzeFile(file, audioCtx);
      setStatus("Rendering...");
      setAnalysis(feat);
      setIpfsResult(null);
      setTokenUriInput("");
      setTxInfo(null);
      await audioCtx.close();
    } catch (error) {
      console.error(error);
      setStatus(`Error: ${error?.message || error}`);
    }
  };

  const ensureAnalysis = () => {
    if (!analysis || !renderInfo) {
      alert("Run Analyze & Render first.");
      return false;
    }
    return true;
  };

  const exportPNG = async () => {
    if (!ensureAnalysis()) return;
    try {
      const blob = await getCanvasBlob(canvasRef.current);
      downloadBlob(blob, "spiro.png");
    } catch (err) {
      alert(err.message);
    }
  };

  const exportMetadata = async () => {
    if (!ensureAnalysis()) return;
    try {
      const tempoValue = useManualTempo ? manualTempo : analysis.bpm;
      const metadata = buildMetadataPayload(analysis, renderInfo, tempoValue, {
        imageUri: "spiro.png",
      });
      const blob = new Blob([JSON.stringify(metadata, null, 2)], { type: "application/json" });
      downloadBlob(blob, "metadata.json");
    } catch (err) {
      alert(err.message);
    }
  };

  const uploadToIpfs = async () => {
    if (!ensureAnalysis()) return;
    if (!ipfsToken.trim()) {
      alert("Paste your web3.storage or Pinata token first.");
      return;
    }
    try {
      setIpfsStatus("Uploading image...");
      const client = new Web3Storage({ token: ipfsToken.trim() });
      const blob = await getCanvasBlob(canvasRef.current);
      const imageFile = new File([blob], "spiro.png", { type: "image/png" });
      const imageCid = await client.put([imageFile], {
        wrapWithDirectory: true,
        name: "spiro-mint-image",
      });
      const imageUri = `ipfs://${imageCid}/spiro.png`;
      setIpfsStatus("Uploading metadata...");
      const tempoValue = useManualTempo ? manualTempo : analysis.bpm;
      const metadata = buildMetadataPayload(analysis, renderInfo, tempoValue, { imageUri });
      const metadataFile = new File([JSON.stringify(metadata)], "metadata.json", {
        type: "application/json",
      });
      const metadataCid = await client.put([metadataFile], {
        wrapWithDirectory: true,
        name: "spiro-mint-metadata",
      });
      const metadataUri = `ipfs://${metadataCid}/metadata.json`;
      setIpfsResult({
        imageCid,
        metadataCid,
        imageUri,
        metadataUri,
        imageGateway: `https://w3s.link/ipfs/${imageCid}/spiro.png`,
        metadataGateway: `https://w3s.link/ipfs/${metadataCid}/metadata.json`,
      });
      setIpfsStatus("Uploaded to IPFS!");
    } catch (error) {
      console.error(error);
      setIpfsStatus(error?.message || "IPFS upload failed");
    }
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("MetaMask (or any EIP-1193 wallet) is required.");
      return;
    }
    try {
      const provider = new BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const network = await provider.getNetwork();
      walletRef.current = { provider, signer };
      setWalletDetails({ address, chainId: Number(network.chainId) });
      setMintStatus("Wallet connected");
    } catch (error) {
      console.error(error);
      setMintStatus(error?.message || "Wallet connection failed");
    }
  };

  const mintNft = async () => {
    if (!walletRef.current.signer) {
      alert("Connect your wallet first.");
      return;
    }
    if (!contractAddress) {
      alert("Enter the contract address.");
      return;
    }
    const tokenUri = tokenUriInput.trim() || ipfsResult?.metadataUri;
    if (!tokenUri) {
      alert("Provide a token URI (or upload to IPFS first).");
      return;
    }
    try {
      setMintStatus("Sending transaction...");
      setTxInfo(null);
      const abi = ABI_MAP[mintFunction];
      const contract = new Contract(contractAddress.trim(), abi, walletRef.current.signer);
      const to = await walletRef.current.signer.getAddress();
      const tx = await contract[mintFunction](to, tokenUri);
      setTxInfo({ hash: tx.hash, explorer: `${selectedChain.explorer}/tx/${tx.hash}` });
      await tx.wait();
      setMintStatus("Mint confirmed!");
    } catch (error) {
      console.error(error);
      setMintStatus(error?.shortMessage || error?.message || "Mint failed");
    }
  };

  const displayFeatures = analysis
    ? {
        bpm_auto: analysis.bpm,
        bpm_used: renderInfo?.tempoUsed,
        rmsMean: analysis.rmsMean,
        centroidMean: analysis.centroidMean,
        centroidMedian: analysis.centroidMedian,
        frames: analysis.frames,
        duration: analysis.duration,
        sampleRate: analysis.sampleRate,
        mapped: renderInfo?.mapped,
        ipfs: ipfsResult,
      }
    : null;

  return (
    <div className="app">
      <header>
        <h1>SpiroMint Sandbox</h1>
        <p>Upload an mp3 or wav file, extract audio features in the browser, and paint a multi-rotor spirograph.</p>
      </header>

      <section className="controls">
        <label className="file-input">
          <span>Select audio</span>
          <input type="file" accept="audio/*" onChange={handleFileChange} />
          <small>{file ? file.name : "No file chosen"}</small>
        </label>
        <button onClick={analyzeAndRender}>Analyze & Render</button>
        <div className="status">{status}</div>
      </section>

      <section className="workspace">
        <div className="canvas-panel panel">
          <h2>Canvas</h2>
          <canvas ref={canvasRef} width={540} height={540} />
        </div>

        <div className="side-panel">
          <div className="preview-panel panel">
            <h2>Preview</h2>
            {previewUrl ? (
              <img src={previewUrl} alt="spirograph preview" />
            ) : (
              <div className="placeholder">Run an analysis to see the generated art.</div>
            )}
            <h2>Features</h2>
            <pre>{displayFeatures ? JSON.stringify(displayFeatures, null, 2) : "—"}</pre>
          </div>

          <div className="actions-panel panel">
            <h2>Actions</h2>

            <section>
              <h3>Exports</h3>
              <div className="button-row">
                <button onClick={exportPNG}>Export PNG</button>
                <button className="secondary" onClick={exportMetadata}>
                  Export metadata.json
                </button>
              </div>
            </section>

            <section>
              <h3>IPFS (optional)</h3>
              <label>
                IPFS Token (web3.storage / Pinata)
                <input
                  type="password"
                  placeholder="Paste token..."
                  value={ipfsToken}
                  onChange={(e) => setIpfsToken(e.target.value)}
                />
              </label>
              <button onClick={uploadToIpfs}>Upload to IPFS</button>
              <div className="info-box">{ipfsStatus || "Token stays in your browser."}</div>
              {ipfsResult && (
                <div className="link-list">
                  <strong>image URI:</strong>
                  <a href={ipfsResult.imageGateway} target="_blank" rel="noreferrer">
                    {ipfsResult.imageUri}
                  </a>
                  <strong>metadata URI:</strong>
                  <a href={ipfsResult.metadataGateway} target="_blank" rel="noreferrer">
                    {ipfsResult.metadataUri}
                  </a>
                </div>
              )}
            </section>

            <section>
              <h3>Tempo override</h3>
              <label style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  checked={useManualTempo}
                  onChange={(e) => setUseManualTempo(e.target.checked)}
                />
                Use manual tempo
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <input
                  type="range"
                  min="50"
                  max="200"
                  step="1"
                  value={manualTempo}
                  onChange={(e) => setManualTempo(Number(e.target.value))}
                  disabled={!useManualTempo}
                  style={{ flex: 1 }}
                />
                <span style={{ fontWeight: 600 }}>{Math.round(tempoLabel)} BPM</span>
              </div>
              {tempoWarning && <div className="info-box" style={{ background: "#fef3c7", border: "1px solid #f97316" }}>{tempoWarning}</div>}
            </section>

            <section>
              <h3>Mint (optional)</h3>
              <div className="button-row">
                <button onClick={connectWallet}>Connect Wallet</button>
                {walletDetails.address && (
                  <span style={{ fontSize: 12, color: "#475569" }}>
                    {walletDetails.address.slice(0, 6)}...{walletDetails.address.slice(-4)}
                  </span>
                )}
              </div>
              <label>
                Chain
                <select value={selectedChainId} onChange={(e) => setSelectedChainId(Number(e.target.value))}>
                  {CHAINS.map((chain) => (
                    <option key={chain.id} value={chain.id}>
                      {chain.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Contract address
                <input
                  type="text"
                  placeholder="0x..."
                  value={contractAddress}
                  onChange={(e) => setContractAddress(e.target.value)}
                />
              </label>
              <label>
                Function
                <select value={mintFunction} onChange={(e) => setMintFunction(e.target.value)}>
                  <option value="mintTo">mintTo(address,string)</option>
                  <option value="safeMint">safeMint(address,string)</option>
                </select>
              </label>
              <label>
                Token URI
                <input
                  type="url"
                  placeholder="ipfs://..."
                  value={tokenUriInput}
                  onChange={(e) => setTokenUriInput(e.target.value)}
                />
              </label>
              <button onClick={mintNft}>Mint NFT</button>
              <div className="info-box">{mintStatus || "Uses your wallet + signer; no backend."}</div>
              {chainMismatch && (
                <div className="info-box" style={{ background: "#fee2e2", border: "1px solid #dc2626" }}>
                  Wallet is on chain ID {walletDetails.chainId}. Switch to match {selectedChain.label} (ID {selectedChain.id}).
                </div>
              )}
              {txInfo && (
                <div className="link-list">
                  <strong>Tx:</strong>
                  <a href={txInfo.explorer} target="_blank" rel="noreferrer">
                    {txInfo.hash}
                  </a>
                </div>
              )}
            </section>
          </div>

          <div className="next-steps panel">
            <h2>Next steps</h2>
            <ul>
              <li>
                Manual route: use the exported PNG + metadata.json to mint on OpenSea, Zora, or Manifold (upload
                metadata as a file or host it on IPFS yourself).
              </li>
              <li>
                IPFS route: once you have the `ipfs://` metadata URI, you can share it with teammates or drop it into any
                ERC-721/1155 contract.
              </li>
              <li>
                Mint route: connect a wallet with minter permissions, paste your contract address, and hit Mint NFT.
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
