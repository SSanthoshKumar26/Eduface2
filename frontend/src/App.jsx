import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import { ClerkProvider } from "@clerk/clerk-react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import ContentGen from "./components/ContentGen";
import VideoGen from "./components/VideoGenerator";
import PPTGenerator from "./components/PPTGenerator";
import ProtectedRoute from "./components/ProtectedRoutes";  // Fixed path
import "./App.css";
import "./styles/theme.css";

function App() {
  const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

  return (
    <ClerkProvider publishableKey={clerkPubKey}>
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
            <Route
              path="/content-gen"
              element={
                <ProtectedRoute>
                  <ContentGen />
                </ProtectedRoute>
              }
            />
            <Route
              path="/video-gen"
              element={
                <ProtectedRoute>
                  <VideoGen />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ppt-generator"
              element={
                <ProtectedRoute>
                  <PPTGenerator />
                </ProtectedRoute>
              }
            />
          </Routes>
        </Router>
      </ThemeProvider>
    </ClerkProvider>
  );
}

export default App;