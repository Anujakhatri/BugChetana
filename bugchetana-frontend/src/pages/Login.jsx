import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, Lock } from 'lucide-react';
import InputField from '@/components/shared/InputField.jsx';
import OAuthButtons from '@/components/shared/OAuthButtons.jsx';
import { loginUser } from "@/api/authService.js";
import { useAuth } from "@/context/AuthContext.jsx";

function extractLockoutMinutes(message) {
  const match = message?.match(/(\d+)\s*minute/i);
  return match ? parseInt(match[1], 10) : null;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getEmailValidationError(value) {
  if (!value.trim()) return '';
  return EMAIL_REGEX.test(value.trim()) ? '' : 'Please enter a valid email address.';
}

export default function Login() {
  // backend connection ko lagi chaini
  const { setUser } = useAuth();  //global user set garna
  const navigate = useNavigate();  //login pachi redirect
  const [searchParams] = useSearchParams();
  const [error, setError] = useState(""); //backend ko error.txt dekhauna
  //yo input components haru backend ma pathaincha
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);

  // Lockout state
  const [lockedUntil, setLockedUntil] = useState(null); // Date object or null
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!lockedUntil) return;

    const tick = () => {
      const secondsLeft = Math.max(0, Math.round((lockedUntil - new Date()) / 1000));
      setRemainingSeconds(secondsLeft);
      if (secondsLeft <= 0) {
        setLockedUntil(null);
        setError("");
        clearInterval(intervalRef.current);
      }
    };

    tick();
    intervalRef.current = setInterval(tick, 1000);
    return () => clearInterval(intervalRef.current);
  }, [lockedUntil]);

  const isLocked = lockedUntil !== null && remainingSeconds > 0;

  const formatCountdown = (totalSeconds) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLocked) return;

    const validationError = getEmailValidationError(email);
    if (validationError) {
      setEmailTouched(true);
      setEmailError(validationError);
      return;
    }

    {/* ui ma actual backend ko data lyaune */ }
    try {
      // Step 1: Backend ma POST request
      const { data } = await loginUser({ email, password });
      //Step 2: Backend le diyeko tokens save garcha (per-tab session)
      sessionStorage.setItem("access", data.tokens.access);
      sessionStorage.setItem("refresh", data.tokens.refresh);
      //Step 3: Global state ma user rakhcha
      setUser(data.user);
      //step 4: Redirect — honour ?next= (set by ProtectedRoute when an
      // unauthenticated user tried to visit a protected page). The
      // startsWith("/") + !startsWith("//") check blocks open-redirect
      // attempts like ?next=https://evil.com.
      const next = searchParams.get("next");
      const safeNext = next && next.startsWith("/") && !next.startsWith("//")
        ? next
        : "/dashboard";
      navigate(safeNext);
    } catch (err) {
      const data = err.response?.data;

      if (typeof data === "string" && data.toLowerCase().includes("<html")) {
        console.error("Server Error:", data);
        setError("An unexpected server error.txt occurred. Please try again later.");
        return;
      }
      const message = data?.detail || (typeof data === "string" ? data : "Login failed.");
      setError(message);
      // Detect a lockout response and start the countdown
      const minutes = extractLockoutMinutes(message);
      if (message.toLowerCase().includes("Locked") && minutes){
        setLockedUntil(new Date(Date.now() + minutes * 60 * 1000));
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white shadow-sm p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">bugchetana</h1>
          <p className="text-sm text-gray-500 mt-2">Welcome back! Please enter your details.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1 w-full">
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailTouched) {
                  setEmailError(getEmailValidationError(e.target.value));
                }
              }}
              onBlur={() => {
                setEmailTouched(true);
                setEmailError(getEmailValidationError(email));
              }}
              placeholder="Enter your email"
              required
              disabled={isLocked}
              className="border border-gray-200 rounded-lg py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 px-4"
            />
            {emailError && (
              <p className="text-sm text-red-500">{emailError}</p>
            )}
          </div>

          <InputField
            label="Password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            required
            disabled={isLocked}
            rightElement={
              <button
                type="button"
                className="text-gray-400 hover:text-gray-600 focus:outline-none"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLocked}
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

          {isLocked ? (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg px-3 py-2.5">
              <Lock className="h-4 w-4 shrink-0" />
              <span>
                Account temporarily locked. Try again in{' '}
                <span className="font-semibold tabular-nums">{formatCountdown(remainingSeconds)}</span>.
              </span>
            </div>
          ) : error ? (
             <p className="text-sm text-red-500 text-center">{error}</p>
          ) : null}

          <button
            type="submit"
            className="w-full h-11 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
          >
            {isLocked ? 'Locked' : 'Log in'}
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
