"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Download, Eye, EyeOff, Moon, Sun, Pause, Play, Square, Trash2, RotateCcw, LogIn } from "lucide-react";

/**
 * Multi‑AI Image Generator Dashboard
 * --------------------------------------------------------------
 * - Next.js/React single-file component (drop into app/page.jsx)
 * - TailwindCSS for styling (no config changes required)
 * - Dark/Light mode toggle (persisted)
 * - Gmail-style login (email box; required to use app)
 * - Provider dropdown: Gemini, ChatGPT, Bing AI, Leonardo, DALL·E (OpenAI), Gemini Banana, Stability AI
 * - API key save/view per provider (stored in localStorage only)
 * - Prompt textarea supporting 500–1000 lines; shows count + progress bar
 * - Generate / Pause / Resume / Stop / Clear controls with responsive feedback
 * - Per-image filename generator (letters only) based on prompt
 * - Gallery preview with per-card status + Regenerate on failure
 * - ZIP download of all generated images
 * - Clean adapters where real API calls can be plugged in
 *
 * NOTE: This file ships with a safe mock generator so the UI works out of the box.
 *       Replace the adapters in `providerEngines` with real API calls when ready.
 */

// --- Utility: localStorage helpers -------------------------------------------------
const storage = {
  get(key, fallback = null) {
    try {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }
};

// --- Theme management --------------------------------------------------------------
function useTheme() {
  const [theme, setTheme] = useState(() => storage.get("theme", "light"));
  useEffect(() => {
    storage.set("theme", theme);
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", theme === "dark");
    }
  }, [theme]);
  return { theme, setTheme };
}

// --- Auth (email-only, Gmail-like) -------------------------------------------------
function useAuth() {
  const [email, setEmail] = useState(() => storage.get("auth_email", ""));
  const [loggedIn, setLoggedIn] = useState(() => !!storage.get("auth_email", ""));

  const login = (value) => {
    const v = (value || "").trim();
    if (!/^[^@\s]+@gmail\.com$/i.test(v)) {
      throw new Error("শুধু Gmail ইমেল দিন (example@gmail.com)");
    }
    storage.set("auth_email", v);
    setEmail(v);
    setLoggedIn(true);
  };

  const logout = () => {
    storage.set("auth_email", "");
    setEmail("");
    setLoggedIn(false);
  };

  return { email, loggedIn, login, logout };
}

// --- Filename from prompt (letters only, no digits/symbols) ------------------------
function lettersOnlyFilename(prompt, existingNames) {
  const base = (prompt || "image").
    normalize("NFKD").
    replace(/[^A-Za-z\s]/g, " "). // remove digits, symbols, accents -> spaces
    replace(/\s+/g, " ").
    trim()
    .split(" ")
    .slice(0, 8) // limit words for brevity
    .join("-")
    .toLowerCase();

  let name = base || "image";
  // ensure uniqueness without numbers: append "copy" repeats if necessary
  let attempt = name;
  while (existingNames.has(attempt + ".png")) {
    attempt += "-copy";
  }
  return attempt + ".png";
}

// --- Provider keys ----------------------------------------------------------------
const PROVIDERS = [
  "Gemini",
  "ChatGPT",
  "Bing AI",
  "Leonardo",
  "DALL·E (OpenAI)",
  "Gemini Banana",
  "Stability AI",
];

