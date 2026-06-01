/* eslint-disable react-refresh/only-export-components */
import { StrictMode, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import { dark } from '@clerk/themes'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.jsx'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
  throw new Error("Missing Publishable Key")
}

function ClerkProviderWithTheme({ children }) {
  const [isDark, setIsDark] = useState(() => {
    return document.documentElement.classList.contains('dark');
  });

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return (
    <ClerkProvider
      publishableKey={PUBLISHABLE_KEY}
      afterSignOutUrl="/"
      appearance={{
        baseTheme: isDark ? dark : undefined,
        variables: {
          colorPrimary: 'hsl(215, 90%, 55%)', /* Our primary color approx */
          colorBackground: 'var(--surface-container-lowest)',
          colorInputBackground: 'var(--surface)',
          colorText: 'var(--on-surface)',
          colorTextSecondary: 'var(--on-surface-variant)',
          colorDanger: 'var(--error)',
          fontFamily: 'Inter, sans-serif'
        },
        elements: {
          card: 'shadow-2xl rounded-2xl border border-[var(--outline-variant)]',
          userPreviewMainIdentifier: 'font-bold font-display',
        }
      }}
    >
      {children}
    </ClerkProvider>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ClerkProviderWithTheme>
      <BrowserRouter>
        <Routes>
          <Route path="/*" element={<App />} />
        </Routes>
      </BrowserRouter>
    </ClerkProviderWithTheme>
  </StrictMode>,
)
