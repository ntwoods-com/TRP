/*************************************************
  NT Woods HRMS - api.js
  - Generic GET/POST wrappers
  - Requirements APIs (Phase-1)
**************************************************/

// 👉 Yahan apna deployed Web App URL daalo (EXEC URL)
const GAS_WEB_URL = "PUT_YOUR_WEB_APP_EXEC_URL_HERE";

/**
 * Logged-in user ko localStorage se nikaalne ka helper
 */
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

/**
 * Generic GET call: ?action=...&param=...
 */
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

/**
 * Generic POST call: { action, ...body }
 */
async function apiPost(action, body = {}) {
  const payload = Object.assign({}, body, { action });

  const res = await fetch(GAS_WEB_URL, {
    method: "POST",
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

/**
 * Get list of Requirements
 */
async function fetchRequirements() {
  const user = getCurrentUser();
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  return apiGet("list_requirements", {
    email: user.email
  });
}

/**
 * Create a new Requirement (EA only)
 */
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

/**
 * Update Requirement Status (HR / EA)
 */
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

/**
 * List Job Templates (for dropdown auto-fill)
 */
async function fetchJobTemplates() {
  const user = getCurrentUser();
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  return apiGet("list_job_templates", {
    email: user.email
  });
}
