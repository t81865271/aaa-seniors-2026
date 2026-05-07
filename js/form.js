// js/form.js
const form = document.getElementById("studentForm");
const nameEn = document.getElementById("nameEn");
const majorInput = document.getElementById("major");

const photoInput = document.getElementById("photoInput");
const submitBtn = document.getElementById("submitBtn");
const message = document.getElementById("message");

const cropSection = document.getElementById("cropSection");
const cropCanvas = document.getElementById("cropCanvas");
const cropCtx = cropCanvas.getContext("2d");


let uploadedImage = null;

nameEn.addEventListener("blur", () => {
  nameEn.value = titleCaseName(nameEn.value);
});
majorInput.addEventListener("blur", () => {
  if (majorInput.value.trim()) {
    majorInput.value = titleCaseText(majorInput.value);
  }
});




photoInput.addEventListener("change", async () => {
  const file = photoInput.files[0];
  if (!file) return;

  const dataUrl = await fileToDataUrl(file);
  uploadedImage = await loadImage(dataUrl);

  cropSection.classList.remove("hidden");
  drawCropPreview();
});


function drawCropPreview() {
  if (!uploadedImage) return;

  cropCtx.clearRect(0, 0, cropCanvas.width, cropCanvas.height);
  cropCtx.fillStyle = "#eee";
  cropCtx.fillRect(0, 0, cropCanvas.width, cropCanvas.height);

  const boxW = cropCanvas.width;
  const boxH = cropCanvas.height;

  // Automatic portrait crop:
  // fills the frame, centers horizontally, and slightly favors the face area
  const scale = Math.max(boxW / uploadedImage.width, boxH / uploadedImage.height);

  const w = uploadedImage.width * scale;
  const h = uploadedImage.height * scale;

  const x = (boxW - w) / 2;
  const y = (boxH - h) / 2 - 18;

  cropCtx.drawImage(uploadedImage, x, y, w, h);

  cropCtx.strokeStyle = "rgba(255,255,255,.75)";
  cropCtx.lineWidth = 3;
  cropCtx.strokeRect(1.5, 1.5, boxW - 3, boxH - 3);
}

function getCroppedBlob() {
  return new Promise(resolve => {
    cropCanvas.toBlob(blob => resolve(blob), "image/jpeg", 0.94);
  });
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  showMessage(message, "");

  try {
    const supabase = getSupabase();

    const name_ar = document.getElementById("nameAr").value.trim();
    const name_en = titleCaseName(nameEn.value);
    const majorRaw = document.getElementById("major").value;
const major = majorRaw.trim() ? titleCaseText(majorRaw) : " ";
    const universities = document.getElementById("universities").value.trim();

    if (!name_ar || !name_en || !major || !universities || !uploadedImage) {
      showMessage(message, "Please fill all required fields and upload your portrait photo.", "error");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting...";

    const id = makeId();
    const croppedBlob = await getCroppedBlob();
    const photoPath = `student-photos/${id}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from("senior-assets")
      .upload(photoPath, croppedBlob, {
        contentType: "image/jpeg",
        upsert: false
      });

    if (uploadError) throw uploadError;

    const { data: publicData } = supabase.storage
      .from("senior-assets")
      .getPublicUrl(photoPath);

    const { error: insertError } = await supabase
      .from("senior_submissions")
      .insert({
        id,
        name_ar,
        name_en,
        major,
        universities,
        photo_path: photoPath,
        photo_url: publicData.publicUrl,
        created_post_url: null
      });

    if (insertError) throw insertError;

await sendTelegramNotification({
  name_ar: nameAr,
  name_en: nameEn,
  major,
  universities
});
    
    form.reset();
    cropSection.classList.add("hidden");
    uploadedImage = null;
    showMessage(message, "Submitted successfully. Thank you!", "success");
  } catch (err) {
    console.error(err);
    showMessage(message, err.message || "Something went wrong. Please try again.", "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Submit";
  }
});

async function sendTelegramNotification(submission) {
  try {
    await fetch("/api/notifyTelegram", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name_ar: submission.name_ar,
        name_en: submission.name_en,
        major: submission.major,
        universities: submission.universities
      })
    });
  } catch (err) {
    console.warn("Telegram notification failed:", err);
  }
}

