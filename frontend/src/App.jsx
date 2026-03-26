import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import ContentGen from "./components/ContentGen";
import VideoGen from "./components/VideoGenerator";
import PPTGenerator from "./components/PPTGenerator";
import "./App.css";
import "./styles/theme.css";

function App() {
  return (
    <ThemeProvider>
      <Router>
        <Navbar />
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="colored"
        />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/content-gen" element={<ContentGen />} />
          <Route path="/video-gen" element={<VideoGen />} />
          <Route path="/video-generator" element={<VideoGen />} />
          <Route path="/ppt-generator" element={<PPTGenerator />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;