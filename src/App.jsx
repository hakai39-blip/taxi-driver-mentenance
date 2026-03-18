import React from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import Survey from './components/Survey';
import VideoCheck from './components/VideoCheck';
import MeetingSelection from './components/MeetingSelection';
import ManagerDashboard from './components/ManagerDashboard';
import FinalCheck from './components/FinalCheck';
import Home from './components/Home';
import Settings from './components/Settings';
import ManagerSettings from './components/ManagerSettings';

function App() {
  return (
    <div className="app-container">
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/survey" element={<Survey />} />
        <Route path="/video" element={<VideoCheck />} />
        <Route path="/meeting" element={<MeetingSelection />} />
        <Route path="/manager" element={<ManagerDashboard />} />
        <Route path="/final" element={<FinalCheck />} />
        <Route path="/home" element={<Home />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/manager/settings" element={<ManagerSettings />} />
      </Routes>
    </div>
  );
}

export default App;
