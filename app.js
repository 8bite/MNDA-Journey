(function(){
"use strict";

var PREFIX = "myjourney_";
var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ============================================================
   OWNER LOCK — the edit toolbar stays hidden from normal visitors.
   Change SECRET_KEY below to your own private word, then always
   open your site once as: yoursite.com/index.html?edit=SECRET_KEY
   That unlocks the toolbar on this browser/device from then on.
   To lock it again on a device, clear the site's browser data,
   or open the URL with a wrong/no ?edit= value in a private window.
============================================================ */
var SECRET_KEY = "MNDAJOURNEY"; // <-- GANTI dengan kata rahasiamu sendiri
(function ownerCheck() {
  var params = new URLSearchParams(window.location.search);
  var attempt = params.get("edit");
  if (attempt && attempt === SECRET_KEY) {
    try { localStorage.setItem(PREFIX + "owner", "1"); } catch (e) {}
  }
  var isOwner = false;
  try { isOwner = localStorage.getItem(PREFIX + "owner") === "1"; } catch (e) {}
  if (isOwner) {
    document.documentElement.classList.add("is-owner");
  }
})();

/* ============================================================
   1. INFO BAR DISMISS
============================================================ */
var infobar = document.getElementById("infobar");
var dismissInfo = document.getElementById("dismissInfo");
if (localStorage.getItem(PREFIX + "infobar_dismissed") === "1" && infobar) {
  infobar.classList.add("hidden");
}
if (dismissInfo) {
  dismissInfo.addEventListener("click", function () {
    infobar.classList.add("hidden");
    try { localStorage.setItem(PREFIX + "infobar_dismissed", "1"); } catch (e) {}
  });
}

/* ============================================================
   2. BACKGROUND CANVAS — drifting stars + rising bubbles, mouse parallax
============================================================ */
var canvas = document.getElementById("bgCanvas");
var ctx = canvas.getContext("2d");
var W, H, DPR;
var stars = [];
var mouseX = 0.5, mouseY = 0.5;

function resizeCanvas() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = W * DPR;
  canvas.height = H * DPR;
  canvas.style.width = W + "px";
  canvas.style.height = H + "px";
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  buildStars();
}

function buildStars() {
  var count = Math.floor((W * H) / 9000);
  count = Math.max(40, Math.min(count, 160));
  stars = [];
  for (var i = 0; i < count; i++) {
    stars.push({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.4 + 0.3,
      tw: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.4 + 0.1,
      parallax: Math.random() * 0.5 + 0.1
    });
  }
}

window.addEventListener("mousemove", function (e) {
  mouseX = e.clientX / window.innerWidth;
  mouseY = e.clientY / window.innerHeight;
});

var t = 0;
function drawFrame() {
  t += 0.016;
  ctx.clearRect(0, 0, W, H);
  var px = (mouseX - 0.5) * 18;
  var py = (mouseY - 0.5) * 18;

  for (var i = 0; i < stars.length; i++) {
    var s = stars[i];
    var alpha = 0.35 + 0.45 * Math.sin(t * s.speed + s.tw);
    alpha = Math.max(0.08, alpha);
    ctx.beginPath();
    ctx.fillStyle = "rgba(238,243,245," + alpha.toFixed(3) + ")";
    var sx = s.x + px * s.parallax;
    var sy = s.y + py * s.parallax;
    ctx.arc(sx, sy, s.r, 0, Math.PI * 2);
    ctx.fill();
  }

  if (!reduceMotion) {
    requestAnimationFrame(drawFrame);
  }
}

resizeCanvas();
window.addEventListener("resize", resizeCanvas);
drawFrame();
if (reduceMotion) {
  // draw a couple of static frames so the sky isn't empty, then stop
  setTimeout(drawFrame, 50);
}

/* ============================================================
   3. JOURNEY TRACK — wavy SVG spine that fills on scroll + rising bubbles
============================================================ */
var trackWrap = document.getElementById("journeyTrack");
var svgWrap = document.getElementById("trackSvgWrap");
var bubbleField = document.getElementById("bubbleField");
var pathD = "";
var fillPath, trackHeight;

function buildTrackSvg() {
  if (!trackWrap || !svgWrap) return;
  trackHeight = trackWrap.offsetHeight;
  if (trackHeight < 10) return;

  var amp = 16;
  var step = 40;
  var pts = [];
  for (var y = 0; y <= trackHeight; y += step) {
    var x = 30 + Math.sin(y / 220) * amp;
    pts.push([x, y]);
  }
  var d = "M " + pts[0][0].toFixed(1) + " " + pts[0][1].toFixed(1);
  for (var i = 1; i < pts.length; i++) {
    var prev = pts[i - 1], cur = pts[i];
    var midY = (prev[1] + cur[1]) / 2;
    d += " Q " + prev[0].toFixed(1) + " " + midY.toFixed(1) + " " + cur[0].toFixed(1) + " " + cur[1].toFixed(1);
  }
  pathD = d;

  svgWrap.innerHTML =
    '<svg viewBox="0 0 60 ' + trackHeight + '" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="' + d + '" stroke="rgba(138,160,176,0.18)" stroke-width="2" fill="none" stroke-linecap="round"/>' +
    '<path id="fillPath" d="' + d + '" stroke="url(#grad)" stroke-width="2.5" fill="none" stroke-linecap="round"/>' +
    '<defs><linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0%" stop-color="#3fe0c5"/><stop offset="100%" stop-color="#e8b94d"/>' +
    '</linearGradient></defs></svg>';

  fillPath = document.getElementById("fillPath");
  if (fillPath) {
    var len = fillPath.getTotalLength();
    fillPath.style.strokeDasharray = len;
    fillPath.style.strokeDashoffset = len;
  }

  buildBubbles();
}

function buildBubbles() {
  if (!bubbleField) return;
  bubbleField.innerHTML = "";
  var n = 14;
  for (var i = 0; i < n; i++) {
    var b = document.createElement("div");
    b.className = "bubble";
    var size = Math.random() * 8 + 4;
    b.style.width = size + "px";
    b.style.height = size + "px";
    b.style.left = (30 + (Math.random() * 40 - 20)) + "px";
    b.style.setProperty("--drift", (Math.random() * 30 - 15) + "px");
    var dur = Math.random() * 10 + 10;
    b.style.animationDuration = dur + "s";
    b.style.animationDelay = (-Math.random() * dur) + "s";
    bubbleField.appendChild(b);
  }
}

function updateTrackProgress() {
  if (!fillPath || !trackWrap) return;
  var rect = trackWrap.getBoundingClientRect();
  var viewportCenter = window.innerHeight * 0.5;
  var progress = (viewportCenter - rect.top) / trackWrap.offsetHeight;
  progress = Math.max(0, Math.min(1, progress));
  var len = fillPath.getTotalLength();
  fillPath.style.strokeDashoffset = len * (1 - progress);
}

/* Chapter reveal + active node via IntersectionObserver */
var chapters = document.querySelectorAll("[data-chapter]");
if ("IntersectionObserver" in window) {
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add("inview");
      }
    });
  }, { threshold: 0.3 });
  chapters.forEach(function (c) { io.observe(c); });
} else {
  chapters.forEach(function (c) { c.classList.add("inview"); });
}

