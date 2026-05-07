
// js/postRenderer.js
const postCanvas = document.getElementById("postCanvas");
const pctx = postCanvas ? postCanvas.getContext("2d") : null;

async function renderPostToCanvas(canvas, submission, selectedLogoUrls = []) {
  const ctx = canvas.getContext("2d");
  const cfg = window.APP_CONFIG;
  
const size = cfg.POST_SIZE || 1080;

// Makes the admin preview + downloaded image sharper on Retina/iPhone screens
const previewScale = Math.min(window.devicePixelRatio || 1, 3);

canvas.width = size * previewScale;
canvas.height = size * previewScale;

// Keep the preview visually the same size on the page
canvas.style.width = "100%";
canvas.style.height = "auto";

// Keep your 1080 design coordinates working
ctx.setTransform(previewScale, 0, 0, previewScale, 0, 0);

ctx.imageSmoothingEnabled = true;
ctx.imageSmoothingQuality = "high";


  const bg = await loadImage(cfg.TEMPLATE_PATH);

  ctx.clearRect(0, 0, size, size);

  // 1. Draw student photo first so it sits behind the template
  if (submission.photo_url) {
    const photo = await loadImage(submission.photo_url);
    drawPhotoBehindTemplate(ctx, photo, cfg.PHOTO_BOX, submission);
  }

  // 2. Draw the transparent template on top
  ctx.drawImage(bg, 0, 0, size, size);

  // Arabic name
  drawFittedText(
    ctx,
    submission.name_ar || "",
    cfg.TEXT.nameAr.x + Number(submission.name_ar_x || 0),
    cfg.TEXT.nameAr.y,
    cfg.TEXT.nameAr.maxWidth,
    Number(submission.name_ar_size || cfg.TEXT.nameAr.size),
    {
      color: "#071f35",
      font: "serif",
      align: "right",
      direction: "rtl",
      weight: "700"
    }
  );

  // English name
  drawFittedText(
    ctx,
    submission.name_en || "",
    cfg.TEXT.nameEn.x + Number(submission.name_en_x || 0),
    cfg.TEXT.nameEn.y,
    cfg.TEXT.nameEn.maxWidth,
    Number(submission.name_en_size || cfg.TEXT.nameEn.size),
    {
      color: "#b99a60",
      font: "Georgia, serif",
      align: "right",
      weight: "500"
    }
  );

  // Major after label
  drawWrappedText(
    ctx,
    submission.major || "",
    cfg.TEXT.major.x,
    cfg.TEXT.major.y,
    cfg.TEXT.major.maxWidth,
    cfg.TEXT.major.size,
    42,
    {
      color: "#071f35",
      font: "Georgia, serif",
      align: "left",
      maxLines: 3,
      weight: "700"
    }
  );

  // University logos after Applying to
  await drawLogos(ctx, selectedLogoUrls, cfg.TEXT.applyingToLogos);

  return canvas;
}

function drawPhotoBehindTemplate(ctx, img, box, settings = {}) {
  const { x, y, w, h } = box;

  // Make the image area bigger than the visible arch opening
  const bleed = 40;

  const areaX = x - bleed;
  const areaY = y - bleed;
  const areaW = w + bleed * 2;
  const areaH = h + bleed * 2;

  const zoom = Number(settings.photo_zoom || 1.05);
  const moveX = Number(settings.photo_x || 14);
  const moveY = Number(settings.photo_y || 91);

  const scale = Math.max(areaW / img.width, areaH / img.height) * zoom;

  const nw = img.width * scale;
  const nh = img.height * scale;

  const dx = areaX + (areaW - nw) / 2 + moveX;
  const dy = areaY + (areaH - nh) / 2 + moveY;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, dx, dy, nw, nh);
}

