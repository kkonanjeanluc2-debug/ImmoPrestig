import { useCallback, useEffect, useMemo, useState } from "react";
import { ACTIONS, EVENTS, EventData, Joyride, STATUS, TooltipRenderProps } from "react-joyride";
import { useLocation } from "react-router-dom";

import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { getTourDefinition } from "@/components/onboarding/tourConfig";

type TourState = {
  status: "completed" | "skipped" | "postponed";
  updatedAt: string;
  postponedUntil?: string;
};

const POSTPONE_DURATION_MS = 24 * 60 * 60 * 1000;

function getStorageKey(userId: string, tourKey: string) {
  return `guided-tour:${userId}:${tourKey}`;
}

function readTourState(userId: string, tourKey: string): TourState | null {
  try {
    const raw = localStorage.getItem(getStorageKey(userId, tourKey));
    return raw ? (JSON.parse(raw) as TourState) : null;
  } catch {
    return null;
  }
}

function writeTourState(userId: string, tourKey: string, value: TourState) {
  localStorage.setItem(getStorageKey(userId, tourKey), JSON.stringify(value));
}

function TourTooltip(props: TooltipRenderProps & { onLater: () => void }) {
  const { step, index, size, backProps, primaryProps, tooltipProps, skipProps, isLastStep, onLater } = props;

  return (
    <div
      {...tooltipProps}
      className="max-w-sm rounded-lg border border-border bg-popover p-4 shadow-lg"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-primary px-2 text-xs font-semibold text-primary-foreground">
          {index + 1}
        </span>
        <span className="text-xs text-muted-foreground">Étape {index + 1} sur {size}</span>
      </div>

      <div className="space-y-2">
        {step.title ? <h3 className="text-sm font-semibold text-foreground">{step.title}</h3> : null}
        <div className="text-sm leading-6 text-foreground">{step.content}</div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onLater}>
            Revoir plus tard
          </Button>
          <Button type="button" variant="outline" size="sm" {...skipProps}>
            Passer le guide
          </Button>
        </div>

        <div className="flex gap-2">
          {index > 0 ? (
            <Button type="button" variant="outline" size="sm" {...backProps}>
              Précédent
            </Button>
          ) : null}
          <Button type="button" size="sm" {...primaryProps}>
            {isLastStep ? "Terminer" : "Suivant"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function GuidedTour() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const [run, setRun] = useState(false);
  const [stepsReady, setStepsReady] = useState(false);
  const [lastAction, setLastAction] = useState<"later" | null>(null);

  const definition = useMemo(() => getTourDefinition(pathname), [pathname]);

  const steps = useMemo(
    () => {
      if (typeof document === "undefined") return [];
      return definition.steps.filter((step) => typeof step.target === "string" && !!document.querySelector(step.target));
    },
    [definition.steps, stepsReady]
  );

  const persistState = useCallback(
    (value: TourState) => {
      if (!user?.id) return;
      writeTourState(user.id, definition.key, value);
    },
    [definition.key, user?.id]
  );

  const handleLater = useCallback(() => {
    setLastAction("later");
    persistState({
      status: "postponed",
      updatedAt: new Date().toISOString(),
      postponedUntil: new Date(Date.now() + POSTPONE_DURATION_MS).toISOString(),
    });
    setRun(false);
  }, [persistState]);

  useEffect(() => {
    setStepsReady(false);
    const timeout = window.setTimeout(() => setStepsReady(true), 50);
    return () => window.clearTimeout(timeout);
  }, [pathname]);

  useEffect(() => {
    if (!user?.id || pathname === "/dashboard" || !stepsReady || steps.length === 0) {
      setRun(false);
      return;
    }

    const state = readTourState(user.id, definition.key);
    const now = Date.now();
    const postponedUntil = state?.postponedUntil ? new Date(state.postponedUntil).getTime() : 0;
    const shouldRun = !state || (state.status === "postponed" && postponedUntil <= now);

    setRun(shouldRun);
    setLastAction(null);
  }, [definition.key, pathname, steps.length, stepsReady, user?.id]);

  const handleCallback = useCallback(
    (data: EventData) => {
      const { action, status, type } = data;
      if (lastAction === "later") return;

      if (status === STATUS.FINISHED) {
        persistState({ status: "completed", updatedAt: new Date().toISOString() });
        setRun(false);
        return;
      }

      if (status === STATUS.SKIPPED || action === ACTIONS.SKIP) {
        persistState({ status: "skipped", updatedAt: new Date().toISOString() });
        setRun(false);
        return;
      }

      if (type === EVENTS.TOUR_END) {
        setRun(false);
      }
    },
    [lastAction, persistState]
  );

  if (!user?.id || pathname === "/dashboard" || steps.length === 0) {
    return null;
  }

  return (
    <Joyride
      run={run}
      steps={steps}
      continuous
      hideCloseButton
      scrollToFirstStep
      showProgress={false}
      showSkipButton={false}
      onEvent={handleCallback}
      options={{
        arrowColor: 'hsl(var(--popover))',
        backgroundColor: 'hsl(var(--popover))',
        overlayColor: 'hsl(var(--foreground) / 0.45)',
        overlayClickAction: false,
        primaryColor: 'hsl(var(--primary))',
        spotlightRadius: 12,
        textColor: 'hsl(var(--foreground))',
        zIndex: 1000,
      }}
      tooltipComponent={(props) => <TourTooltip {...props} onLater={handleLater} />}
    />
  );
}