window.addEventListener("scroll", function () {
  window.requestAnimationFrame(updateTrackProgress);
}, { passive: true });
window.addEventListener("resize", function () {
  buildTrackSvg();
  updateTrackProgress();
});

/* delay build until layout (fonts/images) settle */
window.addEventListener("load", function () {
  buildTrackSvg();
  updateTrackProgress();
});
setTimeout(function () { buildTrackSvg(); updateTrackProgress(); }, 400);

/* ============================================================
   4. PHOTO UPLOAD SLOTS (persisted to localStorage as base64)
============================================================ */
function renderSlotImage(slot) {
  var id = slot.getAttribute("data-slot");
  var data;
  try { data = localStorage.getItem(PREFIX + "photo_" + id); } catch (e) { data = null; }
  var img = slot.querySelector("img");

  if (data) {
    // an uploaded (localStorage) photo always takes priority
    if (!img) {
      img = document.createElement("img");
      slot.insertBefore(img, slot.firstChild);
    }
    img.src = data;
    img.dataset.jsManaged = "1";
    slot.classList.add("has-img");
    return;
  }

  // no localStorage entry for this slot
  if (img && img.dataset.jsManaged === "1") {
    // this image was created by our own upload feature and has no
    // matching saved data anymore (e.g. after a reset) — safe to remove
    img.remove();
    slot.classList.remove("has-img");
  } else if (img) {
    // a hardcoded <img> was placed directly in the HTML by hand —
    // never touch it, just make sure the slot styling matches
    slot.classList.add("has-img");
  } else {
    slot.classList.remove("has-img");
  }
}

