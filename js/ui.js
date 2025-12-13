/*************************************************
  NT Woods HRMS - ui.js (UPDATED - Clean UI/UX)
**************************************************/

/* -------------------------------
   AUTH / LAYOUT
--------------------------------*/
function getCurrentUserOrRedirect() {
  const raw = localStorage.getItem("hrmsUser");
  if (!raw) { window.location.href = "login.html"; return null; }
  try { return JSON.parse(raw); }
  catch (e) { window.location.href = "login.html"; return null; }
}

function logout() {
  localStorage.removeItem("hrmsUser");
  window.location.href = "login.html";
}

function initLayout(activeKey = "") {
  renderNavbar();
  renderSidebar(activeKey);
}

function renderNavbar() {
  const user = getCurrentUserOrRedirect();
  if (!user) return;

  const nav = document.getElementById("navbar");
  if (!nav) return;

  nav.innerHTML = `
    <div class="nav-left">
      <div class="app-title">NT Woods HRMS</div>
    </div>
    <div class="nav-right">
      <div class="user-info">
        <div class="user-name">${escapeHtml(user.name || "")}</div>
        <div class="user-email">${escapeHtml(user.email || "")}</div>
      </div>
      <div class="role-badge">${escapeHtml(user.role || "")}</div>
      <button class="btn-link" onclick="logout()">Logout</button>
    </div>
  `;
}

function renderSidebar(activeKey = "") {
  const user = getCurrentUserOrRedirect();
  if (!user) return;

  const side = document.getElementById("sidebar");
  if (!side) return;

  const modules = [];

  // Shared
  modules.push({ key: "dashboard", label: "Dashboard", link: "dashboard.html" });
  modules.push({ key: "requirements", label: "Requirements", link: "requirements.html" });

  // HR/Admin
  if (user.role === "HR" || user.role === "ADMIN") {
    modules.push({ key: "jobposting", label: "Job Posting", link: "jobposting.html" });
  }

  let html = `<ul class="sidebar-menu">`;
  modules.forEach(m => {
    const active = (m.key === activeKey) ? "active" : "";
    html += `<li class="${active}"><a href="${m.link}">${m.label}</a></li>`;
  });
  html += `</ul>`;

  side.innerHTML = html;
}

/* -------------------------------
   UI HELPERS
--------------------------------*/
function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setAlert(containerId, type, msg) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (!msg) { el.innerHTML = ""; return; }
  el.innerHTML = `<div class="alert alert-${type}">${escapeHtml(msg)}</div>`;
}

/* -------------------------------
   MODAL SYSTEM (CENTERED)
--------------------------------*/
let reqModalEl = null;

function openModal(innerHtml, wide = false) {
  closeReqModal();

  reqModalEl = document.createElement("div");
  reqModalEl.className = "modal-backdrop";
  reqModalEl.innerHTML = `
    <div class="modal ${wide ? "modal-wide" : ""}">
      ${innerHtml}
    </div>
  `;
  document.body.appendChild(reqModalEl);
}

function closeReqModal() {
  if (reqModalEl) {
    reqModalEl.remove();
    reqModalEl = null;
  }
}

/* -------------------------------
   DASHBOARD
--------------------------------*/
async function loadDashboard() {
  const user = getCurrentUserOrRedirect();
  if (!user) return;

  initLayout("dashboard");

  const tiles = [];

  if (user.role === "EA") {
    tiles.push({ title: "Raise Requirement", desc: "Create a new requirement for HR validation", href: "requirements.html" });
  }

  if (user.role === "HR") {
    tiles.push({ title: "Validate Requirements", desc: "Review EA submitted requirements", href: "requirements.html" });
    tiles.push({ title: "Job Posting", desc: "Track where jobs are posted", href: "jobposting.html" });
  }

  if (user.role === "ADMIN") {
    tiles.push({ title: "Requirements", desc: "All requirements overview", href: "requirements.html" });
    tiles.push({ title: "Job Posting", desc: "Manage postings", href: "jobposting.html" });
  }

  const container = document.getElementById("tiles");
  container.innerHTML = tiles.map(t => `
    <div class="tile-card" onclick="window.location.href='${t.href}'">
      <h3>${escapeHtml(t.title)}</h3>
      <p>${escapeHtml(t.desc)}</p>
    </div>
  `).join("");
}

