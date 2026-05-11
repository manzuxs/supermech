import { ThemeProvider } from 'next-themes';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { WorkbenchProvider } from './context/WorkbenchContext.tsx';
import './lib/i18n.ts';
import App from './App.tsx';
import './styles.css';

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');
createRoot(root).render(
  <StrictMode>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <WorkbenchProvider>
        <App />
      </WorkbenchProvider>
    </ThemeProvider>
  </StrictMode>,
);
