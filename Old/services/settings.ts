
import { AppSettings } from '../types';
import { fetchSettingsFromUpstash, saveSettingsToUpstash } from './kv';

const LOCAL_SETTINGS_KEY = 'med_russia_local_settings';

export const DEFAULT_SETTINGS: AppSettings = {
  currencyConverter: { enabled: false, apiKey: '' },
  groqAI: { enabled: false, apiKey: '', model: 'llama-3.3-70b-versatile' },
  // These are now handled server-side, but kept in type definition for Admin UI toggle visibility if needed
  emailJs: { enabled: true, serviceId: '', templateId: '', publicKey: '' },
  cloudinary: { cloudName: '', uploadPreset: '' },
  chatBot: { 
    enabled: false, 
    botName: 'Dr. MedRussia', 
    welcomeMessage: 'Hello! I can help you with questions about MBBS fees, universities, and admission. Ask me anything!' 
  },
  features: {
    eligibilityCheck: true,
    universityCompare: true,
    chatWidget: true,
    whatsappFab: true,
    studentLogin: true
  }
};

export const getSettings = async (): Promise<AppSettings> => {
  // 1. Try Cloud (Upstash) - Primary Source for Admin Overrides
  let cloudSettings = DEFAULT_SETTINGS;
  try {
    const fetched = await fetchSettingsFromUpstash();
    cloudSettings = {
        ...DEFAULT_SETTINGS,
        ...fetched,
        features: { ...DEFAULT_SETTINGS.features, ...(fetched.features || {}) }
    };
  } catch (error) {
    console.warn("Failed to fetch cloud settings, using defaults:", error);
    // Fallback to local storage if cloud fails
    const local = localStorage.getItem(LOCAL_SETTINGS_KEY);
    if (local) {
        try {
            const parsed = JSON.parse(local);
            cloudSettings = { ...DEFAULT_SETTINGS, ...parsed, features: { ...DEFAULT_SETTINGS.features, ...(parsed.features || {}) } };
        } catch (e) {}
    }
  }

  // 2. Return Settings
  // Note: We no longer fetch or merge sensitive API keys from the server to the client.
  // The client simply flags features as enabled/disabled based on Upstash, 
  // but the actual keys reside in process.env on the server.
  
  const finalSettings: AppSettings = {
      ...cloudSettings,
      // Ensure we don't accidentally expose empty strings that might overwrite logic if we were using client-side SDKs.
      // Now that we use server proxies, the client-side 'enabled' flag is mostly for UI state.
      emailJs: {
          ...cloudSettings.emailJs,
          // Force enabled true for UI if we assume server envs are set, 
          // or rely on Admin Dashboard toggle. 
          enabled: cloudSettings.emailJs?.enabled ?? true 
      }
  };

  // Cache final result to local for sync reference
  localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(finalSettings));
  
  return finalSettings;
};

export const saveSettings = async (settings: AppSettings): Promise<boolean> => {
  try {
    // 1. Save Local
    localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(settings));

    // 2. Save Cloud (Sync)
    await saveSettingsToUpstash(settings);
    return true;
  } catch (error) {
    console.warn("Failed to save settings to cloud (local only):", error);
    return true;
  }
};
