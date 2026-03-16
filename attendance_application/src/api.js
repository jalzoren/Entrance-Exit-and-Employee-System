import axios from "axios";
import 'bootstrap/dist/css/bootstrap.min.css';

// ====================================
// CONFIGURATION
// ====================================

const API_BASE_URL =
  process.env.REACT_APP_API_URL ||
  "http://localhost/EMP/Employee-Detection-System/facial_attendance_api/controllers";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

// ====================================
// GLOBAL ERROR HANDLER
// ====================================

const handleError = (error) => {
  console.error("API Error:", error);

  if (error.response) {
    throw error.response.data;
  } else if (error.request) {
    throw { message: "Server not responding" };
  } else {
    throw { message: "Unexpected error occurred" };
  }
};

// ====================================
// AUTH ENDPOINTS
// ====================================

export const login = async ({ username, password }) => {
  try {
    const { data } = await api.post("/auth.php", { username, password });
    return data;
  } catch (error) {
    handleError(error);
  }
};

export const requestPasswordReset = async ({ email }) => {
  try {
    const { data } = await api.post("/password_reset_request.php", { email });
    return data;
  } catch (error) {
    handleError(error);
  }
};

export const resetPasswordWithOtp = async ({ email, otp, new_password }) => {
  try {
    const { data } = await api.post("/reset_password.php", {
      email,
      otp,
      new_password,
    });
    return data;
  } catch (error) {
    handleError(error);
  }
};

// ====================================
// EMPLOYEE ENDPOINTS
// ====================================

export const getEmployees = async (params = {}) => {
  try {
    const { data } = await api.get("/employee.php", { params });
    return data;
  } catch (error) {
    handleError(error);
  }
};

export const addEmployee = async (employeeData) => {
  try {
    const { data } = await api.post("/employee.php", employeeData);
    return data;
  } catch (error) {
    handleError(error);
  }
};

export const deleteEmployee = async (id) => {
  try {
    const { data } = await api.delete(`/employee.php?id=${id}`);
    return data;
  } catch (error) {
    handleError(error);
  }
};

export const restoreEmployee = async (id) => {
  try {
    const { data } = await api.put(`/employee.php?id=${id}`);
    return data;
  } catch (error) {
    handleError(error);
  }
};

export const updateEmployee = async (employeeData) => {
  try {
    const { data } = await api.post("/employee_update.php", employeeData);
    return data;
  } catch (error) {
    handleError(error);
  }
};

// ====================================
// ATTENDANCE ENDPOINTS
// ====================================

export const getAttendance = async (filters = {}) => {
  try {
    const { data } = await api.get("/attendance.php", {
      params: filters,
    });
    return data;
  } catch (error) {
    handleError(error);
  }
};

export const markAttendance = async ({
  employee_id,
  event_id,
  attendance_type, // "Check In" or "Check Out"
}) => {
  try {
    const { data } = await api.post("/attendance.php", {
      employee_id,
      event_id,
      attendance_type,
    });
    return data;
  } catch (error) {
    handleError(error);
  }
};

// ====================================
// EVENT ENDPOINTS
// ====================================

export const getEvents = async (params = {}) => {
  try {
    const { data } = await api.get("/events.php", { params });
    return data;
  } catch (error) {
    handleError(error);
  }
};

export const createEvent = async (eventData) => {
  try {
    const { data } = await api.post("/events.php", eventData);
    return data;
  } catch (error) {
    handleError(error);
  }
};

export const deleteEvent = async (id) => {
  try {
    const { data } = await api.delete(`/events.php?id=${id}`);
    return data;
  } catch (error) {
    handleError(error);
  }
};

export const restoreEvent = async (id) => {
  try {
    const { data } = await api.put(`/events.php?id=${id}`, { restore: true });
    return data;
  } catch (error) {
    handleError(error);
  }
};

export const updateEvent = async (id, eventData) => {
  try {
    const { data } = await api.put(`/events.php?id=${id}`, eventData);
    return data;
  } catch (error) {
    handleError(error);
  }
};

