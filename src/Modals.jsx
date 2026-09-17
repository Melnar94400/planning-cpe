import React, { useState, useEffect, useRef } from 'react';
import { 
  THEMES, getContrastYIQ, extractTimeStr, parseHeureSaisie,
  calculerContratProratise, calculerContratBetty, formatHeureMinutes,
  getJoursFerie
} from './utils';
import { saveAppData } from './storage.js';

const nomsJours = ['DIM', 'LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM'];

// --- COMPOSANT MENU DÉROULANT AVEC COULEUR ---
export const DropdownAvecCouleur = ({ options, value, onChange, placeholder, t }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOpt = options.find(o => String(o.id) === String(value));

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button type="button" onClick={() => setIsOpen(!isOpen)} className={`w-full flex items-center justify-between border ${t.borderLight} rounded p-2 text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm`}>
        <div className="flex items-center gap-2 truncate">
          {selectedOpt ? (
            <>
              {selectedOpt.couleur && <span className="w-3.5 h-3.5 rounded-full shadow-sm shrink-0 border border-black/10" style={{ backgroundColor: selectedOpt.couleur }}></span>}
              <span className="truncate font-bold">{selectedOpt.nom}</span>
            </>
          ) : <span className="text-gray-500">{placeholder}</span>}
        </div>
        <span className="text-xs opacity-50 ml-2">{isOpen ? '▲' : '▼'}</span>
      </button>
      {isOpen && (
        <div className={`absolute z-[99999] w-full mt-1 ${t.cardBg} border ${t.borderLight} rounded-md shadow-2xl max-h-52 overflow-y-auto`}>
          {options.map(opt => (
            <button key={opt.id} type="button" onClick={() => { onChange(opt.id); setIsOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-black/10 dark:hover:bg-white/10 text-left transition-colors`}>
              {opt.couleur && <span className="w-3.5 h-3.5 rounded-full shadow-sm shrink-0 border border-black/10" style={{ backgroundColor: opt.couleur }}></span>}
              <span className="truncate font-bold">{opt.nom}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// --- TOUTES LES MODALES ---

export const ModalPrint = ({ modalPrint, setModalPrint, modeImpression, setModeImpression, setIsPrinting, t }) => {
  if (!modalPrint.isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-[99999] flex items-center justify-center p-4 no-print">
      <div className={`${t.cardBg} rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in duration-200 border ${t.borderLight}`}>
        <div className={`${t.headerBg} ${t.headerText} p-4`}><h3 className="font-bold text-lg">🖨️ Paramètres d'impression</h3></div>
        <div className="p-5 space-y-4">
          {(modalPrint.type === 'planning' || modalPrint.type === 'template') && (
            <div>
              <p className="text-sm font-bold mb-2">Que voulez-vous imprimer ?</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => setModeImpression('global')} className={`flex-1 p-2 border rounded-lg text-xs font-bold transition-all ${modeImpression === 'global' ? 'bg-blue-500 border-blue-600 text-white shadow-sm' : `bg-transparent border-black/20 text-gray-500 hover:${t.bgLight}`}`}>🌍 Équipe complète</button>
                <button type="button" onClick={() => setModeImpression('individuel')} className={`flex-1 p-2 border rounded-lg text-xs font-bold transition-all ${modeImpression === 'individuel' ? 'bg-purple-600 border-purple-700 text-white shadow-sm' : `bg-transparent border-black/20 text-gray-500 hover:${t.bgLight}`}`}>👤 Fiches Individuelles</button>
              </div>
            </div>
          )}
          <div>
            <p className="text-sm font-bold mb-2">Format de la page :</p>
            <select value={modalPrint.format} onChange={e => setModalPrint({...modalPrint, format: e.target.value})} className={`w-full border ${t.borderLight} rounded p-2 text-sm bg-transparent`}>
              <option value="A4">A4 (Classique)</option>
              <option value="A3">A3 (Grand format)</option>
            </select>
          </div>
          <div>
            <p className="text-sm font-bold mb-2">Jours à imprimer (1 jour = 1 page) :</p>
            <div className={`flex flex-col gap-2 border ${t.borderLight} p-3 rounded-lg ${t.bgLight}`}>
              {[1,2,3,4,5].map(d => (
                <label key={d} className={`flex items-center gap-3 cursor-pointer font-bold text-sm hover:opacity-75 ${t.header}`}>
                  <input type="checkbox" className="w-4 h-4 cursor-pointer accent-[#3B82F6]" checked={modalPrint.jours.includes(d)} onChange={e => {
                      const newJours = e.target.checked ? [...modalPrint.jours, d] : modalPrint.jours.filter(j => j !== d);
                      setModalPrint({...modalPrint, jours: newJours.sort()});
                  }} />
                  {['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'][d-1]}
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className={`p-4 ${t.bgLight} border-t ${t.borderLight} flex justify-end gap-3`}>
          <button onClick={() => setModalPrint({...modalPrint, isOpen: false})} className="px-4 py-2 text-gray-500 font-bold hover:bg-black/5 rounded transition">Annuler</button>
          <button onClick={() => {
              setModalPrint({...modalPrint, isOpen: false});
              setIsPrinting(true);
              setTimeout(() => { window.print(); setIsPrinting(false); }, 800);
          }} className={`px-5 py-2 ${t.btnPrimary} rounded font-bold shadow`}>Lancer l'impression</button>
        </div>
      </div>
    </div>
  );
};

export const ModalTemplateProps = ({ modalTemplate, setModalTemplate, validerTemplateModal, templateVersions, t }) => {
  if (!modalTemplate || !modalTemplate.isOpen) return null;
    return (
    <div className="fixed inset-0 bg-black/50 z-[99999] flex items-center justify-center p-4 no-print">
      <div className={`${t.cardBg} rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200 border ${t.borderLight}`}>
        <div className={`${t.headerBg} ${t.headerText} p-4`}><h3 className="font-bold text-lg">{modalTemplate.id ? '⚙️ Propriétés du modèle' : '➕ Nouveau modèle'}</h3></div>
        <form onSubmit={validerTemplateModal}>
          <div className="p-5 space-y-4">
            <div>
              <label className={`block text-sm font-semibold mb-1 ${t.header}`}>Nom du modèle</label>
              <input type="text" required value={modalTemplate.nom} onChange={e => setModalTemplate({...modalTemplate, nom: e.target.value})} placeholder="Ex: Semaine A, Semaine de stage..." className={`w-full border ${t.borderLight} rounded p-2 text-sm bg-transparent font-bold`} />
            </div>

            {!modalTemplate.id && (
              <div>
                <label className={`block text-sm font-semibold mb-1 ${t.header}`}>Copier depuis</label>
                <select value={modalTemplate.baseTemplateId || 'vierge'} onChange={e => setModalTemplate({...modalTemplate, baseTemplateId: e.target.value})} className={`w-full border ${t.borderLight} rounded p-2 text-sm bg-transparent font-bold`}>
                  <option value="vierge">📄 Modèle vierge (Grille vide)</option>
                  <optgroup label="Modèles existants">
                    {(templateVersions || []).map(tv => (
                      <option key={tv.id} value={tv.id}>Copier : {tv.nom}</option>
                    ))}
                  </optgroup>
                </select>
              </div>
            )}
            
            <div className={`p-3 rounded-lg border ${t.borderLight} ${t.bgLight}`}>
              <label className={`block text-sm font-semibold mb-2 ${t.header}`}>Type de modèle</label>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="radio" name="typeModele" value="standard" checked={modalTemplate.typeModele === 'standard'} onChange={() => setModalTemplate({...modalTemplate, typeModele: 'standard'})} className="accent-blue-600" />
                  <div><strong>Standard</strong> <span className="text-gray-500 text-xs">(Se déploie automatiquement)</span></div>
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="radio" name="typeModele" value="ponctuel" checked={modalTemplate.typeModele === 'ponctuel'} onChange={() => setModalTemplate({...modalTemplate, typeModele: 'ponctuel', rythme: 'toutes'})} className="accent-blue-600" />
                  <div><strong>Volant / Réserve</strong> <span className="text-gray-500 text-xs">(Application manuelle, sans date)</span></div>
                </label>
              </div>
            </div>

            {modalTemplate.typeModele === 'standard' && (
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className={`block text-sm font-semibold mb-1 ${t.header}`}>À partir du</label>
                  <input type="date" required value={modalTemplate.dateDebut} onChange={e => setModalTemplate({...modalTemplate, dateDebut: e.target.value})} className={`w-full border ${t.borderLight} rounded p-2 text-sm bg-transparent`} />
                </div>
                <div className="flex-1">
                  <label className={`block text-sm font-semibold mb-1 ${t.header}`}>Alternance</label>
                  <select value={modalTemplate.rythme || 'toutes'} onChange={e => setModalTemplate({...modalTemplate, rythme: e.target.value})} className={`w-full border ${t.borderLight} rounded p-2 text-sm bg-transparent font-bold`}>
                    <option value="toutes">Toutes les semaines</option>
                    <option value="pair">Semaines Paires (A)</option>
                    <option value="impair">Semaines Impaires (B)</option>
                  </select>
                </div>
              </div>
            )}
          </div>
          <div className={`p-4 ${t.bgLight} border-t ${t.borderLight} flex justify-end gap-3`}>
            <button type="button" onClick={() => setModalTemplate({...modalTemplate, isOpen: false})} className="px-4 py-2 text-gray-500 hover:opacity-75 rounded font-medium">Annuler</button>
            <button type="submit" className={`px-5 py-2 ${t.btnPrimary} rounded font-medium`}>{modalTemplate.id ? 'Enregistrer' : 'Créer'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const ModalPoste = ({ modalPoste, setModalPoste, validerPosteModal, t }) => {
  if (!modalPoste.isOpen) return null;

  const addSlot = () => {
    const newSlots = [...(modalPoste.slots || []), { id: Date.now(), start: '08:00', end: '12:00', days: { 1: true, 2: true, 3: true, 4: true, 5: true } }];
    setModalPoste({ ...modalPoste, slots: newSlots });
  };

  const updateSlot = (id, field, value) => {
    const newSlots = modalPoste.slots.map(s => s.id === id ? { ...s, [field]: value } : s);
    setModalPoste({ ...modalPoste, slots: newSlots });
  };

  const updateSlotDay = (id, dayIndex, value) => {
    const newSlots = modalPoste.slots.map(s => s.id === id ? { ...s, days: { ...s.days, [dayIndex]: value } } : s);
    setModalPoste({ ...modalPoste, slots: newSlots });
  };

  const removeSlot = (id) => {
    const newSlots = modalPoste.slots.filter(s => s.id !== id);
    setModalPoste({ ...modalPoste, slots: newSlots });
  };

  const hasSlots = modalPoste.slots && modalPoste.slots.length > 0;

  return (
    <div className="fixed inset-0 bg-black/50 z-[99999] flex items-center justify-center p-4 no-print">
      <div className={`${t.cardBg} rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in duration-200 border ${t.borderLight}`}>
        <div className={`${t.headerBg} ${t.headerText} p-4`}>
          <h3 className="font-bold text-lg">{modalPoste.id ? '⚙️ Modifier le poste' : '➕ Nouveau poste'}</h3>
        </div>
        <form onSubmit={validerPosteModal}>
          <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
            
            {/* Ligne 1 : Nom et Couleur */}
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className={`block text-sm font-semibold mb-1 ${t.header}`}>Nom du poste</label>
                <input type="text" required value={modalPoste.nom} onChange={e => setModalPoste({...modalPoste, nom: e.target.value})} placeholder="Ex: Grille, Permanence..." className={`w-full border ${t.borderLight} rounded p-2 text-sm bg-transparent font-bold`} />
              </div>
              <div className="w-24">
                <label className={`block text-sm font-semibold mb-1 ${t.header}`}>Couleur</label>
                <input type="color" value={modalPoste.couleur} onChange={e => setModalPoste({...modalPoste, couleur: e.target.value})} className="w-full h-9 rounded cursor-pointer border-0 p-0" />
              </div>
            </div>
            
            {/* Ligne 2 : Effectif */}
            <div>
              <label className={`block text-sm font-semibold mb-1 ${t.header}`}>Effectif requis par défaut</label>
              <div className="flex items-center gap-2">
                <input type="number" min="1" required value={modalPoste.qte} onChange={e => setModalPoste({...modalPoste, qte: Number(e.target.value)})} className={`w-24 border ${t.borderLight} rounded p-2 text-sm bg-transparent font-bold text-center`} />
                <span className="text-gray-500 text-sm font-medium">agent(s)</span>
              </div>
            </div>

            {/* Section : Grille des besoins */}
            <div className={`p-4 rounded-xl border ${t.borderLight} ${t.bgLight}`}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className={`font-bold ${t.header} text-base`}>Grille horaire des besoins</h4>
                  <p className="text-xs text-gray-500 mt-0.5 leading-tight">Définissez les créneaux récurrents de ce poste pour la semaine type.</p>
                </div>
                <button type="button" onClick={addSlot} className={`px-3 py-1.5 rounded text-xs font-bold ${t.btnPrimary} shadow-sm shrink-0 flex items-center gap-1 hover:scale-105 transition-transform`}>
                  ➕ Ajouter une plage
                </button>
              </div>

              <div className="space-y-3">
                {!hasSlots ? (
                  <div className="text-center text-gray-500 italic py-6 text-sm">
                    Aucune plage horaire définie. Cliquez sur "Ajouter une plage".
                  </div>
                ) : (
                  modalPoste.slots.map(slot => (
                    <div key={slot.id} className={`${t.cardBg} border ${t.borderLight} p-3 rounded-lg shadow-sm`}>
                      <div className="flex items-center gap-3 mb-3">
                        <input type="time" required value={slot.start} onChange={e => updateSlot(slot.id, 'start', e.target.value)} className={`border ${t.borderLight} rounded p-1.5 text-sm font-bold bg-transparent`} />
                        <span className="text-gray-500 font-bold text-sm">à</span>
                        <input type="time" required value={slot.end} onChange={e => updateSlot(slot.id, 'end', e.target.value)} className={`border ${t.borderLight} rounded p-1.5 text-sm font-bold bg-transparent`} />
                        <button type="button" onClick={() => removeSlot(slot.id)} className="ml-auto text-red-400 hover:text-red-600 font-black px-2 transition-colors text-lg" title="Supprimer ce créneau">✖</button>
                      </div>
                      <div className="flex gap-1.5 justify-between">
                        {[1, 2, 3, 4, 5].map(d => {
                          const isActive = slot.days[d];
                          return (
                            <label key={d} className={`flex-1 flex justify-center items-center py-1.5 rounded text-xs font-bold cursor-pointer transition-colors ${isActive ? 'bg-[#dfab46] text-white shadow-inner' : `bg-black/5 dark:bg-white/5 text-gray-400 hover:bg-black/10 dark:hover:bg-white/10`}`}>
                              <input type="checkbox" className="hidden" checked={isActive} onChange={e => updateSlotDay(slot.id, d, e.target.checked)} />
                              {['LUN', 'MAR', 'MER', 'JEU', 'VEN'][d-1]}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
          <div className={`p-4 ${t.bgLight} border-t ${t.borderLight} flex justify-end gap-3`}>
            <button type="button" onClick={() => setModalPoste({...modalPoste, isOpen: false})} className="px-4 py-2 text-gray-500 hover:text-gray-800 dark:hover:text-white rounded font-medium text-sm transition-colors">Annuler</button>
            <button type="submit" className={`px-6 py-2 ${t.btnPrimary} rounded font-bold text-sm shadow hover:scale-105 transition-transform`}>{modalPoste.id ? 'Enregistrer' : 'Créer le poste'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};
export const ModalException = ({ modalException, setModalException, validerExceptionJourModal, supprimerExceptionJour, t }) => {
  if (!modalException.isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-[99999] flex items-center justify-center p-4 no-print">
      <div className={`${t.cardBg} rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in duration-200 border ${t.borderLight}`}>
        <div className={`${t.headerBg} ${t.headerText} p-4`}><h3 className="font-bold text-lg">Modifier le jour ({modalException.dateStr})</h3></div>
        <form onSubmit={validerExceptionJourModal}>
          <div className="p-5 space-y-4">
            <div>
              <label className={`block text-sm font-semibold mb-1 ${t.header}`}>Heures travaillées (ex: 8h45 ou 0)</label>
              <input type="text" required value={modalException.h} onChange={e => setModalException({...modalException, h: e.target.value})} className={`w-full border ${t.borderLight} rounded p-2 text-sm bg-transparent`} autoFocus />
            </div>
            <div>
              <label className={`block text-sm font-semibold mb-1 ${t.header}`}>Motif / Note (ex: Toussaint, Stage)</label>
              <input type="text" value={modalException.note} onChange={e => setModalException({...modalException, note: e.target.value})} className={`w-full border ${t.borderLight} rounded p-2 text-sm bg-transparent`} />
            </div>
          </div>
          <div className={`p-4 ${t.bgLight} border-t ${t.borderLight} flex justify-between items-center`}>
            <button type="button" onClick={supprimerExceptionJour} className="px-3 py-2 text-red-500 hover:bg-red-500/10 rounded font-bold text-xs transition-colors">🗑️ Rétablir normal</button>
            <div className="flex gap-2">
              <button type="button" onClick={() => setModalException({isOpen: false, agentId: null, dateStr: null, h: '0h00', note: ''})} className="px-4 py-2 text-gray-500 hover:opacity-75 rounded font-medium">Annuler</button>
              <button type="submit" className={`px-5 py-2 ${t.btnPrimary} rounded font-medium`}>Enregistrer</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export const ModalParametres = ({
  modalParametres, setModalParametres, setModalBasculement, amplitude, setAmplitude, sonneriesText, setSonneriesText,
  handleSonneriesBlur, formPeriode, setFormPeriode, ajouterPeriodeFeriee, periodesFeriees,
  supprimerPeriodeFeriee, isDarkMode, toggleDarkMode, themeId, changeTheme, customColors, updateCustomColor, 
  handleExport, handleImport, setPeriodesFeriees, baseYear, t
}) => {
  const [zone, setZone] = useState("Zone C");
  const [isFetchingDates, setIsFetchingDates] = useState(false);

  const autoGenerateDates = async () => {
    setIsFetchingDates(true);
    const year1 = baseYear; 
    const year2 = baseYear + 1;
    let nouvellesPeriodes = [];
    
    // 1. Jours Fériés fixes de l'année
    const feriesY1 = getJoursFerie(year1).filter(f => f.date >= `${year1}-08-15`);
    const feriesY2 = getJoursFerie(year2).filter(f => f.date <= `${year2}-08-15`);
    nouvellesPeriodes = [...feriesY1, ...feriesY2].map(f => ({ 
      id: `ferie_${Date.now()}_${Math.random()}`, nom: f.nom, debut: f.date, fin: f.date, type: 'ferie'
    }));

    // 2. Pré-rentrée (Par défaut pour sécuriser le mois d'août)
    nouvellesPeriodes.push({
      id: `vac_pre_${Date.now()}`, nom: "Vacances d'Été (Pré-rentrée)", debut: `${year1}-07-01`, fin: `${year1}-08-31`, type: 'vacances'
    });

    try {
      const zoneFormattee = zone.replace(' ', '+');
      const urlApi = `https://data.education.gouv.fr/api/explore/v2.1/catalog/datasets/fr-en-calendrier-scolaire/records?limit=100&refine=zones%3A${zoneFormattee}&refine=annee_scolaire%3A${year1}-${year2}`;
      const res = await fetch(urlApi);
      const data = await res.json();
      
      let vacs = (data.results || [])
        .filter(r => !r.population || !r.population.toLowerCase().includes("enseignant"))
        .filter(r => r.description && r.description.toLowerCase().includes("vacances"))
        .map(r => {
           const startD = new Date(r.start_date);
           // FIX API ÉDUCATION NATIONALE : Les vacances commencent le vendredi soir. On décale au samedi matin.
           if (startD.getDay() === 5) { 
             startD.setDate(startD.getDate() + 1); 
           }
           
           const endD = new Date(r.end_date); 
           endD.setDate(endD.getDate() - 1);
           
           const pad = n => String(n).padStart(2, '0');
           return { 
             id: `vac_${Date.now()}_${Math.random()}`, nom: r.description, debut: `${startD.getFullYear()}-${pad(startD.getMonth()+1)}-${pad(startD.getDate())}`, fin: `${endD.getFullYear()}-${pad(endD.getMonth()+1)}-${pad(endD.getDate())}`, type: 'vacances'
           };
        });

      // Nettoyage et fusion
      vacs = Array.from(new Map(vacs.map(item => [item.debut, item])).values());
      vacs = vacs.map(v => {
        if (v.nom.toLowerCase().includes("été") && v.fin < `${year2}-08-31`) {
          return { ...v, fin: `${year2}-08-31` };
        }
        return v;
      });

      nouvellesPeriodes = [...nouvellesPeriodes, ...vacs];
    } catch (e) {
      alert("Erreur de connexion. Seuls les jours fériés fixes ont pu être ajoutés.");
    }
    
    if (window.confirm(`Générer les vacances pour la ${zone} (Année ${year1}-${year2}) ?\n\nAttention : Cela remplacera vos dates actuelles.`)) {
       setPeriodesFeriees(nouvellesPeriodes.sort((a,b) => a.debut.localeCompare(b.debut)));
    }
    setIsFetchingDates(false);
  };

  if (!modalParametres) return null;
  return (
    <div className="fixed inset-0 bg-black/60 z-[99999] flex items-center justify-center p-4 no-print">
      <div className={`${t.cardBg} rounded-xl shadow-2xl w-full max-w-6xl overflow-hidden flex flex-col max-h-[90vh] border ${t.borderLight}`}>
        <div className={`${t.headerBg} ${t.headerText} p-5 flex justify-between items-center shrink-0`}>
          <h3 className="font-bold text-xl">⚙️ Paramètres Généraux</h3>
          <button onClick={() => setModalParametres(false)} className="hover:opacity-50 font-bold text-xl transition-opacity">✖</button>
        </div>
        
        <div className={`p-6 overflow-y-auto flex-1 ${t.bgMain}`}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 flex flex-col gap-6">
              <div className={`${t.cardBg} p-5 rounded-xl border ${t.borderLight} shadow-sm`}>
                <h4 className={`font-bold text-lg ${t.header} mb-4`}>🕒 Horaires & Amplitude</h4>
                <div className="flex gap-4 mb-4 pb-4 border-b border-black/10 dark:border-white/10">
                  <div className="flex-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Début de journée</label>
                    <input type="time" value={amplitude.start} onChange={e => setAmplitude({...amplitude, start: e.target.value})} className={`mt-1 w-full border ${t.borderLight} rounded-lg p-2 text-sm bg-transparent font-bold`} />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Fin de journée</label>
                    <input type="time" value={amplitude.end} onChange={e => setAmplitude({...amplitude, end: e.target.value})} className={`mt-1 w-full border ${t.borderLight} rounded-lg p-2 text-sm bg-transparent font-bold`} />
                  </div>
                </div>

                <h5 className={`font-bold text-sm ${t.header} mb-1`}>🔔 Heures de Sonneries</h5>
                <p className="text-xs text-gray-500 mb-3">Séparez par des virgules. Elles apparaîtront en traits pleins.</p>
                <textarea 
                  value={sonneriesText} 
                  onChange={(e) => setSonneriesText(e.target.value)}
                  onBlur={handleSonneriesBlur}
                  className={`w-full border ${t.borderLight} rounded-lg p-3 text-sm bg-transparent font-mono shadow-inner`}
                  rows="2"
                  placeholder="Ex: 08:00, 08:55, 10:05..."
                />
              </div>

              <div className={`${t.cardBg} p-5 rounded-xl border ${t.borderLight} shadow-sm flex-1 flex flex-col`}>
                <h4 className={`font-bold text-lg ${t.header} mb-4`}>🏖️ Périodes de Vacances & Fériés</h4>
                
                {/* --- BLOC API EDUCATION NATIONALE --- */}
                <div className={`p-4 rounded-lg border border-blue-500/30 bg-blue-500/10 mb-4`}>
                  <div className="flex justify-between items-center mb-2">
                    <span className={`text-xs font-bold ${isDarkMode ? 'text-blue-300' : 'text-blue-800'} uppercase tracking-wider`}>⚡ Importation Automatique (Éduc. Nat.)</span>
                  </div>
                  <div className="flex gap-2 items-center">
                    <select value={zone} onChange={e=>setZone(e.target.value)} className={`border border-blue-500/30 p-1.5 rounded text-sm bg-transparent flex-1 ${isDarkMode ? 'text-blue-100' : 'text-blue-900'} font-bold outline-none`}>
                      <option value="Zone A">Zone A</option><option value="Zone B">Zone B</option><option value="Zone C">Zone C</option><option value="Corse">Corse</option>
                    </select>
                    <button type="button" onClick={autoGenerateDates} disabled={isFetchingDates} className={`px-4 py-1.5 rounded text-sm font-bold shadow-sm transition-opacity bg-blue-600 text-white disabled:opacity-50`}>
                      {isFetchingDates ? 'Calcul...' : 'Générer'}
                    </button>
                  </div>
                </div>

                <form onSubmit={ajouterPeriodeFeriee} className={`p-4 rounded-lg border ${t.borderLight} ${t.bgLight} mb-6`}>
                  <h5 className="font-bold text-xs text-gray-500 uppercase mb-3">➕ Ajouter une nouvelle période manuelle</h5>
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <input type="text" required placeholder="Nom (ex: Pont Ascension)" value={formPeriode.nom} onChange={e => setFormPeriode({...formPeriode, nom: e.target.value})} className="flex-[2] border rounded p-2 text-sm bg-transparent" />
                      <select value={formPeriode.type} onChange={e => setFormPeriode({...formPeriode, type: e.target.value})} className="flex-1 border rounded p-2 text-sm bg-transparent">
                        <option value="vacances">Vacances (0h)</option>
                        <option value="ferie">Jour Férié / Pont</option>
                      </select>
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-1"><label className="text-xs font-bold text-gray-500">Début</label><input type="date" required value={formPeriode.debut} onChange={e => setFormPeriode({...formPeriode, debut: e.target.value})} className="w-full border rounded p-2 text-sm bg-transparent" /></div>
                      <div className="flex-1"><label className="text-xs font-bold text-gray-500">Fin (Optionnel)</label><input type="date" value={formPeriode.fin} onChange={e => setFormPeriode({...formPeriode, fin: e.target.value})} className="w-full border rounded p-2 text-sm bg-transparent" /></div>
                      <div className="flex items-end"><button type="submit" className={`h-9 px-5 ${t.btnPrimary} rounded text-sm font-bold shadow`}>Ajouter</button></div>
                    </div>
                  </div>
                </form>

                <h5 className="font-bold text-xs text-gray-500 uppercase mb-2">Périodes enregistrées</h5>
                <ul className="space-y-2 overflow-y-auto pr-2 flex-1 max-h-[250px]">
                  {periodesFeriees.length === 0 && <p className="text-sm italic text-gray-500 text-center py-4">Aucune période configurée.</p>}
                  {periodesFeriees.map(p => (
                    <li key={p.id} className={`${t.bgMain} p-3 rounded-lg border ${t.borderLight} flex justify-between items-center text-sm shadow-sm`}>
                      <div>
                        <span className={`font-bold ${t.header}`}>{p.nom}</span> 
                        <span className={`ml-2 px-2 py-0.5 rounded text-[10px] uppercase font-bold text-white ${p.type === 'ferie' ? 'bg-green-600' : 'bg-blue-600'}`}>
                          {p.type === 'ferie' ? 'Férié (Payé)' : 'Vacances (0h)'}
                        </span>
                        <br/><span className="text-gray-500 text-xs">({p.debut === p.fin ? p.debut : `Du ${p.debut} au ${p.fin}`})</span>
                      </div>
                      <button onClick={() => supprimerPeriodeFeriee(p.id)} className="text-red-500 hover:bg-red-500/20 px-2 py-1 rounded transition-colors font-bold">✖</button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="lg:col-span-5 flex flex-col gap-6">
              <div className={`${t.cardBg} p-5 rounded-xl border ${t.borderLight} shadow-sm`}>
                <div className="flex justify-between items-center mb-4">
                  <h4 className={`font-bold text-lg ${t.header}`}>🎨 Thème visuel</h4>
                  <button type="button" onClick={toggleDarkMode} className={`px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all ${isDarkMode ? 'bg-gray-700 text-yellow-300 border border-gray-600' : 'bg-white text-gray-800 border border-gray-300'}`}>
                    {isDarkMode ? '☀️ Mode Clair' : '🌙 Mode Sombre'}
                  </button>
                </div>
                
                <div className="grid grid-cols-1 gap-3 mb-6">
                  {Object.entries(THEMES).filter(([id]) => id !== 'personnalise').map(([id, theme]) => {
                    const currentMode = isDarkMode ? theme.dark : theme.light;
                    return (
                      <button type="button" key={id} onClick={() => changeTheme(id)} className={`p-4 rounded-xl border-2 flex items-center gap-4 transition-all ${themeId === id ? `border-[${theme.fcPrimary}] shadow-md ${currentMode.cardBg}` : `border-transparent hover:${t.bgLight} ${t.bgMain}`}`}>
                        <div className={`flex shrink-0 overflow-hidden rounded-full w-10 h-10 border border-black/10 dark:border-white/10 shadow-inner ${currentMode.cardBg}`}>
                          <div className={`w-1/2 h-full ${currentMode.sidebar.split(' ')[0]}`}></div>
                          <div className={`w-1/2 h-full ${theme.btnPrimary.split(' ')[0]}`}></div>
                        </div>
                        <span className={`text-sm font-bold text-left leading-tight ${t.header}`}>{theme.nom}</span>
                      </button>
                    );
                  })}
                </div>

                <div className={`pt-5 border-t ${t.borderLight}`}>
                  <h5 className={`font-bold text-sm mb-3 ${t.header}`}>✨ Thème Personnalisé</h5>
                  <div className="flex items-end gap-3">
                    <label className={`flex flex-col text-[10px] font-bold uppercase ${t.textMenuMuted}`}>
                      Dominante
                      <input type="color" value={customColors.primary} onChange={(e) => updateCustomColor('primary', e.target.value)} className="w-12 h-10 mt-1 cursor-pointer border-0 rounded p-0 bg-transparent" />
                    </label>
                    <label className={`flex flex-col text-[10px] font-bold uppercase ${t.textMenuMuted}`}>
                      Accent
                      <input type="color" value={customColors.accent} onChange={(e) => updateCustomColor('accent', e.target.value)} className="w-12 h-10 mt-1 cursor-pointer border-0 rounded p-0 bg-transparent" />
                    </label>
                    <button type="button" onClick={() => changeTheme('personnalise')} className={`flex-1 px-3 h-10 text-xs font-bold rounded shadow transition-all ${themeId === 'personnalise' ? 'bg-blue-600 text-white' : `${t.bgLight} ${t.header} hover:opacity-80`}`}>
                      {themeId === 'personnalise' ? '✅ Actif' : 'Activer'}
                    </button>
                  </div>
                </div>
              </div>

              {/* --- BLOC SAUVEGARDE ET IMPORTATION --- */}
              <div className={`${t.cardBg} p-5 rounded-xl border ${t.borderLight} shadow-sm flex flex-col`}>
                <h4 className={`font-bold text-lg ${t.header} mb-2`}>💾 Sauvegarde & Restauration</h4>
                <p className="text-xs text-gray-500 mb-4 leading-tight">Exportez vos plannings, agents et paramètres, ou restaurez une sauvegarde JSON existante.</p>
                <div className="flex flex-col gap-3">
                  <button onClick={handleExport} className={`w-full ${t.btnPrimary} py-2 rounded text-sm font-bold shadow flex items-center justify-center gap-2 hover:opacity-90 transition-opacity`}>
                    ⬇️ Sauvegarder (Exporter JSON)
                  </button>
                  <input type="file" id="import-settings" accept=".json" onChange={handleImport} className="hidden" />
                  <button onClick={() => document.getElementById('import-settings').click()} className={`w-full border ${t.borderLight} hover:${t.bgLight} py-2 rounded text-sm font-bold transition-colors ${t.header} flex items-center justify-center gap-2`}>
                    ⬆️ Restaurer (Importer JSON)
                  </button>
                  <button onClick={() => setModalBasculement(true)} className="w-full bg-orange-600 hover:bg-orange-700 text-white py-2 rounded text-sm font-bold shadow flex items-center justify-center gap-2 transition-colors">
                    📁 Préparer la rentrée suivante (Bascule)
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ModalCreation = ({
  modalCreation, setModalCreation, validerCreationModal, formTypeEvent, setFormTypeEvent,
  formTypeAbsence, setFormTypeAbsence, formAbsImpact, setFormAbsImpact, formAgent, setFormAgent,
  formPoste, setFormPoste, formNote, setFormNote, agents, postes, posteActif, t, vueActive,
  supprimerAbsence, applyAction
}) => {
  if (!modalCreation.isOpen) return null;

  const isJourneeEntiere = modalCreation.journeeEntiere !== false;

  return (
    <div className="fixed inset-0 bg-black/50 z-[99999] flex items-center justify-center p-4 no-print">
      <div className={`${t.cardBg} rounded-xl shadow-2xl w-full max-w-sm overflow-visible animate-in zoom-in duration-200 border ${t.borderLight}`}>
        <div className={`${t.headerBg} ${t.headerText} p-4 rounded-t-xl`}><h3 className="font-bold text-lg">{modalCreation.eventId ? 'Modifier l\'affectation' : 'Nouvelle affectation'}</h3></div>
        <form onSubmit={validerCreationModal}>
          <div className="p-5 space-y-4">
            {(vueActive === 'planning' || vueActive === 'journee') && !modalCreation.eventId && (
              <div>
                <label className={`block text-sm font-semibold mb-1 ${t.header}`}>Type d'action</label>
                <select value={formTypeEvent} onChange={e => setFormTypeEvent(e.target.value)} className={`w-full border ${t.borderLight} rounded p-2 ${t.bgLight} font-bold text-sm`}>
                  <option value="affectation">Affectation de poste</option>
                  <option value="absence">Absence ou Retard</option>
                </select>
              </div>
            )}

            <div>
              <label className={`block text-sm font-semibold mb-1 ${t.header}`}>👤 Agent</label>
              <DropdownAvecCouleur 
                options={agents.map(a => ({ id: a.id, nom: a.nom, couleur: a.couleurFond }))}
                value={formAgent}
                onChange={setFormAgent}
                placeholder="-- Sélectionner un agent --"
                t={t}
              />
            </div>
            
            {formTypeEvent === 'absence' ? (
              <>
                <div>
                  <label className={`block text-sm font-semibold mb-1 ${t.header}`}>Nature</label>
                  <select value={formTypeAbsence} onChange={e => setFormTypeAbsence(e.target.value)} className={`w-full border ${t.borderLight} rounded p-2 bg-transparent`}>
                    <option value="absence">🚫 Absence</option>
                    <option value="retard">⏰ Retard</option>
                    <option value="heures_supp">🟢 Heures Supp' / Rattrapage</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-semibold mb-1 mt-2 ${t.header}`}>Impact sur les compteurs</label>
                  <select value={formAbsImpact} onChange={e => setFormAbsImpact(e.target.value)} className={`w-full border ${t.borderLight} rounded p-2 bg-transparent font-bold text-sm`}>
                    <option value="global">🌍 Bilan Annuel Global</option>
                    <option value="local">📍 Compteur Local (Dette / Compensation)</option>
                    {['absence', 'retard'].includes(formTypeAbsence) && <option value="neutre">⚪ Neutre (Ignoré)</option>}
                  </select>
                </div>

                {/* NOUVEAU BLOC DATES ET DURÉE POUR ABSENCE */}
                <div className="p-3 border border-blue-500/30 bg-blue-500/5 rounded-lg mt-3 space-y-3 shadow-inner">
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className={`block text-xs font-bold uppercase mb-1 ${t.header}`}>Du (Date)</label>
                      <input type="date" required value={modalCreation.date} onChange={e => setModalCreation({...modalCreation, date: e.target.value})} className={`w-full border ${t.borderLight} rounded p-2 text-sm bg-transparent`} />
                    </div>
                    <div className="flex-1">
                      <label className={`block text-xs font-bold uppercase mb-1 ${t.header}`}>Au (Inclus)</label>
                      <input type="date" required value={modalCreation.dateFin || modalCreation.date} onChange={e => setModalCreation({...modalCreation, dateFin: e.target.value})} className={`w-full border ${t.borderLight} rounded p-2 text-sm bg-transparent`} />
                    </div>
                  </div>

                  <label className={`flex items-center gap-2 text-sm font-bold cursor-pointer ${t.header}`}>
                    <input type="checkbox" checked={isJourneeEntiere} onChange={e => setModalCreation({...modalCreation, journeeEntiere: e.target.checked})} className="w-4 h-4 accent-blue-600" />
                    Journée(s) entière(s)
                  </label>

                  {!isJourneeEntiere && (
                    <div>
                      <label className={`block text-xs font-bold uppercase mb-1 ${t.header}`}>Durée manuelle (ex: 1h30)</label>
                      <input type="text" required placeholder="Ex: 1h30" value={modalCreation.duree || ''} onChange={e => setModalCreation({ ...modalCreation, duree: e.target.value })} className={`w-full border ${t.borderLight} rounded p-2 font-bold text-center bg-transparent`} />
                    </div>
                  )}
                  {isJourneeEntiere && (
                    <p className="text-[11px] text-blue-600 dark:text-blue-400 italic leading-tight">
                      La durée sera calculée automatiquement d'après l'emploi du temps de l'agent sur cette période.
                    </p>
                  )}
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className={`block text-sm font-semibold mb-1 ${t.header}`}>📍 Poste</label>
                  <DropdownAvecCouleur 
                    options={postes.map(p => ({ id: p.id, nom: p.nom, couleur: p.couleur }))}
                    value={formPoste}
                    onChange={setFormPoste}
                    placeholder="-- Sélectionner un poste --"
                    t={t}
                  />
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className={`block text-sm font-semibold mb-1 ${t.header}`}>Début</label>
                    <input type="time" required value={extractTimeStr(modalCreation.start)} onChange={e => setModalCreation({...modalCreation, start: e.target.value})} className={`w-full border ${t.borderLight} rounded p-2 bg-transparent`} />
                  </div>
                  <div className="flex-1">
                    <label className={`block text-sm font-semibold mb-1 ${t.header}`}>Fin</label>
                    <input type="time" required value={extractTimeStr(modalCreation.end)} onChange={e => setModalCreation({...modalCreation, end: e.target.value})} className={`w-full border ${t.borderLight} rounded p-2 bg-transparent`} />
                  </div>
                </div>
              </>
            )}

            <div><label className={`block text-sm font-semibold mb-1 ${t.header}`}>📝 {formTypeEvent === 'absence' ? 'Motif' : 'Note'}</label><input type="text" value={formNote} onChange={e => setFormNote(e.target.value)} placeholder={formTypeEvent === 'absence' ? "Ex: Maladie, Grève..." : "Ex: Réunion..."} className={`w-full border ${t.borderLight} rounded p-2 bg-transparent`} autoFocus={!!modalCreation.eventId} /></div>
          </div>
          
          <div className={`p-4 ${t.bgLight} border-t ${t.borderLight} flex justify-between items-center rounded-b-xl`}>
            <div>
              {modalCreation.eventId && (
                <button type="button" onClick={() => {
                  if(window.confirm('Voulez-vous vraiment supprimer cet élément ?')) {
                    if (formTypeEvent === 'absence') {
                      supprimerAbsence(String(modalCreation.eventId).replace('abs_','').split('_')[0]);
                    } else {
                      applyAction('delete', { 
                        id: modalCreation.eventId, 
                        start: `${modalCreation.date}T${modalCreation.start || '08:00'}:00` 
                      });
                    }
                    setModalCreation({ isOpen: false, eventId: null, date: null, start: '08:00', end: '09:00' });
                  }
                }} className="px-3 py-2 bg-red-500/10 text-red-600 hover:bg-red-500/20 rounded font-bold transition-colors text-sm shadow-sm flex items-center gap-1">
                  🗑️ Supprimer
                </button>
              )}
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setModalCreation({ isOpen: false, eventId: null, date: null, start: '08:00', end: '09:00' })} className="px-4 py-2 text-gray-500 hover:opacity-75 rounded font-medium">Annuler</button>
              <button type="submit" className={`px-5 py-2 ${t.btnPrimary} rounded font-medium`}>{modalCreation.eventId ? 'Enregistrer' : 'Créer'}</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export const ModalBesoinMulti = ({ modalBesoinMulti, setModalBesoinMulti, validerBesoinMultiModal, postes, t }) => {
  if (!modalBesoinMulti.isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-[99999] flex items-center justify-center p-4 no-print">
      <div className={`${t.cardBg} rounded-xl shadow-2xl w-full max-w-lg overflow-visible animate-in zoom-in duration-200 flex flex-col max-h-[90vh] border ${t.borderLight}`}>
        <div className="bg-red-700 text-white p-4 shrink-0 rounded-t-xl"><h3 className="font-bold text-lg">🎯 Saisie d'une grille de besoins</h3></div>
        <form onSubmit={validerBesoinMultiModal} className="flex flex-col overflow-hidden">
          <div className="p-5 space-y-4 overflow-y-auto">
            <div className="flex gap-4">
              <div className="flex-[2]">
                <label className="block text-sm font-semibold mb-1 text-red-600">Poste requis</label>
                <DropdownAvecCouleur 
                  options={postes.map(p => ({ id: p.id, nom: p.nom, couleur: p.couleur }))}
                  value={modalBesoinMulti.posteId}
                  onChange={val => setModalBesoinMulti({...modalBesoinMulti, posteId: val})}
                  placeholder="-- Sélectionner le poste --"
                  t={t}
                />
              </div>
              <div className="flex-1"><label className="block text-sm font-semibold mb-1 text-red-600">Effectif</label><input type="number" min="1" required value={modalBesoinMulti.qte} onChange={e => setModalBesoinMulti({...modalBesoinMulti, qte: e.target.value})} className="w-full border border-red-500/50 rounded p-2 text-center font-bold bg-transparent" /></div>
            </div>
            
            <div className="border border-red-500/30 rounded p-3 bg-red-900/10">
              <div className="flex justify-between items-center mb-3">
                <p className="text-sm font-bold text-red-600">Créez vos plages horaires et cochez les jours :</p>
                <button type="button" onClick={() => setModalBesoinMulti({...modalBesoinMulti, slots: [...modalBesoinMulti.slots, { id: Date.now(), start: '08:00', end: '10:00', days: { 1: false, 2: false, 3: false, 4: false, 5: false } }]})} className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700 font-semibold shadow">➕ Plage</button>
              </div>
              <div className="flex flex-col gap-3">
                {modalBesoinMulti.slots.map((slot, idx) => (
                  <div key={idx} className="flex flex-col gap-2 border-b border-red-500/30 pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center gap-2">
                      <input type="time" required value={slot.start} onChange={e => {
                        const ns = [...modalBesoinMulti.slots]; ns[idx].start = e.target.value; setModalBesoinMulti({...modalBesoinMulti, slots: ns});
                      }} className="border border-red-500/50 p-1 text-sm rounded bg-transparent w-24 text-center text-red-600 font-bold" />
                      <span className="text-gray-500 text-xs font-bold">à</span>
                      <input type="time" required value={slot.end} onChange={e => {
                        const ns = [...modalBesoinMulti.slots]; ns[idx].end = e.target.value; setModalBesoinMulti({...modalBesoinMulti, slots: ns});
                      }} className="border border-red-500/50 p-1 text-sm rounded bg-transparent w-24 text-center text-red-600 font-bold" />
                      {modalBesoinMulti.slots.length > 1 && (
                        <button type="button" onClick={() => {
                          const ns = [...modalBesoinMulti.slots]; ns.splice(idx, 1); setModalBesoinMulti({...modalBesoinMulti, slots: ns});
                        }} className="text-red-400 hover:text-red-600 text-xs rounded-full w-5 h-5 flex items-center justify-center shadow-sm ml-auto" title="Retirer cette plage">✖</button>
                      )}
                    </div>
                    <div className="flex gap-2 pl-1 mt-1">
                      {[1, 2, 3, 4, 5].map(day => (
                        <label key={day} className={`flex items-center gap-1 px-2 py-1 rounded border text-xs font-bold cursor-pointer transition-colors ${slot.days[day] ? 'bg-red-600 text-white border-red-700 shadow-sm' : `bg-transparent text-gray-500 border-gray-500/30 hover:${t.bgLight}`}`}>
                          <input type="checkbox" className="hidden" checked={slot.days[day]} onChange={e => {
                            const ns = [...modalBesoinMulti.slots]; ns[idx].days[day] = e.target.checked; setModalBesoinMulti({...modalBesoinMulti, slots: ns});
                          }} />
                          {nomsJours[day]}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className={`p-4 ${t.bgLight} border-t ${t.borderLight} shrink-0 flex justify-end gap-3 rounded-b-xl`}><button type="button" onClick={() => setModalBesoinMulti({ isOpen: false, posteId: '', qte: 1, slots: [] })} className="px-4 py-2 text-gray-500 hover:opacity-75 rounded font-medium">Annuler</button><button type="submit" className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-medium shadow">Générer la grille</button></div>
        </form>
      </div>
    </div>
  );
};

export const ModalEditBesoin = ({ modalEditBesoin, setModalEditBesoin, validerEditBesoin, updateCurrentTemplate, currentTemplate, t }) => {
  if (!modalEditBesoin.isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-[99999] flex items-center justify-center p-4 no-print">
      <div className={`${t.cardBg} rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in duration-200 border ${t.borderLight}`}>
        <div className="bg-red-700 text-white p-4"><h3 className="font-bold text-lg">Modifier le besoin</h3></div>
        <form onSubmit={validerEditBesoin}>
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-1 text-red-600">Effectif attendu</label>
              <input type="number" min="1" required value={modalEditBesoin.qte} onChange={e => setModalEditBesoin({...modalEditBesoin, qte: e.target.value})} className="w-full border border-red-500/50 rounded p-2 text-center font-bold text-lg bg-transparent" autoFocus />
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className={`block text-sm font-semibold mb-1 ${t.header}`}>Début</label>
                <input type="time" required value={modalEditBesoin.start} onChange={e => setModalEditBesoin({...modalEditBesoin, start: e.target.value})} className={`w-full border ${t.borderLight} rounded p-2 bg-transparent`} />
              </div>
              <div className="flex-1">
                <label className={`block text-sm font-semibold mb-1 ${t.header}`}>Fin</label>
                <input type="time" required value={modalEditBesoin.end} onChange={e => setModalEditBesoin({...modalEditBesoin, end: e.target.value})} className={`w-full border ${t.borderLight} rounded p-2 bg-transparent`} />
              </div>
            </div>
          </div>
          <div className={`p-4 ${t.bgLight} border-t ${t.borderLight} flex justify-between items-center`}>
            <button 
              type="button" 
              onClick={() => {
                if(window.confirm('Voulez-vous vraiment supprimer ce besoin ?')) {
                  updateCurrentTemplate(null, currentTemplate.besoins.filter(b => String(b.id).split('_')[0] !== modalEditBesoin.id));
                  setModalEditBesoin({ isOpen: false, id: null, posteId: '', qte: 1, start: '', end: '' });
                }
              }} 
              className="px-3 py-2 bg-red-500/10 text-red-600 hover:bg-red-500/20 rounded font-bold transition-colors text-sm shadow-sm flex items-center gap-1"
            >
              🗑️ Supprimer
            </button>
            <div className="flex gap-3">
              <button type="button" onClick={() => setModalEditBesoin({ isOpen: false, id: null, posteId: '', qte: 1, start: '', end: '' })} className="px-4 py-2 text-gray-500 hover:opacity-75 rounded font-medium">Annuler</button>
              <button type="submit" className="px-5 py-2 bg-red-600 text-white rounded font-medium">Mettre à jour</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export const ModalAgent = ({ modalAgent, setModalAgent, validerAgentModal, handleEditAgentChange, baseYear, agents, t }) => {
  if (!modalAgent.isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-[99999] flex items-center justify-center p-4 no-print">
      <div className={`${t.cardBg} rounded-xl shadow-2xl w-full max-w-md overflow-hidden border ${t.borderLight}`}>
        <div className={`${t.headerBg} ${t.headerText} p-4`}><h3 className="font-bold text-lg">{modalAgent.id ? 'Modifier un agent' : 'Nouvel agent'}</h3></div>
        <form onSubmit={validerAgentModal}>
          <div className="p-5 space-y-4">
            <div><label className={`block text-sm font-semibold mb-1 ${t.header}`}>Nom complet</label><input type="text" required value={modalAgent.nom} onChange={e => setModalAgent({...modalAgent, nom: e.target.value})} className={`w-full border ${t.borderLight} rounded p-2 bg-transparent`} autoFocus /></div>
            <div className="flex gap-4">
              <div className="flex-1"><label className={`block text-sm font-semibold mb-1 ${t.header}`}>Quotité (%)</label><input type="number" step="0.1" required value={modalAgent.quotite} onChange={e => handleEditAgentChange('quotite', e.target.value)} className={`w-full border ${t.borderLight} rounded p-2 font-bold text-center bg-transparent`} /></div>
              <div className="flex-1 flex flex-col justify-end"><label className={`flex items-center gap-2 p-2 border ${t.borderLight} ${t.bgLight} rounded cursor-pointer font-bold text-sm ${t.header}`}><input type="checkbox" checked={modalAgent.estEtudiant} onChange={e => handleEditAgentChange('estEtudiant', e.target.checked)} className="w-4 h-4" />🎓 Statut Étudiant</label></div>
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className={`block text-sm font-semibold mb-1 ${t.header}`}>Contrat (Calculé)</label>
                <input type="text" required value={typeof modalAgent.hContrat === 'number' ? formatHeureMinutes(modalAgent.hContrat) : modalAgent.hContrat} onChange={e => setModalAgent({...modalAgent, hContrat: e.target.value})} onBlur={e => setModalAgent({...modalAgent, hContrat: parseHeureSaisie(e.target.value)})} className={`w-full border ${t.borderLight} rounded p-2 font-mono text-center bg-transparent`} />
              </div>
              <div className="flex-1"><label className={`block text-sm font-semibold mb-1 ${t.header}`}>Couleur</label><div className="flex items-center gap-3"><input type="color" value={modalAgent.couleurFond} onChange={e => setModalAgent({...modalAgent, couleurFond: e.target.value})} className={`w-10 h-10 p-1 border ${t.borderLight} rounded cursor-pointer bg-transparent`} /><span className={`text-sm uppercase ${t.header}`}>{modalAgent.couleurFond}</span></div></div>
            </div>
            

            <div className="flex flex-col mt-4 pt-4 border-t border-black/10 dark:border-white/10">
              <div className="flex justify-between items-center mb-2">
                <label className={`text-sm font-semibold ${t.header}`}>Avenants (Changement en cours d'année)</label>
                <button type="button" onClick={() => {
                  const newAv = [...(modalAgent.avenants || []), { date: '', quotite: 100, estEtudiant: false }];
                  setModalAgent({...modalAgent, avenants: newAv});
                }} className={`text-xs ${t.bgLight} hover:opacity-80 px-2 py-1 rounded font-bold transition-colors`}>➕ Ajouter</button>
              </div>
              {(modalAgent.avenants || []).map((av, idx) => (
                <div key={idx} className="flex gap-2 items-center mb-2 bg-black/5 dark:bg-white/5 p-2 rounded shadow-inner">
                  <input type="date" required value={av.date} onChange={e => {
                    const newAv = [...modalAgent.avenants]; newAv[idx].date = e.target.value;
                    const newAgent = {...modalAgent, avenants: newAv};
                    newAgent.hContrat = calculerContratProratise(newAgent, baseYear, calculerContratBetty);
                    setModalAgent(newAgent);
                  }} className="flex-1 border border-black/20 dark:border-white/20 rounded p-1 text-xs bg-transparent" />
                  <input type="number" step="0.1" required value={av.quotite} onChange={e => {
                    const newAv = [...modalAgent.avenants]; newAv[idx].quotite = e.target.value;
                    const newAgent = {...modalAgent, avenants: newAv};
                    newAgent.hContrat = calculerContratProratise(newAgent, baseYear, calculerContratBetty);
                    setModalAgent(newAgent);
                  }} className="w-16 border border-black/20 dark:border-white/20 rounded p-1 text-xs text-center bg-transparent font-bold" placeholder="%" />
                  <label className="flex items-center gap-1 text-[10px] font-bold cursor-pointer">
                    <input type="checkbox" checked={av.estEtudiant} onChange={e => {
                      const newAv = [...modalAgent.avenants]; newAv[idx].estEtudiant = e.target.checked;
                      const newAgent = {...modalAgent, avenants: newAv};
                      newAgent.hContrat = calculerContratProratise(newAgent, baseYear, calculerContratBetty);
                      setModalAgent(newAgent);
                    }} /> Étud.
                  </label>
                  <button type="button" onClick={() => {
                    const newAv = [...modalAgent.avenants]; newAv.splice(idx, 1);
                    const newAgent = {...modalAgent, avenants: newAv};
                    newAgent.hContrat = calculerContratProratise(newAgent, baseYear, calculerContratBetty);
                    setModalAgent(newAgent);
                  }} className="text-red-500 hover:text-red-700 px-1 font-black transition-colors" title="Supprimer cet avenant">✖</button>
                </div>
              ))}
              {(modalAgent.avenants || []).length > 0 && (
                <p className="text-[10px] text-gray-500 italic leading-tight mt-1">Le contrat global est recalculé automatiquement au prorata exact des jours de l'année scolaire (1er Sept. au 31 Août).</p>
              )}
            </div>
          </div>
          {/* --- SECTION REMPLACEMENT --- */}
        <div className={`mt-4 p-3 border ${t.borderLight} rounded-lg bg-black/5 dark:bg-white/5`}>
          <label className="flex items-center gap-2 font-bold text-sm cursor-pointer">
            <input 
              type="checkbox" 
              className="w-4 h-4 accent-blue-600 rounded"
              checked={!!modalAgent.remplacement}
              onChange={(e) => {
                if (e.target.checked) {
                  handleEditAgentChange('remplacement', { agentId: '', start: '', end: '' });
                } else {
                  handleEditAgentChange('remplacement', null);
                }
              }}
            />
            Cet agent est un remplaçant (CDD)
          </label>
          
          {modalAgent.remplacement && (
            <div className="mt-3 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <div>
                <label className="block text-xs font-semibold mb-1 opacity-80">Agent remplacé</label>
                <select 
                  value={modalAgent.remplacement.agentId || ''} 
                  onChange={(e) => handleEditAgentChange('remplacement', { ...modalAgent.remplacement, agentId: e.target.value })}
                  className={`w-full p-2 border ${t.borderLight} rounded bg-transparent text-sm font-bold`}
                >
                  <option value="" className="text-black">-- Sélectionner un AED --</option>
                  {agents.filter(a => a.id !== modalAgent.id).map(a => (
                    <option key={a.id} value={a.id} className="text-black">{a.nom}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-semibold mb-1 opacity-80">Du</label>
                  <input type="date" value={modalAgent.remplacement.start || ''} onChange={(e) => handleEditAgentChange('remplacement', { ...modalAgent.remplacement, start: e.target.value })} className={`w-full p-2 border ${t.borderLight} rounded bg-transparent text-sm font-bold`} />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold mb-1 opacity-80">Au</label>
                  <input type="date" value={modalAgent.remplacement.end || ''} onChange={(e) => handleEditAgentChange('remplacement', { ...modalAgent.remplacement, end: e.target.value })} className={`w-full p-2 border ${t.borderLight} rounded bg-transparent text-sm font-bold`} />
                </div>
              </div>
            </div>
          )}
        </div>
        
          <div className={`p-4 ${t.bgLight} border-t ${t.borderLight} flex justify-end gap-3`}>
            <button type="button" onClick={() => setModalAgent({...modalAgent, isOpen: false})} className="px-4 py-2 text-gray-500 hover:opacity-75 rounded">Annuler</button>
            <button type="submit" className={`px-5 py-2 ${t.btnPrimary} rounded font-bold`}>{modalAgent.id ? 'Mettre à jour' : 'Créer'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- MODALE DE CONFIRMATION UNIVERSELLE ---
export const ModalConfirm = ({ dialog, closeDialog, t }) => {
  if (!dialog.isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/60 z-[999999] flex items-center justify-center p-4 no-print animate-in fade-in duration-200">
      <div className={`${t.cardBg} rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 border ${t.borderLight}`}>
        <div className={`p-5 flex flex-col gap-3`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${dialog.isDanger ? 'bg-red-500/20 text-red-500' : 'bg-blue-500/20 text-blue-500'}`}>
              {dialog.isDanger ? '⚠️' : '❓'}
            </div>
            <h3 className={`font-bold text-lg ${t.header}`}>{dialog.title}</h3>
          </div>
          <p className={`text-sm ${t.textMenuMuted} whitespace-pre-line ml-13 leading-relaxed`}>{dialog.message}</p>
        </div>
        <div className={`p-4 ${t.bgLight} border-t ${t.borderLight} flex justify-end gap-3`}>
          <button onClick={closeDialog} className="px-4 py-2 text-gray-500 hover:opacity-75 rounded font-medium text-sm transition-opacity">Annuler</button>
          <button onClick={() => { dialog.onConfirm(); closeDialog(); }} className={`px-5 py-2 rounded font-bold text-sm shadow text-white transition-colors ${dialog.isDanger ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
            {dialog.confirmText || 'Confirmer'}
          </button>
        </div>
      </div>
    </div>
  );
};


// --- ASSISTANT DE BASCULE D'ANNÉE ---
export const ModalBasculement = ({ modalBasculement, setModalBasculement, baseYear, postes, agents, currentTemplate, t, onComplete }) => {
  const [nouvelleAnnee, setNouvelleAnnee] = useState(baseYear + 1);
  const [zone, setZone] = useState("Zone C");
  const [garderPostes, setGarderPostes] = useState(true);
  const [garderAgents, setGarderAgents] = useState(true); // <-- Correctement activé par défaut pour garder les agents et leurs affectations
  const [garderTemplateActuel, setGarderTemplateActuel] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!modalBasculement) return null;

  // Helper pour parser une date YYYY-MM-DD sans bug de fuseau horaire UTC
  const parseLocalDate = (dateStr) => {
    if (!dateStr) return new Date();
    const [y, m, d] = dateStr.split('T')[0].split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  const formatDateLocal = (d) => {
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  const getMondayOfDate = (d) => {
    const day = d.getDay() || 7;
    const monday = new Date(d);
    monday.setDate(monday.getDate() - (day - 1));
    return monday;
  };

  const executerBasculement = async () => {
    if (!window.confirm(`Attention : Vous allez basculer vers l'année scolaire ${nouvelleAnnee}-${nouvelleAnnee+1}.\n\nCette action va réinitialiser les plannings et absences tout en conservant vos structures. Pensez à faire un export JSON de sauvegarde avant par sécurité !`)) {
      return;
    }

    setIsProcessing(true);
    try {
      let nouvellesPeriodes = [];
      const year1 = nouvelleAnnee;
      const year2 = nouvelleAnnee + 1;

      // 1. Fériés de la nouvelle année
      const feriesY1 = getJoursFerie(year1).filter(f => f.date >= `${year1}-08-15`);
      const feriesY2 = getJoursFerie(year2).filter(f => f.date <= `${year2}-08-15`);
      nouvellesPeriodes = [...feriesY1, ...feriesY2].map(f => ({ 
        id: `ferie_${Date.now()}_${Math.random()}`, nom: f.nom, debut: f.date, fin: f.date, type: 'ferie'
      }));

      nouvellesPeriodes.push({
        id: `vac_pre_${Date.now()}`, nom: "Vacances d'Été (Pré-rentrée)", debut: `${year1}-07-01`, fin: `${year1}-08-31`, type: 'vacances'
      });

      // 2. Appel API Éduc Nat pour les vacances
      try {
        const zoneFormattee = zone.replace(' ', '+');
        const urlApi = `https://data.education.gouv.fr/api/explore/v2.1/catalog/datasets/fr-en-calendrier-scolaire/records?limit=100&refine=zones%3A${zoneFormattee}&refine=annee_scolaire%3A${year1}-${year2}`;
        const res = await fetch(urlApi);
        const data = await res.json();
        
        let vacs = (data.results || [])
          .filter(r => !r.population || !r.population.toLowerCase().includes("enseignant"))
          .filter(r => r.description && r.description.toLowerCase().includes("vacances"))
          .map(r => {
             const startD = parseLocalDate(r.start_date);
             if (startD.getDay() === 5) { startD.setDate(startD.getDate() + 1); }
             const endD = parseLocalDate(r.end_date); 
             endD.setDate(endD.getDate() - 1);
             return { 
               id: `vac_${Date.now()}_${Math.random()}`, nom: r.description, debut: formatDateLocal(startD), fin: formatDateLocal(endD), type: 'vacances'
             };
          });
        vacs = Array.from(new Map(vacs.map(item => [item.debut, item])).values());
        nouvellesPeriodes = [...nouvellesPeriodes, ...vacs];
      } catch (err) {
        console.error("Erreur API vacances", err);
      }

      // 3. Calcul du premier lundi de septembre de la nouvelle rentrée en heure locale
      const newBaseDate = getMondayOfDate(new Date(year1, 8, 1));
      const startStr = formatDateLocal(newBaseDate);

      const currentPostes = garderPostes ? postes : [];

      // Fonction utilitaire pour reporter proprement les éléments sur la nouvelle semaine de rentrée
      const shiftItemsToNewWeek = (itemsList) => {
        if (!itemsList || itemsList.length === 0) return [];
        return itemsList.map(item => {
          if (!item.start) return item;
          const [datePart, timePart] = item.start.split('T');
          const [endDatePart, endTimePart] = (item.end || '').split('T');
          
          if (!datePart) return item;

          const dateObj = parseLocalDate(datePart);
          const jsDay = dateObj.getDay();
          const dayIndex = jsDay === 0 ? 6 : jsDay - 1; // 0 = Lundi, 4 = Vendredi

          const newDateForDay = parseLocalDate(startStr);
          newDateForDay.setDate(newDateForDay.getDate() + dayIndex);
          const shiftedDatePart = formatDateLocal(newDateForDay);

          let shiftedEndDatePart = shiftedDatePart;
          if (endDatePart) {
            const endDateObj = parseLocalDate(endDatePart);
            const endJsDay = endDateObj.getDay();
            const endDayIndex = endJsDay === 0 ? 6 : endJsDay - 1;
            const newEndDateForDay = parseLocalDate(startStr);
            newEndDateForDay.setDate(newEndDateForDay.getDate() + endDayIndex);
            shiftedEndDatePart = formatDateLocal(newEndDateForDay);
          }

          return {
            ...item,
            id: String(Date.now() + Math.random()),
            start: timePart ? `${shiftedDatePart}T${timePart}` : shiftedDatePart,
            end: endTimePart ? `${shiftedEndDatePart}T${endTimePart}` : (item.end ? `${shiftedEndDatePart}T00:00:00` : undefined)
          };
        });
      };

      let finalBesoins = [];
      let finalEvents = [];

      if (garderTemplateActuel && currentTemplate) {
        finalBesoins = shiftItemsToNewWeek(currentTemplate.besoins);
        finalEvents = shiftItemsToNewWeek(currentTemplate.events);
      } else {
        currentPostes.forEach(p => {
          if (p.slots && p.slots.length > 0) {
            p.slots.forEach(slot => {
              if (slot.start && slot.end) {
                [1, 2, 3, 4, 5].forEach(dayIndex => {
                  if (slot.days[dayIndex]) {
                    const d = new Date(newBaseDate);
                    d.setDate(d.getDate() + dayIndex - 1);
                    const dateStr = formatDateLocal(d);
                    finalBesoins.push({
                      id: String(Date.now() + Math.random()),
                      start: `${dateStr}T${slot.start}:00`,
                      end: `${dateStr}T${slot.end}:00`,
                      extendedProps: { posteId: p.id, posteNom: p.nom, qte: Number(p.qte) || 1 }
                    });
                  }
                });
              }
            });
          }
        });
      }

      const templateVersions = [{ 
        id: 1, 
        nom: currentTemplate?.nom || "Modèle Rentrée", 
        dateDebut: startStr, 
        events: finalEvents, 
        besoins: finalBesoins, 
        statut: 'brouillon' 
      }];

    const retainedAgents = garderAgents ? agents.map(a => ({ ...a })) : [];

      await saveAppData({
        agents: retainedAgents,
        postes: currentPostes,
        periodesFeriees: nouvellesPeriodes.sort((a,b) => a.debut.localeCompare(b.debut)),
        dotation: 0,
        templateVersions,
        customWeeks: {},
        exceptions: {},
        absences: [],
        amplitude: { start: '07:30', end: '18:00' },
        sonneries: ['08:00', '08:55', '10:05', '11:00', '11:55', '12:50', '13:45', '14:40', '15:50', '16:45', '17:40']
      });

      alert("Basculement réussi vers la nouvelle année scolaire !");
      setModalBasculement(false);
      if (onComplete) onComplete();
    } catch (e) {
      alert("Erreur lors du basculement.");
      console.error(e);
    }
    setIsProcessing(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[99999] flex items-center justify-center p-4 no-print">
      <div className={`${t.cardBg} rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border ${t.borderLight}`}>
        <div className={`${t.headerBg} ${t.headerText} p-5 flex justify-between items-center`}>
          <h3 className="font-bold text-xl">📁 Assistant de Bascule d'Année</h3>
          <button onClick={() => setModalBasculement(false)} className="hover:opacity-50 font-bold text-xl">✖</button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-500 leading-relaxed">
            Cet assistant prépare votre établissement pour la prochaine rentrée scolaire en conservant vos structures et votre semaine type actuelle (avec ses affectations), tout en réinitialisant les plannings de l'année passée.
          </p>

          <div className={`p-4 rounded-xl border ${t.borderLight} ${t.bgLight} space-y-3`}>
            <div>
              <label className={`block text-xs font-bold uppercase mb-1 ${t.header}`}>Année de la nouvelle rentrée (Septembre)</label>
              <input type="number" value={nouvelleAnnee} onChange={e => setNouvelleAnnee(Number(e.target.value))} className={`w-full border ${t.borderLight} rounded p-2 text-sm font-bold bg-transparent`} />
            </div>
            <div>
              <label className={`block text-xs font-bold uppercase mb-1 ${t.header}`}>Zone Académique</label>
              <select value={zone} onChange={e => setZone(e.target.value)} className={`w-full border ${t.borderLight} rounded p-2 text-sm font-bold bg-transparent`}>
                <option value="Zone A">Zone A</option><option value="Zone B">Zone B</option><option value="Zone C">Zone C</option><option value="Corse">Corse</option>
              </select>
            </div>
          </div>

          <div className="space-y-2.5 pt-2">
            <label className={`flex items-center gap-2 text-sm font-bold cursor-pointer ${t.header}`}>
              <input type="checkbox" checked={garderPostes} onChange={e => setGarderPostes(e.target.checked)} className="w-4 h-4 accent-blue-600" />
              Conserver les postes et leurs grilles ({postes.length} postes)
            </label>
            
            <label className={`flex items-center gap-2 text-sm font-bold cursor-pointer ${t.header}`}>
              <input 
                type="checkbox" 
                checked={garderTemplateActuel} 
                onChange={e => {
                  const val = e.target.checked;
                  setGarderTemplateActuel(val);
                  if (val) setGarderAgents(true); // Force la conservation des agents si on garde le planning
                }} 
                className="w-4 h-4 accent-blue-600" 
              />
              Conserver et reporter la semaine type actuelle ({currentTemplate?.events?.length || 0} affectations, {currentTemplate?.besoins?.length || 0} besoins)
            </label>

            <label className={`flex items-center gap-2 text-sm font-bold cursor-pointer ${t.header}`}>
              <input 
                type="checkbox" 
                checked={garderAgents} 
                disabled={garderTemplateActuel} // Grisé et bloqué à true si la semaine type est cochée
                onChange={e => setGarderAgents(e.target.checked)} 
                className="w-4 h-4 accent-blue-600 disabled:opacity-50" 
              />
              Conserver la liste des agents ({agents.length} agents) 
              {garderTemplateActuel && <span className="text-[11px] font-normal text-blue-500 italic">(Requis pour les affectations)</span>}
            </label>

            <p className="text-[11px] text-orange-500 italic mt-1">⚠️ Pensez à faire un export JSON de sauvegarde dans les paramètres avant de lancer cette action !</p>
          </div>
        </div>

        <div className={`p-4 ${t.bgLight} border-t ${t.borderLight} flex justify-end gap-3`}>
          <button onClick={() => setModalBasculement(false)} className="px-4 py-2 text-gray-500 hover:opacity-75 rounded font-medium text-sm">Annuler</button>
          <button onClick={executerBasculement} disabled={isProcessing} className={`px-5 py-2 ${t.btnPrimary} rounded font-bold text-sm shadow disabled:opacity-50`}>
            {isProcessing ? 'Préparation...' : 'Lancer la bascule 🚀'}
          </button>
        </div>
      </div>
    </div>
  );
};