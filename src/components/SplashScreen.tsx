import { useState, useEffect } from "react";
import { Building2 } from "lucide-react";

interface SplashScreenProps {
  onComplete: () => void;
  minDuration?: number;
}

const SplashScreen = ({ onComplete, minDuration = 2000 }: SplashScreenProps) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(onComplete, 500); // Wait for exit animation
    }, minDuration);

    return () => clearTimeout(timer);
  }, [onComplete, minDuration]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-navy via-navy-dark to-emerald-dark transition-opacity duration-500 ${
        isExiting ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-radial from-emerald/20 to-transparent rounded-full animate-pulse" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-radial from-sand/10 to-transparent rounded-full animate-pulse delay-300" />
      </div>

      {/* Logo and content */}
      <div className="relative z-10 flex flex-col items-center space-y-6">
        {/* Animated icon container */}
        <div className="relative">
          {/* Outer ring */}
          <div className="absolute inset-0 w-28 h-28 border-4 border-emerald/30 rounded-full animate-[spin_3s_linear_infinite]" />
          
          {/* Middle ring */}
          <div className="absolute inset-2 w-24 h-24 border-2 border-sand/40 rounded-full animate-[spin_2s_linear_infinite_reverse]" />
          
          {/* Icon container */}
          <div className="w-28 h-28 flex items-center justify-center">
            <div className="w-20 h-20 bg-gradient-to-br from-emerald to-emerald-dark rounded-2xl flex items-center justify-center shadow-2xl animate-[scale-in_0.5s_ease-out_forwards] transform">
              <Building2 className="w-10 h-10 text-white animate-[fade-in_0.8s_ease-out_0.3s_forwards] opacity-0" />
            </div>
          </div>
        </div>

        {/* App name with staggered animation */}
        <div className="flex flex-col items-center space-y-2">
          <h1 className="font-display text-4xl font-bold text-white animate-[fade-in_0.6s_ease-out_0.4s_forwards] opacity-0">
            PropertyGrace
          </h1>
          <p className="text-sand-light/80 text-sm font-body tracking-wider uppercase animate-[fade-in_0.6s_ease-out_0.6s_forwards] opacity-0">
            Gestion Immobilière
          </p>
        </div>

        {/* Loading indicator */}
        <div className="flex items-center space-x-2 animate-[fade-in_0.6s_ease-out_0.8s_forwards] opacity-0">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-emerald rounded-full animate-bounce [animation-delay:0ms]" />
            <div className="w-2 h-2 bg-emerald rounded-full animate-bounce [animation-delay:150ms]" />
            <div className="w-2 h-2 bg-emerald rounded-full animate-bounce [animation-delay:300ms]" />
          </div>
        </div>
      </div>

      {/* Bottom branding */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-center animate-[fade-in_0.6s_ease-out_1s_forwards] opacity-0">
        <p className="text-white/40 text-xs font-body">
          Propulsé par Lovable
        </p>
      </div>
    </div>
  );
};

export default SplashScreen;
