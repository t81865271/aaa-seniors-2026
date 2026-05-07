// js/admin.js
const loginBox = document.getElementById("loginBox");
const adminApp = document.getElementById("adminApp");
const loginBtn = document.getElementById("loginBtn");
const loginMessage = document.getElementById("loginMessage");
const submissionList = document.getElementById("submissionList");
const countBadge = document.getElementById("countBadge");
const searchInput = document.getElementById("searchInput");
const refreshBtn = document.getElementById("refreshBtn");

const reviewPanel = document.getElementById("reviewPanel");
const emptyState = document.getElementById("emptyState");
const editNameAr = document.getElementById("editNameAr");
const editNameEn = document.getElementById("editNameEn");
const editMajor = document.getElementById("editMajor");
const editUniversities = document.getElementById("editUniversities");
const useMajorUndecidedLogoBtn = document.getElementById("useMajorUndecidedLogoBtn");

const studentPhotoPreview = document.getElementById("studentPhotoPreview");
const duplicateNotice = document.getElementById("duplicateNotice");
const adminMessage = document.getElementById("adminMessage");

const adminPhotoZoom = document.getElementById("adminPhotoZoom");
const adminPhotoX = document.getElementById("adminPhotoX");
const adminPhotoY = document.getElementById("adminPhotoY");
const resetPhotoBtn = document.getElementById("resetPhotoBtn");
const adminNameArSize = document.getElementById("adminNameArSize");
const adminNameArX = document.getElementById("adminNameArX");
const adminNameEnSize = document.getElementById("adminNameEnSize");
const adminNameEnX = document.getElementById("adminNameEnX");
const resetTextBtn = document.getElementById("resetTextBtn");



const logoName = document.getElementById("logoName");
const logoFile = document.getElementById("logoFile");
const uploadLogoBtn = document.getElementById("uploadLogoBtn");
const logoLibrary = document.getElementById("logoLibrary");

const createPostBtn = document.getElementById("createPostBtn");
const downloadPngBtn = document.getElementById("downloadPngBtn");
const createAllPostsBtn = document.getElementById("createAllPostsBtn");
const downloadAllPostsBtn = document.getElementById("downloadAllPostsBtn");
const saveChangesBtn = document.getElementById("saveChangesBtn");
const deleteSubmissionBtn = document.getElementById("deleteSubmissionBtn");

let submissions = [];
let current = null;
let logos = [];
let selectedLogoIds = new Set();
let realtimeChannel = null;



loginBtn.addEventListener("click", () => {
  const pass = document.getElementById("adminPassword").value;
  if (pass !== window.APP_CONFIG.ADMIN_PASSWORD) {
    showMessage(loginMessage, "Wrong password.", "error");
    return;
  }
  sessionStorage.setItem("aca_admin_ok", "yes");
  startAdmin();
});

if (sessionStorage.getItem("aca_admin_ok") === "yes") {
  startAdmin();
}

async function startAdmin() {
  loginBox.classList.add("hidden");
  adminApp.classList.remove("hidden");

  await loadAll();
  setupRealtime();
}

function setupRealtime() {
  try {
    const supabase = getSupabase();
    if (realtimeChannel) supabase.removeChannel(realtimeChannel);
    realtimeChannel = supabase
      .channel("senior-submissions-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "senior_submissions" }, async () => {
        await loadSubmissions();
      })
      .subscribe();
  } catch (err) {
    console.warn("Realtime not active:", err.message);
  }
}

async function loadAll() {
  await loadLogos();
  await loadSubmissions();
}

async function loadSubmissions() {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("senior_submissions")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    submissions = data || [];
    renderList();
    if (current) {
      const newer = submissions.find(s => s.id === current.id);
      if (newer) current = newer;
    }
  } catch (err) {
    submissionList.innerHTML = `<div class="error">${err.message}</div>`;
  }
}

async function loadLogos() {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("university_logos")
      .select("*")
      .order("name", { ascending: true });
    if (error) throw error;
    logos = data || [];
    renderLogoLibrary();
  } catch (err) {
    logoLibrary.innerHTML = `<div class="error">${err.message}</div>`;
  }
}