/* -------------------------------
   REQUIREMENTS
--------------------------------*/
async function loadRequirements() {
  const user = getCurrentUserOrRedirect();
  if (!user) return;

  initLayout("requirements");

  // Title / sub
  const titleEl = document.getElementById("pageTitle");
  const subEl = document.getElementById("pageSub");
  if (titleEl && subEl) {
    if (user.role === "HR") {
      titleEl.textContent = "Requirements for Validation";
      subEl.textContent = "Review & validate EA requirements";
    } else {
      titleEl.textContent = "My Requirements";
      subEl.textContent = "Create & track requirements";
    }
  }

  // EA only: show raise button
  const btn = document.getElementById("btnRaiseRequirement");
  if (btn) btn.style.display = (user.role === "EA") ? "inline-flex" : "none";

  setAlert("reqAlert", "", "");
  const tbl = document.getElementById("reqTable");
  tbl.innerHTML = `<tr><td class="loading">Loading...</td></tr>`;

  const res = await fetchRequirements();
  if (!res || !res.success) {
    tbl.innerHTML = `<tr><td>Error</td></tr>`;
    setAlert("reqAlert", "error", (res && res.error) ? res.error : "Unable to load requirements");
    return;
  }

  let rows = res.data || [];

  // HR view: only SENT_TO_HR / HR_SENDBACK
  if (user.role === "HR") {
    rows = rows.filter(r => ["SENT_TO_HR", "HR_SENDBACK"].includes(String(r.Status || "").toUpperCase()));
  }

  renderRequirementsTable(rows, user.role);
}

function statusBadge(status) {
  const s = String(status || "").toLowerCase();
  return `<span class="badge status-${s}">${escapeHtml(status || "")}</span>`;
}

function renderRequirementsTable(list, role) {
  const tbl = document.getElementById("reqTable");

  if (!list.length) {
    tbl.innerHTML = `
      <tr><th>Empty</th></tr>
      <tr><td class="empty-state">No requirements found.</td></tr>
    `;
    return;
  }

  let html = `
    <thead>
      <tr>
        <th>ID</th>
        <th>Job Role</th>
        <th>Job Title</th>
        <th>Status</th>
        <th>Action</th>
      </tr>
    </thead>
    <tbody>
  `;

  list.forEach(r => {
    html += `
      <tr>
        <td>${escapeHtml(r.RequirementId)}</td>
        <td>${escapeHtml(r.JobRoleKey)}</td>
        <td>${escapeHtml(r.JobTitle)}</td>
        <td>${statusBadge(r.Status)}</td>
        <td>
          <button class="btn-secondary" onclick='openRequirementDetail(${JSON.stringify(r)})'>View</button>
        </td>
      </tr>
    `;
  });

  html += `</tbody>`;
  tbl.innerHTML = html;
}

function openCreateReq() {
  const inner = `
    <h3>Raise New Requirement</h3>

    <div class="detail-grid">
      <div>
        <label>Job Role Key</label>
        <select id="reqJobRole"></select>
      </div>
      <div>
        <label>Job Title</label>
        <input id="reqJobTitle" type="text" placeholder="Job title..." />
      </div>
    </div>

    <label>Roles & Responsibilities</label>
    <textarea id="reqRR" placeholder="Roles and responsibilities..."></textarea>

    <label>Must Have Skills</label>
    <textarea id="reqSkills" placeholder="Must have skills..."></textarea>

    <div class="detail-grid">
      <div>
        <label>Shift</label>
        <input id="reqShift" type="text" placeholder="Day / Night / General" />
      </div>
      <div>
        <label>Pay Scale</label>
        <input id="reqPay" type="text" placeholder="e.g. 18k-22k" />
      </div>
    </div>

    <label>Perks</label>
    <input id="reqPerks" type="text" placeholder="Perks..." />

    <label>Notes</label>
    <textarea id="reqNotes" placeholder="Any extra notes..."></textarea>

    <div class="modal-actions">
      <button class="btn-outline" onclick="closeReqModal()">Cancel</button>
      <button class="btn-primary" onclick="saveRequirement()">Save as Draft</button>
      <button class="btn-small" onclick="submitRequirementToHR()">Submit to HR</button>
    </div>
  `;

  openModal(inner, true);
  loadJobTemplateOptions();
}

