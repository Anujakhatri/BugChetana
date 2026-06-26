import React, { useState } from 'react';
import {useNavigate} from "react-router-dom";
import { Eye, EyeOff } from 'lucide-react';
import InputField from '@/components/shared/InputField.jsx';
import OAuthButtons from '@/components/shared/OAuthButtons.jsx';
import {loginUser} from "@/api/authService.js";
import {useAuth} from "@/context/AuthContext.jsx";

export default function Login() {
  // backend connection ko lagi chaini
  const { setUser } = useAuth();  //global user set garna
  const navigate = useNavigate();  //login pachi redirect
  const [error, setError] = useState(""); //backend ko error dekhauna
  //yo input components haru backend ma pathaincha
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    {/* ui ma actual backend ko data lyaune */}
    try{
      // Step 1: Backend ma POST request
      const { data } = await loginUser({email, password});
      //Step 2: Backend le diyeko tokens save garcha
      localStorage.setItem("access", data.tokens.access);
      localStorage.setItem("refresh", data.tokens.refresh);
      //Step 3: Global state ma user rakhcha
      setUser(data.user);
      //step 4: Redirect
      navigate("/dashboard");
    } catch (err) {
      const data = err.response?.data;
      if (typeof data === "string" && data.toLowerCase().includes("<html")) {
        console.error("Server Error:", data);
        setError("An unexpected server error occurred. Please try again later.");
      } else {
        setError(data?.detail || (typeof data === "string" ? data : "Login failed."));
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white shadow-sm p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">BugSense</h1>
          <p className="text-sm text-gray-500 mt-2">Welcome back! Please enter your details.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <InputField 
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            required
          />

          <InputField 
            label="Password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            required
            rightElement={
              <button 
                type="button"
                className="text-gray-400 hover:text-gray-600 focus:outline-none"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            }
          />

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600" 
              />
              <span className="text-sm text-gray-600">Remember me</span>
            </label>
            <a href="#" className="text-sm font-medium text-blue-600 hover:text-blue-700">
              Forgot password?
            </a>
          </div>

          {/* error message */}
          {error && (
              <p className="text-sm text-red-500 text-center">{error}</p>
          )}

          <button 
            type="submit"
            className="w-full h-11 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
          >
            Log in
          </button>
        </form>

        <div className="mt-8 relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">or continue with</span>
          </div>
        </div>

        <OAuthButtons action="Sign in" />

        <p className="mt-8 text-center text-sm text-gray-600">
          Don't have an account?{' '}
          <a href="/register" className="font-medium text-blue-600 hover:text-blue-700">
            Register
          </a>
        </p>
      </div>
    </div>
  );
}
