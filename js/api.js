// =======================================
// GLOBAL CONFIG
// =======================================
const API_BASE = "https://script.google.com/macros/s/AKfycbyNxDkI76UwM1F9g_5f7mgk4HdwPbOXbbpGSBCgbT138hfUbM4mCFg7eRDNSP-XpSuFOQ/exec"; // MUST END WITH /exec

// GET request wrapper
async function apiGet(action, params = {}) {
  params.action = action;

  const qs = new URLSearchParams(params).toString();
  const url = `${API_BASE}?${qs}`;

  const res = await fetch(url);
  return await res.json();
}

// POST request wrapper
async function apiPost(action, body = {}) {
  body.action = action;

  const res = await fetch(API_BASE, {
    method: "POST",
    mode: "no-cors", // YOU ASKED FOR THIS
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  // no-cors does not return JSON, so we fake a success response
  return { success: true };
}

// ---- Specific API Handlers ----

// LOGIN
async function loginUser(email) {
  return await apiGet("login", { email });
}

// GET CURRENT USER
function getCurrentUser() {
  const raw = localStorage.getItem("HRMS_USER");
  if (!raw) return null;
  return JSON.parse(raw);
}

function saveCurrentUser(u) {
  localStorage.setItem("HRMS_USER", JSON.stringify(u));
}

function logoutUser() {
  localStorage.removeItem("HRMS_USER");
  window.location.href = "login.html";
}

function getCurrentUserOrRedirect() {
  const u = getCurrentUser();
  if (!u) {
    window.location.href = "login.html";
    return null;
  }
  return u;
}

// -------- REQUIREMENTS ---------

async function fetchRequirements() {
  const user = getCurrentUser();
  return await apiGet("list_requirements", { email: user.email });
}

async function createRequirement(data) {
  const user = getCurrentUser();
  return await apiPost("create_requirement", { ...data, email: user.email });
}

async function updateRequirementStatus(data) {
  const user = getCurrentUser();
  return await apiPost("update_requirement_status", { ...data, email: user.email });
}