function openRequirementDetail(req) {
  // Use wide modal and show fields neatly
  const inner = `
    <h3>Requirement Detail</h3>

    <div class="detail-grid">
      <div>
        <label>RequirementId</label>
        <div class="field-value">${escapeHtml(req.RequirementId)}</div>
      </div>
      <div>
        <label>Status</label>
        <div class="field-value">${statusBadge(req.Status)}</div>
      </div>
      <div>
        <label>Job Role</label>
        <div class="field-value">${escapeHtml(req.JobRoleKey)}</div>
      </div>
      <div>
        <label>Job Title</label>
        <div class="field-value">${escapeHtml(req.JobTitle)}</div>
      </div>
    </div>

    <label>Roles & Responsibilities</label>
    <div class="field-box multi">${escapeHtml(req.RolesAndResponsibilities || "")}</div>

    <label>Must Have Skills</label>
    <div class="field-box multi">${escapeHtml(req.MustHaveSkills || "")}</div>

    <div class="detail-grid">
      <div>
        <label>Shift</label>
        <div class="field-value">${escapeHtml(req.Shift || "")}</div>
      </div>
      <div>
        <label>Pay Scale</label>
        <div class="field-value">${escapeHtml(req.PayScale || "")}</div>
      </div>
    </div>

    <label>Perks</label>
    <div class="field-box">${escapeHtml(req.Perks || "")}</div>

    <label>Notes</label>
    <div class="field-box multi">${escapeHtml(req.Notes || "")}</div>

    <div class="modal-actions">
      <button class="btn-outline" onclick="closeReqModal()">Close</button>
    </div>
  `;
  openModal(inner, true);
}

async function loadJobTemplateOptions() {
  const res = await fetchJobTemplates();
  const sel = document.getElementById("reqJobRole");
  if (!sel) return;

  sel.innerHTML = `<option value="">Select Role</option>`;
  if (res && res.success) {
    res.data.forEach(t => {
      sel.innerHTML += `<option value="${escapeHtml(t.JobRoleKey)}">${escapeHtml(t.JobRoleKey)}</option>`;
    });
  }

  sel.addEventListener("change", async () => {
    const roleKey = sel.value;
    if (!roleKey || !res || !res.success) return;

    const t = (res.data || []).find(x => String(x.JobRoleKey) === String(roleKey));
    if (!t) return;

    // Autofill
    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val || "";
    };

    set("reqJobTitle", t.JobTitle);
    set("reqRR", t.RolesAndResponsibilities);
    set("reqSkills", t.MustHaveSkills);
    set("reqShift", t.Shift);
    set("reqPay", t.PayScale);
    set("reqPerks", t.Perks);
  });
}

function readReqForm(status) {
  return {
    JobRoleKey: document.getElementById("reqJobRole")?.value || "",
    JobTitle: document.getElementById("reqJobTitle")?.value || "",
    RolesAndResponsibilities: document.getElementById("reqRR")?.value || "",
    MustHaveSkills: document.getElementById("reqSkills")?.value || "",
    Shift: document.getElementById("reqShift")?.value || "",
    PayScale: document.getElementById("reqPay")?.value || "",
    Perks: document.getElementById("reqPerks")?.value || "",
    Notes: document.getElementById("reqNotes")?.value || "",
    Status: status
  };
}

async function saveRequirement() {
  const data = readReqForm("DRAFT");
  if (!data.JobRoleKey) { alert("Job Role required"); return; }
  const res = await createRequirement(data);
  if (res && res.ok) {
    alert("Saved as Draft");
    closeReqModal();
    loadRequirements();
  } else {
    alert("Unable to save requirement");
  }
}

async function submitRequirementToHR() {
  const data = readReqForm("SENT_TO_HR");
  if (!data.JobRoleKey) { alert("Job Role required"); return; }
  const res = await createRequirement(data);
  if (res && res.ok) {
    alert("Submitted to HR");
    closeReqModal();
    loadRequirements();
  } else {
    alert("Unable to submit requirement");
  }
}

