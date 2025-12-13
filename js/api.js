/*************************************************
  NT Woods HRMS - api.js
**************************************************/

// 👇 yahan apna latest Web App EXEC URL daalo
const GAS_WEB_URL = "https://script.google.com/macros/s/AKfycbyNxDkI76UwM1F9g_5f7mgk4HdwPbOXbbpGSBCgbT138hfUbM4mCFg7eRDNSP-XpSuFOQ/exec";

/* ---------- Current user helpers ---------- */

function getCurrentUser() {
  const raw = localStorage.getItem("hrmsUser");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.error("Invalid hrmsUser in storage", e);
    return null;
  }
}

/* ---------- Generic GET / POST ---------- */

async function apiGet(action, params = {}) {
  const url = new URL(GAS_WEB_URL);
  url.searchParams.set("action", action);

  Object.keys(params).forEach(k => {
    const v = params[k];
    if (v !== undefined && v !== null) {
      url.searchParams.set(k, v);
    }
  });

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: { "Accept": "application/json" }
  });

  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error("GET non-JSON:", text);
    return { success: false, error: "Invalid response from server (GET)" };
  }
}

async function apiPost(action, body = {}) {
  const payload = { ...body, action };

  try {
    await fetch(GAS_WEB_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    // no-cors me response read nahi hota
    return { ok: true };
  } catch (err) {
    console.error("apiPost error", err);
    return { ok: false };
  }
}

/* ---------- Requirements APIs ---------- */

async function fetchRequirements() {
  const user = getCurrentUser();
  if (!user) { window.location.href = "login.html"; return; }
  return apiGet("list_requirements", { email: user.email });
}

async function fetchJobTemplates() {
  const user = getCurrentUser();
  if (!user) { window.location.href = "login.html"; return; }
  return apiGet("list_job_templates", { email: user.email });
}

async function createRequirement(data) {
  const user = getCurrentUser();
  if (!user) { window.location.href = "login.html"; return; }
  const payload = Object.assign({}, data, { email: user.email });
  return apiPost("create_requirement", payload);
}

async function updateRequirementStatus(data) {
  const user = getCurrentUser();
  if (!user) { window.location.href = "login.html"; return; }
  const payload = Object.assign({}, data, { email: user.email });
  return apiPost("update_requirement_status", payload);
}

/* ---------- Job Posting APIs ---------- */

async function fetchHRValidRequirements() {
  const user = getCurrentUser();
  if (!user) { window.location.href = "login.html"; return; }
  return apiGet("list_hr_valid_requirements", { email: user.email });
}

async function fetchJobPostings() {
  const user = getCurrentUser();
  if (!user) { window.location.href = "login.html"; return; }
  return apiGet("list_job_postings", { email: user.email });
}

async function saveJobPostings(requirementId, portals) {
  return apiPost("save_job_postings", { RequirementId: requirementId, portals });
}
