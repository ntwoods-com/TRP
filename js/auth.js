/*************************************************
  auth.js - Google GSI callback
**************************************************/
const AUTH = { CLIENT_ID: "1029752642188-ku0k9krbdbsttj9br238glq8h4k5loj3.apps.googleusercontent.com" };

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
