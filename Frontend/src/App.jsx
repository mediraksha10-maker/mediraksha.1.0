// utility imports
import { useState, useEffect } from "react";
import { Toaster } from 'react-hot-toast';
import { Route, Routes } from 'react-router';

// splash screen
import Splash from './components/Splash';

// page imports
import Dashboard from './pages/DashBoard';
import Auth from './pages/Auth';
import About from "./pages/About";
import MyPatient from './pages/MyPatient';
import DetailConfirmation from './pages/DetailConfirmation'
import DoctorAuth from './pages/DoctorAuth';
import DoctorDash from './pages/DoctorDash';
import DoctorAvailability from './pages/DoctorAvailability';
import BedAvailability from './pages/BedAvailability';
import DoctorDetails from './pages/DoctorDetail';
import Service from "./pages/Service";

// component imports
import Upload from './components/Upload'
import MyDetail from './components/MyDet';
import Map from './components/MapComponent'
import HealthSummary from './components/HealthSummary';
import AppointmentCalendar from './components/Appointment';
import Chatbot from './components/Chatbot';
import DoctorDet from './components/DoctorDet'
import MyDoctor from './components/MyDoctor';



export default function App() {

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return <Splash />;
  }
  

  return (
    <div>
      <Toaster />
      <Routes>
        {/* Define routes for the application */}
        <Route path="/" element={<Dashboard />} />
        <Route path="/auth" element={<Auth />} />
        <Route path='/details' element={<DetailConfirmation />} />
        <Route path='/detail' element={<MyDetail />} />
        <Route path='/upload' element={<Upload />} />
        <Route path='/map' element={<Map />} />
        <Route path='/about' element={<About />} />
        <Route path='/mydoctor' element={<MyDoctor />} />
        <Route path='/appointment' element={<AppointmentCalendar />} />
        <Route path='/ai' element={<Chatbot />} />
        <Route path='/bedavailable' element={<BedAvailability />} />
        <Route path='/history' element={<HealthSummary/>} />
        <Route path='/services' element={<Service/>} />
        

        {/* Doctor related routes */}
        <Route path='/doctor' element={<DoctorAuth />} />
        <Route path='/doctordash' element={<DoctorDash />} />
        <Route path='/doctoravailable' element={<DoctorAvailability />} />
        <Route path='/doctordetail' element={<DoctorDetails />} />
        <Route path='/doctorprofile' element={<DoctorDet />} />
        <Route path='/patients' element={<MyPatient />} />
        
      </Routes>
    </div>
  );
}

