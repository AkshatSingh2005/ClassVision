const mongoose = require('mongoose');

const StudentSchema = new mongoose.Schema({
  classId: { type: String, required: true },
  id: { type: String, required: true },
  name: { type: String, required: true },
  gender: String,
  guardianName: String,
  contactInfo: String,
  selfiePath: String,     // <-- MUST be present!
  faceDescriptor: [Number] // Array of 128 numbers

}, { timestamps: true });

module.exports = mongoose.model('Student', StudentSchema);
