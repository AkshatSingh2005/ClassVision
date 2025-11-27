import axios from 'axios';

// For local dev:
const PARALLEL_BASE_URL = 'http://10.219.78.147:5050';

// For student with image (selfie)
export const addStudentParallel = async (payload) => {
  // payload should be a plain JS object with all student data + faceDescriptor
  const res = await axios.post(`${PARALLEL_BASE_URL}/students`, payload);
  return res.data;
};


// For attendance (JSON-only)
export const addAttendanceParallel = async (classId, attendanceObject) => {
  const res = await axios.post(`${PARALLEL_BASE_URL}/attendance`, { classId, ...attendanceObject });
  return res.data;
};
