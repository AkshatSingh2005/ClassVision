const mongoose = require('mongoose');

const MaterialSchema = new mongoose.Schema(
  {
    classId: { type: String, required: true },
    title: { type: String, required: true },
    type: { type: String, default: 'pdf' },
    content: { type: String, required: true },
    filePath: { type: String, required: true },
    originalName: { type: String },

    quiz: [
      {
        question: String,
        options: [String],
        answer: String,
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Material', MaterialSchema);
