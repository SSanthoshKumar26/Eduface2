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
import QuizSetup from "./components/quiz/QuizSetup";
import QuizAttempt from "./components/quiz/QuizAttempt";
import QuizResult from "./components/quiz/QuizResult";
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
          <Route path="/quiz/setup" element={<QuizSetup />} />
          <Route path="/quiz/attempt" element={<QuizAttempt />} />
          <Route path="/quiz/result" element={<QuizResult />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;