function wireSlot(slot) {
  var id = slot.getAttribute("data-slot");
  var input = slot.querySelector('input[type="file"]');
  var removeBtn = slot.querySelector(".remove-btn");

  renderSlotImage(slot);

  slot.addEventListener("click", function (e) {
    if (!document.documentElement.classList.contains("is-owner")) return; // pengunjung biasa: tidak bisa upload
    if (e.target === removeBtn) return;
    if (document.body.classList.contains("edit-mode") || !slot.classList.contains("has-img")) {
      input.click();
    }
  });

  input.addEventListener("change", function () {
    var file = input.files && input.files[0];
    if (!file) return;
    if (!file.type.match(/^image\//)) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        localStorage.setItem(PREFIX + "photo_" + id, reader.result);
        renderSlotImage(slot);
        showToast("Foto tersimpan ✓");
      } catch (err) {
        showToast("Gagal simpan — foto terlalu besar");
      }
    };
    reader.readAsDataURL(file);
  });

  if (removeBtn) {
    removeBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      try { localStorage.removeItem(PREFIX + "photo_" + id); } catch (err) {}
      renderSlotImage(slot);
      showToast("Foto dihapus");
    });
  }
}

function makeSlotEl(id, label) {
  var div = document.createElement("div");
  div.className = "photo-slot";
  div.setAttribute("data-slot", id);
  div.innerHTML =
    '<span class="ph-icon">+</span><span class="ph-label">' + label + '</span>' +
    '<input type="file" accept="image/*"><button class="remove-btn" type="button">×</button>';
  return div;
}

document.querySelectorAll(".photo-slot").forEach(wireSlot);

/* "+ tambah foto" dynamic slots, remembering count per group */
document.querySelectorAll(".add-slot-btn[data-add]").forEach(function (btn) {
  var group = btn.getAttribute("data-add");
  var countKey = PREFIX + "extra_" + group;
  var container = group === "gallery" ? document.getElementById("galleryGrid") : document.querySelector('.photo-grid[data-group="' + group + '"]');

  function addExtraSlot(persist) {
    var extraCount = 0;
    try { extraCount = parseInt(localStorage.getItem(countKey) || "0", 10); } catch (e) {}
    var newIndex = extraCount + 1;
    var id = group + "-extra-" + newIndex;
    var el = makeSlotEl(id, "Foto baru");
    container.appendChild(el);
    wireSlot(el);
    if (persist) {
      try { localStorage.setItem(countKey, String(newIndex)); } catch (e) {}
    }
    return el;
  }

  // restore previously added extra slots
  var existing = 0;
  try { existing = parseInt(localStorage.getItem(countKey) || "0", 10); } catch (e) {}
  for (var i = 0; i < existing; i++) { addExtraSlot(false); }

  btn.addEventListener("click", function () {
    var el = addExtraSlot(true);
    el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
  });
});

/* ============================================================
   5. PROJECT CARDS + GALLERY — build from data so structure stays consistent
============================================================ */
var projects = [
  { id: "tambakarts", name: "TambakArts", icon: "🎨", desc: "Ruang kreatif untuk eksplorasi desain dan karya visual." },
  { id: "filosofitambak", name: "Filosofi Tambak", icon: "🐟", desc: "Eksplorasi ide di persimpangan akuakultur dan makna hidup." },
  { id: "desainai", name: "Desain AI", icon: "🤖", desc: "Eksperimen desain dengan bantuan kecerdasan buatan." },
  { id: "poster", name: "Poster", icon: "🖼️", desc: "Kumpulan karya desain poster untuk berbagai acara." },
  { id: "video", name: "Video", icon: "🎬", desc: "Dokumentasi dan karya video." },
  { id: "freelance", name: "Freelance", icon: "💼", desc: "Proyek-proyek lepas yang pernah dikerjakan." }
];

var projectGrid = document.getElementById("projectGrid");
if (projectGrid) {
  projects.forEach(function (p) {
    var card = document.createElement("div");
    card.className = "card project-card";
    card.innerHTML =
      '<span class="card-icon">' + p.icon + '</span>' +
      '<h3 class="card-title">' + p.name + '</h3>' +
      '<p class="card-desc" contenteditable="false" data-key="proj-desc-' + p.id + '">' + p.desc + '</p>' +
      '<div class="photo-grid" data-group="proj-' + p.id + '">' +
      '  <div class="photo-slot" data-slot="proj-' + p.id + '-logo"><span class="ph-icon">+</span><span class="ph-label">Logo</span><input type="file" accept="image/*"><button class="remove-btn" type="button">×</button></div>' +
      '  <div class="photo-slot" data-slot="proj-' + p.id + '-shot"><span class="ph-icon">+</span><span class="ph-label">Screenshot</span><input type="file" accept="image/*"><button class="remove-btn" type="button">×</button></div>' +
      '</div>';
    projectGrid.appendChild(card);
    card.querySelectorAll(".photo-slot").forEach(wireSlot);
  });
}

