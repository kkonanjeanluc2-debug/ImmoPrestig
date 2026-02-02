import { Component, ReactNode } from "react";
import { WifiOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  isChunkLoadError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, isChunkLoadError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Check if it's a chunk loading error (dynamic import failure)
    const isChunkLoadError = 
      error.message.includes("Failed to fetch dynamically imported module") ||
      error.message.includes("Loading chunk") ||
      error.message.includes("Failed to load");
    
    return { hasError: true, isChunkLoadError };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleRetry = () => {
    // Clear the error state and try to reload
    this.setState({ hasError: false, isChunkLoadError: false });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.state.isChunkLoadError) {
        return (
          <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <div className="text-center space-y-6 max-w-md">
              <div className="flex justify-center">
                <div className="p-4 rounded-full bg-muted">
                  <WifiOff className="h-12 w-12 text-muted-foreground" />
                </div>
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-semibold text-foreground">
                  Problème de connexion
                </h1>
                <p className="text-muted-foreground">
                  Impossible de charger la page. Vérifiez votre connexion internet et réessayez.
                </p>
              </div>
              <Button onClick={this.handleRetry} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Réessayer
              </Button>
            </div>
          </div>
        );
      }

      // Generic error fallback
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="text-center space-y-6 max-w-md">
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold text-foreground">
                Une erreur est survenue
              </h1>
              <p className="text-muted-foreground">
                Veuillez rafraîchir la page pour continuer.
              </p>
            </div>
            <Button onClick={this.handleRetry} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Rafraîchir
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
