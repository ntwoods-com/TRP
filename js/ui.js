// =======================================
// GLOBAL STATE
// =======================================
let currentUser = null;
let globalRequirements = [];
let reqModalEl = null;

// =======================================
// AUTH + LAYOUT
// =======================================

function initLayout() {
  const user = getCurrentUser();
  if (!user) return;

  const app = document.getElementById("app");
  if (!app) return;

  const nav = `
    <div class="navbar">
      <div class="nav-title">NT Woods HRMS</div>
      <div class="nav-user">
        ${user.name} (${user.role})
        <button class="btn-small" onclick="logoutUser()">Logout</button>
      </div>
    </div>
  `;

  app.insertAdjacentHTML("beforebegin", nav);
}

// =======================================
// MODAL SYSTEM (FINAL)
// =======================================

function closeReqModal() {
  if (reqModalEl) {
    reqModalEl.remove();
    reqModalEl = null;
  }
}

function openModalContainer(html) {
  closeReqModal();
  reqModalEl = document.createElement("div");
  reqModalEl.className = "modal-backdrop";
  reqModalEl.innerHTML = html;
  document.body.appendChild(reqModalEl);
}

function showModal(title, bodyHtml, footerHtml = "") {
  const html = `
    <div class="modal modal-wide">
      <h3>${title}</h3>
      <div class="modal-body">${bodyHtml}</div>
      <div class="modal-actions">${footerHtml}</div>
    </div>
  `;
  openModalContainer(html);
}

// =======================================
// REQUIREMENTS PAGE LOADING
// =======================================

async function loadRequirements() {
  const user = getCurrentUserOrRedirect();
  if (!user) return;

  initLayout();

  const raiseBtn = document.getElementById("btnRaiseRequirement");
  if (raiseBtn && user.role !== "EA") {
    raiseBtn.style.display = "none";
  }

  const table = document.getElementById("reqTable");
  table.innerHTML = "<tr><td>Loading...</td></tr>";

  const res = await fetchRequirements();
  if (!res || !res.success) {
    table.innerHTML = "<tr><td>Error loading requirements</td></tr>";
    return;
  }

  globalRequirements = res.data || [];

  if (!globalRequirements.length) {
    table.innerHTML = "<tr><td>No requirements found.</td></tr>";
    return;
  }

  let html = `
    <thead>
      <tr>
        <th>ID</th>
        <th>JobRole</th>
        <th>Title</th>
        <th>Status</th>
        <th>Remark</th>
        <th>Raised By</th>
        <th>Raised At</th>
        <th>Action</th>
      </tr>
    </thead><tbody>
  `;

  globalRequirements.forEach(r => {
    let label = "View";
    if (user.role === "EA" && (r.Status === "DRAFT" || r.Status === "HR_SENDBACK")) {
      label = "Edit & View";
    }
    if (user.role === "HR" && (r.Status === "SENT_TO_HR" || r.Status === "HR_SENDBACK")) {
      label = "Validate";
    }

    html += `
      <tr>
        <td>${r.RequirementId}</td>
        <td>${r.JobRoleKey}</td>
        <td>${r.JobTitle}</td>
        <td>${r.Status}</td>
        <td>${r.HRRemark || ""}</td>
        <td>${r.RaisedByEmail}</td>
        <td>${r.RaisedAt}</td>
        <td>
          <button class="btn-small" onclick="openRequirementDetail('${r.RequirementId}')">${label}</button>
        </td>
      </tr>
    `;
  });

  html += "</tbody>";
  table.innerHTML = html;
}

// =======================================
// VIEW / VALIDATE REQUIREMENT MODAL
// =======================================

function openRequirementDetail(reqId) {
  const user = getCurrentUserOrRedirect();
  if (!user) return;

  const req = globalRequirements.find(r => r.RequirementId === reqId);
  if (!req) {
    alert("Requirement not found");
    return;
  }

  const safe = v => (v == null ? "" : String(v));

  const isHR = user.role === "HR";
  const canHRAct =
    isHR && (req.Status === "SENT_TO_HR" || req.Status === "HR_SENDBACK");

  const hrRemarkSection = isHR
    ? `
        <label>HR Remark</label>
        <textarea id="hrRemark" rows="3">${safe(req.HRRemark)}</textarea>
      `
    : `
        <label>HR Remark</label>
        <div class="field-box">${safe(req.HRRemark)}</div>
      `;

  const body = `
    <label>ID</label>
    <div class="field-box">${safe(req.RequirementId)}</div>

    <label>Job Role</label>
    <div class="field-box">${safe(req.JobRoleKey)}</div>

    <label>Job Title</label>
    <div class="field-box">${safe(req.JobTitle)}</div>

    <label>Status</label>
    <div class="badge">${safe(req.Status)}</div>

    <label>Roles & Responsibilities</label>
    <div class="field-box multi">${safe(req.RolesAndResponsibilities)}</div>

    <label>Skills</label>
    <div class="field-box multi">${safe(req.MustHaveSkills)}</div>

    <label>Notes</label>
    <div class="field-box multi">${safe(req.Notes)}</div>

    ${hrRemarkSection}
  `;

  let footer = `<button onclick="closeReqModal()" class="btn-outline">Close</button>`;

  if (canHRAct) {
    footer += `
      <button class="btn-secondary" onclick="submitHRDecision('${reqId}','HR_SENDBACK')">Send Back</button>
      <button class="btn-primary" onclick="submitHRDecision('${reqId}','HR_VALID')">Mark as Valid</button>
    `;
  }

  showModal("Requirement Detail", body, footer);
}

// =======================================
// HR ACTION HANDLER
// =======================================

async function submitHRDecision(reqId, status) {
  const remarkInput = document.getElementById("hrRemark");
  const remark = remarkInput ? remarkInput.value.trim() : "";

  if (status === "HR_SENDBACK" && !remark) {
    alert("Remark required for Send Back");
    return;
  }

  const res = await updateRequirementStatus({
    RequirementId: reqId,
    Status: status,
    HRRemark: remark
  });

  alert("Updated Successfully");
  closeReqModal();
  loadRequirements();
}
