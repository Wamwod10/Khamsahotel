const baseUrl = import.meta.env.VITE_API_BASE_URL;

export async function fetchData(endpoint) {
  const response = await fetch(`${baseUrl}/${endpoint}`);
  if (!response.ok) {
    throw new Error(`Network response was not ok: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

export async function postData(endpoint, data) {
  const response = await fetch(`${baseUrl}/${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Failed to post data: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export async function putData(endpoint, data) {
  const response = await fetch(`${baseUrl}/${endpoint}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Failed to update data: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export async function deleteData(endpoint) {
  const response = await fetch(`${baseUrl}/${endpoint}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(`Failed to delete data: ${response.status} ${response.statusText}`);
  }

  return response.json();
}