function renderList() {
  const q = searchInput.value.trim().toLowerCase();
  const filtered = submissions.filter(s => {
    const blob = `${s.name_ar} ${s.name_en} ${s.major} ${s.universities}`.toLowerCase();
    return !q || blob.includes(q);
  });

  countBadge.textContent = submissions.length;
  submissionList.innerHTML = filtered.map(s => `
    <div class="item ${current?.id === s.id ? "active" : ""}" data-id="${s.id}">
      <h3>${escapeHtml(s.name_en || "Unnamed")}</h3>
      <p dir="rtl">${escapeHtml(s.name_ar || "")}</p>
      <p>${escapeHtml(s.universities || "")}</p>
      ${s.created_post_url ? '<span class="badge">Post created</span>' : '<span class="badge">Submitted</span>'}
    </div>
  `).join("") || `<p class="hint">No submissions yet.</p>`;

  submissionList.querySelectorAll(".item").forEach(el => {
    el.addEventListener("click", () => selectSubmission(el.dataset.id));
  });
}

async function selectSubmission(id) {
  current = submissions.find(s => s.id === id);
  if (!current) return;

  emptyState.classList.add("hidden");
  reviewPanel.classList.remove("hidden");

  editNameAr.value = current.name_ar || "";
  editNameEn.value = current.name_en || "";
  editMajor.value = current.major || "";
  editUniversities.value = current.universities || "";
  
  studentPhotoPreview.src = current.photo_url || "";


  adminPhotoZoom.value = current.photo_zoom ?? 1.05;
  adminPhotoX.value = current.photo_x ?? 14;
  adminPhotoY.value = current.photo_y ?? 91;

  adminNameArSize.value = current.name_ar_size ?? 46;
  adminNameArX.value = current.name_ar_x ?? 0;
  adminNameEnSize.value = current.name_en_size ?? 42;
  adminNameEnX.value = current.name_en_x ?? 0;
  

selectedLogoIds = new Set(current.logo_ids || []);
updateMajorUndecidedButton();
renderLogoLibrary();
checkDuplicates();


  downloadPngBtn.disabled = true;
  renderList();
  await previewCurrent();
}

async function previewCurrent() {
  if (!current) return;

  const submission = collectEditedSubmission();

  const selectedUrls = logos
    .filter(l => selectedLogoIds.has(l.id))
    .map(l => l.logo_url);

  const majorLogo = logos.find(l => l.id === submission.major_logo_id);
  submission.major_logo_url = majorLogo ? majorLogo.logo_url : null;

  await renderPostToCanvas(postCanvas, submission, selectedUrls);
}




function collectEditedSubmission() {
  return {
    ...current,
    name_ar: editNameAr.value.trim(),
    name_en: titleCaseName(editNameEn.value),
    major: editMajor.value.trim() ? titleCaseText(editMajor.value) : " ",
    universities: editUniversities.value.trim(),

    photo_zoom: Number(adminPhotoZoom.value),
    photo_x: Number(adminPhotoX.value),
    photo_y: Number(adminPhotoY.value),

    name_ar_size: Number(adminNameArSize.value),
    name_ar_x: Number(adminNameArX.value),
    name_en_size: Number(adminNameEnSize.value),
    name_en_x: Number(adminNameEnX.value),

    major_logo_id: current.major_logo_id || null,
    major_logo_url: current.major_logo_id
      ? (logos.find(l => l.id === current.major_logo_id)?.logo_url || "")
      : "",
  };
}



[editNameAr, editNameEn, editMajor, editUniversities].forEach(el => {
  el.addEventListener("input", () => {
    previewCurrent();
  });

  el.addEventListener("blur", () => {
    if (el === editNameEn) editNameEn.value = titleCaseName(editNameEn.value);
    if (el === editMajor) editMajor.value = titleCaseText(editMajor.value);
    previewCurrent();
  });
});

[adminPhotoZoom, adminPhotoX, adminPhotoY].forEach(el => {
  el.addEventListener("input", () => {
    previewCurrent();
  });
});
[adminNameArSize, adminNameArX, adminNameEnSize, adminNameEnX].forEach(el => {
  el.addEventListener("input", () => {
    previewCurrent();
  });
});


resetPhotoBtn.addEventListener("click", () => {
  adminPhotoZoom.value = 1.05;
  adminPhotoX.value = 14;
  adminPhotoY.value = 91;
  previewCurrent();
});
resetTextBtn.addEventListener("click", () => {
  adminNameArSize.value = 46;
  adminNameArX.value = 0;
  adminNameEnSize.value = 42;
  adminNameEnX.value = 0;
  previewCurrent();
});
function checkDuplicates() {
  const sameName = submissions.filter(s =>
    s.id !== current.id &&
    (normalize(s.name_en) === normalize(current.name_en) || normalize(s.name_ar) === normalize(current.name_ar))
  );
  duplicateNotice.innerHTML = sameName.length
    ? `<b>Duplicate warning:</b> Similar name found: ${sameName.map(s => escapeHtml(s.name_en)).join(", ")}`
    : "No duplicate name found.";
}

