import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import Home from "./pages/Home.jsx";
import ContentGen from "./components/ContentGen.jsx";
import PPTGenerator from "./components/PPTGenerator.jsx";
import VideoGenerator from "./components/VideoGenerator.jsx";

export default function App() {
  return (
    <Router>
      <Navbar />
      <div className="container py-3">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/content-gen" element={<ContentGen />} />
          <Route path="/ppt-generator" element={<PPTGenerator />} />
          <Route path="/video-generator" element={<VideoGenerator />} />
        </Routes>
      </div>
    </Router>
  );
}