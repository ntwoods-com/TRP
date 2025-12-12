/*************************************************
  NT Woods HRMS - ui.js
**************************************************/

// Global state
let reqModalEl = null;
let globalRequirements = [];

/* ---------- Basic layout helpers ---------- */

function getCurrentUserOrRedirect() {
  const user = getCurrentUser();
  if (!user) {
    window.location.href = "login.html";
    return null;
  }
  return user;
}

function logout() {
  localStorage.removeItem("hrmsUser");
  window.location.href = "login.html";
}

function renderNavbar() {
  const user = getCurrentUserOrRedirect();
  if (!user) return;

  const nav = document.getElementById("navbar");
  if (!nav) return;

  nav.innerHTML = `
    <div class="nav-left">
      <span class="app-title">NT Woods HRMS</span>
    </div>
    <div class="nav-right">
      <div class="user-info">
        <div class="user-name">${user.name || ""}</div>
        <div class="user-email">${user.email}</div>
      </div>
      <span class="role-badge">${user.role}</span>
      <button class="btn-outline" onclick="logout()">Logout</button>
    </div>
  `;
}

const SIDEBAR_MODULES = [
  { key: "DASHBOARD", label: "Dashboard", href: "dashboard.html" },
  { key: "REQUIREMENTS", label: "Requirements", href: "requirements.html" },
  { key: "JOB_POSTING", label: "Job Posting", href: "jobposting.html" },
  { key: "CV_UPLOAD", label: "CV Upload & Applicants", href: "cvupload.html" },
  { key: "SHORTLISTING", label: "Shortlisting", href: "applicants_shortlisting.html" },
  { key: "ONCALL", label: "On Call", href: "oncall.html" },
  { key: "OWNERS_DISCUSSION", label: "Owners Discussion", href: "owners_discussion.html" },
  { key: "INTERVIEW_SCHEDULE", label: "Schedule Interviews", href: "schedule_interviews.html" },
  { key: "WALKINS", label: "Walk-ins", href: "walkins.html" },
  { key: "TESTS", label: "Tests", href: "tests.html" },
  { key: "FINAL_INTERVIEW", label: "Final Interview", href: "final_interview.html" },
  { key: "OFFER", label: "Offers & Documents", href: "offers_documents.html" },
  { key: "JOINING", label: "Joining & Probation", href: "joining_probation.html" },
  { key: "ADMIN_PANEL", label: "Admin Panel", href: "admin.html" }
];

function hasViewPermission(user, moduleKey) {
  if (moduleKey === "DASHBOARD") return true;
  if (user.role === "ADMIN") return true;
  if (!user.permissions || !Array.isArray(user.permissions)) return false;

  return user.permissions.some(p =>
    p.ModuleKey === moduleKey &&
    (p.CanView === true || p.CanView === "TRUE")
  );
}

function renderSidebar() {
  const user = getCurrentUserOrRedirect();
  if (!user) return;

  const side = document.getElementById("sidebar");
  if (!side) return;

  const current = window.location.pathname.split("/").pop() || "dashboard.html";

  let html = `<ul class="sidebar-menu">`;
  SIDEBAR_MODULES.forEach(m => {
    if (!hasViewPermission(user, m.key)) return;
    const active = current === m.href ? "active" : "";
    html += `<li class="${active}"><a href="${m.href}">${m.label}</a></li>`;
  });
  html += `</ul>`;

  side.innerHTML = html;
}

function initLayout() {
  renderNavbar();
  renderSidebar();
}

/* ---------- Dashboard ---------- */

function loadDashboard() {
  const user = getCurrentUserOrRedirect();
  if (!user) return;

  initLayout();

  const container = document.getElementById("tiles");
  if (!container) return;

  let tiles = [];

  if (user.role === "EA") {
    tiles = [
      { title: "Raise Requirement", desc: "Create new hiring requirement", action: "requirements.html" },
      { title: "Incomplete Requirements", desc: "Draft / Send Back", action: "requirements.html" },
      { title: "Requirements in Validation", desc: "Pending with HR", action: "requirements.html" },
      { title: "Validated Requirements", desc: "Ready for job posting", action: "requirements.html" }
    ];
  } else if (user.role === "HR") {
    tiles = [
      { title: "Pending Requirements", desc: "Requirements to validate", action: "requirements.html" },
      { title: "Job Posting – Pending", desc: "Post jobs on portals", action: "jobposting.html" },
      { title: "New CVs", desc: "Fresh CVs uploaded", action: "cvupload.html" }
    ];
  } else if (user.role === "ADMIN") {
    tiles = [
      { title: "Manage Users", desc: "Add / Edit HRMS users", action: "admin.html" },
      { title: "Manage Permissions", desc: "Role-wise module access", action: "admin.html" },
      { title: "Requirements", desc: "Monitor all requirements", action: "requirements.html" }
    ];
  }

  container.innerHTML = tiles.map(t => `
    <div class="tile-card" onclick="location.href='${t.action}'">
      <h3>${t.title}</h3>
      <p>${t.desc}</p>
    </div>
  `).join("");
}