async function drawLogos(ctx, urls, box) {
  const clean = urls.filter(Boolean).slice(0, 3);
  if (!clean.length) return;

  let slots = [];

  if (clean.length === 1) {
    // One logo centered
    slots = [
      {
        x: box.x + box.w / 2 - 130,
        y: box.y,
        w: 260,
        h: box.h
      }
    ];
  } else if (clean.length === 2) {
    // Two logos closer together
    slots = [
      {
        x: box.x,
        y: box.y,
        w: box.w / 2 - 2,
        h: box.h
      },
      {
        x: box.x + box.w / 2 + 2,
        y: box.y,
        w: box.w / 2 - 2,
        h: box.h
      }
    ];
  } else {
    // Three logos smaller with spacing
    const gap = 14;
    const sw = (box.w - gap * 2) / 3;

    slots = [
      { x: box.x, y: box.y, w: sw, h: box.h },
      { x: box.x + sw + gap, y: box.y, w: sw, h: box.h },
      { x: box.x + (sw + gap) * 2, y: box.y, w: sw, h: box.h }
    ];
  }

  for (let i = 0; i < clean.length; i++) {
    const img = await loadImage(clean[i]);

    // Use the transparent PNG directly.
    // Do NOT use removeWhiteBackground() for your new Canva transparent logos.
    const logoCanvas = img;

    const slot = slots[i];
    const aspect = logoCanvas.width / logoCanvas.height;

    let maxW;
    let maxH;

    if (clean.length === 1) {
      // One logo = biggest
      if (aspect > 1.45) {
        maxW = Math.min(slot.w * 1.2, 260);
        maxH = 120;
      } else {
        maxW = 180;
        maxH = 180;
      }
    } else if (clean.length === 2) {
      // Two logos = bigger
      if (aspect > 1.45) {
        maxW = Math.min(slot.w * 1.15, 230);
        maxH = 110;
      } else {
        maxW = 145;
        maxH = 145;
      }
    } else {
      // Three logos = smaller to avoid overlap
      if (aspect > 1.45) {
        maxW = Math.min(slot.w * 1.02, 130);
        maxH = 72;
      } else {
        maxW = 95;
        maxH = 95;
      }
    }

    const scale = Math.min(maxW / logoCanvas.width, maxH / logoCanvas.height);
    const nw = logoCanvas.width * scale;
    const nh = logoCanvas.height * scale;

    const dx = slot.x + (slot.w - nw) / 2;

    // This +9 moves the logos slightly down.
    // Increase to +12 or +15 if you want them lower.
    const dy = slot.y + (slot.h - nh) / 2 + 9;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(logoCanvas, dx, dy, nw, nh);
  }
}

function drawFittedText(ctx, text, x, y, maxWidth, size, opts = {}) {
  let fontSize = size;
  const font = opts.font || "Georgia, serif";
  const weight = opts.weight || "400";

  ctx.textAlign = opts.align || "left";
  ctx.fillStyle = opts.color || "#111";
  ctx.direction = opts.direction || "ltr";

  do {
    ctx.font = `${weight} ${fontSize}px ${font}`;
    if (ctx.measureText(text).width <= maxWidth) break;
    fontSize -= 2;
  } while (fontSize > 18);

  ctx.fillText(text, x, y);

  // Reset direction after Arabic text
  ctx.direction = "ltr";
}

function drawWrappedText(ctx, text, x, y, maxWidth, size, lineHeight, opts = {}) {
  const manualLines = String(text || "").split("\n");
  const lines = [];
  const font = opts.font || "Georgia, serif";
  const weight = opts.weight || "400";

  ctx.font = `${weight} ${size}px ${font}`;

  for (const manualLine of manualLines) {
    const words = manualLine.split(/\s+/).filter(Boolean);
    let current = "";

    for (const word of words) {
      const test = current ? `${current} ${word}` : word;

      if (ctx.measureText(test).width <= maxWidth) {
        current = test;
      } else {
        if (current) lines.push(current);
        current = word;
      }
    }

    if (current) lines.push(current);

    // Keep empty manual line if user presses Enter twice
    if (!words.length) lines.push("");
  }

  ctx.fillStyle = opts.color || "#111";
  ctx.textAlign = opts.align || "left";
  ctx.font = `${weight} ${size}px ${font}`;

  lines.slice(0, opts.maxLines || 3).forEach((line, i) => {
    ctx.fillText(line, x, y + i * lineHeight);
  });
}