var galleryGrid = document.getElementById("galleryGrid");
if (galleryGrid) {
  var galleryLabels = ["Selfie", "Pemandangan", "Kampus", "Teman", "Selfie", "Momen", "Momen", "Momen"];
  galleryLabels.forEach(function (label, idx) {
    var el = makeSlotEl("gallery-" + (idx + 1), label);
    galleryGrid.appendChild(el);
    wireSlot(el);
  });
}

/* re-run wiring in case elements were added after initial querySelectorAll (safety net) */
document.querySelectorAll(".photo-slot").forEach(function (slot) {
  if (!slot.dataset.wired) {
    slot.dataset.wired = "1";
  }
});

/* ============================================================
   6. EDIT MODE — contenteditable text + autosave
============================================================ */
var editBtn = document.getElementById("btnEditToggle");
var toolbarPanel = document.getElementById("toolbarPanel");

function loadEditableText() {
  document.querySelectorAll("[data-key]").forEach(function (el) {
    var key = el.getAttribute("data-key");
    var saved;
    try { saved = localStorage.getItem(PREFIX + "text_" + key); } catch (e) { saved = null; }
    if (saved !== null && saved !== "") {
      el.textContent = saved;
      el.classList.remove("placeholder-text");
    }
  });
}

function setEditMode(on) {
  document.body.classList.toggle("edit-mode", on);
  editBtn.classList.toggle("active", on);
  document.querySelectorAll("[data-key]").forEach(function (el) {
    el.setAttribute("contenteditable", on ? "true" : "false");
  });
  document.querySelectorAll(".chapter-story").forEach(function (el) {
    el.setAttribute("contenteditable", on ? "true" : "false");
  });
}

var saveTimers = {};
function debounceSave(el) {
  var key = el.getAttribute("data-key");
  if (!key) return;
  clearTimeout(saveTimers[key]);
  saveTimers[key] = setTimeout(function () {
    try {
      localStorage.setItem(PREFIX + "text_" + key, el.textContent.trim());
      el.classList.remove("placeholder-text");
      showToast("Tersimpan ✓");
    } catch (e) {}
  }, 500);
}

document.addEventListener("input", function (e) {
  if (e.target && e.target.hasAttribute && e.target.hasAttribute("data-key")) {
    debounceSave(e.target);
  }
});

if (editBtn) {
  editBtn.addEventListener("click", function () {
    var willBeOn = !document.body.classList.contains("edit-mode");
    setEditMode(willBeOn);
    toolbarPanel.classList.toggle("open", willBeOn);
  });
}

loadEditableText();

/* ============================================================
   7. EXPORT / IMPORT / RESET
============================================================ */
var btnExport = document.getElementById("btnExport");
var btnImport = document.getElementById("btnImport");
var btnReset = document.getElementById("btnReset");
var importFile = document.getElementById("importFile");

function collectData() {
  var data = {};
  for (var i = 0; i < localStorage.length; i++) {
    var k = localStorage.key(i);
    if (k && k.indexOf(PREFIX) === 0) {
      data[k] = localStorage.getItem(k);
    }
  }
  return data;
}

if (btnExport) {
  btnExport.addEventListener("click", function () {
    var data = collectData();
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "myjourney-data.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("Data diekspor ✓");
  });
}

if (btnImport) {
  btnImport.addEventListener("click", function () { importFile.click(); });
}
if (importFile) {
  importFile.addEventListener("change", function () {
    var file = importFile.files && importFile.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var data = JSON.parse(reader.result);
        Object.keys(data).forEach(function (k) {
          if (k.indexOf(PREFIX) === 0) localStorage.setItem(k, data[k]);
        });
        showToast("Data diimpor — memuat ulang...");
        setTimeout(function () { location.reload(); }, 700);
      } catch (e) {
        showToast("File tidak valid");
      }
    };
    reader.readAsText(file);
  });
}

if (btnReset) {
  btnReset.addEventListener("click", function () {
    if (!confirm("Yakin ingin menghapus semua teks & foto yang sudah disimpan di browser ini?")) return;
    var keys = [];
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k && k.indexOf(PREFIX) === 0) keys.push(k);
    }
    keys.forEach(function (k) { localStorage.removeItem(k); });
    location.reload();
  });
}

/* ============================================================
   8. TOAST
============================================================ */
var toast = document.getElementById("saveToast");
var toastTimer;
function showToast(msg) {
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { toast.classList.remove("show"); }, 1600);
}

})();
