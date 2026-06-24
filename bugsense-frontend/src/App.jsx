import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Homepage from './pages/HomePage.jsx';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Homepage />} />
        <Route path="/login" element={<div className="p-8 text-center mt-20 text-xl font-medium">Login Page Coming Soon</div>} />
        <Route path="/register" element={<div className="p-8 text-center mt-20 text-xl font-medium">Register Page Coming Soon</div>} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
