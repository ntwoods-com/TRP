/*************************************************
  ui.js - Phase-2.3 (Requirements + Job Posting + CV Upload)
**************************************************/

/* ===== Core ===== */
function getCurrentUserOrRedirect(){
  const raw = localStorage.getItem("hrmsUser");
  if(!raw){ location.href="login.html"; return null; }
  try { return JSON.parse(raw); } catch(e){ location.href="login.html"; return null; }
}

function logout(){
  localStorage.removeItem("hrmsUser");
  location.href="login.html";
}

function escapeHtml(str){
  return String(str||"")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function setAlert(id, type, msg){
  const el=document.getElementById(id);
  if(!el) return;
  if(!msg){ el.innerHTML=""; return; }
  el.innerHTML = `<div class="alert alert-${type}">${escapeHtml(msg)}</div>`;
}

function statusBadge(status){
  const s = String(status||"").toLowerCase();
  return `<span class="badge status-${s}">${escapeHtml(status||"")}</span>`;
}

/* ===== Layout ===== */
function initLayout(activeKey=""){
  renderNavbar();
  renderSidebar(activeKey);
}

function renderNavbar(){
  const u=getCurrentUserOrRedirect(); if(!u) return;
  const nav=document.getElementById("navbar"); if(!nav) return;

  nav.innerHTML = `
    <div class="nav-left"><div class="app-title">NT Woods HRMS</div></div>
    <div class="nav-right">
      <div class="user-info">
        <div class="user-name">${escapeHtml(u.name||"")}</div>
        <div class="user-email">${escapeHtml(u.email||"")}</div>
      </div>
      <div class="role-badge">${escapeHtml(u.role||"")}</div>
      <button class="btn-link" onclick="logout()">Logout</button>
    </div>`;
}

function renderSidebar(activeKey=""){
  const u=getCurrentUserOrRedirect(); if(!u) return;
  const side=document.getElementById("sidebar"); if(!side) return;

  const modules=[];
  modules.push({ key:"dashboard", label:"Dashboard", link:"dashboard.html" });
  modules.push({ key:"requirements", label:"Requirements", link:"requirements.html" });

  if(u.role==="HR" || u.role==="ADMIN"){
    modules.push({ key:"jobposting", label:"Job Posting", link:"jobposting.html" });
    modules.push({ key:"cvupload", label:"CV Upload", link:"cvupload.html" });
  }

  let html = `<ul class="sidebar-menu">`;
  modules.forEach(m=>{
    html += `<li class="${m.key===activeKey?'active':''}"><a href="${m.link}">${m.label}</a></li>`;
  });
  html += `</ul>`;
  side.innerHTML = html;
}

/* ===== Modal ===== */
let reqModalEl = null;
function openModal(innerHtml, wide=false){
  closeReqModal();
  reqModalEl = document.createElement("div");
  reqModalEl.className="modal-backdrop";
  reqModalEl.innerHTML = `<div class="modal ${wide?'modal-wide':''}">${innerHtml}</div>`;
  document.body.appendChild(reqModalEl);
}
function closeReqModal(){
  if(reqModalEl){ reqModalEl.remove(); reqModalEl=null; }
}

/* ===== Dashboard (optional) ===== */
async function loadDashboard(){
  const u=getCurrentUserOrRedirect(); if(!u) return;
  initLayout("dashboard");
  const tiles=[];
  tiles.push({ title:"Requirements", desc:"Create / validate requirements", href:"requirements.html" });

  if(u.role==="HR"||u.role==="ADMIN"){
    tiles.push({ title:"Job Posting", desc:"Mark portals + upload screenshot", href:"jobposting.html" });
    tiles.push({ title:"CV Upload", desc:"Upload CVs after job posting", href:"cvupload.html" });
  }
  const c=document.getElementById("tiles");
  if(!c) return;
  c.innerHTML = tiles.map(t=>`
    <div class="tile-card" onclick="location.href='${t.href}'">
      <h3>${escapeHtml(t.title)}</h3><p>${escapeHtml(t.desc)}</p>
    </div>`).join("");
}

/* ===== Requirements (view + HR valid/sendback) ===== */
let REQ_TAB = "mine";
function switchReqTab(tab){
  REQ_TAB = tab;
  document.getElementById("tabMine")?.classList.toggle("active", tab==="mine");
  document.getElementById("tabNeed")?.classList.toggle("active", tab==="need");
  loadRequirements();
}

async function loadRequirements(){
  const u=getCurrentUserOrRedirect(); if(!u) return;
  initLayout("requirements");

  // EA tabs visible; HR tabs hidden
  if(u.role==="HR" || u.role==="ADMIN"){
    document.querySelector(".tabbar")?.classList.add("hide");
  } else {
    document.querySelector(".tabbar")?.classList.remove("hide");
  }

  const btn=document.getElementById("btnRaiseRequirement");
  if(btn) btn.style.display = (u.role==="EA") ? "inline-flex" : "none";

  setAlert("reqAlert","","");
  const tbl=document.getElementById("reqTable");
  if(!tbl) return;
  tbl.innerHTML = `<tr><td class="loading">Loading...</td></tr>`;

  const res = await fetchRequirements();
  if(!res || !res.success){
    tbl.innerHTML = `<tr><td>Error</td></tr>`;
    setAlert("reqAlert","error",(res&&res.error)||"Unable to load");
    return;
  }

  let rows = res.data || [];

  if(u.role==="HR" || u.role==="ADMIN"){
    rows = rows.filter(r=>["SENT_TO_HR","HR_SENDBACK"].includes(String(r.Status||"").toUpperCase()));
  } else {
    if(REQ_TAB==="need"){
      rows = rows.filter(r=>String(r.Status||"").toUpperCase()==="HR_SENDBACK");
    } else {
      rows = rows.filter(r=>String(r.Status||"").toUpperCase()!=="HR_SENDBACK");
    }
  }

  renderRequirementsTable(rows);
}

function renderRequirementsTable(list){
  const tbl=document.getElementById("reqTable");
  if(!list.length){
    tbl.innerHTML = `<tr><th>Empty</th></tr><tr><td class="empty-state">No data</td></tr>`;
    return;
  }
  let html = `<thead><tr>
    <th>ID</th><th>Job Role</th><th>Job Title</th><th>Status</th><th>Action</th>
  </tr></thead><tbody>`;
  list.forEach(r=>{
    html += `<tr>
      <td>${escapeHtml(r.RequirementId)}</td>
      <td>${escapeHtml(r.JobRoleKey)}</td>
      <td>${escapeHtml(r.JobTitle)}</td>
      <td>${statusBadge(r.Status)}</td>
      <td><button class="btn-secondary" onclick='openRequirementDetail(${JSON.stringify(r)})'>View</button></td>
    </tr>`;
  });
  html += `</tbody>`;
  tbl.innerHTML = html;
}

function openRequirementDetail(req){
  const u=getCurrentUserOrRedirect(); if(!u) return;
  const isHR = (u.role==="HR"||u.role==="ADMIN");
  const status = String(req.Status||"").toUpperCase();
  const canAct = isHR && (status==="SENT_TO_HR" || status==="HR_SENDBACK");

  const inner = `
    <h3>Requirement Detail</h3>
    <div class="detail-grid">
      <div><label>RequirementId</label><div class="field-value">${escapeHtml(req.RequirementId)}</div></div>
      <div><label>Status</label><div class="field-value">${statusBadge(req.Status)}</div></div>
      <div><label>Job Role</label><div class="field-value">${escapeHtml(req.JobRoleKey||"")}</div></div>
      <div><label>Job Title</label><div class="field-value">${escapeHtml(req.JobTitle||"")}</div></div>
    </div>

    <label>Roles & Responsibilities</label>
    <div class="field-box multi">${escapeHtml(req.RolesAndResponsibilities||"")}</div>

    <label>Must Have Skills</label>
    <div class="field-box multi">${escapeHtml(req.MustHaveSkills||"")}</div>

    <div class="detail-grid">
      <div><label>Shift</label><div class="field-value">${escapeHtml(req.Shift||"")}</div></div>
      <div><label>Pay Scale</label><div class="field-value">${escapeHtml(req.PayScale||"")}</div></div>
    </div>

    <label>Perks</label>
    <div class="field-box">${escapeHtml(req.Perks||"")}</div>

    <label>Notes</label>
    <div class="field-box multi">${escapeHtml(req.Notes||"")}</div>

    ${canAct ? `
      <div class="hr-action-box">
        <label>HR Remark (Send Back ke liye mandatory)</label>
        <textarea id="hrRemark" rows="3" placeholder="Reason / clarification...">${escapeHtml(req.HRRemark||"")}</textarea>
        <div class="modal-actions">
          <button class="btn-outline" onclick="closeReqModal()">Close</button>
          <button class="btn-danger" onclick="hrSendBack('${escapeHtml(req.RequirementId)}')">Send Back</button>
          <button class="btn-primary" onclick="hrMarkValid('${escapeHtml(req.RequirementId)}')">Mark as Valid</button>
        </div>
      </div>
    ` : `
      <div class="modal-actions">
        <button class="btn-outline" onclick="closeReqModal()">Close</button>
      </div>
    `}
  `;
  openModal(inner, true);
}

async function hrMarkValid(requirementId){
  const remark = document.getElementById("hrRemark")?.value?.trim() || "";
  const res = await apiPostNoCors("update_requirement_status", { email:getCurrentUserOrRedirect().email, RequirementId: requirementId, Status:"HR_VALID", HRRemark: remark });
  if(res && res.ok){ alert("Marked HR_VALID ✅"); closeReqModal(); loadRequirements(); }
  else alert("Unable to mark valid");
}

async function hrSendBack(requirementId){
  const remark = document.getElementById("hrRemark")?.value?.trim() || "";
  if(!remark){ alert("HR Remark mandatory"); return; }
  const res = await apiPostNoCors("update_requirement_status", { email:getCurrentUserOrRedirect().email, RequirementId: requirementId, Status:"HR_SENDBACK", HRRemark: remark });
  if(res && res.ok){ alert("Sent back ✅"); closeReqModal(); loadRequirements(); }
  else alert("Unable to send back");
}

/* ===== Job Posting (file upload) ===== */
async function loadJobPosting(){
  const u=getCurrentUserOrRedirect(); if(!u) return;
  initLayout("jobposting");
  if(u.role!=="HR" && u.role!=="ADMIN"){
    document.querySelector(".content").innerHTML="<h2>Access Denied</h2>";
    return;
  }

  setAlert("jpAlert","","");
  const table=document.getElementById("jpTable");
  if(!table) return;
  table.innerHTML = `<tr><td class="loading">Loading...</td></tr>`;

  const reqRes = await fetchHrValidRequirements();
  const postRes = await fetchJobPostings();

  if(!reqRes||!reqRes.success){ setAlert("jpAlert","error",(reqRes&&reqRes.error)||"Unable to load"); return; }
  const reqs=reqRes.data||[];
  const postings=(postRes&&postRes.success)?(postRes.data||[]):[];

  const isDone = (reqId)=> postings.filter(p=>String(p.RequirementId)===String(reqId))
    .some(p=> String(p.IsPosted||"").toLowerCase()==="true" || p.IsPosted===true);

  if(!reqs.length){
    table.innerHTML = `<tr><th>Empty</th></tr><tr><td class="empty-state">No HR_VALID requirements.</td></tr>`;
    return;
  }

  let html = `<thead><tr><th>RequirementId</th><th>JobRoleKey</th><th>JobTitle</th><th>Posting</th><th>Action</th></tr></thead><tbody>`;
  reqs.forEach(r=>{
    const done = isDone(r.RequirementId);
    html += `<tr>
      <td>${escapeHtml(r.RequirementId)}</td>
      <td>${escapeHtml(r.JobRoleKey)}</td>
      <td>${escapeHtml(r.JobTitle)}</td>
      <td><span class="badge ${done?'status-ok':'status-pending'}">${done?'COMPLETED':'PENDING'}</span></td>
      <td><button class="btn-small" onclick="openJobPostingModal('${escapeHtml(r.RequirementId)}')">Manage</button></td>
    </tr>`;
  });
  html += `</tbody>`;
  table.innerHTML = html;
}

function openJobPostingModal(requirementId){
  const PORTALS = ["Naukri","Indeed","Apna","WorkIndia","Direct","Others"];

  const cards = PORTALS.map(p=>`
    <div class="portal-card">
      <div class="portal-row">
        <b>${escapeHtml(p)}</b>
        <label class="toggle">
          <input type="checkbox" id="posted_${p}">
          <span>Posted?</span>
        </label>
      </div>

      <label class="small">Screenshot Upload</label>
      <input type="file" id="file_${p}" accept="image/*,.pdf" />
      <div class="small muted mt6">Optional (recommended). File will be stored in Drive.</div>
    </div>
  `).join("");

  const inner = `
    <h3>Manage Job Posting</h3>
    <div class="subtext">Requirement: <b>${escapeHtml(requirementId)}</b></div>
    <div class="portal-grid">${cards}</div>

    <div class="modal-actions">
      <button class="btn-outline" onclick="closeReqModal()">Close</button>
      <button class="btn-primary" onclick="saveJobPostingModal('${escapeHtml(requirementId)}')">Save</button>
    </div>
  `;
  openModal(inner, true);
}

async function saveJobPostingModal(requirementId){
  const PORTALS = ["Naukri","Indeed","Apna","WorkIndia","Direct","Others"];

  const portals = [];
  for(const p of PORTALS){
    const isPosted = document.getElementById(`posted_${p}`)?.checked || false;
    const fileInput = document.getElementById(`file_${p}`);
    let fileObj = null;
    if(fileInput && fileInput.files && fileInput.files[0]){
      fileObj = await fileToBase64Obj(fileInput.files[0]);
    }
    portals.push({ PortalName:p, IsPosted:isPosted, ScreenshotFile:fileObj });
  }

  const res = await saveJobPostings(requirementId, portals);
  if(res && res.ok){
    alert("Saved ✅ (Refresh list to see COMPLETED)");
    closeReqModal();
    loadJobPosting();
  } else {
    alert("Failed to save");
  }
}

/* ===== CV Upload ===== */
async function loadCvUpload(){
  const u=getCurrentUserOrRedirect(); if(!u) return;
  initLayout("cvupload");
  if(u.role!=="HR" && u.role!=="ADMIN"){
    document.querySelector(".content").innerHTML="<h2>Access Denied</h2>";
    return;
  }

  setAlert("cvAlert","","");
  const sel=document.getElementById("cvReqSelect");
  if(!sel) return;
  sel.innerHTML = `<option value="">Loading...</option>`;

  const res = await fetchCvReadyRequirements();
  if(!res || !res.success){
    sel.innerHTML = `<option value="">Select requirement</option>`;
    setAlert("cvAlert","error",(res&&res.error)||"Unable to load cv-ready requirements");
    return;
  }

  const list = res.data || [];
  if(!list.length){
    sel.innerHTML = `<option value="">No completed job postings yet</option>`;
    setAlert("cvAlert","info","Job Posting complete karo (at least one portal Posted = YES). Phir yahan requirement dikhega.");
    return;
  }

  sel.innerHTML = `<option value="">Select requirement</option>` + list.map(r=>
    `<option value="${escapeHtml(r.RequirementId)}">${escapeHtml(r.RequirementId)} - ${escapeHtml(r.JobTitle||"")}</option>`
  ).join("");

  sel.addEventListener("change", refreshApplicants);
}

async function refreshApplicants(){
  const reqId=document.getElementById("cvReqSelect")?.value;
  if(!reqId) return;

  const tbl=document.getElementById("cvApplicantsTable");
  if(!tbl) return;
  tbl.innerHTML = `<tr><td class="loading">Loading...</td></tr>`;

  const res = await fetchApplicantsByRequirement(reqId);
  if(!res || !res.success){
    tbl.innerHTML = `<tr><td>Error</td></tr>`;
    return;
  }

  const list=res.data||[];
  if(!list.length){
    tbl.innerHTML = `<tr><th>Empty</th></tr><tr><td class="empty-state">No applicants uploaded.</td></tr>`;
    return;
  }

  let html = `<thead><tr><th>Name</th><th>Mobile</th><th>Source</th><th>Stage</th><th>CV</th></tr></thead><tbody>`;
  list.forEach(a=>{
    html += `<tr>
      <td>${escapeHtml(a.CandidateName)}</td>
      <td>${escapeHtml(a.MobileNumber)}</td>
      <td>${escapeHtml(a.Source)}</td>
      <td>${statusBadge(a.CurrentStage)}</td>
      <td><a href="${escapeHtml(a.CVFileUrl||"#")}" target="_blank">Open</a></td>
    </tr>`;
  });
  html += `</tbody>`;
  tbl.innerHTML = html;
}

async function startCvUpload(){
  const reqId=document.getElementById("cvReqSelect")?.value;
  const files=document.getElementById("cvFiles")?.files;

  if(!reqId){ alert("Select requirement"); return; }
  if(!files || !files.length){ alert("Select files"); return; }

  const wrap=document.getElementById("cvProgressWrap");
  const bar=document.getElementById("cvProgBar");
  const txt=document.getElementById("cvProgText");
  if(wrap){ wrap.style.display="block"; }
  if(bar){ bar.style.width="0%"; }

  for(let i=0;i<files.length;i++){
    const f=files[i];
    if(txt){ txt.textContent = `Uploading ${i+1}/${files.length}: ${f.name}`; }

    const fileObj = await fileToBase64Obj(f);
    const res = await uploadSingleCv(reqId, fileObj);

    if(!res || !res.ok){
      alert("Upload failed for: " + f.name);
      break;
    }
    if(bar){ bar.style.width = Math.round(((i+1)/files.length)*100) + "%"; }
  }

  if(txt){ txt.textContent="Done ✅ (Click Refresh List)"; }
  setTimeout(()=>{ if(wrap){ wrap.style.display="none"; } }, 900);
}

/* ===== File to base64 ===== */
function fileToBase64Obj(file){
  return new Promise((resolve, reject)=>{
    const reader=new FileReader();
    reader.onload=()=>{
      const base64=String(reader.result).split(",")[1];
      resolve({ name:file.name, mimeType:file.type, dataBase64: base64 });
    };
    reader.onerror=reject;
    reader.readAsDataURL(file);
  });
}
