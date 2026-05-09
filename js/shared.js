// js/shared.js
let supabaseClient = null;

function getSupabase() {
  if (supabaseClient) return supabaseClient;
  const cfg = window.APP_CONFIG;
  if (!cfg.SUPABASE_URL || cfg.SUPABASE_URL.includes("PASTE_")) {
    throw new Error("Supabase is not configured. Open js/config.js and paste your Supabase URL and anon key.");
  }
  supabaseClient = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
  return supabaseClient;
}

function titleCaseName(value) {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((word) => {
      if (!word) return "";

      const lower = word.toLowerCase();

      if (lower.includes("-")) {
        return lower
          .split("-")
          .map(p => p.charAt(0).toUpperCase() + p.slice(1))
          .join("-");
      }

      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

function titleCaseText(value) {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .split(/(\s+|\/|-)/)
    .map(part => {
      if (part === " " || part === "/" || part === "-") return part;
      if (/^\s+$/.test(part)) return part;
      if (part.length <= 3 && part === part.toUpperCase()) return part;

      const lower = part.toLowerCase();
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join("");
}

function showMessage(el, text, type="notice") {
  el.innerHTML = text ? `<div class="${type}">${text}</div>` : "";
}

function safeFileName(name) {
  return String(name || "")
    .trim()
    .replace(/[^a-z0-9_\-\.]+/gi, "_")
    .replace(/_+/g, "_")
    .slice(0, 80);
}

function makeId() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function downloadCanvas(canvas, filename) {
  const jpgName = filename
    .replace(/\.png$/i, ".jpg")
    .replace(/\.jpeg$/i, ".jpg");

  canvas.toBlob((blob) => {
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.download = jpgName;
    a.href = url;
    a.click();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, "image/jpeg", 0.95);
}