export const getEventTypes = async () => {
  try {
    const { data } = await api.get("/eventtype.php");
    return data;
  } catch (error) {
    handleError(error);
  }
};

export const getLocations = async () => {
  try {
    const { data } = await api.get("/location.php");
    return data;
  } catch (error) {
    handleError(error);
  }
};

export const getDepartments = async () => {
  try {
    const { data } = await api.get("/department.php");
    return data;
  } catch (error) {
    handleError(error);
  }
};

export const getPositions = async () => {
  try {
    const { data } = await api.get("/position.php");
    return data;
  } catch (error) {
    handleError(error);
  }
};

export const addDepartment = async ({ department_name }) => {
  try {
    const { data } = await api.post("/department.php", { department_name });
    return data;
  } catch (error) {
    handleError(error);
  }
};

export const addPosition = async ({ position_name }) => {
  try {
    const { data } = await api.post("/position.php", { position_name });
    return data;
  } catch (error) {
    handleError(error);
  }
};

export const addLocation = async ({ location_name }) => {
  try {
    const { data } = await api.post("/location.php", { location_name });
    return data;
  } catch (error) {
    handleError(error);
  }
};

export const updateDepartment = async (id, { department_name }) => {
  try {
    const { data } = await api.put(`/department.php?id=${id}`, {
      department_name,
    });
    return data;
  } catch (error) {
    handleError(error);
  }
};

export const deleteDepartment = async (id) => {
  try {
    const { data } = await api.delete(`/department.php?id=${id}`);
    return data;
  } catch (error) {
    handleError(error);
  }
};

export const updatePosition = async (id, { position_name }) => {
  try {
    const { data } = await api.put(`/position.php?id=${id}`, {
      position_name,
    });
    return data;
  } catch (error) {
    handleError(error);
  }
};

export const deletePosition = async (id) => {
  try {
    const { data } = await api.delete(`/position.php?id=${id}`);
    return data;
  } catch (error) {
    handleError(error);
  }
};

export const updateLocation = async (id, { location_name }) => {
  try {
    const { data } = await api.put(`/location.php?id=${id}`, {
      location_name,
    });
    return data;
  } catch (error) {
    handleError(error);
  }
};

export const deleteLocation = async (id) => {
  try {
    const { data } = await api.delete(`/location.php?id=${id}`);
    return data;
  } catch (error) {
    handleError(error);
  }
};

export const getEmailsList = async () => {
  try {
    const { data } = await api.get("/email.php");
    return data;
  } catch (error) {
    handleError(error);
  }
};
// ====================================
// FACIAL RECOGNITION ENDPOINTS
// ====================================

export const getFacialEncodings = async () => {
  try {
    const { data } = await api.get("/facial.php");
    return data;
  } catch (error) {
    handleError(error);
  }
};

export const registerFace = async ({
  employee_id,
  encoding,
}) => {
  try {
    const { data } = await api.post("/facial.php", {
      employee_id,
      encoding,
    });
    return data;
  } catch (error) {
    handleError(error);
  }
};

// ====================================
// DASHBOARD ENDPOINTS
// ====================================

export const getDashboardStats = async () => {
  try {
    const { data } = await api.get("/dashboard_stats.php");
    return data?.data ?? data ?? {};
  } catch (error) {
    handleError(error);
  }
};

export const getDepartmentAttendance = async () => {
  try {
    const { data } = await api.get("/dashboard_department.php");
    return Array.isArray(data) ? data : (data?.data ?? []);
  } catch (error) {
    handleError(error);
  }
};

export const getEntryExitLogs = async () => {
  try {
    const { data } = await api.get("/entry_exit.php");
    return data;
  } catch (error) {
    handleError(error);
  }
};

export const getEventAttendance = async (event_id) => {
  try {
    const { data } = await api.get(
      `/event_attendance.php?event_id=${event_id}`
    );
    return data;
  } catch (error) {
    handleError(error);
  }
};
