import { useRef, useState, useCallback, useEffect } from 'react';

export const useHistory = (getCurrentState, applyState) => {
  // Références pour stocker l'historique sans déclencher de re-rendus inutiles
  const historyRef = useRef([]);
  const redoRef = useRef([]);
  
  // États pour déclencher l'affichage des notifications "Bulles" (Toasts)
  const [showUndoToast, setShowUndoToast] = useState(false);
  const [showRedoToast, setShowRedoToast] = useState(false);

  // Fonction pour capturer l'état avant une modification
  const sauvegarderEtatPrecedent = useCallback((snapshot = null) => {
    const stateToSave = snapshot || getCurrentState();
    if (!stateToSave) return;
    
    // Clonage profond pour éviter les références croisées
    const deepClone = JSON.parse(JSON.stringify(stateToSave));
    
    // On limite l'historique à 30 actions pour éviter de saturer la RAM
    historyRef.current = [...historyRef.current, deepClone].slice(-30);
    
    // Toute nouvelle action vide la pile "Refaire"
    redoRef.current = [];
  }, [getCurrentState]);

  // Fonction pour Annuler (Undo)
  const annulerAction = useCallback(() => {
    if (historyRef.current.length === 0) return;
    
    const currentState = getCurrentState();
    if (currentState) {
      redoRef.current = [...redoRef.current, JSON.parse(JSON.stringify(currentState))].slice(-30);
    }
    
    const lastState = historyRef.current.pop();
    if (lastState && applyState) {
      applyState(lastState);
      
      // Afficher le toast temporairement
      setShowUndoToast(true); 
      setTimeout(() => setShowUndoToast(false), 2000);
    }
  }, [getCurrentState, applyState]);

  // Fonction pour Refaire (Redo)
  const refaireAction = useCallback(() => {
    if (redoRef.current.length === 0) return;
    
    const currentState = getCurrentState();
    if (currentState) {
      historyRef.current = [...historyRef.current, JSON.parse(JSON.stringify(currentState))].slice(-30);
    }
    
    const nextState = redoRef.current.pop();
    if (nextState && applyState) {
      applyState(nextState);
      
      // Afficher le toast temporairement
      setShowRedoToast(true); 
      setTimeout(() => setShowRedoToast(false), 2000);
    }
  }, [getCurrentState, applyState]);

  // Écouteur global pour les raccourcis clavier (Ctrl+Z / Ctrl+Y)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Vérifie si Ctrl (Windows/Linux) ou Cmd (Mac) est enfoncé
      if (e.ctrlKey || e.metaKey) {
        const key = e.key.toLowerCase();
        
        if (key === 'z') {
          e.preventDefault();
          if (e.shiftKey) {
            refaireAction(); // Ctrl + Shift + Z
          } else {
            annulerAction(); // Ctrl + Z
          }
        } else if (key === 'y') {
          e.preventDefault();
          refaireAction(); // Ctrl + Y
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [annulerAction, refaireAction]);

  return { sauvegarderEtatPrecedent, showUndoToast, showRedoToast };
};