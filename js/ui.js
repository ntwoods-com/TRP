/*************************************************
  NT Woods HRMS - ui.js (FULL UPDATED)
  Safe, stable & complete (Phase-2 ready)
**************************************************/

/* -------------------------------
   GLOBAL HELPERS
--------------------------------*/

// Logged-in user fetch
function getCurrentUserOrRedirect() {
  const raw = localStorage.getItem("hrmsUser");
  if (!raw) {
    window.location.href = "login.html";
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch (e) {
    console.error("Invalid stored hrmsUser", e);
    window.location.href = "login.html";
    return null;
  }
}

// Navbar rendering
function renderNavbar() {
  const user = getCurrentUserOrRedirect();
  if (!user) return;

  const nav = document.getElementById("navbar");
  if (!nav) return;

  nav.innerHTML = `
    <div class="nav-left">
      <h2>NT Woods HRMS</h2>
    </div>
    <div class="nav-right">
      <span>${user.name} (${user.email})</span>
      <span class="badge role-${user.role.toLowerCase()}">${user.role}</span>
      <button class="logout-btn" onclick="logout()">Logout</button>
    </div>
  `;
}

// Sidebar rendering
function renderSidebar() {
  const user = getCurrentUserOrRedirect();
  if (!user) return;

  const side = document.getElementById("sidebar");
  if (!side) return;

  let modules = [];

  if (user.role === "EA") {
    modules = [
      { key: "requirements", label: "Requirements", link: "requirements.html" }
    ];
  }

  if (user.role === "HR") {
    modules = [
      { key: "requirements", label: "Requirements", link: "requirements.html" }
    ];
  }

  if (user.role === "ADMIN") {
    modules = [
      { key: "requirements", label: "Requirements", link: "requirements.html" }
    ];
  }

  let html = `<ul class="sidebar-menu">`;
  modules.forEach(m => {
    html += `<li><a href="${m.link}">${m.label}</a></li>`;
  });
  html += `</ul>`;

  side.innerHTML = html;
}

// Logout
function logout() {
  localStorage.removeItem("hrmsUser");
  window.location.href = "login.html";
}

/* -------------------------------
   DASHBOARD SCREEN
--------------------------------*/
async function loadDashboard() {
  const user = getCurrentUserOrRedirect();
  if (!user) return;

  renderNavbar();
  renderSidebar();

  document.getElementById("tiles").innerHTML = `
    <div class="tile">Welcome, ${user.name}</div>
  `;
}

/* -------------------------------
   REQUIREMENTS MODULE
--------------------------------*/

// Modal reference (global)
let reqModal;

// Create modal dynamically
function buildRequirementModal() {
  if (reqModal) return;

  reqModal = document.createElement("div");
  reqModal.id = "reqModal";
  reqModal.className = "modal hidden";
  reqModal.innerHTML = `
    <div class="modal-content">
      <span class="close" onclick="closeReqModal()">&times;</span>
      <h3 id="reqModalTitle">Requirement</h3>

      <label>Job Role Key</label>
      <select id="reqJobRole"></select>

      <label>Job Title</label>
      <input id="reqJobTitle" type="text"/>

      <label>Roles & Responsibilities</label>
      <textarea id="reqRR"></textarea>

      <label>Must Have Skills</label>
      <textarea id="reqSkills"></textarea>

      <label>Shift</label>
      <input id="reqShift" type="text"/>

      <label>Pay Scale</label>
      <input id="reqPay" type="text"/>

      <label>Perks</label>
      <input id="reqPerks" type="text"/>

      <label>Notes</label>
      <textarea id="reqNotes"></textarea>

      <button class="btn-primary" onclick="saveRequirement()">Save Requirement</button>
    </div>
  `;

  document.body.appendChild(reqModal);
}

// Open modal for create
function openCreateReq() {
  buildRequirementModal();

  document.getElementById("reqModalTitle").innerText = "Create Requirement";

  loadJobTemplateOptions();

  reqModal.classList.remove("hidden");
}

// Close modal
function closeReqModal() {
  if (reqModal) reqModal.classList.add("hidden");
}

/* -------------------------------
   REQUIREMENTS DATA LOAD
--------------------------------*/

async function loadRequirements() {
  const user = getCurrentUserOrRedirect();
  if (!user) return;

  renderNavbar();
  renderSidebar();

  const res = await fetchRequirements();
  if (!res.success) {
    alert("Error loading requirements");
    return;
  }

  renderRequirementsTable(res.data);
}

function renderRequirementsTable(list) {
  const tbl = document.getElementById("reqTable");

  let html = `
    <tr>
      <th>ID</th>
      <th>Job Role</th>
      <th>Job Title</th>
      <th>Status</th>
      <th>Action</th>
    </tr>
  `;

  list.forEach(r => {
    html += `
      <tr>
        <td>${r.RequirementId}</td>
        <td>${r.JobRoleKey}</td>
        <td>${r.JobTitle}</td>
        <td><span class="badge">${r.Status}</span></td>
        <td>
          <button class="btn-secondary" onclick='openRequirementDetail(${JSON.stringify(
            r
          )})'>View</button>
        </td>
      </tr>
    `;
  });

  tbl.innerHTML = html;
}

/* -------------------------------
   VIEW REQUIREMENT
--------------------------------*/

function openRequirementDetail(req) {
  buildRequirementModal();

  document.getElementById("reqModalTitle").innerText =
    "Requirement Details – " + req.RequirementId;

  document.getElementById("reqJobRole").innerHTML =
    `<option>${req.JobRoleKey}</option>`;

  document.getElementById("reqJobTitle").value = req.JobTitle;
  document.getElementById("reqRR").value = req.RolesAndResponsibilities;
  document.getElementById("reqSkills").value = req.MustHaveSkills;
  document.getElementById("reqShift").value = req.Shift;
  document.getElementById("reqPay").value = req.PayScale;
  document.getElementById("reqPerks").value = req.Perks;
  document.getElementById("reqNotes").value = req.Notes;

  reqModal.classList.remove("hidden");
}

/* -------------------------------
   LOAD JOB TEMPLATES
--------------------------------*/

async function loadJobTemplateOptions() {
  const res = await fetchJobTemplates();
  const sel = document.getElementById("reqJobRole");

  sel.innerHTML = `<option value="">Select Role</option>`;

  if (res.success) {
    res.data.forEach(t => {
      sel.innerHTML += `<option value="${t.JobRoleKey}">${t.JobRoleKey}</option>`;
    });
  }
}

/* -------------------------------
   SAVE REQUIREMENT
--------------------------------*/

async function saveRequirement() {
  const role = document.getElementById("reqJobRole").value;
  if (!role) {
    alert("Job Role required");
    return;
  }

  const data = {
    JobRoleKey: role,
    JobTitle: document.getElementById("reqJobTitle").value,
    RolesAndResponsibilities: document.getElementById("reqRR").value,
    MustHaveSkills: document.getElementById("reqSkills").value,
    Shift: document.getElementById("reqShift").value,
    PayScale: document.getElementById("reqPay").value,
    Perks: document.getElementById("reqPerks").value,
    Notes: document.getElementById("reqNotes").value,
    Status: "DRAFT"
  };

  const res = await createRequirement(data);

  if (res.ok) {
    alert("Requirement saved!");
    closeReqModal();
    loadRequirements();
  } else {
    alert("Failed to save requirement");
  }
}