/* ---------- Requirements list ---------- */

async function loadRequirements() {
  const user = getCurrentUserOrRedirect();
  if (!user) return;

  initLayout();

  // EA ke alawa Raise Requirement button hide
  const raiseBtn = document.getElementById("btnRaiseRequirement");
  if (raiseBtn && user.role !== "EA") {
    raiseBtn.style.display = "none";
  }

  const table = document.getElementById("reqTable");
  if (!table) return;
  table.innerHTML = `<tr><td>Loading...</td></tr>`;

  try {
    const res = await fetchRequirements();
    if (!res || !res.success) {
      table.innerHTML = `<tr><td>Error: ${(res && res.error) || "Unable to load requirements"}</td></tr>`;
      return;
    }

    const rows = res.data || [];
    globalRequirements = rows;

    if (!rows.length) {
      table.innerHTML = `<tr><td>No requirements found</td></tr>`;
      return;
    }

    const headers = [
      "RequirementId",
      "JobRoleKey",
      "JobTitle",
      "Status",
      "HRRemark",
      "RaisedByEmail",
      "RaisedAt"
    ];

    let html = "<thead><tr>";
    headers.forEach(h => html += `<th>${h}</th>`);
    html += "<th>Actions</th></tr></thead><tbody>";

    rows.forEach(r => {
      html += "<tr>";
      headers.forEach(h => {
        let v = r[h] || "";
        if (h === "RaisedAt" && v) {
          try { v = new Date(v).toLocaleString(); } catch (e) {}
        }
        html += `<td>${v}</td>`;
      });

      const canEAEdit =
        user.role === "EA" &&
        (r.Status === "DRAFT" || r.Status === "HR_SENDBACK");

      const canHRValidate =
        user.role === "HR" &&
        (r.Status === "SENT_TO_HR" || r.Status === "HR_SENDBACK");

      let label = "View";
      if (canEAEdit) label = "Edit & View";
      else if (canHRValidate) label = "Validate";

      html += `<td>
        <button class="btn-small" onclick="openRequirementDetail('${r.RequirementId}')">
          ${label}
        </button>
      </td>`;

      html += "</tr>";
    });

    html += "</tbody>";
    table.innerHTML = html;

  } catch (err) {
    console.error(err);
    table.innerHTML = `<tr><td>Error loading requirements</td></tr>`;
  }
}

async function saveRequirement(status) {
  const jobRoleKey = document.getElementById("reqJobRoleKey").value.trim();
  const jobTitle   = document.getElementById("reqJobTitle").value.trim();
  const rr         = document.getElementById("reqRR").value.trim();
  const skills     = document.getElementById("reqSkills").value.trim();
  const shift      = document.getElementById("reqShift").value.trim();
  const pay        = document.getElementById("reqPay").value.trim();
  const perks      = document.getElementById("reqPerks").value.trim();
  const notes      = document.getElementById("reqNotes").value.trim();

  if (!jobRoleKey || !jobTitle) {
    alert("Job Role Key aur Job Title required hai.");
    return;
  }

  try {
    const res = await createRequirement({
      JobRoleKey: jobRoleKey,
      JobTitle: jobTitle,
      RolesAndResponsibilities: rr,
      MustHaveSkills: skills,
      Shift: shift,
      PayScale: pay,
      Perks: perks,
      Notes: notes,
      Status: status
    });

    console.log("createRequirement response:", res);

    if (res && res.success === false) {
      alert("Error: " + (res.error || "Unable to save requirement"));
      return;
    }

    alert("Requirement saved successfully.");
    closeReqModal();
    loadRequirements();

  } catch (e) {
    console.error(e);
    alert("Unexpected error while saving requirement.");
  }
}

