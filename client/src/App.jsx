import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import Home from "./pages/home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Readings from "./pages/Readings";
import Medications from "./pages/Medications.jsx";
import Plan from "./pages/Plan.jsx";
import Assistant from "./pages/Assistant.jsx";

export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home/>} />
        <Route path="/login" element={<Login/>} />
        <Route path="/register" element={<Register/>} />
        <Route path="/medications" element={
          <ProtectedRoute><Medications/></ProtectedRoute>
        } />
        <Route path="/plan" element={<Plan />} />
         <Route path="/assistant" element={<Assistant />} />

        <Route path="/dashboard" element={
          <ProtectedRoute><Dashboard/></ProtectedRoute>
        } />
        <Route path="/readings" element={
          <ProtectedRoute><Readings/></ProtectedRoute>
        } />

        <Route path="*" element={<Home/>} />
      </Routes>
    </>
  );
}
