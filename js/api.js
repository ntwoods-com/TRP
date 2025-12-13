/*************************************************
  NT Woods HRMS - api.js (Phase-2.3)
**************************************************/
const HRMS = { WEB_APP_URL: "https://script.google.com/macros/s/AKfycbyNxDkI76UwM1F9g_5f7mgk4HdwPbOXbbpGSBCgbT138hfUbM4mCFg7eRDNSP-XpSuFOQ/exec" };

function getCurrentUser(){
  const raw = localStorage.getItem("hrmsUser");
  if(!raw) return null;
  try { return JSON.parse(raw); } catch(e){ return null; }
}

async function apiGet(action, params = {}) {
  const url = new URL(HRMS.WEB_APP_URL);
  url.searchParams.set("action", action);
  Object.keys(params).forEach(k => {
    const v = params[k];
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, v);
  });

  const res = await fetch(url.toString(), { method:"GET", headers:{ "Accept":"application/json" } });
  const text = await res.text();
  try { return JSON.parse(text); }
  catch(e){ return { success:false, error:"Invalid JSON from server" }; }
}

async function apiPostNoCors(action, body = {}) {
  const payload = { ...body, action };
  try {
    await fetch(HRMS.WEB_APP_URL, {
      method:"POST",
      mode:"no-cors",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify(payload)
    });
    return { ok:true };
  } catch(e){
    console.error(e);
    return { ok:false, error:String(e) };
  }
}

/* AUTH */
async function loginWithEmail(email){ return apiGet("login", { email }); }

/* Requirements */
async function fetchRequirements(){
  const u=getCurrentUser(); if(!u){ location.href="login.html"; return; }
  return apiGet("list_requirements", { email:u.email });
}
async function fetchHrValidRequirements(){
  const u=getCurrentUser(); if(!u){ location.href="login.html"; return; }
  return apiGet("list_hr_valid_requirements", { email:u.email });
}

/* Job Posting */
async function fetchJobPostings(){
  const u=getCurrentUser(); if(!u){ location.href="login.html"; return; }
  return apiGet("list_job_postings", { email:u.email });
}
async function saveJobPostings(requirementId, portals){
  const u=getCurrentUser(); if(!u){ location.href="login.html"; return; }
  return apiPostNoCors("save_job_postings", { email:u.email, RequirementId: requirementId, portals });
}

/* CV Upload */
async function fetchCvReadyRequirements(){
  const u=getCurrentUser(); if(!u){ location.href="login.html"; return; }
  return apiGet("list_cv_ready_requirements", { email:u.email });
}
async function fetchApplicantsByRequirement(requirementId){
  const u=getCurrentUser(); if(!u){ location.href="login.html"; return; }
  return apiGet("list_applicants_by_requirement", { email:u.email, requirementId });
}
async function uploadSingleCv(requirementId, fileObj){
  const u=getCurrentUser(); if(!u){ location.href="login.html"; return; }
  return apiPostNoCors("upload_cv_single", { email:u.email, RequirementId: requirementId, file:fileObj });
}
