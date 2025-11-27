import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import * as yup from 'yup';
import { useFormik } from 'formik';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Box, Button, TextField, Typography } from '@mui/material';
import styled from '@emotion/styled';

import { useAddStudentMutation } from '../teachersApiSlice';
import Loading from '../../../Components/Loading';
import { CardWrapper } from '../../../Components/CardWrapper';

import { addStudentParallel } from '../../ParallelBackend/parallelBackendApi';
import * as faceapi from 'face-api.js';
import axios from 'axios';


async function getFaceDescriptor(imageFile) {
  const MODEL_URL = '/models';
  await Promise.all([
    faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
  ]);
  const img = await faceapi.bufferToImage(imageFile);
  const result = await faceapi
    .detectSingleFace(img)
    .withFaceLandmarks()
    .withFaceDescriptor();
  if (!result) {
    console.log('No face detected!');
    return null;
  }
  return Array.from(result.descriptor);
}

const ValidationSchema = yup.object({
  id: yup.string().min(0, 'Invalid Roll Number').required('Please provide the Roll Number'),
  name: yup.string().min(4, 'Please provide fullName').required('Please provide the full-name of the student'),
  gender: yup.string().min(4, 'Please specify gender').required('Please enter the gender of the student'),
  guardianName: yup.string().min(4, 'Please enter the Name').required('Please enter the name of the guardian of the student'),
  contactInfo: yup.number().min(10, 'Invalid Phone Number').required('Please fill the contact number of the guardian of the student'),
});

const StyledTypography = styled(Typography)(() => ({
  color: 'red',
}));

export const AddStudent = () => {
  const { classId } = useParams();
  const [addStudent, { isLoading }] = useAddStudentMutation();
  const [selfie, setSelfie] = useState(null);

  // Add student data with face descriptor (JSON only)
  const AddSdata = async (data) => {
  try {
    if (!selfie) {
      toast.error('Please upload a selfie for face registration.');
      console.log("No selfie uploaded");
      return;
    }
    console.log("Selfie chosen");

    const descriptor = await getFaceDescriptor(selfie);
    if (!descriptor) {
      toast.error('No face detected in selfie. Please try again with a clearer photo.');
      console.log("No descriptor extracted");
      return;
    }
    console.log("Descriptor extracted:", descriptor);

    const payload = {
      ...data,
      classId,
      faceDescriptor: descriptor,
    };

    console.log("Payload about to POST:", payload);

    const mainPayload = { ...data ,  classId };

    await addStudent({ classId, data: mainPayload })
      .unwrap()
      .then((response) => toast.success(response.message))
      .catch((error) => {
        const errorMessage =
          error?.error?.message ||
          error?.data?.error?.message ||
          'An error occurred.';
        toast.error(errorMessage);
      });


    await axios.post('http://10.219.78.147:5050/students', payload)
      .then((response) => {
        console.log("POST response", response.data);
        toast.success(response.data.message);
      })
      .catch((error) => {
        console.error("POST error", error);
        toast.error(error.response?.data?.message || 'An error occurred');
      });
  } catch (err) {
    console.error('Add student with face descriptor failed (full error):', err);
    toast.error('JS error: ' + err.message);
  }
};


  const formik = useFormik({
    initialValues: {
      id: '',
      name: '',
      gender: '',
      guardianName: '',
      contactInfo: '',
    },
    validationSchema: ValidationSchema,
    onSubmit: (values) => {
      AddSdata(values);
    },
  });

  return (
    <CardWrapper title="Add Student">
      <ToastContainer />
      {isLoading ? (
        <Loading open={isLoading} />
      ) : (
        <Box
          component="form"
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            marginBottom: '30px',
          }}
          onSubmit={formik.handleSubmit}
        >
          <input type="file" accept="image/*" onChange={(e) => setSelfie(e.target.files[0])} />

          <TextField
            id="id"
            name="id"
            value={formik.values.id}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.id && Boolean(formik.errors.id)}
            label="Roll No."
          />
          <StyledTypography>{formik.touched.id && formik.errors.id ? formik.errors.id : ''}</StyledTypography>

          <TextField
            id="name"
            name="name"
            value={formik.values.name}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.name && Boolean(formik.errors.name)}
            label="Name"
          />
          <StyledTypography>{formik.touched.name && formik.errors.name ? formik.errors.name : ''}</StyledTypography>

          <TextField
            id="gender"
            name="gender"
            value={formik.values.gender}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.gender && Boolean(formik.errors.gender)}
            label="Gender"
          />
          <StyledTypography>{formik.touched.gender && formik.errors.gender ? formik.errors.gender : ''}</StyledTypography>

          <TextField
            id="guardianName"
            name="guardianName"
            value={formik.values.guardianName}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.guardianName && Boolean(formik.errors.guardianName)}
            label="Guardian Name"
          />
          <StyledTypography>{formik.touched.guardianName && formik.errors.guardianName ? formik.errors.guardianName : ''}</StyledTypography>

          <TextField
            id="contactInfo"
            name="contactInfo"
            value={formik.values.contactInfo}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.contactInfo && Boolean(formik.errors.contactInfo)}
            label="Contact Info"
          />
          <StyledTypography>
            {formik.touched.contactInfo && formik.errors.contactInfo ? formik.errors.contactInfo : ''}
          </StyledTypography>

          <Button
            variant="outlined"
            sx={{ color: '#4e73df', fontWeight: '600' }}
            type="submit"
            disabled={formik.isSubmitting}
          >
            Add Student
          </Button>
        </Box>
      )}
    </CardWrapper>
  );
};
