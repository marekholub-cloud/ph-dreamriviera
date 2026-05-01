import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Download, FileText, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import logoImage from "@/assets/logo-produbai.png";

const brochureFiles: Record<string, { path: string; name: string; displayName: string }> = {
  "investice-kostarika": {
    path: "/brochures/investice-kostarika.pdf",
    name: "investice-kostarika.pdf",
    displayName: "Investice v Kostarice",
  },
};

const DirectDownload = () => {
  const [searchParams] = useSearchParams();
  const fileId = searchParams.get("file") || "investice-kostarika";
  const [downloaded, setDownloaded] = useState(false);
  
  const brochure = brochureFiles[fileId];

  const handleDownload = () => {
    if (!brochure) return;
    
    const link = document.createElement("a");
    link.href = brochure.path;
    link.download = brochure.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setDownloaded(true);
  };

  const handleView = () => {
    if (!brochure) return;
    window.open(brochure.path, "_blank");
  };

  if (!brochure) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8">
            <p className="text-muted-foreground">Soubor nebyl nalezen.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <img src={logoImage} alt="CAD Logo" className="h-12 w-auto" />
          </div>
          <CardTitle className="text-2xl font-serif">{brochure.displayName}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
              {downloaded ? (
                <CheckCircle className="w-10 h-10 text-primary" />
              ) : (
                <FileText className="w-10 h-10 text-primary" />
              )}
            </div>
          </div>
          
          <p className="text-center text-muted-foreground">
            {downloaded 
              ? "Brožura byla stažena. Můžete ji znovu stáhnout nebo zobrazit."
              : "Klikněte na tlačítko níže pro stažení brožury ve formátu PDF."
            }
          </p>

          <div className="flex flex-col gap-3">
            <Button onClick={handleDownload} className="w-full">
              <Download className="mr-2 h-4 w-4" />
              Stáhnout PDF
            </Button>
            <Button variant="outline" onClick={handleView} className="w-full">
              <FileText className="mr-2 h-4 w-4" />
              Zobrazit v prohlížeči
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            © {new Date().getFullYear()} Costa Adela Development
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default DirectDownload;
