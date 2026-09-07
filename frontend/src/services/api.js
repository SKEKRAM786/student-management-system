import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const payload = error.response.data;
      error.status = error.response.status;
      error.field = payload?.error;
      if (payload?.message) {
        error.message = payload.message;
      }
    } else if (error.request) {
      error.status = null;
      error.message = "Unable to reach the server. Please try again.";
    }

    return Promise.reject(error);
  }
);

export async function getStudents({ page, pageSize, status } = {}) {
  const params = {};
  if (page != null) {
    params.page = page;
  }
  if (pageSize != null) {
    params.page_size = pageSize;
  }
  if (status) {
    params.status = status;
  }

  const response = await api.get("/students", { params });
  return response.data;
}

export async function getStudent(id) {
  const response = await api.get(`/students/${id}`);
  return response.data;
}

export async function createStudent(studentData) {
  const response = await api.post("/students", studentData);
  return response.data;
}

export async function updateStudent(id, studentData) {
  const response = await api.put(`/students/${id}`, studentData);
  return response.data;
}

export async function deleteStudent(id) {
  const response = await api.delete(`/students/${id}`);
  return response.data;
}
