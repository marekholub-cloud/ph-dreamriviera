import { useEffect, useState } from "react";
import { useSearchParams, Navigate } from "react-router-dom";
import { Loader2, Download, ExternalLink } from "lucide-react";

// Map brochure IDs to PDF file paths
const brochureFiles: { [key: string]: { path: string; name: string; displayName: string } } = {
  laperla: { 
    path: "/brochures/la-perla-beach-front.pdf", 
    name: "La-Perla-Beach-Front.pdf",
    displayName: "La Perla Beach Front Resort"
  },
  oceanviews: { 
    path: "/brochures/ocean-views-san-miguel.pdf", 
    name: "Ocean-Views-San-Miguel.pdf",
    displayName: "Ocean Views San Miguel"
  },
  villapark: { 
    path: "/brochures/villa-park-sandalo.pdf", 
    name: "Villa-Park-Sandalo.pdf",
    displayName: "Villa Park Sandalo"
  },
  oasis: { 
    path: "/brochures/oasis-de-coco.pdf", 
    name: "Oasis-de-Coco.pdf",
    displayName: "Oasis de Coco"
  },
  tropical: { 
    path: "/brochures/tropical-gardens-canaza.pdf", 
    name: "Tropical-Gardens-Canaza.pdf",
    displayName: "Tropical Gardens Cañaza"
  },
  catalog: { 
    path: "/katalog-domu-a-vil.pdf", 
    name: "Katalog-domu-a-vil.pdf",
    displayName: "Katalog vzorových vil"
  },
};

const DownloadFile = () => {
  const [searchParams] = useSearchParams();
  const fileId = searchParams.get("file");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [brochure, setBrochure] = useState<typeof brochureFiles[string] | null>(null);

  useEffect(() => {
    if (!fileId || !brochureFiles[fileId]) {
      setStatus("error");
      return;
    }

    const file = brochureFiles[fileId];
    setBrochure(file);

    // Small delay to ensure page renders first
    const timer = setTimeout(() => {
      // 1. Open PDF in new window for viewing
      window.open(file.path, '_blank', 'noopener,noreferrer');

      // 2. Trigger download with a slight delay
      setTimeout(() => {
        triggerDownload(file.path, file.name);
        setStatus("success");
      }, 300);
    }, 500);

    return () => clearTimeout(timer);
  }, [fileId]);

  const triggerDownload = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleManualDownload = () => {
    if (brochure) {
      triggerDownload(brochure.path, brochure.name);
    }
  };

  const handleManualView = () => {
    if (brochure) {
      window.open(brochure.path, '_blank', 'noopener,noreferrer');
    }
  };

  if (!fileId) {
    return <Navigate to="/villas-catalog" replace />;
  }

  if (status === "error") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <h1 className="text-3xl font-serif font-bold text-foreground mb-4">
            Soubor nenalezen
          </h1>
          <p className="text-muted-foreground mb-8">
            Omlouváme se, ale požadovaný soubor nebyl nalezen.
          </p>
          <a
            href="/nemovitosti"
            className="inline-block bg-accent text-accent-foreground px-6 py-3 rounded-md hover:bg-accent/90 transition-colors"
          >
            Zpět na nemovitosti
          </a>
        </div>
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-accent mx-auto mb-4" />
          <h1 className="text-2xl font-serif font-bold text-foreground mb-2">
            Připravujeme brožuru...
          </h1>
          <p className="text-muted-foreground">
            {brochure?.displayName || "Vaše brožura se připravuje ke stažení"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="mb-6">
          <svg
            className="h-16 w-16 text-green-500 mx-auto"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M5 13l4 4L19 7"></path>
          </svg>
        </div>
        <h1 className="text-3xl font-serif font-bold text-foreground mb-4">
          Brožura je připravena!
        </h1>
        <p className="text-muted-foreground mb-2">
          {brochure?.displayName}
        </p>
        <p className="text-sm text-muted-foreground mb-8">
          Brožura se otevřela v novém okně a stahování bylo zahájeno.
        </p>
        
        <div className="space-y-3 mb-8">
          <button
            onClick={handleManualView}
            className="w-full flex items-center justify-center gap-2 bg-accent text-accent-foreground px-6 py-3 rounded-md hover:bg-accent/90 transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            Otevřít znovu v novém okně
          </button>
          <button
            onClick={handleManualDownload}
            className="w-full flex items-center justify-center gap-2 bg-muted text-foreground px-6 py-3 rounded-md hover:bg-muted/80 transition-colors"
          >
            <Download className="h-4 w-4" />
            Stáhnout znovu
          </button>
        </div>

        <div className="pt-6 border-t border-border">
          <a
            href="/"
            className="text-accent hover:underline"
          >
            ← Zpět na hlavní stránku
          </a>
        </div>
      </div>
    </div>
  );
};

export default DownloadFile;