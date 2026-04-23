import { useCallback, useEffect, useMemo, useState } from "react";
import { ACTIONS, EVENTS, EventData, Joyride, STATUS, TooltipRenderProps } from "react-joyride";
import { useLocation } from "react-router-dom";

import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { getTourDefinition } from "@/components/onboarding/tourConfig";
import { supabase } from "@/integrations/supabase/client";

type TourState = {
  status: "completed" | "skipped" | "postponed";
  updatedAt: string;
  postponedUntil?: string;
  tourVersion: number;
};

const POSTPONE_DURATION_MS = 24 * 60 * 60 * 1000;

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
  const [stateLoaded, setStateLoaded] = useState(false);
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
    async (value: TourState) => {
      if (!user?.id) return;

      const { error } = await (supabase as any)
        .from("guided_tour_states")
        .upsert(
          {
            user_id: user.id,
            tour_key: definition.key,
            status: value.status,
            postponed_until: value.postponedUntil ?? null,
            tour_version: value.tourVersion,
          },
          { onConflict: "user_id,tour_key,tour_version" }
        );

      if (error) {
        console.error("Unable to persist guided tour state", error);
      }
    },
    [definition.key, user?.id]
  );

  const handleLater = useCallback(() => {
    setLastAction("later");
    void persistState({
      status: "postponed",
      updatedAt: new Date().toISOString(),
      postponedUntil: new Date(Date.now() + POSTPONE_DURATION_MS).toISOString(),
      tourVersion: definition.version,
    });
    setRun(false);
  }, [definition.version, persistState]);

  useEffect(() => {
    setStepsReady(false);
    const timeout = window.setTimeout(() => setStepsReady(true), 50);
    return () => window.clearTimeout(timeout);
  }, [pathname]);

  useEffect(() => {
    if (!user?.id || pathname === "/dashboard" || !stepsReady || steps.length === 0) {
      setRun(false);
      setStateLoaded(false);
      return;
    }

    let cancelled = false;

    const loadState = async () => {
      setStateLoaded(false);

      const { data, error } = await (supabase as any)
        .from("guided_tour_states")
        .select("status, updated_at, postponed_until, tour_version")
        .eq("user_id", user.id)
        .eq("tour_key", definition.key)
        .eq("tour_version", definition.version)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.error("Unable to load guided tour state", error);
        setRun(false);
        setStateLoaded(true);
        return;
      }

      const state = data
        ? {
            status: data.status as TourState["status"],
            updatedAt: data.updated_at as string,
            postponedUntil: (data.postponed_until as string | null) ?? undefined,
            tourVersion: (data.tour_version as number | null) ?? 1,
          }
        : null;

      const now = Date.now();
      const postponedUntil = state?.postponedUntil ? new Date(state.postponedUntil).getTime() : 0;
      const shouldRun =
        !state ||
        state.tourVersion !== definition.version ||
        (state.status === "postponed" && postponedUntil <= now);

      setRun(shouldRun);
      setLastAction(null);
      setStateLoaded(true);
    };

    void loadState();

    return () => {
      cancelled = true;
    };
  }, [definition.key, definition.version, pathname, steps.length, stepsReady, user?.id]);

  const handleCallback = useCallback(
    (data: EventData) => {
      const { action, status, type } = data;
      if (lastAction === "later") return;

      if (status === STATUS.FINISHED) {
        void persistState({ status: "completed", updatedAt: new Date().toISOString(), tourVersion: definition.version });
        setRun(false);
        return;
      }

      if (status === STATUS.SKIPPED || action === ACTIONS.SKIP) {
        void persistState({ status: "skipped", updatedAt: new Date().toISOString(), tourVersion: definition.version });
        setRun(false);
        return;
      }

      if (type === EVENTS.TOUR_END) {
        setRun(false);
      }
    },
    [definition.version, lastAction, persistState]
  );

  if (!user?.id || pathname === "/dashboard" || steps.length === 0 || !stateLoaded) {
    return null;
  }

  return (
    <Joyride
      run={run}
      steps={steps}
      continuous
      scrollToFirstStep
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