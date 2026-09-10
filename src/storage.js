import { get, set, clear } from 'idb-keyval';

const STORAGE_KEY = 'planning_cpe_data';

// Décodeur intelligent pour éviter le bug de "double-stringify" des anciennes sauvegardes
export const parseLegacy = (key, isArray = true) => {
  try {
    let val = localStorage.getItem(key);
    if (!val) return isArray ? [] : null;
    let parsed = JSON.parse(val);
    if (typeof parsed === 'string') parsed = JSON.parse(parsed); // Double passage pour sécurité
    return parsed;
  } catch(e) { 
    return isArray ? [] : null; 
  }
};

export const loadAppData = async () => {
  try {
    const data = await get(STORAGE_KEY);
    
    // --- MIGRATION AUTOMATIQUE (Depuis localStorage) ---
    const hasLegacyData = !!localStorage.getItem('edt-agents');
    
    if (!data && hasLegacyData) {
      console.log("Migration des données localStorage vers IndexedDB...");
      
      const migratedData = {
        agents: parseLegacy('edt-agents', true),
        postes: parseLegacy('edt-postes', true),
        periodesFeriees: parseLegacy('edt-periodes', true),
        templateVersions: parseLegacy('edt-template-versions', true),
        customWeeks: parseLegacy('edt-custom-weeks', false) || {},
        exceptions: parseLegacy('edt-exceptions', false) || {},
        absences: parseLegacy('edt-absences-retards', true),
        amplitude: parseLegacy('edt-amplitude', false) || { start: '07:30', end: '18:00' },
        sonneries: parseLegacy('edt-sonneries', true).length > 0 ? parseLegacy('edt-sonneries', true) : ['08:00', '08:55', '10:05', '11:00', '11:55', '12:50', '13:45', '14:40', '15:50', '16:45', '17:40'],
        dotation: parseFloat(localStorage.getItem('edt-dotation')) || 0
      };
      
      await set(STORAGE_KEY, migratedData);
      return migratedData;
    }
    
    return data;
  } catch (error) {
    console.error("Erreur IndexedDB", error);
    return null;
  }
};

export const saveAppData = async (data) => {
  try { await set(STORAGE_KEY, data); } catch (error) { console.error(error); }
};

export const clearAppData = async () => {
  try { 
    await clear(); 
    localStorage.clear(); 
  } catch (error) {}
};