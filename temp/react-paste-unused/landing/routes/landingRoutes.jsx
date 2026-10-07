import React from 'react';

/**
 * Landing feature route table (kept for feature-MVC discovery).
 * AppRouter lazy-loads MarketingLandingPage for `/` and ValidateUrlPage for `/validateurl`.
 */
export const landingRoutePaths = ['/', '/validateurl', '/validateurl/:client'];

export { default as MarketingLandingPage } from '../pages/MarketingLandingPage.jsx';
export { default as ValidateUrlPage } from '../pages/ValidateUrlPage.jsx';
export const loadLandingUI = () => import('../pages/LandingUI.jsx');
