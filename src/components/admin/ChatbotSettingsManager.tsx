import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Bot, Clock, MessageSquare, Bell, Settings2, FileText } from "lucide-react";

interface ChatbotSettings {
  auto_open_enabled: boolean;
  auto_open_delay_seconds: number;
  reminder_enabled: boolean;
  reminder_delay_seconds: number;
  welcome_message: string;
  system_prompt: string;
}

export const ChatbotSettingsManager = () => {
  const [settings, setSettings] = useState<ChatbotSettings>({
    auto_open_enabled: true,
    auto_open_delay_seconds: 20,
    reminder_enabled: true,
    reminder_delay_seconds: 600,
    welcome_message: "Ahoj 👋 Jsem tvůj virtuální průvodce investicemi v Dubaji.",
    system_prompt: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("chatbot_settings")
        .select("setting_key, setting_value");

      if (error) throw error;

      if (data) {
        const newSettings: Partial<ChatbotSettings> = {};
        data.forEach((item) => {
          const value = item.setting_value;
          switch (item.setting_key) {
            case "auto_open_enabled":
              newSettings.auto_open_enabled = value === true || value === "true";
              break;
            case "auto_open_delay_seconds":
              newSettings.auto_open_delay_seconds = typeof value === "number" ? value : parseInt(String(value), 10);
              break;
            case "reminder_enabled":
              newSettings.reminder_enabled = value === true || value === "true";
              break;
            case "reminder_delay_seconds":
              newSettings.reminder_delay_seconds = typeof value === "number" ? value : parseInt(String(value), 10);
              break;
            case "welcome_message":
              newSettings.welcome_message = typeof value === "string" ? value : String(value);
              break;
            case "system_prompt":
              newSettings.system_prompt = typeof value === "string" ? value : String(value);
              break;
          }
        });
        setSettings((prev) => ({ ...prev, ...newSettings }));
      }
    } catch (error) {
      console.error("Error fetching chatbot settings:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se načíst nastavení chatbota",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveSetting = async (key: string, value: any) => {
    const { error } = await supabase
      .from("chatbot_settings")
      .upsert(
        { setting_key: key, setting_value: value },
        { onConflict: "setting_key" }
      );

    if (error) throw error;
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      await Promise.all([
        saveSetting("auto_open_enabled", settings.auto_open_enabled),
        saveSetting("auto_open_delay_seconds", settings.auto_open_delay_seconds),
        saveSetting("reminder_enabled", settings.reminder_enabled),
        saveSetting("reminder_delay_seconds", settings.reminder_delay_seconds),
        saveSetting("welcome_message", settings.welcome_message),
        saveSetting("system_prompt", settings.system_prompt),
      ]);

      toast({
        title: "Uloženo",
        description: "Nastavení chatbota bylo úspěšně uloženo",
      });
    } catch (error) {
      console.error("Error saving chatbot settings:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se uložit nastavení",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-medium text-muted-foreground flex items-center gap-2">
            <Bot className="w-5 h-5 text-primary" />
            Nastavení chatbota
          </h2>
          <p className="text-xs text-muted-foreground/70">
            Konfigurace chování a obsahu investičního chatbota
          </p>
        </div>
        <Button onClick={handleSaveAll} disabled={isSaving} size="sm">
          {isSaving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Uložit změny
        </Button>
      </div>

      <Tabs defaultValue="behavior" className="space-y-6">
        <TabsList>
          <TabsTrigger value="behavior" className="flex items-center gap-2">
            <Settings2 className="w-4 h-4" />
            Chování
          </TabsTrigger>
          <TabsTrigger value="content" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Obsah & Prompt
          </TabsTrigger>
        </TabsList>

        <TabsContent value="behavior" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Auto-open settings */}
            <Card className="bg-card border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium text-muted-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  Automatické otevření
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground/70">
                  Nastavení automatického zobrazení chatbota návštěvníkům
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="auto-open" className="flex flex-col gap-1">
                    <span>Povolit auto-open</span>
                    <span className="text-xs text-muted-foreground font-normal">
                      Chatbot se automaticky otevře po nastavené době
                    </span>
                  </Label>
                  <Switch
                    id="auto-open"
                    checked={settings.auto_open_enabled}
                    onCheckedChange={(checked) =>
                      setSettings((prev) => ({ ...prev, auto_open_enabled: checked }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="auto-open-delay">
                    Zpoždění před otevřením (sekundy)
                  </Label>
                  <Input
                    id="auto-open-delay"
                    type="number"
                    min={5}
                    max={300}
                    value={settings.auto_open_delay_seconds}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        auto_open_delay_seconds: parseInt(e.target.value, 10) || 20,
                      }))
                    }
                    disabled={!settings.auto_open_enabled}
                  />
                  <p className="text-xs text-muted-foreground">
                    Doporučeno: 15-30 sekund
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Reminder settings */}
            <Card className="bg-card border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium text-muted-foreground flex items-center gap-2">
                  <Bell className="w-4 h-4 text-primary" />
                  Připomínky
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground/70">
                  Nastavení opětovného zobrazení po zavření chatbota
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="reminder" className="flex flex-col gap-1">
                    <span>Povolit připomínky</span>
                    <span className="text-xs text-muted-foreground font-normal">
                      Chatbot se znovu otevře po nastavené době
                    </span>
                  </Label>
                  <Switch
                    id="reminder"
                    checked={settings.reminder_enabled}
                    onCheckedChange={(checked) =>
                      setSettings((prev) => ({ ...prev, reminder_enabled: checked }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reminder-delay">
                    Zpoždění připomínky (sekundy)
                  </Label>
                  <Input
                    id="reminder-delay"
                    type="number"
                    min={60}
                    max={3600}
                    value={settings.reminder_delay_seconds}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        reminder_delay_seconds: parseInt(e.target.value, 10) || 600,
                      }))
                    }
                    disabled={!settings.reminder_enabled}
                  />
                  <p className="text-xs text-muted-foreground">
                    Doporučeno: 300-600 sekund (5-10 minut)
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Preview */}
          <Card className="bg-card border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium text-muted-foreground">Náhled chování</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground/70 space-y-2">
              <p>
                {settings.auto_open_enabled
                  ? `✅ Chatbot se automaticky otevře po ${settings.auto_open_delay_seconds} sekundách`
                  : "❌ Automatické otevření je vypnuto"}
              </p>
              <p>
                {settings.reminder_enabled
                  ? `✅ Po zavření se chatbot znovu připomene za ${Math.floor(settings.reminder_delay_seconds / 60)} minut`
                  : "❌ Připomínky jsou vypnuty"}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content" className="space-y-6">
          {/* Welcome message */}
          <Card className="bg-card border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium text-muted-foreground flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary" />
                Úvodní zpráva
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground/70">
                Zpráva, kterou chatbot zobrazí při prvním kontaktu (není zatím implementováno v chatbotu)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={settings.welcome_message}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    welcome_message: e.target.value,
                  }))
                }
                rows={3}
                placeholder="Zadejte úvodní zprávu chatbota..."
              />
              <p className="text-xs text-muted-foreground mt-2">
                Můžete použít emoji pro přátelštější vzhled 👋
              </p>
            </CardContent>
          </Card>

          {/* System prompt */}
          <Card className="bg-card border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium text-muted-foreground flex items-center gap-2">
                <Bot className="w-4 h-4 text-primary" />
                Systémový prompt (AI instrukce)
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground/70">
                Instrukce pro AI model, které definují chování a osobnost chatbota.
                Změny se projeví okamžitě pro nové konverzace.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={settings.system_prompt}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    system_prompt: e.target.value,
                  }))
                }
                rows={20}
                className="font-mono text-sm"
                placeholder="Zadejte systémový prompt pro AI..."
              />
              <p className="text-xs text-muted-foreground mt-2">
                Tip: Definujte roli, styl komunikace, pravidla a cíle konverzace.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
