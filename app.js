// ---------------------------------------------------------------------------
// 4 P's of Loss Diagnostic — front-end logic
// Vanilla JS, no build step, safe to host as a static site (e.g. GitHub Pages).
// ---------------------------------------------------------------------------

const STORAGE_KEY = "fourPsLossDiagnosticDraft_v1";
const SECTION_KEYS = ["people", "place", "process", "product"];
const SECTION_LABELS = { people: "People", place: "Place", process: "Process", product: "Product" };
const RATING_SEVERITY = { "Deep Dive Required": 3, "Opportunity": 2, "Good Order": 1 };

function defaultState() {
  return {
    context: {
      store: "", brand: "", walkDateTime: "",
      leaderSpokenTo: "", completedBy: "", overallHealth: "", email: ""
    },
    sections: {
      people: { observations: "", rating: "" },
      place: { observations: "", rating: "" },
      process: { observations: "", rating: "" },
      product: { observations: "", rating: "" }
    }
  };
}

let state = defaultState();

// ---------------------------------------------------------------------------
// Persistence (local draft, works offline, keeps data safe on the device)
// ---------------------------------------------------------------------------
function saveDraft() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    setStatus("Draft saved on this device", "ok");
  } catch (e) {
    console.warn("Could not save draft locally", e);
  }
}

function loadDraft() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      state = Object.assign(defaultState(), parsed);
      state.sections = Object.assign(defaultState().sections, parsed.sections || {});
    }
  } catch (e) {
    console.warn("Could not load saved draft", e);
  }
}

// ---------------------------------------------------------------------------
// DOM <-> state
// ---------------------------------------------------------------------------
function applyStateToDOM() {
  // context fields
  Object.keys(state.context).forEach((key) => {
    const el = document.querySelector(`[data-field="${key}"]`);
    if (el && el.tagName !== "SPAN") {
      if (key === "overallHealth") return; // computed, filled separately
      el.value = state.context[key] || "";
    }
  });

  // sections
  SECTION_KEYS.forEach((key) => {
    const section = document.querySelector(`.p-section[data-key="${key}"]`);
    if (!section) return;
    const obsEl = section.querySelector("textarea.observations");
    if (obsEl) obsEl.value = state.sections[key].observations || "";
    const rating = state.sections[key].rating;
    section.querySelectorAll(".rating-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.value === rating);
    });
  });

  updateOverallHealth();
  updateSummaryTable();
}

function updateOverallHealth() {
  const ratings = SECTION_KEYS.map((k) => state.sections[k].rating).filter(Boolean);
  let overall = "";
  if (ratings.length === SECTION_KEYS.length) {
    let worst = ratings[0];
    ratings.forEach((r) => {
      if (RATING_SEVERITY[r] > RATING_SEVERITY[worst]) worst = r;
    });
    overall = worst;
  } else if (ratings.length > 0) {
    overall = "In progress";
  }
  state.context.overallHealth = overall;
  const el = document.querySelector('[data-field="overallHealth"]');
  if (el) el.value = overall;
}

function truncate(str, len) {
  if (!str) return "";
  return str.length > len ? str.slice(0, len - 1).trim() + "…" : str;
}

function updateSummaryTable() {
  SECTION_KEYS.forEach((key) => {
    const ratingCell = document.querySelector(`[data-summary="${key}-rating"]`);
    const obsCell = document.querySelector(`[data-summary="${key}-obs"]`);
    if (ratingCell) ratingCell.textContent = state.sections[key].rating || "—";
    if (obsCell) obsCell.textContent = truncate(state.sections[key].observations, 140) || "—";
  });
}

// ---------------------------------------------------------------------------
// Event wiring
// ---------------------------------------------------------------------------
function wireContextFields() {
  document.querySelectorAll("#context [data-field]").forEach((el) => {
    if (el.readOnly) return;
    const key = el.dataset.field;
    el.addEventListener("input", () => {
      state.context[key] = el.value;
      saveDraft();
    });
  });
}

function wireSections() {
  document.querySelectorAll(".p-section").forEach((section) => {
    const key = section.dataset.key;
    const obsEl = section.querySelector("textarea.observations");
    if (obsEl) {
      obsEl.addEventListener("input", () => {
        state.sections[key].observations = obsEl.value;
        updateSummaryTable();
        saveDraft();
      });
    }
    section.querySelectorAll(".rating-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const current = state.sections[key].rating;
        const value = btn.dataset.value;
        state.sections[key].rating = current === value ? "" : value; // toggle off if clicked again
        section.querySelectorAll(".rating-btn").forEach((b) => {
          b.classList.toggle("active", b === btn && state.sections[key].rating === value);
        });
        updateOverallHealth();
        updateSummaryTable();
        saveDraft();
      });
    });
  });
}

// ---------------------------------------------------------------------------
// PDF generation
// ---------------------------------------------------------------------------
function sanitiseFilenamePart(str) {
  return (str || "unnamed").toString().trim().replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "") || "unnamed";
}

function buildFilename() {
  const store = sanitiseFilenamePart(state.context.store);
  const date = (state.context.walkDateTime || "").slice(0, 10) || new Date().toISOString().slice(0, 10);
  return `4Ps-Diagnostic_${store}_${date}.pdf`;
}

