import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, Shield, TrendingUp, Users, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WelcomeScreenProps {
  onComplete: () => void;
  minDuration?: number;
}

const welcomeMessages = [
  "Bienvenue",
  "Votre espace de gestion immobilière",
  "Simplifié. Sécurisé. Serein.",
];

const features = [
  {
    icon: Building2,
    title: "Gestion simplifiée",
    description: "Tous vos biens en un seul endroit",
  },
  {
    icon: Users,
    title: "Suivi locataires",
    description: "Relations harmonieuses garanties",
  },
  {
    icon: TrendingUp,
    title: "Performance",
    description: "Optimisez vos revenus locatifs",
  },
  {
    icon: Shield,
    title: "Sécurité",
    description: "Vos données sont protégées",
  },
];

const WelcomeScreen = ({ onComplete, minDuration = 4000 }: WelcomeScreenProps) => {
  const [currentPhase, setCurrentPhase] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const [canSkip, setCanSkip] = useState(false);

  // Phase progression
  useEffect(() => {
    const phases = [
      { duration: 1500, next: 1 }, // Initial welcome
      { duration: 2000, next: 2 }, // Features reveal
      { duration: 1500, next: 3 }, // Ready state
    ];

    if (currentPhase < phases.length) {
      const timer = setTimeout(() => {
        setCurrentPhase(phases[currentPhase].next);
      }, phases[currentPhase].duration);
      return () => clearTimeout(timer);
    }
  }, [currentPhase]);

  // Message cycling
  useEffect(() => {
    if (currentPhase === 0 && messageIndex < welcomeMessages.length - 1) {
      const timer = setTimeout(() => {
        setMessageIndex((prev) => prev + 1);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [messageIndex, currentPhase]);

  // Enable skip after minimum duration
  useEffect(() => {
    const timer = setTimeout(() => setCanSkip(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  // Auto-complete after full duration
  useEffect(() => {
    const timer = setTimeout(() => {
      handleComplete();
    }, minDuration);
    return () => clearTimeout(timer);
  }, [minDuration]);

  const handleComplete = () => {
    if (!isExiting) {
      setIsExiting(true);
      setTimeout(onComplete, 600);
    }
  };

  const handleSkip = () => {
    if (canSkip) {
      handleComplete();
    }
  };

  return (
    <AnimatePresence>
      {!isExiting && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden"
          onClick={handleSkip}
        >
          {/* Gradient background with animated orbs */}
          <div className="absolute inset-0 bg-gradient-to-br from-navy via-navy-dark to-[hsl(210,50%,8%)]">
            {/* Floating orbs for depth perception */}
            <motion.div
              className="absolute w-[600px] h-[600px] rounded-full bg-gradient-radial from-emerald/15 to-transparent blur-3xl"
              animate={{
                x: ["-20%", "10%", "-20%"],
                y: ["-30%", "-20%", "-30%"],
              }}
              transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
              style={{ top: "-20%", left: "-10%" }}
            />
            <motion.div
              className="absolute w-[500px] h-[500px] rounded-full bg-gradient-radial from-sand/10 to-transparent blur-3xl"
              animate={{
                x: ["10%", "-10%", "10%"],
                y: ["20%", "30%", "20%"],
              }}
              transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
              style={{ bottom: "-20%", right: "-10%" }}
            />
            <motion.div
              className="absolute w-[300px] h-[300px] rounded-full bg-gradient-radial from-primary/10 to-transparent blur-2xl"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.5, 0.3],
              }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
              style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}
            />
          </div>

          {/* Main content */}
          <div className="relative z-10 flex flex-col items-center justify-center px-6 max-w-4xl mx-auto">
            {/* Logo and brand */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="mb-8"
            >
              <div className="relative">
                {/* Glow effect */}
                <div className="absolute inset-0 w-24 h-24 bg-emerald/30 rounded-2xl blur-xl" />
                {/* Icon container */}
                <motion.div
                  className="relative w-24 h-24 bg-gradient-to-br from-emerald to-emerald-dark rounded-2xl flex items-center justify-center shadow-2xl"
                  animate={{ 
                    boxShadow: [
                      "0 0 30px rgba(46, 204, 113, 0.3)",
                      "0 0 50px rgba(46, 204, 113, 0.4)",
                      "0 0 30px rgba(46, 204, 113, 0.3)"
                    ]
                  }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Building2 className="w-12 h-12 text-white" />
                </motion.div>
              </div>
            </motion.div>

            {/* Brand name */}
            <motion.h1
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="font-display text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight"
            >
              ImmoPrestige
            </motion.h1>

            {/* Dynamic welcome messages */}
            <div className="h-16 flex items-center justify-center mb-12">
              <AnimatePresence mode="wait">
                <motion.p
                  key={messageIndex}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -20, opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  className="text-sand-light/90 text-lg md:text-xl font-body text-center"
                >
                  {welcomeMessages[messageIndex]}
                </motion.p>
              </AnimatePresence>
            </div>

            {/* Features grid - appears in phase 2 */}
            <AnimatePresence>
              {currentPhase >= 2 && (
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.6, staggerChildren: 0.1 }}
                  className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-12 w-full max-w-2xl"
                >
                  {features.map((feature, index) => (
                    <motion.div
                      key={feature.title}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1, duration: 0.5 }}
                      className="flex flex-col items-center text-center p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-colors"
                    >
                      <feature.icon className="w-8 h-8 text-emerald mb-2" />
                      <h3 className="text-white text-sm font-medium mb-1">{feature.title}</h3>
                      <p className="text-sand-light/60 text-xs">{feature.description}</p>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* CTA Button - appears in phase 3 */}
            <AnimatePresence>
              {currentPhase >= 3 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4 }}
                >
                  <Button
                    onClick={handleComplete}
                    size="lg"
                    className="bg-emerald hover:bg-emerald-dark text-white font-medium px-8 py-6 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all group"
                  >
                    Commencer
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Skip hint */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: canSkip ? 0.5 : 0 }}
              transition={{ duration: 0.3 }}
              className="absolute bottom-8 text-white/40 text-sm font-body"
            >
              Cliquez n'importe où pour continuer
            </motion.p>
          </div>

          {/* Progress indicator */}
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex gap-2">
            {[0, 1, 2, 3].map((phase) => (
              <motion.div
                key={phase}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  phase <= currentPhase ? "bg-emerald" : "bg-white/20"
                }`}
                animate={{ width: phase <= currentPhase ? 24 : 8 }}
              />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default WelcomeScreen;