/* -------------------------------
   JOB POSTING
--------------------------------*/
async function loadJobPosting() {
  const user = getCurrentUserOrRedirect();
  if (!user) return;

  initLayout("jobposting");

  if (user.role !== "HR" && user.role !== "ADMIN") {
    document.querySelector(".content").innerHTML = "<h2>Access Denied</h2>";
    return;
  }

  setAlert("jpAlert", "", "");
  const table = document.getElementById("jpTable");
  table.innerHTML = `<tr><td class="loading">Loading...</td></tr>`;

  const reqRes = await fetchHRValidRequirements();
  const postRes = await fetchJobPostings();

  if (!reqRes || !reqRes.success) {
    setAlert("jpAlert", "error", (reqRes && reqRes.error) ? reqRes.error : "Unable to load requirements");
    table.innerHTML = `<tr><td>Error</td></tr>`;
    return;
  }
  if (!postRes || !postRes.success) {
    setAlert("jpAlert", "error", (postRes && postRes.error) ? postRes.error : "Unable to load job postings");
    table.innerHTML = `<tr><td>Error</td></tr>`;
    return;
  }

  const reqs = reqRes.data || [];
  const postings = postRes.data || [];

  if (!reqs.length) {
    table.innerHTML = `<tr><th>Empty</th></tr><tr><td class="empty-state">No HR_VALID requirements found.</td></tr>`;
    return;
  }

  const portalsForReq = (reqId) => postings.filter(p => String(p.RequirementId) === String(reqId));
  const isCompleted = (reqId) => portalsForReq(reqId).some(p => p.IsPosted === true || p.IsPosted === "TRUE" || p.IsPosted === "true");

  let html = `
    <thead>
      <tr>
        <th>RequirementId</th>
        <th>JobRoleKey</th>
        <th>JobTitle</th>
        <th>Posting</th>
        <th>Action</th>
      </tr>
    </thead>
    <tbody>
  `;

  reqs.forEach(r => {
    const done = isCompleted(r.RequirementId);
    html += `
      <tr>
        <td>${escapeHtml(r.RequirementId)}</td>
        <td>${escapeHtml(r.JobRoleKey)}</td>
        <td>${escapeHtml(r.JobTitle)}</td>
        <td><span class="badge ${done ? "status-ok" : "status-pending"}">${done ? "COMPLETED" : "PENDING"}</span></td>
        <td><button class="btn-small" onclick="openJobPostingModal('${escapeHtml(r.RequirementId)}')">Manage</button></td>
      </tr>
    `;
  });

  html += `</tbody>`;
  table.innerHTML = html;
}

function openJobPostingModal(requirementId) {
  const PORTALS = ["Naukri", "Indeed", "Apna", "WorkIndia", "Direct", "Others"];

  const rows = PORTALS.map(p => `
    <div class="portal-card">
      <div class="portal-row">
        <b>${escapeHtml(p)}</b>
        <label class="toggle">
          <input type="checkbox" id="posted_${p}">
          <span>Posted?</span>
        </label>
      </div>
      <label class="small">Screenshot URL</label>
      <input type="text" id="shot_${p}" placeholder="https://drive.google.com/..." />
    </div>
  `).join("");

  const inner = `
    <h3>Manage Job Posting</h3>
    <div class="subtext">Requirement: <b>${escapeHtml(requirementId)}</b></div>
    <div class="portal-grid">${rows}</div>

    <div class="modal-actions">
      <button class="btn-outline" onclick="closeReqModal()">Close</button>
      <button class="btn-primary" onclick="saveJobPostingModal('${escapeHtml(requirementId)}')">Save</button>
    </div>
  `;

  openModal(inner, true);
}

async function saveJobPostingModal(requirementId) {
  const PORTALS = ["Naukri", "Indeed", "Apna", "WorkIndia", "Direct", "Others"];
  const portals = PORTALS.map(p => ({
    PortalName: p,
    IsPosted: document.getElementById(`posted_${p}`)?.checked || false,
    ScreenshotUrl: document.getElementById(`shot_${p}`)?.value?.trim() || ""
  }));

  const res = await saveJobPostings(requirementId, portals);
  if (res && res.ok) {
    alert("Job Posting saved successfully.");
    closeReqModal();
    loadJobPosting();
  } else {
    alert("Failed to save job posting.");
  }
}
