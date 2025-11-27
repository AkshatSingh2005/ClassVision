const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema(
  {
    classId: { type: String, required: true },
    date: { type: String, required: true }, // keep your existing format e.g. DD/MMM/YYYY
    absentees: { type: Array, default: [] }, // [{ name, rollno }] or ['All Present']
    attendancePercentage: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model('Attendance', AttendanceSchema);
