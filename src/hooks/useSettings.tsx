import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
export type ThemeMode = 'light' | 'dark' | 'system';
export type Density = 'comfortable' | 'compact';
export type FontScale = 'small' | 'normal' | 'large';
export interface AppSettings {
  theme: ThemeMode; density: Density; fontScale: FontScale;
  duplicateStrongThreshold: number; duplicatePotentialThreshold: number; duplicateAmountTolerance: number;
  maxRowsPerTable: number; autoRefresh: boolean; refreshIntervalMinutes: number; desktopNotifications: boolean;
  apiBaseUrl: string; localProcessingOnly: boolean;
}
export const defaultSettings: AppSettings = {
  theme:'light', density:'comfortable', fontScale:'normal', duplicateStrongThreshold:70,
  duplicatePotentialThreshold:50, duplicateAmountTolerance:10, maxRowsPerTable:100,
  autoRefresh:false, refreshIntervalMinutes:15, desktopNotifications:false,
  apiBaseUrl:import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000', localProcessingOnly:true,
};
const KEY='mplads-app-settings';
function readSettings():AppSettings { try { return {...defaultSettings,...JSON.parse(localStorage.getItem(KEY)||'{}')}; } catch { return defaultSettings; } }
interface SettingsContextValue { settings:AppSettings; updateSettings:(patch:Partial<AppSettings>)=>void; resetSettings:()=>void; }
const Ctx=createContext<SettingsContextValue|null>(null);
export function SettingsProvider({children}:{children:ReactNode}){
 const [settings,setSettings]=useState<AppSettings>(readSettings);
 useEffect(()=>{localStorage.setItem(KEY,JSON.stringify(settings)); document.documentElement.dataset.density=settings.density; document.documentElement.dataset.fontScale=settings.fontScale;},[settings]);
 const value=useMemo(()=>({settings,updateSettings:(patch:Partial<AppSettings>)=>setSettings(p=>({...p,...patch})),resetSettings:()=>setSettings(defaultSettings)}),[settings]);
 return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export const useSettings=()=>{const c=useContext(Ctx);if(!c)throw new Error('useSettings must be used inside SettingsProvider');return c;};
