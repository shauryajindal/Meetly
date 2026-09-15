const ACCESS_TOKEN_KEY = "accessToken";

export function setAccessToken(accessToken) {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
}

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function clearAccessToken() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
}

export async function refreshAccessToken() {
  const response = await fetch(
     `${CONFIG.API_BASE_URL}/auth/refresh`,
    {
      method: "POST",
      credentials: "include",
    }
  );

  const data = await response.json();

  if (!response.ok) {
    clearAccessToken();
    throw new Error(data.message || "Session expired");
  }

  const newAccessToken = data.data.accessToken;

  setAccessToken(newAccessToken);

  return newAccessToken;
}