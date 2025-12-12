/*************************************************
  NT Woods HRMS - auth.js
  - Google Login callback
**************************************************/

async function handleGoogleLogin(response) {
  const user = decodeJwt(response.credential);

  const backend = await fetch(
    GAS_WEB_URL + "?action=login&email=" + encodeURIComponent(user.email)
  ).then(r => r.json());

  if (!backend.success) {
    alert("Login failed: " + (backend.error || "You are not authorized"));
    console.log("LOGIN_BACKEND_RESPONSE", backend);
    return;
  }

  localStorage.setItem("hrmsUser", JSON.stringify(backend.user));
  window.location.href = "dashboard.html";
}

function decodeJwt(token) {
  return JSON.parse(atob(token.split('.')[1]));
}
