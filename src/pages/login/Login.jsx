/**
 * @file Login.jsx
 * @description Login page with authentication
 */

import React, { useState, startTransition } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../middleware/providers/AuthProvider';
import { BRANDING } from '../../config/theme';

const Login = () => {
  const DOMAIN_URL = window.location.href + '';
  const IS_LOCAL_HOST = Boolean(DOMAIN_URL.includes('localhost'));

  const navigate = useNavigate();
  const { login, loading, error } = useAuth();

  const [formData, setFormData] = useState({
    email: IS_LOCAL_HOST ? 'yasar.mohideen@newgen.co' : '',
    password: IS_LOCAL_HOST ? 'Test123' : '',
  });
  const [localError, setLocalError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setLocalError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');

    if (!formData.email || !formData.password) {
      setLocalError('Please enter both email and password');
      return;
    }

    const result = await login(formData);
    if (result.success) {
      startTransition(() => {
        navigate('/dashboard');
      });
    } else {
      setLocalError(result.error || 'Login failed');
    }
  };

  return (
    <div
      className="login-page min-h-screen flex items-center justify-center px-4 bg-slate-50"
      style={{
        backgroundImage: `linear-gradient(180deg, rgba(248,250,252,0.92), rgba(248,250,252,0.96)), url(${BRANDING.companyLogo})`,
        backgroundSize: 'cover, 40em',
        backgroundPosition: 'center, center',
        backgroundRepeat: 'no-repeat, no-repeat',
      }}
    >
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md border border-orange-100">
        <div className="text-center mb-8">
          <div className="mb-4 flex items-center justify-center gap-3">
            <img
              src={BRANDING.productIcon}
              alt="IMPACT"
              data-brand="login-logo"
              className="h-8 w-auto"
              loading="lazy"
            />
            <span className="text-2xl font-bold tracking-tight text-slate-900">
              {BRANDING.productName}
            </span>
          </div>
          <h1 className="text-xl font-semibold text-slate-800 mb-2">Sign in</h1>
          <p className="text-slate-600 text-sm">Access your IMPACT account</p>
        </div>

        {(error || localError) && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded" role="alert">
            {error || localError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
              Email
            </label>
            <input
              type="text"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Enter your email"
              disabled={loading}
              autoComplete="username"
            />
          </div>

          <div className="relative">
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
              Password
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full pr-10 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Enter your password"
              disabled={loading}
              autoComplete="current-password"
            />

            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              disabled={loading}
              className="absolute right-2 top-[2.1rem] text-slate-500 hover:text-slate-700"
            >
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17.94 17.94A10.97 10.97 0 0 1 12 20c-5 0-9.27-3-11-7 1.02-2.36 2.8-4.32 4.91-5.61" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M1 1l22 22" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-primary hover:bg-primary-dark text-white font-semibold rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Signing in...
              </span>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-slate-600">Contact your administrator for access</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
