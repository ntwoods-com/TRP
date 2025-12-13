/*************************************************
  auth.js - Google GSI callback
**************************************************/
const AUTH = { CLIENT_ID: "PASTE_YOUR_OAUTH_CLIENT_ID.apps.googleusercontent.com" };

function decodeJwt(token){
  return JSON.parse(atob(token.split(".")[1]));
}

async function handleGoogleLogin(resp){
  const u = decodeJwt(resp.credential);
  const backend = await loginWithEmail(u.email);

  if(!backend.success){
    alert("Access Denied: " + (backend.error || "Not authorized"));
    return;
  }
  localStorage.setItem("hrmsUser", JSON.stringify(backend.user));
  location.href = "dashboard.html";
}