function normalize(s) {
  return String(s || "").trim().replace(/\s+/g, " ").toLowerCase();
}

function renderLogoLibrary() {
  logoLibrary.innerHTML = logos.map(l => `
    <div class="logo-choice ${selectedLogoIds.has(l.id) ? "selected" : ""}" data-id="${l.id}">
      <img src="${l.logo_url}" alt="${escapeHtml(l.name)}" />
      <span>${escapeHtml(l.name)}</span>
    </div>
  `).join("") || `<p class="hint">No logos uploaded yet.</p>`;

  logoLibrary.querySelectorAll(".logo-choice").forEach(el => {
    el.addEventListener("click", () => {
      const id = el.dataset.id;
      if (selectedLogoIds.has(id)) selectedLogoIds.delete(id);
      else {
        if (selectedLogoIds.size >= 3) {
          showMessage(adminMessage, "Maximum 3 logos per student.", "error");
          return;
        }
        selectedLogoIds.add(id);
      }
      renderLogoLibrary();
      previewCurrent();
    });
  });
}


function findUndecidedLogo() {
  return logos.find(l =>
    String(l.name || "").toLowerCase().includes("undecided")
  );
}

function updateMajorUndecidedButton() {
  if (!useMajorUndecidedLogoBtn || !current) return;

  const undecidedLogo = findUndecidedLogo();

  if (!undecidedLogo) {
    useMajorUndecidedLogoBtn.textContent = "No Undecided Logo";
    useMajorUndecidedLogoBtn.disabled = true;
    useMajorUndecidedLogoBtn.classList.remove("active");
    return;
  }

  useMajorUndecidedLogoBtn.disabled = false;

  if (current.major_logo_id === undecidedLogo.id) {
    useMajorUndecidedLogoBtn.textContent = "Remove Undecided Logo";
    useMajorUndecidedLogoBtn.classList.add("active");
  } else {
    useMajorUndecidedLogoBtn.textContent = "Use Undecided Logo";
    useMajorUndecidedLogoBtn.classList.remove("active");
  }
}



useMajorUndecidedLogoBtn.addEventListener("click", async () => {
  if (!current) return;

  const undecidedLogo = findUndecidedLogo();

  if (!undecidedLogo) {
    showMessage(adminMessage, "Upload a logo named Undecided first.", "error");
    return;
  }

  if (current.major_logo_id === undecidedLogo.id) {
    // Remove ONLY the major undecided logo
    // Do NOT remove it from Applying to
    current.major_logo_id = null;
  } else {
    // Add undecided logo under Major
    // Do NOT touch selectedLogoIds because that controls Applying to logos
    current.major_logo_id = undecidedLogo.id;

    // Clear whatever is typed in Major(s)
    editMajor.value = " ";
    current.major = " ";
  }

  updateMajorUndecidedButton();
  await previewCurrent();
});

