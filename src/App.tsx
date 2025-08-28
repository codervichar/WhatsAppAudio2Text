import React from 'react'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { AuthProvider } from './context/AuthContext'
import Header from './components/Header'
import Footer from './components/Footer'
import ProtectedRoute from './components/ProtectedRoute'
import PublicRoute from './components/PublicRoute'
import Home from './pages/Home'
import Signup from './pages/Signup'
import Signin from './pages/Signin'
import ForgotPassword from './pages/ForgotPassword'
import Pricing from './pages/Pricing'
import BlogList from './pages/BlogList'
import BlogPost from './pages/BlogPost'
import Dashboard from './pages/Dashboard'
import Welcome from './pages/Welcome'
import TranscriptionHistory from './pages/TranscriptionHistory'
import UpdateProfile from './pages/UpdateProfile'
import SubscriptionSuccess from './pages/SubscriptionSuccess'
import SubscriptionCancel from './pages/SubscriptionCancel'
import SubscriptionManagement from './pages/SubscriptionManagement'
import NotFound from './pages/NotFound'

function App() {
  return (
    <HelmetProvider>
      <AuthProvider>
        <Router>
          <div className="flex flex-col min-h-screen gradient-bg">
            <Header />
            <main className="flex-grow pt-16">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route 
                  path="/signup" 
                  element={
                    <PublicRoute restricted={true}>
                      <Signup />
                    </PublicRoute>
                  } 
                />
                <Route 
                  path="/signin" 
                  element={
                    <PublicRoute restricted={true}>
                      <Signin />
                    </PublicRoute>
                  } 
                />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/blog" element={<BlogList />} />
                <Route path="/blog/:id" element={<BlogPost />} />
                <Route 
                  path="/dashboard" 
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/welcome" 
                  element={
                    <ProtectedRoute>
                      <Welcome />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/transcription-history" 
                  element={
                    <ProtectedRoute>
                      <TranscriptionHistory />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/update-profile" 
                  element={
                    <ProtectedRoute>
                      <UpdateProfile />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/subscription/success" 
                  element={
                    <ProtectedRoute>
                      <SubscriptionSuccess />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/subscription/cancel" 
                  element={
                    <ProtectedRoute>
                      <SubscriptionCancel />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/subscription-details" 
                  element={
                    <ProtectedRoute>
                      <SubscriptionManagement />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="*" 
                  element={<NotFound />} 
                />
              </Routes>
            </main>
            <Footer />
          </div>
        </Router>
      </AuthProvider>
    </HelmetProvider>
  )
}

export default App