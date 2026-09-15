import {
  getAccessToken,
  refreshAccessToken
} from "./auth.js";

const API_BASE_URL = CONFIG.API_BASE_URL;

async function authFetch(url, options = {}) {
  let accessToken = getAccessToken();

  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${accessToken}`,
    },
    credentials: "include",
  });

  // Access token expired
  if (response.status === 401) {
    try {
      accessToken = await refreshAccessToken();

      return await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${accessToken}`,
        },
        credentials: "include",
      });
    } catch (error) {
      console.error("Session expired:", error);

      // window.location.href = "/pages/login.html";

      throw error;
    }
  }

  return response;
}

export async function joinMeetingApi(roomId) {

  const response = await authFetch(
    `${API_BASE_URL}/meetings/${roomId}/join`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to join meeting")
  }

  return data;
}

export async function createMeetingApi({ title, description = "", scheduledFor = null, settings={} }) {

  console.log(
      "🔥 API FUNCTION RECEIVED SETTINGS:",
      JSON.stringify(settings, null, 2)
  );
  const response = await authFetch(
    `${API_BASE_URL}/meetings`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title,
        description,
        scheduledFor,
        settings,
      }),
    }
  );
  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || "Failed to create a meeting")
  }
  return data
}

export async function getMeetingApi(roomId) {
 
  const response = await authFetch(
    `${API_BASE_URL}/meetings/${roomId}`,
    {
      method: "GET",
    }
  );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            data.message || "Failed to get meeting"
        );
    }

    return data;
}

export async function getMeApi() {
  const response = await authFetch(
    `${API_BASE_URL}/auth/me`,
    {
      method: "GET",
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to get user");
  }

  return data;
}

export async function getMyMeetingsApi() {
  const response = await authFetch(
    `${API_BASE_URL}/meetings`,
    {
      method: "GET",
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch meetings");
  }

  return data;
}

export async function removeMeetingApi(roomId) {
  const response = await authFetch(
    `${API_BASE_URL}/meetings/${roomId}`,
    {
      method: "DELETE",
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to remove meeting");
  }

  return data;
}

export async function startMeetingApi(roomId) {
  const response = await authFetch(
    `${API_BASE_URL}/meetings/${roomId}/start`,
    {
      method: "POST",
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to start meeting");
  }

  return data;
}

export async function endMeetingApi(roomId) {
    const response = await authFetch(
        `${API_BASE_URL}/meetings/${roomId}/end`,
        {
            method: "POST",
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || "Failed to end meeting");
    }

    return data;
}

export async function updateMeetingApi(roomId, settings) {

    const response = await authFetch(
        `${API_BASE_URL}/meetings/${roomId}`,
        {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                settings,
            }),
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            data.message || "Failed to update meeting"
        );
    }

    return data;
}
