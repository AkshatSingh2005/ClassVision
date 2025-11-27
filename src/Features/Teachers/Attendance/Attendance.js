
import React, { useState, useEffect } from 'react'
import dayjs from 'dayjs';
import { useParams } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import {
  Box,
  Button,
  FormControlLabel,
  Radio,
  RadioGroup,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import styled from '@emotion/styled';
import { addAttendanceParallel } from '../../ParallelBackend/parallelBackendApi';


import {
  useAddAttendanceMutation,
  useGetTeacherDataQuery,
} from '../teachersApiSlice';
import { CardWrapper } from '../../../Components/CardWrapper';
import Loading from '../../../Components/Loading';
import Error from '../../../Components/Error';

import * as faceapi from 'face-api.js';
import axios from 'axios';


const StyledButton = styled(Button)(() => ({
  color: '#4e73df',
  fontWeight: '600'
}));

export const Attendance = () => {
  const { classId } = useParams(); //for identifying the class

  // GET Data
  const { data, isLoading, isSuccess, isError, error } =
    useGetTeacherDataQuery(classId);

  const [addAttendance] = useAddAttendanceMutation();

  const students = data?.studentInfo;

  // Getting Today's Date
  const currentDate = dayjs(new Date().toString()).format('DD/MMM/YYYY');

  // console.log(students);

  // For attendance
  const [attendance, setAttendance] = useState([]);

  const [groupPhoto, setGroupPhoto] = useState(null);
const [modelsLoaded, setModelsLoaded] = useState(false);

useEffect(() => {
  const loadModels = async () => {
    try {
      const MODEL_URL = '/models';
      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);
      setModelsLoaded(true);
      console.log('Face-api models loaded');
    } catch (e) {
      console.error('Error loading face-api models', e);
      toast.error('Failed to load face models');
    }
  };
  loadModels();
}, []);

  // Handling Present or Absent
  const handleRadioChange = (index, value) => {
    const updatedAttendance = [...attendance];
    updatedAttendance[index] = value;
    setAttendance(updatedAttendance);
  };

  // Color change according to Attendance
  const getLabelColor = (index) => {
    const status = attendance[index];
    return status === 'Present' ? '#4e73df' : 'red';
  };

  const euclideanDistance = (a, b) => {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
};

const findBestMatch = (descriptor, studentsWithDescriptor, threshold = 0.6) => {
  let bestStudent = null;
  let bestDistance = Infinity;
  studentsWithDescriptor.forEach((stu) => {
    if (!stu.faceDescriptor || !stu.faceDescriptor.length) return;
    const dist = euclideanDistance(descriptor, stu.faceDescriptor);
    if (dist < bestDistance) {
      bestDistance = dist;
      bestStudent = stu;
    }
  });
  if (bestStudent && bestDistance <= threshold) {
    return bestStudent;
  }
  return null;
};

const handleFaceBasedAttendance = async () => {
  console.log('classId from params:', classId);

  try {
    if (!modelsLoaded) {
      toast.error('Face models not loaded yet.');
      return;
    }
    if (!groupPhoto) {
      toast.error('Please upload a group photo first.');
      return;
    }
    if (!students || students.length === 0) {
      toast.error('No students found for this class.');
      return;
    }

    // 1) Load image into HTMLImageElement
    const img = await faceapi.bufferToImage(groupPhoto);

    // 2) Detect all faces with descriptors
    const results = await faceapi
      .detectAllFaces(img)
      .withFaceLandmarks()
      .withFaceDescriptors();

    if (!results || results.length === 0) {
      toast.error('No faces detected in group photo.');
      return;
    }
    console.log('Detected faces:', results.length);

    // 3) Get students with descriptors from parallel DB
    const res = await axios.get('http://10.219.78.147:5050/students', {
      params: { classId },
    });
    const parallelStudents = res.data || []; // expect array of {classId,id,name,...,faceDescriptor}

    // 4) For each detected face, find best match
    const autoAttendance = Array(students.length).fill('Absent'); // base: all absent

    results.forEach((det) => {
      const descriptor = Array.from(det.descriptor);
      const matched = findBestMatch(descriptor, parallelStudents);
      if (matched) {
        // find index in current students list
        const idx = students.findIndex((s) => s.id === matched.id);
        if (idx !== -1) {
          autoAttendance[idx] = 'Present';
        }
      }
    });

    setAttendance(autoAttendance);
    toast.success('Auto attendance marked from photo. Review and submit.');
  } catch (e) {
    console.error('Face-based attendance failed:', e);
    toast.error('Failed to mark attendance from photo.');
  }
};


  // Clear the Attendance sheet
  const handleClearAttendance = () => {
    setAttendance([]);
  };

  // For quick marking if all are present
  const handleAllPresent = () => {
    const updatedAttendance = students.map(() => 'Present');
    setAttendance(updatedAttendance);
  };

  // Handling Data
  const handleAttendance = () => {
    // Calculate the attendance percentage
    const presentCount = attendance.filter(
      (status) => status === 'Present'
    ).length;
    const totalStudents = students.length;
    const attendancePercentage = ((presentCount / totalStudents) * 100).toFixed(
      2
    );

    // Filter and output only the absentees
    const absentArray = students.filter(
      (student, index) => attendance[index] !== 'Present'
    );
    let absentees = absentArray.map((student) => ({
      name: student.name,
      rollno: student.id,
    }));
    if (absentees.length === 0) {
      absentees = ['All Present'];
    }

    // Attendance object to send to API
    const attendanceObject = {
      date: currentDate,
      absentees: absentees,
      attendancePercentage: attendancePercentage,
    };
    console.log('data', attendanceObject);
    Attndnce(attendanceObject);
  };

  const Attndnce = (data) => {
  // 1) Existing backend call (unchanged)
  addAttendance({ classId: classId, data })
    .unwrap()
    .then((response) => toast.success(response.message))
    .catch((error) => toast.error(error.error || error.data.error.message));

  // 2) NEW: Parallel backend call (silent)
  addAttendanceParallel(classId, data)
    .then(() => {
      // optional: console.log('Parallel attendance stored');
    })
    .catch((e) => {
      console.warn('Parallel backend (attendance) failed:', e?.message || e);
    });
};


  //  Handling Page Display
  let content;
  if (isLoading) {
    content = <Loading open={isLoading} />;
  } else if (isSuccess) {
    content = (
      <CardWrapper title='Attendance'>
        <ToastContainer />
        <Box>
          <Typography
            variant='h6'
            component='h2'
            textAlign='center'
            gutterBottom
            sx={{ color: '#4e73df', fontWeight: '600' }}
          >
            {currentDate}
          </Typography>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Roll No</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Attendance</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {students?.map((student, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Typography
                      variant='body1'
                      component='span'
                      style={{
                        color: getLabelColor(index),
                        fontWeight: 'bold',
                      }}
                    >
                      {student.id}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography
                      variant='body1'
                      component='span'
                      style={{
                        color: getLabelColor(index),
                        fontWeight: 'bold',
                      }}
                    >
                      {student.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <RadioGroup
                      value={attendance[index] || 'Absent'}
                      onChange={(event) =>
                        handleRadioChange(index, event.target.value)
                      }
                      row
                    >
                      <FormControlLabel
                        value='Present'
                        control={<Radio />}
                        label='Present'
                      />
                      <FormControlLabel
                        value='Absent'
                        control={<Radio color='error' />}
                        label='Absent'
                      />
                    </RadioGroup>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Box mt={2} display='flex' flexDirection='column' gap={2}>
          {/* Photo input */}
          <Box display='flex' justifyContent='space-between' alignItems='center'>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setGroupPhoto(e.target.files[0])}
            />
            <StyledButton variant='outlined' onClick={handleFaceBasedAttendance}>
              Mark via Photo
            </StyledButton>
          </Box>

          <Box display='flex' justifyContent='space-between'>
            <StyledButton variant='outlined' onClick={handleAllPresent}>
              All Present
            </StyledButton>
            <StyledButton variant='outlined' onClick={handleAttendance}>
              Submit Attendance
            </StyledButton>
            <StyledButton variant='outlined' onClick={handleClearAttendance}>
              Clear All
            </StyledButton>
          </Box>
        </Box>
        </Box>
      </CardWrapper>
    );
  } else if (isError) {
    content = <Error error={error} />;
  }
  return content;
};
