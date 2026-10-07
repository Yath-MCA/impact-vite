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
      className="login-page tw:min-h-screen tw:flex tw:items-center tw:justify-center tw:px-4 tw:bg-slate-50"
      style={{
        backgroundImage: `linear-gradient(180deg, rgba(248,250,252,0.92), rgba(248,250,252,0.96)), url(${BRANDING.companyLogo})`,
        backgroundSize: 'cover, 40em',
        backgroundPosition: 'center, center',
        backgroundRepeat: 'no-repeat, no-repeat',
      }}
    >
      <div className="tw:bg-white tw:p-8 tw:rounded-xl tw:shadow-lg tw:w-full tw:max-w-md tw:border tw:border-orange-100">
        <div className="tw:text-center tw:mb-8">
          <div className="tw:mb-4 tw:flex tw:items-center tw:justify-center tw:gap-3">
            <img
              src={BRANDING.productIcon}
              alt="IMPACT"
              data-brand="login-logo"
              className="tw:h-8 tw:w-auto"
              loading="lazy"
            />
            <span className="tw:text-2xl tw:font-bold tw:tracking-tight tw:text-slate-900">
              {BRANDING.productName}
            </span>
          </div>
          <h1 className="tw:text-xl tw:font-semibold tw:text-slate-800 tw:mb-2">Sign in</h1>
          {/* <p className="tw:text-slate-600 tw:text-sm">Access your IMPACT account</p> */}
        </div>

        {(error || localError) && (
          <div className="tw:mb-4 tw:p-3 tw:bg-red-100 tw:border tw:border-red-400 tw:text-red-700 tw:rounded" role="alert">
            {error || localError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="tw:space-y-6">
          <div>
            <label htmlFor="email" className="tw:block tw:text-sm tw:font-medium tw:text-slate-700 tw:mb-1">
              Email
            </label>
            <input
              type="text"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="tw:w-full tw:px-4 tw:py-2 tw:border tw:border-slate-300 tw:rounded-lg! tw:focus:ring-2 tw:focus:ring-primary tw:focus:border-transparent"
              placeholder="Enter your email"
              disabled={loading}
              autoComplete="username"
            />
          </div>

          <div>
            <label htmlFor="password" className="tw:block tw:text-sm tw:font-medium tw:text-slate-700 tw:mb-1">
              Password
            </label>
            <div className="tw:relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="tw:w-full tw:pr-10 tw:px-4 tw:py-2 tw:border tw:border-slate-300 tw:rounded-lg! tw:focus:ring-2 tw:focus:ring-primary tw:focus:border-transparent"
                placeholder="Enter your password"
                disabled={loading}
                autoComplete="current-password"
              />

              <a
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                disabled={loading}
                className="tw:absolute tw:right-3 tw:top-1/2 tw:-translate-y-1/2 tw:text-slate-500 tw:hover:text-slate-700 tw:transition-colors"
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="tw:h-5 tw:w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.97 10.97 0 0 1 12 20c-5 0-9.27-3-11-7 1.02-2.36 2.8-4.32 4.91-5.61" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M1 1l22 22" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="tw:h-5 tw:w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </a>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="tw:inline-flex tw:w-full tw:items-center tw:justify-center tw:py-2.5 tw:px-5 tw:bg-primary tw:hover:bg-primary-dark tw:text-white tw:font-semibold tw:rounded-md tw:overflow-hidden tw:focus:outline-none tw:focus:ring-2 tw:focus:ring-primary tw:focus:ring-offset-2 tw:disabled:opacity-50 tw:disabled:cursor-not-allowed tw:transition-colors"
          >
            {loading ? (
              <span className="tw:flex tw:items-center tw:justify-center">
                <svg className="tw:animate-spin tw:-ml-1 tw:mr-3 tw:h-5 tw:w-5 tw:text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="tw:opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="tw:opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Signing in...
              </span>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="tw:mt-6 tw:text-center">
          <p className="tw:text-sm tw:text-slate-600">Contact your administrator for access</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
