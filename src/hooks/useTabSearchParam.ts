import { useSearchParams } from "react-router-dom";

/**
 * Synchronise l'onglet actif avec le paramètre URL `?tab=`.
 * Survit aux rechargements de page et permet les liens directs vers un onglet.
 *
 * @param defaultTab  Valeur de l'onglet par défaut si le paramètre est absent.
 * @param paramName   Nom du paramètre URL (défaut : "tab").
 */
export function useTabSearchParam(defaultTab: string, paramName = "tab") {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get(paramName) || defaultTab;

  const setTab = (value: string) => {
    setSearchParams(
      (prev) => { prev.set(paramName, value); return prev; },
      { replace: true }
    );
  };

  return [activeTab, setTab] as const;
}
