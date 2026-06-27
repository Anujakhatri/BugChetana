import React, { useState } from 'react';
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from 'lucide-react';
import InputField from '@/components/shared/InputField.jsx';
import OAuthButtons from '@/components/shared/OAuthButtons.jsx';
import { registerUser } from "@/api/authService.js";

export default function Register() {
  //added variable required to backend
  const navigate = useNavigate();
  const [error, setError] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    //Step 1: Frontend validation check before sent to backend
    if (!agreeTerms) {
      setError("Please agree to the Terms of Service and Privacy Policy.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don not match.");
      return;       //api call hudaina
    }

    try {
      // Step 2: Backend ma POST
      await registerUser({
        name: fullName,
        email: email,
        username: email.split('@')[0],
        password: password,
        password2: confirmPassword
      });
      // Step 3: Register complete, redirect to login page
      navigate("/login");
    } catch (err) {
      const data = err.response?.data;
      if (data && typeof data === "object" && !Array.isArray(data)) {
        // DRF le { email: ["already exists"] } format ma pathaucha
        const firstError = Object.values(data)[0];
        setError(Array.isArray(firstError) ? firstError[0] : firstError);
      } else if (typeof data === "string" && data.toLowerCase().includes("<html")) {
        console.error("Server Error:", data);
        setError("An unexpected server error occurred. Please try again later.");
      } else {
        setError(typeof data === "string" ? data : "Registration failed.");
      }
    }
  };

  const getPasswordStrength = (pass) => {
    if (!pass) return { label: 'None', color: 'bg-gray-200', text: 'text-gray-500' };
    if (pass.length < 6) return { label: 'Weak', color: 'bg-red-500', text: 'text-red-500' };
    if (pass.length < 10 || !/\d/.test(pass)) return { label: 'Medium', color: 'bg-yellow-500', text: 'text-yellow-500' };
    return { label: 'Strong', color: 'bg-green-500', text: 'text-green-500' };
  };

  const strength = getPasswordStrength(password);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white shadow-sm p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">BugChetena</h1>
          <p className="text-sm text-gray-500 mt-2">Create an account to get started.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <InputField
            label="Full Name"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Enter your name"
            required
          />

          <InputField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            required
          />

          <div className="space-y-1">
            <InputField
              label="Password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a password"
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
            {password && (
              <div className="flex items-center gap-2 pt-1">
                <div className="flex-1 flex gap-1 h-1.5">
                  <div className={`flex-1 rounded-full ${password.length > 0 ? strength.color : 'bg-gray-200'}`}></div>
                  <div className={`flex-1 rounded-full ${password.length >= 6 && strength.label !== 'Weak' ? strength.color : 'bg-gray-200'}`}></div>
                  <div className={`flex-1 rounded-full ${strength.label === 'Strong' ? strength.color : 'bg-gray-200'}`}></div>
                </div>
                <span className={`text-xs font-medium ${strength.text} w-12 text-right`}>{strength.label}</span>
              </div>
            )}
          </div>

          <InputField
            label="Confirm Password"
            type={showPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm your password"
            required
          />

          <label className="flex items-start gap-2 cursor-pointer mt-4">
            <input
              type="checkbox"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600 shrink-0"
              required
            />
            <span className="text-sm text-gray-600">
              I agree to the Terms of Service and Privacy Policy
            </span>
          </label>

          {/* error message */}
          {error && (
            <p className="text-sm text-red-500 text-center">{error}</p>
          )}
          <button
            type="submit"
            className="w-full h-11 mt-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
          >
            Create account
          </button>
        </form>

        <div className="mt-8 relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">or register with</span>
          </div>
        </div>

        <OAuthButtons action="Register" />

        <p className="mt-8 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <a href="/login" className="font-medium text-blue-600 hover:text-blue-700">
            Login
          </a>
        </p>
      </div>
    </div>
  );
}
