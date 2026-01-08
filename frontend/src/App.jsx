import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import ContentGen from "./components/ContentGen";
import VideoGen from "../src/components/VideoGenerator";
import PPTGenerator from "../src/components/PPTGenerator";
import "./App.css";
import "./styles/theme.css";

function App() {
  return (
    <ThemeProvider>
      <Router>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/content-gen" element={<ContentGen />} />
          <Route path="/video-gen" element={<VideoGen />} />
          <Route path="/ppt-generator" element={<PPTGenerator />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;