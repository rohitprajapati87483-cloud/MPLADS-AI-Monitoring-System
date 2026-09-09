import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { ThemeMode } from './useSettings';
interface ThemeContextValue { theme:ThemeMode; setTheme:(theme:ThemeMode)=>void; toggleTheme:()=>void; }
const Ctx=createContext<ThemeContextValue>({theme:'light',setTheme:()=>{},toggleTheme:()=>{}});
const resolve=(m:ThemeMode):'light'|'dark'=>m==='system'?(window.matchMedia?.('(prefers-color-scheme: dark)').matches?'dark':'light'):m;
export function ThemeProvider({children}:{children:ReactNode}){
 const [theme,setTheme]=useState<ThemeMode>(()=>{try{const s=JSON.parse(localStorage.getItem('mplads-app-settings')||'{}');return s.theme||localStorage.getItem('mplads-theme')||'light';}catch{return 'light';}});
 useEffect(()=>{const apply=()=>{const r=resolve(theme);document.documentElement.classList.toggle('dark',r==='dark');document.documentElement.style.colorScheme=r;};apply();localStorage.setItem('mplads-theme',theme);try{const s=JSON.parse(localStorage.getItem('mplads-app-settings')||'{}');localStorage.setItem('mplads-app-settings',JSON.stringify({...s,theme}));}catch{} if(theme==='system'){const m=window.matchMedia('(prefers-color-scheme: dark)');m.addEventListener?.('change',apply);return()=>m.removeEventListener?.('change',apply);}},[theme]);
 const value=useMemo(()=>({theme,setTheme,toggleTheme:()=>setTheme(t=>t==='dark'?'light':'dark')}),[theme]); return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export const useTheme=()=>useContext(Ctx);
