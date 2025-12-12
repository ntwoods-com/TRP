/*************************************************
  NT Woods HRMS - ui.js
  - Navbar + Sidebar
  - Role-based menu
  - Dashboard loader
  - Requirements screen (Phase-1)
**************************************************/
// Requirements ko memory me rakhne ke liye
// Global state
let globalRequirements = [];   // list_requirements ka data
let reqModalEl = null;         // current open modal reference


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

function initLayout() {
  renderNavbar();
  renderSidebar();
}

/* DASHBOARD */

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

/* REQUIREMENTS PAGE */

async function loadRequirements() {
  const user = getCurrentUserOrRedirect();
  if (!user) return;

  initLayout();

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
    // 🔴 yahan global me save kar rahe hain
    globalRequirements = rows;

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

      // 🔴 yahan alert ki jagah proper functions
      let actions = "";
      if (user.role === "EA" && (r.Status === "DRAFT" || r.Status === "HR_SENDBACK")) {
        actions += `
          <button class="btn-small" onclick="openRequirementDetail('${r.RequirementId}')">
            Edit &amp; View
          </button>
        `;
      } else {
        actions += `
          <button class="btn-small" onclick="openRequirementDetail('${r.RequirementId}')">
            View
          </button>
        `;
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

    console.log("createRequirement response:", res);

    // agar response hi nahi mila:
    if (!res) {
      alert("Error: Server ne koi response nahi diya.");
      return;
    }

    // agar backend ne success:false bheja:
    if (res.success === false) {
      alert("Error: " + (res.error || "Backend error while saving requirement"));
      return;
    }

    // agar success field hi nahi hai, fir bhi sheet me row aa rahi hai:
    // to isko success treat kar dete hain
    if (res.success === undefined) {
      console.warn("No success flag in response, but assuming OK:", res);
    }

    alert("Requirement saved successfully.");
    closeReqModal();
    if (typeof loadRequirements === "function") {
      loadRequirements();
    }
  } catch (err) {
    console.error("saveRequirement error:", err);
    alert("Unexpected error while saving requirement.");
  }
}
function openRequirementDetail(reqId) {
  const user = getCurrentUserOrRedirect();
  if (!user) return;

  const req = (globalRequirements || []).find(r => r.RequirementId === reqId);
  if (!req) {
    alert("Requirement data not found for: " + reqId);
    return;
  }

  // Pehle se agar koi modal open hai to remove
  if (reqModalEl) {
    reqModalEl.remove();
    reqModalEl = null;
  }

  const safe = (v) => v == null ? "" : String(v);

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

      <label>HR Remark</label>
      <div class="field-box multi">${safe(req.HRRemark)}</div>

      <div class="modal-actions">
        <button class="btn-outline" onclick="closeReqModal()">Close</button>
        ${
          (user.role === "EA" && (req.Status === "DRAFT" || req.Status === "HR_SENDBACK"))
            ? `<button class="btn-primary" onclick="alert('Edit flow abhi pending hai, baad me implement karenge.')">
                 Edit &amp; Resubmit
               </button>`
            : ""
        }
      </div>
    </div>
  `;

  document.body.appendChild(reqModalEl);
}
