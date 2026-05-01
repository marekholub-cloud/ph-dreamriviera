import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { EmbeddableSupertipForm } from "@/components/tipar/EmbeddableSupertipForm";

const EmbedInvestorForm = () => {
  const [searchParams] = useSearchParams();
  const [affiliateCode, setAffiliateCode] = useState<string>("");
  const [isValid, setIsValid] = useState(false);
  
  const hideProgress = searchParams.get("hideProgress") === "true";
  const theme = (searchParams.get("theme") as "light" | "dark") || "light";

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref && ref.length >= 6) {
      setAffiliateCode(ref);
      setIsValid(true);
    }
  }, [searchParams]);

  // Apply theme class to body for iframe
  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  const handleComplete = () => {
    // Notify parent window of completion
    if (window.parent !== window) {
      window.parent.postMessage({
        type: 'INVESTOR_FORM_COMPLETE',
        success: true,
      }, '*');
    }
  };

  if (!isValid) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-destructive mb-2">
            Neplatný odkaz
          </h1>
          <p className="text-muted-foreground text-sm">
            Tento formulář vyžaduje platný referenční kód.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <Toaster />
      <EmbeddableSupertipForm
        affiliateCode={affiliateCode}
        onComplete={handleComplete}
        hideProgress={hideProgress}
        theme={theme}
      />
    </div>
  );
};

export default EmbedInvestorForm;
