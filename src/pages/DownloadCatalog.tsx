import { useEffect, useState } from "react";
import { useSearchParams, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

// Map brochure IDs to PDF file paths
const brochureFiles: { [key: string]: { path: string; name: string } } = {
  laperla: { path: "/brochures/la-perla-beach-front.pdf", name: "La-Perla-Beach-Front.pdf" },
  oceanviews: { path: "/brochures/ocean-views-san-miguel.pdf", name: "Ocean-Views-San-Miguel.pdf" },
  villapark: { path: "/brochures/villa-park-sandalo.pdf", name: "Villa-Park-Sandalo.pdf" },
  oasis: { path: "/brochures/oasis-de-coco.pdf", name: "Oasis-de-Coco.pdf" },
  tropical: { path: "/brochures/tropical-gardens-canaza.pdf", name: "Tropical-Gardens-Canaza.pdf" },
  catalog: { path: "/katalog-domu-a-vil.pdf", name: "Katalog-domu-a-vil.pdf" },
};

const DownloadCatalog = () => {
  const [searchParams] = useSearchParams();
  const requestId = searchParams.get("requestId");
  const [downloading, setDownloading] = useState(true);
  const [error, setError] = useState(false);
  const [downloadedFiles, setDownloadedFiles] = useState<string[]>([]);

  // Track individual brochure download via edge function
  const trackBrochureDownload = async (brochureId: string, clientId: string | null) => {
    try {
      const { error } = await supabase.functions.invoke("track-download", {
        body: {
          brochure_request_id: requestId,
          client_id: clientId,
        },
      });
      if (error) {
        console.error("Error tracking brochure download:", error);
      }
    } catch (err) {
      console.error("Error tracking download:", err);
    }
  };

  useEffect(() => {
    const trackAndDownload = async () => {
      if (!requestId) {
        setError(true);
        setDownloading(false);
        return;
      }

      try {
        // Fetch the request data via secure edge function (no direct DB access)
        const { data: response, error: fetchError } = await supabase.functions.invoke('get-brochure-request', {
          body: { requestId }
        });

        if (fetchError || !response?.success) {
          console.error("Error fetching request:", fetchError || response?.error);
          // Fallback to catalog download
          downloadFile("/katalog-domu-a-vil.pdf");
          trackBrochureDownload("catalog", null);
          setDownloadedFiles(["Katalog domů a vil"]);
          setDownloading(false);
          return;
        }

        const requestData = response.data;

        const selectedBrochures = requestData?.selectedBrochures as string[] || [];
        const requestType = requestData?.requestType;
        const clientId = requestData?.clientId as string | null;

        // Determine which files to download
        if (requestType === "catalog" || selectedBrochures.length === 0) {
          // Download the main catalog
          downloadFile("/katalog-domu-a-vil.pdf");
          trackBrochureDownload("catalog", clientId);
          setDownloadedFiles(["Katalog domů a vil"]);
        } else {
          // Download selected brochures
          const filesToDownload: string[] = [];
          
          selectedBrochures.forEach((brochureId, index) => {
            const brochure = brochureFiles[brochureId];
            if (brochure) {
              // Stagger downloads to avoid browser blocking
              setTimeout(() => {
                downloadFile(brochure.path);
                trackBrochureDownload(brochureId, clientId);
              }, index * 500);
              filesToDownload.push(brochure.name.replace(/-/g, " ").replace(".pdf", ""));
            }
          });
          
          setDownloadedFiles(filesToDownload);
        }

        // Wait a bit before showing success
        setTimeout(() => {
          setDownloading(false);
        }, 1500 + (selectedBrochures.length * 500));
      } catch (err) {
        console.error("Error during download:", err);
        setError(true);
        setDownloading(false);
      }
    };

    trackAndDownload();
  }, [requestId]);

  const downloadFile = (url: string) => {
    // Open PDF in new tab/window
    const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
    if (!newWindow) {
      // Fallback if popup blocked - create link without download attribute to open in new tab
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (!requestId) {
    return <Navigate to="/villas-catalog" replace />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <h1 className="text-3xl font-serif font-bold text-foreground mb-4">
            Chyba při stahování
          </h1>
          <p className="text-muted-foreground mb-8">
            Omlouváme se, ale při stahování materiálů došlo k chybě. Zkuste to prosím znovu nebo nás kontaktujte.
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

  if (downloading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-accent mx-auto mb-4" />
          <h1 className="text-2xl font-serif font-bold text-foreground mb-2">
            Stahování materiálů...
          </h1>
          <p className="text-muted-foreground">
            Vaše brožury se právě stahují
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
          Materiály byly staženy!
        </h1>
        <p className="text-muted-foreground mb-4">
          Děkujeme za váš zájem. Následující soubory byly staženy:
        </p>
        {downloadedFiles.length > 0 && (
          <ul className="text-left mb-8 bg-muted/50 rounded-lg p-4">
            {downloadedFiles.map((file, index) => (
              <li key={index} className="text-foreground py-1 flex items-center">
                <svg className="h-4 w-4 text-green-500 mr-2" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                  <path d="M5 13l4 4L19 7"></path>
                </svg>
                {file}
              </li>
            ))}
          </ul>
        )}
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Pokud se stahování nespustilo automaticky, zkuste obnovit stránku nebo nás kontaktujte.
          </p>
          <a
            href="/"
            className="inline-block bg-accent text-accent-foreground px-6 py-3 rounded-md hover:bg-accent/90 transition-colors"
          >
            Zpět na hlavní stránku
          </a>
        </div>
      </div>
    </div>
  );
};

export default DownloadCatalog;