function buildPdfDoc() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const marginX = 40;
  let y = 50;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  function ensureSpace(needed) {
    if (y + needed > pageHeight - 50) {
      doc.addPage();
      y = 50;
    }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("4 P's of Loss Diagnostic", marginX, y);
  y += 20;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text("Loss Leadership Toolkit — Confidential — For Internal Use", marginX, y);
  doc.setTextColor(0);
  y += 25;

  const ctx = state.context;
  const infoRows = [
    ["Store", ctx.store || "—", "Brand", ctx.brand || "—"],
    ["Walk Date / Time", ctx.walkDateTime || "—", "Leader Spoken To", ctx.leaderSpokenTo || "—"],
    ["Completed By", ctx.completedBy || "—", "Overall Loss Health", ctx.overallHealth || "—"],
    ["Submitted By (email)", ctx.email || "—", "", ""]
  ];

  doc.autoTable({
    startY: y,
    theme: "plain",
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 110 },
      1: { cellWidth: 140 },
      2: { fontStyle: "bold", cellWidth: 110 },
      3: { cellWidth: 140 }
    },
    body: infoRows
  });
  y = doc.lastAutoTable.finalY + 20;

  SECTION_KEYS.forEach((key, idx) => {
    ensureSpace(90);
    const sec = state.sections[key];
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(`P${idx + 1} — ${SECTION_LABELS[key]}`, marginX, y);

    const rating = sec.rating || "Not rated";
    const ratingColor =
      rating === "Good Order" ? [22, 163, 74] :
      rating === "Opportunity" ? [217, 119, 6] :
      rating === "Deep Dive Required" ? [220, 38, 38] : [120, 120, 120];
    doc.setFontSize(10);
    doc.setTextColor(...ratingColor);
    doc.text(rating, pageWidth - marginX, y, { align: "right" });
    doc.setTextColor(0);
    y += 16;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const obsText = sec.observations && sec.observations.trim() ? sec.observations.trim() : "No observations recorded.";
    const lines = doc.splitTextToSize(obsText, pageWidth - marginX * 2);
    ensureSpace(lines.length * 12 + 15);
    doc.text(lines, marginX, y);
    y += lines.length * 12 + 20;
  });

  ensureSpace(140);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Section Summary", marginX, y);
  y += 10;

  doc.autoTable({
    startY: y,
    head: [["Section", "Rating", "Key Observation / Priority Theme"]],
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [15, 23, 42] },
    columnStyles: { 0: { cellWidth: 70 }, 1: { cellWidth: 100 } },
    body: SECTION_KEYS.map((key) => [
      SECTION_LABELS[key],
      state.sections[key].rating || "—",
      truncate(state.sections[key].observations, 300) || "—"
    ])
  });

  return doc;
}

function downloadPdf() {
  const doc = buildPdfDoc();
  doc.save(buildFilename());
}

// ---------------------------------------------------------------------------
// Submission to Apps Script backend (shared log + email)
// ---------------------------------------------------------------------------
function setStatus(message, kind) {
  const el = document.getElementById("status-line");
  if (!el) return;
  el.textContent = message;
  el.className = "status-line" + (kind ? " " + kind : "");
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value || "");
}

async function submitDiagnostic() {
  const email = state.context.email;
  if (!isValidEmail(email)) {
    setStatus("Enter a valid email address before submitting.", "err");
    document.getElementById("ctx-email").focus();
    return;
  }
  if (!APP_CONFIG.SCRIPT_URL || APP_CONFIG.SCRIPT_URL.indexOf("PASTE_YOUR") === 0) {
    setStatus("Submission isn't configured yet — the site owner needs to add the Apps Script URL in config.js. Your PDF can still be downloaded manually.", "err");
    return;
  }

  const submitBtn = document.getElementById("btn-submit");
  submitBtn.disabled = true;
  setStatus("Generating PDF and submitting…", "pending");

  try {
    const doc = buildPdfDoc();
    const pdfBase64 = doc.output("datauristring").split(",")[1];
    const filename = buildFilename();

    const payload = {
      submittedAt: new Date().toISOString(),
      context: state.context,
      sections: state.sections,
      filename: filename,
      pdfBase64: pdfBase64
    };

    const response = await fetch(APP_CONFIG.SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify(payload) // sent as text/plain to avoid a CORS preflight
    });

    let result = {};
    try { result = await response.json(); } catch (e) { /* ignore parse issues */ }

    if (response.ok && result.ok !== false) {
      setStatus("Submitted — saved to the team log and emailed to " + email + ".", "ok");
    } else {
      throw new Error((result && result.error) || "Unknown error from server");
    }
  } catch (err) {
    console.error(err);
    setStatus("Couldn't submit online (" + err.message + "). Your draft is still saved on this device — try Download PDF and email it manually, or retry submission once you have signal.", "err");
  } finally {
    submitBtn.disabled = false;
  }
}

function clearAll() {
  if (!confirm("Clear all answers on this diagnostic? This can't be undone.")) return;
  state = defaultState();
  localStorage.removeItem(STORAGE_KEY);
  document.querySelectorAll("textarea.observations").forEach((t) => (t.value = ""));
  document.querySelectorAll("#context input, #context select").forEach((el) => (el.value = ""));
  document.querySelectorAll(".rating-btn").forEach((b) => b.classList.remove("active"));
  updateOverallHealth();
  updateSummaryTable();
  setStatus("Cleared. Not yet saved", "");
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  loadDraft();
  wireContextFields();
  wireSections();
  applyStateToDOM();

  document.getElementById("btn-download").addEventListener("click", downloadPdf);
  document.getElementById("btn-submit").addEventListener("click", submitDiagnostic);
  document.getElementById("btn-clear").addEventListener("click", clearAll);

  const hasAnyData = JSON.stringify(state) !== JSON.stringify(defaultState());
  setStatus(hasAnyData ? "Restored your saved draft" : "Not yet saved", hasAnyData ? "ok" : "");
});
