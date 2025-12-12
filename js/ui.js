/*************************************************
  NT Woods HRMS - ui.js
  - Navbar + Sidebar
  - Role-based menu
  - Dashboard loader
  - Requirements screen (Phase-1)
**************************************************/

/* ================================================
   BASIC HELPERS
================================================ */

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

/* ================================================
   NAVBAR + SIDEBAR RENDER
================================================ */

function renderNavbar() {
  const user = getCurrentUserOrRedirect();
  if (!user) return;

  const navbar = document.getElementById("navbar");
  if (!navbar) return;

  navbar.innerHTML = `
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

// Define modules for sidebar
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
  // Dashboard ko sab dekh sakte hai
  if (moduleKey === "DASHBOARD") return true;

  // Admin ko sab visible
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

  const sidebar = document.getElementById("sidebar");
  if (!sidebar) return;

  const currentPage = window.location.pathname.split("/").pop() || "dashboard.html";

  let html = `<ul class="sidebar-menu">`;

  SIDEBAR_MODULES.forEach(mod => {
    if (!hasViewPermission(user, mod.key)) return;

    const active = currentPage === mod.href ? "active" : "";
    html += `
      <li class="${active}">
        <a href="${mod.href}">${mod.label}</a>
      </li>
    `;
  });

  html += `</ul>`;
  sidebar.innerHTML = html;
}

/**
 * Common layout init: navbar + sidebar
 */
function initLayout() {
  renderNavbar();
  renderSidebar();
}

/* ================================================
   DASHBOARD LOGIC (Phase-1: Static-ish tiles)
================================================ */

function loadDashboard() {
  const user = getCurrentUserOrRedirect();
  if (!user) return;

  initLayout();

  const tilesContainer = document.getElementById("tiles");
  if (!tilesContainer) return;

  let tiles = [];

  if (user.role === "EA") {
    tiles = [
      { title: "Raise Requirement", desc: "Create new hiring requirement", action: "requirements.html" },
      { title: "Incomplete Requirements", desc: "Draft / Sent Back", action: "requirements.html" },
      { title: "Requirements in Validation", desc: "Pending with HR", action: "requirements.html" },
      { title: "Requirements Validated", desc: "Ready for Job Posting", action: "requirements.html" }
    ];
  } else if (user.role === "HR") {
    tiles = [
      { title: "Pending Requirements", desc: "Requirements to validate", action: "requirements.html" },
      { title: "Job Posting – Pending", desc: "Post jobs to portals", action: "jobposting.html" },
      { title: "New CVs", desc: "Fresh applicants", action: "cvupload.html" },
      { title: "Shortlisting – Pending", desc: "CV shortlisting", action: "applicants_shortlisting.html" },
      { title: "On-Call – Pending", desc: "Call and screen candidates", action: "oncall.html" },
      { title: "Owners Discussion – Pending", desc: "Move candidates to walk-ins", action: "owners_discussion.html" },
      { title: "Interviews to Schedule", desc: "Call & schedule walk-ins", action: "schedule_interviews.html" },
      { title: "Today’s Walk-ins", desc: "Manage today’s candidates", action: "walkins.html" },
      { title: "Tests Pending", desc: "Enter test marks", action: "tests.html" },
      { title: "Offers / Documents Pending", desc: "Move towards joining", action: "offers_documents.html" }
    ];
  } else if (user.role === "ADMIN") {
    tiles = [
      { title: "Admin - Manage Users", desc: "Add / Edit users", action: "admin.html" },
      { title: "Admin - Permissions", desc: "Role based module access", action: "admin.html" },
      { title: "Job Templates", desc: "Manage job profiles", action: "admin.html" },
      { title: "Reports / Analytics", desc: "View hiring stats", action: "#" },
      // plus some HR tiles reuse for quick navigation
      { title: "Requirements", desc: "Full control over requirements", action: "requirements.html" },
      { title: "Job Posting", desc: "Job posting status", action: "jobposting.html" }
    ];
  }

  tilesContainer.innerHTML = tiles
    .map(t => `
      <div class="tile-card" onclick="location.href='${t.action}'">
        <h3>${t.title}</h3>
        <p>${t.desc}</p>
      </div>
    `)
    .join("");
}

/* ================================================
   REQUIREMENTS PAGE LOGIC
================================================ */

async function loadRequirements() {
  const user = getCurrentUserOrRedirect();
  if (!user) return;

  initLayout();

  const table = document.getElementById("reqTable");
  if (!table) return;

  table.innerHTML = `<tr><td>Loading...</td></tr>`;

  try {
    const res = await fetchRequirements();
    if (!res.success) {
      table.innerHTML = `<tr><td>Error: ${res.error || "Unable to load requirements"}</td></tr>`;
      return;
    }

    const rows = res.data || [];

    if (rows.length === 0) {
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
    html += `<th>Actions</th>`;
    html += "</tr></thead><tbody>";

    rows.forEach(r => {
      html += "<tr>";
      headers.forEach(h => {
        let val = r[h] || "";
        if (h === "RaisedAt" && val) {
          try { val = new Date(val).toLocaleString(); } catch (e) {}
        }
        html += `<td>${val}</td>`;
      });

      let actions = "";
      if (user.role === "EA" && (r.Status === "DRAFT" || r.Status === "HR_SENDBACK")) {
        actions += `<button class="btn-small" onclick="alert('Edit flow later: ${r.RequirementId}')">Edit & Resubmit</button>`;
      } else {
        actions += `<button class="btn-small" onclick="alert('View detail later: ${r.RequirementId}')">View</button>`;
      }

      html += `<td>${actions}</td>`;
      html += "</tr>";
    });

    html += "</tbody>";
    table.innerHTML = html;

  } catch (err) {
    console.error(err);
    table.innerHTML = `<tr><td>Error loading requirements</td></tr>`;
  }
}

/* ================================================
   REQUIREMENT CREATE MODAL (Simple JS Modal)
================================================ */

let reqModalEl = null;

function openCreateReq() {
  const user = getCurrentUserOrRedirect();
  if (!user) return;

  if (user.role !== "EA") {
    alert("Sirf EA hi requirement raise kar sakta hai.");
    return;
  }

  // Already open? remove and recreate
  if (reqModalEl) {
    reqModalEl.remove();
    reqModalEl = null;
  }

  reqModalEl = document.createElement("div");
  reqModalEl.className = "modal-backdrop";
  reqModalEl.innerHTML = `
    <div class="modal">
      <h3>Raise New Requirement</h3>

      <label>Job Role Key</label>
      <input type="text" id="reqJobRoleKey" placeholder="CRM / MIS / JR_ACCOUNTANT etc.">

      <label>Job Title</label>
      <input type="text" id="reqJobTitle" placeholder="Customer Relationship Manager">

      <label>Roles & Responsibilities</label>
      <textarea id="reqRR" rows="3"></textarea>

      <label>Must Have Skills</label>
      <textarea id="reqSkills" rows="3"></textarea>

      <label>Shift</label>
      <input type="text" id="reqShift" placeholder="Day / Evening / Rotational">

      <label>Pay Scale</label>
      <input type="text" id="reqPay" placeholder="15k - 20k per month">

      <label>Perks</label>
      <input type="text" id="reqPerks" placeholder="Incentives, PF, etc.">

      <label>Notes</label>
      <textarea id="reqNotes" rows="2"></textarea>

      <div class="modal-actions">
        <button class="btn-outline" onclick="closeReqModal()">Cancel</button>
        <button class="btn-secondary" onclick="saveRequirement('DRAFT')">Save as Draft</button>
        <button class="btn-primary" onclick="saveRequirement('SENT_TO_HR')">Submit to HR</button>
      </div>
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

async function saveRequirement(status) {
  const jobRoleKey = document.getElementById("reqJobRoleKey").value.trim();
  const jobTitle = document.getElementById("reqJobTitle").value.trim();
  const rr = document.getElementById("reqRR").value.trim();
  const skills = document.getElementById("reqSkills").value.trim();
  const shift = document.getElementById("reqShift").value.trim();
  const pay = document.getElementById("reqPay").value.trim();
  const perks = document.getElementById("reqPerks").value.trim();
  const notes = document.getElementById("reqNotes").value.trim();

  if (!jobRoleKey || !jobTitle) {
    alert("Job Role Key aur Job Title mandatory hai.");
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

    if (!res.success) {
      alert("Error: " + (res.error || "Unable to save requirement"));
      return;
    }

    alert("Requirement saved successfully.");
    closeReqModal();
    // reload list
    if (typeof loadRequirements === "function") {
      loadRequirements();
    }
  } catch (err) {
    console.error(err);
    alert("Unexpected error while saving requirement.");
  }
}
