import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Bot, Send, Loader2, Sparkles, X, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";

type Message = { role: "user" | "assistant"; content: string };
type AdvisorContext = "unpaid" | "sales" | "parcels" | "all";

interface AIAdvisorChatProps {
  context: AdvisorContext;
  title?: string;
}

const CONTEXT_LABELS: Record<AdvisorContext, string> = {
  unpaid: "Recouvrement",
  sales: "Ventes immobilières",
  parcels: "Ventes de parcelles",
  all: "Conseil global",
};

const QUICK_PROMPTS: Record<AdvisorContext, string[]> = {
  unpaid: [
    "Analyse mes impayés et propose un plan de recouvrement",
    "Comment rédiger une mise en demeure efficace ?",
    "Quelles sont les étapes légales pour récupérer un impayé ?",
    "Conseils pour relancer un locataire en retard par WhatsApp",
  ],
  sales: [
    "Analyse mes ventes en cours et donne des recommandations",
    "Comment accélérer la conclusion de mes ventes ?",
    "Conseils pour suivre les échéances de paiement",
    "Comment sécuriser une transaction immobilière ?",
  ],
  parcels: [
    "Analyse mes ventes de parcelles et donne des conseils",
    "Comment optimiser la commercialisation de mes parcelles ?",
    "Stratégies pour relancer les acquéreurs en retard de paiement",
    "Comment gérer les paiements échelonnés efficacement ?",
  ],
  all: [
    "Fais un bilan global de ma situation et donne des recommandations",
    "Quelles sont mes priorités d'action aujourd'hui ?",
    "Comment améliorer mon taux de recouvrement ?",
    "Conseils pour développer mon activité immobilière",
  ],
};

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-advisor`;

export function AIAdvisorChat({ context, title }: AIAdvisorChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Message = { role: "user", content: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    let assistantSoFar = "";

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("Vous devez être connecté pour utiliser l'assistant IA");
      }

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          messages: [...messages, userMsg],
          context,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Erreur" }));
        throw new Error(err.error || "Erreur du service IA");
      }

      if (!resp.body) throw new Error("Pas de réponse");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantSoFar += content;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) =>
                    i === prev.length - 1 ? { ...m, content: assistantSoFar } : m
                  );
                }
                return [...prev, { role: "assistant", content: assistantSoFar }];
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }
    } catch (e: any) {
      toast({
        title: "Erreur",
        description: e.message || "Impossible de contacter l'assistant IA",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90"
        size="icon"
      >
        <Sparkles className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <Card className="fixed z-50 shadow-2xl flex flex-col border-primary/20 bottom-0 right-0 w-full h-[100dvh] sm:bottom-6 sm:right-6 sm:w-[95vw] sm:max-w-[420px] sm:h-[70vh] sm:max-h-[600px] sm:rounded-lg rounded-none">
      <CardHeader className="pb-2 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm sm:text-base flex items-center gap-1.5 sm:gap-2 min-w-0">
            <Bot className="h-5 w-5 text-primary flex-shrink-0" />
            <span className="truncate">{title || "Assistant IA"}</span>
            <Badge variant="secondary" className="text-[10px] sm:text-xs flex-shrink-0">
              {CONTEXT_LABELS[context]}
            </Badge>
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="h-8 w-8 flex-shrink-0">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-3 overflow-hidden p-3 pt-0">
        <ScrollArea className="flex-1" ref={scrollRef}>
          <div className="space-y-3 pr-3">
            {messages.length === 0 && (
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <Bot className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-muted-foreground">
                    Bonjour ! Je suis votre assistant IA spécialisé en gestion immobilière. Comment puis-je vous aider ?
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Suggestions :</p>
                  {QUICK_PROMPTS[context].map((prompt, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      size="sm"
                      className="w-full justify-start text-left h-auto py-2 text-xs whitespace-normal break-words"
                      onClick={() => sendMessage(prompt)}
                    >
                      <MessageCircle className="h-3 w-3 mr-2 flex-shrink-0" />
                      <span className="line-clamp-2">{prompt}</span>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:mb-1 [&>ul]:mb-1 [&>ol]:mb-1">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            ))}

            {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-xs">Analyse en cours...</span>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex gap-2 flex-shrink-0">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Posez votre question..."
            className="min-h-[40px] max-h-[80px] resize-none text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage(input);
              }
            }}
          />
          <Button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="flex-shrink-0 h-10 w-10"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
