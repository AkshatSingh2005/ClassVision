import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Button,
  List,
  ListItem,
  ListItemText,
  Typography,
  Divider,
  RadioGroup,
  FormControlLabel,
  Radio,
} from '@mui/material';
import { CardWrapper } from '../../../Components/CardWrapper';

const PARALLEL_BASE_URL =
  process.env.REACT_APP_PARALLEL_API || 'http://localhost:5050';

export const QuizList = () => {
  const { classId } = useParams();
  const [materials, setMaterials] = useState([]);
  const [selected, setSelected] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(
          `${PARALLEL_BASE_URL}/quizzes?classId=${classId}`
        );
        const data = await res.json();
        setMaterials(Array.isArray(data) ? data : []);
      } catch (e) {
        console.warn('Failed to load quizzes', e);
      }
    };
    load();
  }, [classId]);

  const startQuiz = (m) => {
    setSelected(m);
    setAnswers({});
    setResult('');
  };

  const handleChange = (qIndex, value) => {
    setAnswers((prev) => ({ ...prev, [qIndex]: value }));
  };

  const submitQuiz = () => {
    if (!selected) return;
    let correct = 0;
    selected.quiz.forEach((q, idx) => {
      if (answers[idx] === q.answer) correct += 1;
    });
    setResult(`You scored ${correct} / ${selected.quiz.length}`);
  };

  return (
    <CardWrapper title="Class Quizzes">
      <Box sx={{ display: 'flex', gap: 3 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6">Available Quizzes</Typography>
          {materials.length === 0 ? (
            <Typography>No quizzes available yet.</Typography>
          ) : (
            <List dense>
              {materials.map((m) => (
                <React.Fragment key={m._id}>
                  <ListItem
                    secondaryAction={
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => startQuiz(m)}
                      >
                        Start
                      </Button>
                    }
                  >
                    <ListItemText
                      primary={m.title}
                      secondary={new Date(
                        m.createdAt
                      ).toLocaleString()}
                    />
                  </ListItem>
                  <Divider component="li" />
                </React.Fragment>
              ))}
            </List>
          )}
        </Box>

        <Box sx={{ flex: 1 }}>
          {selected ? (
            <>
              <Typography variant="h6">
                Quiz: {selected.title}
              </Typography>
              {selected.quiz.map((q, idx) => (
                <Box key={idx} sx={{ mt: 2 }}>
                  <Typography>
                    {idx + 1}. {q.question}
                  </Typography>
                  <RadioGroup
                    value={answers[idx] || ''}
                    onChange={(e) => handleChange(idx, e.target.value)}
                  >
                    {q.options.map((opt, i) => {
                      const label = String.fromCharCode(65 + i);
                      return (
                        <FormControlLabel
                          key={i}
                          value={label}
                          control={<Radio />}
                          label={`${label}. ${opt}`}
                        />
                      );
                    })}
                  </RadioGroup>
                </Box>
              ))}
              <Button
                variant="contained"
                sx={{ mt: 2 }}
                onClick={submitQuiz}
              >
                Submit
              </Button>
              {result && (
                <Typography sx={{ mt: 1 }}>{result}</Typography>
              )}
            </>
          ) : (
            <Typography>Select a quiz to start.</Typography>
          )}
        </Box>
      </Box>
    </CardWrapper>
  );
};
