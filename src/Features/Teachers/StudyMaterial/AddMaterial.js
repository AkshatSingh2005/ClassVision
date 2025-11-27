import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Button,
  TextField,
  Typography,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';
import { CardWrapper } from '../../../Components/CardWrapper';

const PARALLEL_BASE_URL =
  process.env.REACT_APP_PARALLEL_API || 'http://localhost:5050';

export const AddMaterial = () => {
  const { classId } = useParams();
  const [title, setTitle] = useState('');
  const [file, setFile] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [message, setMessage] = useState('');
  const [quizStatus, setQuizStatus] = useState('');

  const handleGenerateQuiz = async (materialId) => {
  try {
    setQuizStatus('Generating quiz...');
    const res = await fetch(
      `${PARALLEL_BASE_URL}/materials/${materialId}/quiz`,
      { method: 'POST' }
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Error generating quiz');
    setQuizStatus(
      data.cached ? 'Loaded existing quiz.' : 'New quiz generated.'
    );
  } catch (e) {
    setQuizStatus(e.message || 'Failed to generate quiz');
  }
};


  const loadMaterials = async () => {
    try {
      const res = await fetch(
        `${PARALLEL_BASE_URL}/materials?classId=${classId}`
      );
      const data = await res.json();
      setMaterials(Array.isArray(data) ? data : []);
    } catch (e) {
      console.warn('Failed to load materials', e);
    }
  };

  useEffect(() => {
    loadMaterials();
  }, [classId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    if (!title || !file) {
      setMessage('Title and PDF file are required');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('classId', classId);
      formData.append('title', title);
      formData.append('file', file);

      const res = await fetch(`${PARALLEL_BASE_URL}/materials/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error uploading material');

      setMessage('Material uploaded and processed');
      setTitle('');
      setFile(null);
      loadMaterials();
    } catch (err) {
      setMessage(err.message || 'Error uploading material');
    }
  };

  return (
    <CardWrapper title="Study Material">
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Existing materials list */}
        <Box>
  <Typography variant="h6" sx={{ mb: 1 }}>
    Existing Materials
  </Typography>
  {materials.length === 0 ? (
    <Typography variant="body2">
      No materials added yet.
    </Typography>
  ) : (
    <List dense>
      {materials.map((m) => (
        <React.Fragment key={m._id}>
          <ListItem
            secondaryAction={
              <Button
                variant="outlined"
                size="small"
                onClick={() => handleGenerateQuiz(m._id)}
              >
                Generate Quiz
              </Button>
            }
          >
            <ListItemText
              primary={m.title}
              secondary={new Date(m.createdAt).toLocaleString()}
            />
          </ListItem>
          <Divider component="li" />
        </React.Fragment>
      ))}
    </List>
  )}
  {quizStatus && (
    <Typography variant="body2" sx={{ mt: 1 }}>
      {quizStatus}
    </Typography>
  )}
</Box>


        {/* Add new material via PDF */}
        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
        >
          <Typography variant="h6">Add Study Material</Typography>
          <TextField
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => setFile(e.target.files[0] || null)}
          />
          <Button type="submit" variant="contained">
            Save Material
          </Button>
          {message && (
            <Typography variant="body2">{message}</Typography>
          )}
        </Box>
      </Box>
    </CardWrapper>
  );
};
