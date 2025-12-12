/*************************************************
  NT Woods HRMS - api.js
  - Generic GET/POST wrappers
  - Requirements APIs (Phase-1)
**************************************************/

// 👇 Yahan naya deployed Web App EXEC URL daalo
const GAS_WEB_URL = "https://script.google.com/macros/s/AKfycbyNxDkI76UwM1F9g_5f7mgk4HdwPbOXbbpGSBCgbT138hfUbM4mCFg7eRDNSP-XpSuFOQ/exec";

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

async function apiGet(action, params = {}) {
  const url = new URL(GAS_WEB_URL);
  url.searchParams.set("action", action);

  Object.keys(params).forEach(k => {
    if (params[k] !== undefined && params[k] !== null) {
      url.searchParams.set(k, params[k]);
    }
  });

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "Accept": "application/json"
    }
  });

  return res.json();
}

async function apiPost(action, body = {}) {
  const payload = Object.assign({}, body, { action });

  const res = await fetch(GAS_WEB_URL, {
    method: "POST",
    mode: "no-cors",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    body: JSON.stringify(payload)
  });

  return res.json();
}

/* ================================================
   REQUIREMENTS API HELPERS (Phase-1)
================================================ */

async function fetchRequirements() {
  const user = getCurrentUser();
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  return apiGet("list_requirements", {
    email: encodeURIComponent(user.email)
  });
}

async function createRequirement(data) {
  const user = getCurrentUser();
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const payload = Object.assign({}, data, {
    email: user.email
  });

  return apiPost("create_requirement", payload);
}

async function updateRequirementStatus(data) {
  const user = getCurrentUser();
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const payload = Object.assign({}, data, {
    email: user.email
  });

  return apiPost("update_requirement_status", payload);
}

async function fetchJobTemplates() {
  const user = getCurrentUser();
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  return apiGet("list_job_templates", {
    email: encodeURIComponent(user.email)
  });
}
