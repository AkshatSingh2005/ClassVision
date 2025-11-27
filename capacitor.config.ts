import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.akshat.studentteacher',
  appName: 'student_teacher_dashboard',
  webDir: 'build',
  server: {
    url: 'https://student-teacher-admin-dashboard-app.netlify.app',
    cleartext: true
  }
};


export default config;