/* ---------- Requirement detail modal ---------- */

function openRequirementDetail(reqId) {
  const user = getCurrentUserOrRedirect();
  if (!user) return;

  const req = (globalRequirements || []).find(r => r.RequirementId === reqId);
  if (!req) {
    alert("Requirement data not found: " + reqId);
    return;
  }

  closeReqModal();

  const safe = v => (v == null ? "" : String(v));

  const isHR = (user.role === "HR");
  const canHRDecide =
    isHR && (req.Status === "SENT_TO_HR" || req.Status === "HR_SENDBACK");

  // HR ke liye remark editable, baaki ke liye read-only
  const hrRemarkBlock = isHR
    ? `
      <label>HR Remark</label>
      <textarea id="hrRemarkInput" rows="3">${safe(req.HRRemark)}</textarea>
    `
    : `
      <label>HR Remark</label>
      <div class="field-box multi">${safe(req.HRRemark)}</div>
    `;

  let actionButtons = `
      <button class="btn-outline" onclick="closeReqModal()">Close</button>
  `;

  if (canHRDecide) {
    actionButtons += `
      <button class="btn-secondary"
        onclick="hrSubmitRequirementDecision('${req.RequirementId}','HR_SENDBACK')">
        Send Back
      </button>
      <button class="btn-primary"
        onclick="hrSubmitRequirementDecision('${req.RequirementId}','HR_VALID')">
        Mark as Valid
      </button>
    `;
  }

  reqModalEl = document.createElement("div");
  reqModalEl.className = "modal-backdrop";
  reqModalEl.innerHTML = `
    <div class="modal modal-wide">
      <h3>Requirement Detail</h3>

      <div class="detail-grid">
        <div>
          <label>Requirement ID</label>
          <div class="field-value">${safe(req.RequirementId)}</div>
        </div>
        <div>
          <label>Job Role Key</label>
          <div class="field-value">${safe(req.JobRoleKey)}</div>
        </div>
        <div>
          <label>Job Title</label>
          <div class="field-value">${safe(req.JobTitle)}</div>
        </div>
        <div>
          <label>Status</label>
          <div class="badge status-${safe(req.Status).toLowerCase()}">
            ${safe(req.Status)}
          </div>
        </div>
        <div>
          <label>Raised By</label>
          <div class="field-value">${safe(req.RaisedByEmail)}</div>
        </div>
        <div>
          <label>Raised At</label>
          <div class="field-value">
            ${req.RaisedAt ? new Date(req.RaisedAt).toLocaleString() : ""}
          </div>
        </div>
      </div>

      <label>Roles &amp; Responsibilities</label>
      <div class="field-box multi">${safe(req.RolesAndResponsibilities)}</div>

      <label>Must Have Skills</label>
      <div class="field-box multi">${safe(req.MustHaveSkills)}</div>

      <label>Shift</label>
      <div class="field-box">${safe(req.Shift)}</div>

      <label>Pay Scale</label>
      <div class="field-box">${safe(req.PayScale)}</div>

      <label>Perks</label>
      <div class="field-box">${safe(req.Perks)}</div>

      <label>Notes</label>
      <div class="field-box multi">${safe(req.Notes)}</div>

      ${hrRemarkBlock}

      <div class="modal-actions">
        ${actionButtons}
      </div>
    </div>
  `;
  document.body.appendChild(reqModalEl);
}
async function hrSubmitRequirementDecision(reqId, newStatus) {
  const remarkEl = document.getElementById("hrRemarkInput");
  const remark = remarkEl ? remarkEl.value.trim() : "";

  if (newStatus === "HR_SENDBACK" && !remark) {
    alert("Send Back karte waqt HR Remark required hai.");
    return;
  }

  try {
    const res = await updateRequirementStatus({
      RequirementId: reqId,
      Status: newStatus,
      HRRemark: remark
    });

    console.log("HR update response:", res);

    if (!res || res.success === false) {
      alert("Error: " + (res && res.error ? res.error : "Unable to update requirement"));
      return;
    }

    alert("Requirement updated successfully.");
    closeReqModal();
    loadRequirements();
  } catch (e) {
    console.error(e);
    alert("Unexpected error while updating requirement.");
  }
}