function useProviderKey(provider) {
  const keyName = `apikey:${provider}`;
  const [key, setKey] = useState("");
  const [show, setShow] = useState(false);
  useEffect(() => {
    setKey(storage.get(keyName, ""));
  }, [provider]);
  const save = (v) => {
  if (!v) {
    alert("⚠️ কোনো API Key দেওয়া হয়নি!");
    return;
  }
  storage.set(keyName, v);
  setKey(v);
  alert(`✅ ${provider} API Key সফলভাবে সংরক্ষণ হয়েছে!`);
};

const toggleShow = () => setShow((s) => !s);
return { key, save, show, toggleShow };

// --- Mock image engine (replace per provider) -------------------------------------
async function mockGenerate(prompt) {
  // Simulate variable latency and occasional failure
  const delay = 400 + Math.random() * 1200;
  await new Promise(r => setTimeout(r, delay));
  const fail = Math.random() < 0.08; // 8% failure to test regenerate
  if (fail) throw new Error("Generation failed");

  // Produce a simple PNG dataURL via canvas (no external calls)
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext("2d");
  // background
  ctx.fillStyle = `hsl(${Math.floor(Math.random()*360)},40%,${40+Math.random()*30}%)`;
  ctx.fillRect(0,0,size,size);
  // text snippet (first word)
  ctx.fillStyle = "white";
  ctx.font = "bold 28px ui-sans-serif, system-ui";
  const word = (prompt || "image").split(/\s+/)[0].slice(0,12);
  ctx.fillText(word || "image", 20, size/2);
  return canvas.toDataURL("image/png");
}

const providerEngines = {
  // --- Google Imagen via Gemini ---
  "Gemini": async (prompt, key) => {
    const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models/imagen-2:generateImage?key=" + key, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, size: "1024x1024" }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error?.message || "Gemini error");
    const b64 = json.image?.base64 || json.images?.[0]?.base64 || json.candidates?.[0]?.content?.parts?.[0]?.inline_data?.data;
    if (!b64) throw new Error("Unexpected Gemini response");
    return `data:image/png;base64,${b64}`;
  },

  // --- DALL·E (OpenAI) ---
  "DALL·E (OpenAI)": async (prompt, key) => {
    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt,
        size: "1024x1024",
      }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error?.message || "OpenAI error");
    const b64 = json.data?.[0]?.b64_json;
    return `data:image/png;base64,${b64}`;
  },

  // --- Stability AI ---
  "Stability AI": async (prompt, key) => {
    const res = await fetch("https://api.stability.ai/v1/generation/sd3/text-to-image", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`,
      },
      body: JSON.stringify({
        prompt,
        width: 1024,
        height: 1024,
        output_format: "png",
      }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || "Stability error");
    const b64 = json.artifacts?.[0]?.base64;
    return `data:image/png;base64,${b64}`;
  },

  // বাকি গুলো আপাতত মক রাখো
  "Gemini Banana": async (prompt, key) => mockGenerate(prompt),
  "ChatGPT": async (prompt, key) => mockGenerate(prompt),
  "Bing AI": async (prompt, key) => mockGenerate(prompt),
  "Leonardo": async (prompt, key) => mockGenerate(prompt),
};

// --- ZIP helper (JSZip dynamic import in browser) ---------------------------------
async function zipAndDownload(files) {
  const JSZip = (await import("jszip")).default;
  const { saveAs } = await import("file-saver");
  const zip = new JSZip();
  files.forEach(f => {
    const base64 = f.dataUrl.split(",")[1];
    zip.file(f.name, base64, { base64: true });
  });
  const blob = await zip.generateAsync({ type: "blob" });
  saveAs(blob, "images.zip");
}

// --- Progress bar component --------------------------------------------------------
function Progress({ value }) {
  const v = Math.max(0, Math.min(100, value || 0));
  return (
    <div className="w-full h-2 rounded bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
      <div className="h-full bg-zinc-900 dark:bg-zinc-100" style={{ width: `${v}%` }} />
    </div>
  );
}

// --- Top Bar ----------------------------------------------------------------------
function TopBar({ theme, setTheme, auth, openLogin }) {
  return (
    <div className="sticky top-0 z-30 border-b border-zinc-200 dark:border-zinc-800 backdrop-blur bg-white/80 dark:bg-zinc-950/80">
      <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
        {/* Left: Site name */}
        <div className="flex items-center gap-3">
          <div className="text-xl font-bold tracking-tight">Prompt→Image Hub</div>
          <div className="text-xs px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700">
            <div className="leading-3 text-zinc-500">Developed By</div>
            <div className="leading-3 font-medium">Anil Chandra Barman</div>
          </div>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun size={16}/> : <Moon size={16}/>}<span className="text-sm">{theme === "dark" ? "Light" : "Dark"}</span>
          </button>

          {!auth.loggedIn ? (
            <button
              onClick={openLogin}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:opacity-90 transition"
            >
              <LogIn size={16}/><span className="text-sm">Gmail Login</span>
            </button>
          ) : (
            <div className="text-xs text-zinc-500">Logged in as <span className="font-medium">{auth.email}</span></div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Login Modal ---
function LoginModal({ isOpen, onClose, auth }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setValue("");
      setError("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  async function handleLogin() {
    try {
      if (!value.trim()) {
        setError("⚠️ একটি ইমেইল দিতে হবে।");
        return;
      }
      await auth.login(value.trim());
      onClose();
    } catch (e) {
      setError(e.message || "Login ব্যর্থ হয়েছে।");
    }
  }

  return (
    <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 shadow-xl">
        <div className="text-lg font-semibold mb-3 text-center dark:text-white">
          Gmail Login
        </div>

        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="example@gmail.com"
          className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent focus:outline-none px-3 py-2 text-sm text-zinc-900 dark:text-white"
        />

        {error && (
          <div className="text-red-500 text-sm mt-2 text-center">{error}</div>
        )}

        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            className="px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            Cancel
          </button>

          <button
            onClick={handleLogin}
            className="px-3 py-2 text-sm rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:opacity-90 transition"
          >
            Login
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Main App ---------------------------------------------------------------------
export default function ImageHubApp() {
  const { theme, setTheme } = useTheme();
  const auth = useAuth();
  const [loginOpen, setLoginOpen] = useState(false);

  const [provider, setProvider] = useState(PROVIDERS[0]);
  const { key, save, show, toggleShow } = useProviderKey(provider);
  const [tempKey, setTempKey] = useState("");
  useEffect(() => { setTempKey(key || ""); }, [key]);

  const [promptText, setPromptText] = useState("");
  const prompts = useMemo(() => promptText.split(/\r?\n/).map(s => s.trim()).filter(Boolean), [promptText]);

  // Generation state
  const [queueIndex, setQueueIndex] = useState(0);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [results, setResults] = useState([]); // {prompt, name, status: 'pending'|'ok'|'fail', dataUrl?}
  const existingNames = useMemo(() => new Set(results.map(r => r.name).filter(Boolean)), [results]);

  const total = prompts.length;
  const completed = results.filter(r => r.status === "ok").length;
  const progress = total ? Math.round(((queueIndex) / total) * 100) : 0;

  // Prepare results when prompt list changes
  useEffect(() => {
    if (!running) {
      setResults(prompts.map(p => ({ prompt: p, name: lettersOnlyFilename(p, new Set()), status: "pending" })));
      setQueueIndex(0);
    }
  }, [promptText, running]);

  // Core worker loop
  const controllerRef = useRef({ stop: false });

  useEffect(() => {
    let cancelled = false;
    async function work() {
      if (!running || paused) return;
      if (queueIndex >= total) { setRunning(false); return; }
      const p = prompts[queueIndex];
      const engine = providerEngines[provider];
      let name = results[queueIndex]?.name || lettersOnlyFilename(p, existingNames);

      try {
        const dataUrl = await engine(p, key);
        if (cancelled) return;
        setResults(prev => prev.map((r, i) => i === queueIndex ? { ...r, name, status: "ok", dataUrl } : r));
      } catch (e) {
        if (cancelled) return;
        setResults(prev => prev.map((r, i) => i === queueIndex ? { ...r, name, status: "fail", error: e.message } : r));
      } finally {
        if (cancelled) return;
        setQueueIndex(i => i + 1);
      }
    }
    work();
    return () => { cancelled = true; };
  }, [running, paused, queueIndex, total, provider, key, prompts, existingNames, results]);

  // Actions
  const start = () => {
    if (!auth.loggedIn) { setLoginOpen(true); return; }
    if (!providerEngines[provider]) return;
    if (!prompts.length) return;
    setQueueIndex(0);
    setRunning(true);
    setPaused(false);
  };
  const stop = () => {
    setRunning(false); setPaused(false);
  };
  const pause = () => setPaused(true);
  const resume = () => { if (running) setPaused(false); else if (prompts.length) setRunning(true); };
  const clearAll = () => {
    setPromptText("");
    setResults([]);
    setQueueIndex(0);
    setRunning(false); setPaused(false);
  };

  const regenerateOne = async (idx) => {
    const p = results[idx];
    if (!p) return;
    try {
      const engine = providerEngines[provider];
      setResults(prev => prev.map((r,i) => i===idx? { ...r, status: "pending", error: undefined } : r));
      const dataUrl = await engine(p.prompt, key);
      setResults(prev => prev.map((r,i) => i===idx? { ...r, status: "ok", dataUrl } : r));
    } catch (e) {
      setResults(prev => prev.map((r,i) => i===idx? { ...r, status: "fail", error: e.message } : r));
    }
  };

  const downloadZip = async () => {
    const files = results.filter(r => r.status === "ok" && r.dataUrl).map(r => ({ name: r.name, dataUrl: r.dataUrl }));
    if (!files.length) return;
    await zipAndDownload(files);
  };

  const inputCountPct = Math.min(100, Math.round((prompts.length / 1000) * 100));

  return (
    <div className="min-h-screen bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 transition-colors">
      <TopBar theme={theme} setTheme={setTheme} auth={auth} openLogin={() => setLoginOpen(true)} />
      <LoginModal isOpen={loginOpen} onClose={() => setLoginOpen(false)} auth={auth} />

      <main className="mx-auto max-w-7xl px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Controls */}
        <section className="lg:col-span-1">
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-4 shadow-sm">
            <h2 className="text-lg font-semibold">ইনপুট এপিআই কী</h2>
            <div className="grid grid-cols-1 gap-3">
              <label className="text-sm text-zinc-500">AI Provider</label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent"
              >
                {PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>

              <div className="flex items-center gap-2">
                <input
                  value={tempKey}
                  onChange={(e) => setTempKey(e.target.value)}
                  placeholder="এখানে API Key দিন"
                  className="flex-1 px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent"
                  type={show ? "text" : "password"}
                />
                <button onClick={() => save(tempKey)} className="px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-900">Save</button>
                <button onClick={toggleShow} className="px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-900" aria-label="toggle key visibility">
                  {show ? <Eye size={16}/> : <EyeOff size={16}/>}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-3 shadow-sm">
            <h2 className="text-lg font-semibold">ইনপুট প্রাম্পট</h2>
            <textarea
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              rows={12}
              placeholder="প্রতি লাইনে একটি প্রম্পট — ৫০০–১০০০ লাইন সুপারিশ"
              className="w-full resize-y px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent"
            />
            <div className="flex items-center justify-between text-sm">
              <span>ইনপুট হয়েছে: <span className="font-medium">{prompts.length}</span> প্রম্পট</span>
              <span className="text-zinc-500">লিমিট: 1000</span>
            </div>
            <Progress value={inputCountPct} />
          </div>

          <div className="mt-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-3 shadow-sm">
            <h2 className="text-lg font-semibold">কন্ট্রোল</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button onClick={start} className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:opacity-90"><Play size={16}/> ইমেজ জেনারেট</button>
              <button onClick={pause} className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl border hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"><Pause size={16}/> পজ</button>
              <button onClick={resume} className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl border hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"><Play size={16}/> রিজুম</button>
              <button onClick={stop} className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl border hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"><Square size={16}/> স্টপ</button>
              <button onClick={clearAll} className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl border hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"><Trash2 size={16}/> ক্লিয়ার</button>
              <button onClick={downloadZip} className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl border hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"><Download size={16}/> ডাউনলোড ZIP</button>
            </div>
            <div className="space-y-2">
              <div className="text-sm">প্রগতি: {progress}%</div>
              <Progress value={progress} />
              <div className="text-xs text-zinc-500">{queueIndex}/{total} প্রসেসড • সফল {completed} </div>
            </div>
          </div>
        </section>

        {/* Right column: Gallery */}
        <section className="lg:col-span-2">
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 shadow-sm">
            <h2 className="text-lg font-semibold mb-3">জেনারেটকৃত ইমেজের প্রিভিউ</h2>
            {results.length === 0 && (
              <div className="text-sm text-zinc-500">এখানে ইমেজগুলো দেখা যাবে।</div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {results.map((r, idx) => (
                <motion.div key={idx} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                  <div className="aspect-square bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center">
                    {r.status === "ok" && r.dataUrl ? (
                      <img src={r.dataUrl} alt={r.name} className="w-full h-full object-cover" />
                    ) : r.status === "fail" ? (
                      <div className="text-red-500 text-sm p-4">ফেইল: {r.error || "Unknown error"}</div>
                    ) : (
                      <div className="text-zinc-400 text-sm">Pending…</div>
                    )}
                  </div>
                  <div className="p-3 border-t border-zinc-200 dark:border-zinc-800">
                    <div className="text-xs text-zinc-500 line-clamp-2 mb-1">{r.prompt}</div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-medium truncate" title={r.name}>{r.name}</div>
                      {r.status === "fail" && (
                        <button onClick={() => regenerateOne(idx)} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-900"><RotateCcw size={14}/> রিজেনারেট</button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-zinc-200 dark:border-zinc-800 py-6">
        <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-3">
            <a className="underline-offset-4 hover:underline" href="https://www.facebook.com/anil.chandrabarman.3" target="_blank" rel="noreferrer">Facebook</a>
            <span>•</span>
            <a className="underline-offset-4 hover:underline" href="tel:01770735110">WhatsApp: 01770735110</a>
          </div>
          <div className="text-right">
            <div className="text-zinc-500 leading-4">Developed By</div>
            <div className="font-medium leading-4">Anil Chandra Barman</div>
          </div>
        </div>
      </footer>
    </div>
  );
}

/**
 * 🔌 HOW TO INTEGRATE REAL PROVIDERS
 * -----------------------------------------------------------------
 * Replace the mocks in `providerEngines` with real API calls.
 * Each engine should return a dataURL (base64 PNG/JPEG) string.
 * Below are minimal examples (pseudo-implementations):
 *
 * 1) DALL·E (OpenAI Images API)
 *    const engine = async (prompt, key) => {
 *      const res = await fetch("https://api.openai.com/v1/images/generations", {
 *        method: "POST",
 *        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
 *        body: JSON.stringify({ model: "gpt-image-1", prompt, size: "1024x1024" })
 *      });
 *      const json = await res.json();
 *      const b64 = json.data[0].b64_json; // base64 PNG
 *      return `data:image/png;base64,${b64}`;
 *    };
 *
 * 2) Gemini (Imagen 2 via Google AI Studio)
 *    const engine = async (prompt, key) => {
 *      const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models/imagen-2:generateImage?key=" + key, {
 *        method: "POST",
 *        headers: { "Content-Type": "application/json" },
 *        body: JSON.stringify({ prompt, size: "1024x1024" })
 *      });
 *      const json = await res.json();
 *      const b64 = json?.image?.base64; // adjust per API shape
 *      return `data:image/png;base64,${b64}`;
 *    };
 *
 * 3) Stability AI
 *    const engine = async (prompt, key) => {
 *      const res = await fetch("https://api.stability.ai/v1/generation/sd3/text-to-image", {
 *        method: "POST",
 *        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
 *        body: JSON.stringify({ prompt, width: 1024, height: 1024, output_format: "png" })
 *      });
 *      const json = await res.json();
 *      const b64 = json.artifacts[0].base64;
 *      return `data:image/png;base64,${b64}`;
 *    };
 *
 * 4) Leonardo, Bing AI, etc. — follow their REST endpoints similarly.
 *
 * SECURITY NOTE: Keys are kept in localStorage only in this demo.
 * For production, proxy calls through your server and secure keys there.
 */
