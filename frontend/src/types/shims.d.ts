// Lightweight shims for dev/test dependencies and JSON imports
// These help the TS compiler in environments where node_modules aren't installed
declare module 'vitest';
declare module '@testing-library/react';
declare module '@testing-library/user-event';
declare module 'i18next';
declare module 'react-i18next';
declare module 'react-aria';
declare module '*.json';
