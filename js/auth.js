/*************************************************
  NT Woods HRMS - auth.js
**************************************************/

function decodeJwt(token) {
  return JSON.parse(atob(token.split(".")[1]));
}

async function handleGoogleLogin(response) {
  const user = decodeJwt(response.credential);

  const res = await fetch(
    GAS_WEB_URL + "?action=login&email=" + encodeURIComponent(user.email)
  );

  const backend = await res.json();

  if (!backend.success) {
    alert("Login failed: " + (backend.error || "You are not authorized"));
    console.log("LOGIN_BACKEND_RESPONSE", backend);
    return;
  }

  localStorage.setItem("hrmsUser", JSON.stringify(backend.user));
  window.location.href = "dashboard.html";
}
