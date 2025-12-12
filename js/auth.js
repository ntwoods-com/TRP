async function handleGoogleLogin(response) {
  const user = decodeJwt(response.credential);

  const backend = await fetch(
    GAS_WEB_URL + "?action=login&email=" + user.email
  ).then(r => r.json());

  if (!backend.success) {
    alert("Access Denied: You are not authorized");
    return;
  }

  localStorage.setItem("hrmsUser", JSON.stringify(backend.user));
  window.location.href = "dashboard.html";
}

function decodeJwt(token) {
  return JSON.parse(atob(token.split('.')[1]));
}