uploadLogoBtn.addEventListener("click", async () => {
  try {
    const name = logoName.value.trim();
    const file = logoFile.files[0];
    if (!name || !file) {
      showMessage(adminMessage, "Enter logo name and choose a logo file.", "error");
      return;
    }

    uploadLogoBtn.disabled = true;
    uploadLogoBtn.textContent = "Uploading...";

    const supabase = getSupabase();
    const ext = file.name.split(".").pop() || "png";
    const path = `university-logos/${safeFileName(name)}_${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("senior-assets")
      .upload(path, file, { upsert: false, contentType: file.type || "image/png" });
    if (uploadError) throw uploadError;

    const { data: publicData } = supabase.storage.from("senior-assets").getPublicUrl(path);

    const { error: insertError } = await supabase.from("university_logos").insert({
      name,
      logo_path: path,
      logo_url: publicData.publicUrl
    });
    if (insertError) throw insertError;

    logoName.value = "";
    logoFile.value = "";
    await loadLogos();
    showMessage(adminMessage, "Logo uploaded.", "success");
  } catch (err) {
    showMessage(adminMessage, err.message, "error");
  } finally {
    uploadLogoBtn.disabled = false;
    uploadLogoBtn.textContent = "Upload Logo";
  }
});


async function saveCurrentChanges() {
  if (!current) return;

  const supabase = getSupabase();
  const updated = collectEditedSubmission();
  updated.logo_ids = Array.from(selectedLogoIds);

  const { error } = await supabase
    .from("senior_submissions")
    .update({
      name_ar: updated.name_ar,
      name_en: updated.name_en,
      major: updated.major,
      universities: updated.universities,
      logo_ids: updated.logo_ids,
      major_logo_id: updated.major_logo_id,

      photo_zoom: updated.photo_zoom,
      photo_x: updated.photo_x,
      photo_y: updated.photo_y,

      name_ar_size: updated.name_ar_size,
      name_ar_x: updated.name_ar_x,
      name_en_size: updated.name_en_size,
      name_en_x: updated.name_en_x,

      updated_at: new Date().toISOString()
    })
    .eq("id", current.id);

  if (error) throw error;

  current = {
    ...current,
    ...updated,
    logo_ids: updated.logo_ids
  };

  await loadSubmissions();
}

saveChangesBtn.addEventListener("click", async () => {
  try {
    saveChangesBtn.disabled = true;
    saveChangesBtn.textContent = "Saving...";

    await saveCurrentChanges();

    showMessage(adminMessage, "Changes saved for this student.", "success");
  } catch (err) {
    console.error(err);
    showMessage(adminMessage, err.message, "error");
  } finally {
    saveChangesBtn.disabled = false;
    saveChangesBtn.textContent = "Save Changes";
  }
});

async function createPostForSubmission(submission) {
  const supabase = getSupabase();

  const selectedUrls = logos
    .filter(l => (submission.logo_ids || []).includes(l.id))
    .map(l => l.logo_url);

  const majorLogo = logos.find(l => l.id === submission.major_logo_id);
submission.major_logo_url = majorLogo ? majorLogo.logo_url : null;

await renderPostToCanvas(postCanvas, submission, selectedUrls);
  

  const blob = await new Promise(resolve => postCanvas.toBlob(resolve, "image/png", 1));
  const postPath = `created-posts/${submission.id}.png`;

  const { error: uploadError } = await supabase.storage
    .from("senior-assets")
    .upload(postPath, blob, {
      contentType: "image/png",
      upsert: true
    });

  if (uploadError) throw uploadError;

  const { data: publicData } = supabase.storage
    .from("senior-assets")
    .getPublicUrl(postPath);

  const { error: updateError } = await supabase
    .from("senior_submissions")
    .update({
      created_post_path: postPath,
      created_post_url: publicData.publicUrl,
      updated_at: new Date().toISOString()
    })
    .eq("id", submission.id);

  if (updateError) throw updateError;
}

createAllPostsBtn.addEventListener("click", async () => {
  const confirmed = confirm(
    "Create posts for ALL submissions?\n\nMake sure you saved changes for each student first."
  );

  if (!confirmed) return;

  try {
    createAllPostsBtn.disabled = true;
    downloadAllPostsBtn.disabled = true;
    createAllPostsBtn.textContent = "Creating 0/...";

    await loadSubmissions();

    let count = 0;
    const total = submissions.length;

    for (const submission of submissions) {
      createAllPostsBtn.textContent = `Creating ${count + 1}/${total}...`;
      await createPostForSubmission(submission);
      count++;
    }

    await loadSubmissions();

    alert(`Done. Created ${count} posts.`);
    showMessage(adminMessage, `Created ${count} posts successfully.`, "success");
  } catch (err) {
    console.error(err);
    alert("Something went wrong while creating all posts: " + err.message);
  } finally {
    createAllPostsBtn.disabled = false;
    downloadAllPostsBtn.disabled = false;
    createAllPostsBtn.textContent = "Create All Posts";
  }
});

downloadAllPostsBtn.addEventListener("click", async () => {
  try {
    downloadAllPostsBtn.disabled = true;
    createAllPostsBtn.disabled = true;
    downloadAllPostsBtn.textContent = "Preparing ZIP...";

    await loadSubmissions();

    const created = submissions.filter(s => s.created_post_url);

    if (!created.length) {
      alert("No created posts found. Click Create All Posts first.");
      return;
    }

    const zip = new JSZip();
    let count = 0;

    for (const student of created) {
      count++;
      downloadAllPostsBtn.textContent = `Downloading ${count}/${created.length}...`;

      const response = await fetch(student.created_post_url);

      if (!response.ok) {
        throw new Error(`Could not download post for ${student.name_en || student.id}`);
      }

      const blob = await response.blob();

      const filename = `${safeFileName(student.name_en || student.id)}_senior_post.png`;
      zip.file(filename, blob);
    }

    downloadAllPostsBtn.textContent = "Creating ZIP...";

    const zipBlob = await zip.generateAsync({ type: "blob" });

    const a = document.createElement("a");
    a.href = URL.createObjectURL(zipBlob);
    a.download = "aca_seniors_2026_posts.zip";
    a.click();

    URL.revokeObjectURL(a.href);

    showMessage(adminMessage, `Downloaded ${created.length} posts as ZIP.`, "success");
  } catch (err) {
    console.error(err);
    alert("Something went wrong while downloading all posts: " + err.message);
  } finally {
    downloadAllPostsBtn.disabled = false;
    createAllPostsBtn.disabled = false;
    downloadAllPostsBtn.textContent = "Download All Posts";
  }
});



createPostBtn.addEventListener("click", async () => {
  try {
    if (!current) return;

    const supabase = getSupabase();
    const updated = collectEditedSubmission();
    updated.logo_ids = Array.from(selectedLogoIds);

    createPostBtn.disabled = true;
    createPostBtn.textContent = "Creating...";

    const selectedUrls = logos.filter(l => selectedLogoIds.has(l.id)).map(l => l.logo_url);
    await renderPostToCanvas(postCanvas, updated, selectedUrls);

    const blob = await new Promise(resolve => postCanvas.toBlob(resolve, "image/png", 1));
    const postPath = `created-posts/${current.id}.png`;

    const { error: uploadError } = await supabase.storage
      .from("senior-assets")
      .upload(postPath, blob, { contentType: "image/png", upsert: true });
    if (uploadError) throw uploadError;

    const { data: publicData } = supabase.storage.from("senior-assets").getPublicUrl(postPath);

    const { error: updateError } = await supabase
  .from("senior_submissions")
  .update({
    name_ar: updated.name_ar,
    name_en: updated.name_en,
    major: updated.major,
    universities: updated.universities,
    logo_ids: updated.logo_ids,
    major_logo_id: updated.major_logo_id,

    photo_zoom: updated.photo_zoom,
    photo_x: updated.photo_x,
    photo_y: updated.photo_y,

    name_ar_size: updated.name_ar_size,
name_ar_x: updated.name_ar_x,
name_en_size: updated.name_en_size,
name_en_x: updated.name_en_x,


    created_post_path: postPath,
    created_post_url: publicData.publicUrl,
    updated_at: new Date().toISOString()
  })
  .eq("id", current.id);

    if (updateError) throw updateError;

    downloadPngBtn.disabled = false;
    showMessage(adminMessage, "Post created and saved. You can download it now.", "success");
    await loadSubmissions();
  } catch (err) {
    console.error(err);
    showMessage(adminMessage, err.message, "error");
  } finally {
    createPostBtn.disabled = false;
    createPostBtn.textContent = "Create Post";
  }
});

downloadPngBtn.addEventListener("click", () => {
  if (!current) return;
  downloadCanvas(postCanvas, `${safeFileName(editNameEn.value || current.id)}_senior_post.png`);
});



refreshBtn.addEventListener("click", loadAll);
searchInput.addEventListener("input", renderList);

function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
deleteSubmissionBtn.addEventListener("click", async () => {
  if (!current) return;

  const confirmed = confirm(
    `Delete submission for ${current.name_en}?\n\nThis is useful if the student wants to resubmit.`
  );

  if (!confirmed) return;

  try {
    const supabase = getSupabase();

    deleteSubmissionBtn.disabled = true;
    deleteSubmissionBtn.textContent = "Deleting...";

    const { error } = await supabase
      .from("senior_submissions")
      .delete()
      .eq("id", current.id);

    if (error) throw error;

    current = null;
    reviewPanel.classList.add("hidden");
    emptyState.classList.remove("hidden");

    await loadSubmissions();

    alert("Submission deleted. The student can now resubmit.");
  } catch (err) {
    console.error(err);
    showMessage(adminMessage, err.message, "error");
  } finally {
    deleteSubmissionBtn.disabled = false;
    deleteSubmissionBtn.textContent = "Delete Submission";
  }
});
