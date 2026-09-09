import { useEffect, useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AppRouter } from './routes/AppRouter';
import { ThemeProvider } from './hooks/useTheme';
import { SettingsProvider } from './hooks/useSettings';
import { hydrateDatasetStore } from './services/datasetStore';

export default function App() {
  const [ready, setReady] = useState(false);
  useEffect(() => { void hydrateDatasetStore().finally(() => setReady(true)); }, []);
  return <SettingsProvider><ThemeProvider><BrowserRouter>{ready ? <AppRouter/> : <div className="flex h-screen items-center justify-center bg-slate-50 text-sm text-slate-500">Loading MPLADS workspace…</div>}</BrowserRouter></ThemeProvider></SettingsProvider>;
}
