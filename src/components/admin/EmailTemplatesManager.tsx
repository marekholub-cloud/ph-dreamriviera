import { useState, useEffect } from "react";
import DOMPurify from "dompurify";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { 
  Mail, 
  Edit2, 
  Eye, 
  Save, 
  X, 
  Users, 
  Bell, 
  UserCheck,
  Calendar,
  Key,
  MessageSquare,
  FileText,
  TrendingUp,
  AlertCircle,
  Check
} from "lucide-react";

type EmailTemplateCategory = 'system' | 'team' | 'customer';
type EmailTemplateTrigger = 
  | 'password_reset' 
  | 'email_confirmation' 
  | 'welcome_email'
  | 'event_registration_customer'
  | 'event_registration_tipar'
  | 'event_registration_obchodnik'
  | 'event_reminder_customer'
  | 'event_cancelled'
  | 'lead_status_change'
  | 'lead_level_upgrade'
  | 'milestone_reached'
  | 'new_contact_message'
  | 'brochure_request'
  | 'catalog_download';

interface EmailTemplate {
  id: string;
  event_id: string | null;
  trigger: EmailTemplateTrigger;
  category: EmailTemplateCategory;
  name: string;
  subject: string;
  html_content: string;
  is_active: boolean;
  description: string | null;
  variables: string[];
  created_at: string;
  updated_at: string;
}

interface Event {
  id: string;
  title: string;
}

const triggerLabels: Record<EmailTemplateTrigger, { label: string; icon: React.ReactNode }> = {
  password_reset: { label: 'Obnovení hesla', icon: <Key className="h-4 w-4" /> },
  email_confirmation: { label: 'Potvrzení emailu', icon: <Check className="h-4 w-4" /> },
  welcome_email: { label: 'Uvítací email', icon: <UserCheck className="h-4 w-4" /> },
  event_registration_customer: { label: 'Registrace - zákazník', icon: <Calendar className="h-4 w-4" /> },
  event_registration_tipar: { label: 'Registrace - tipař', icon: <Users className="h-4 w-4" /> },
  event_registration_obchodnik: { label: 'Registrace - obchodník', icon: <Bell className="h-4 w-4" /> },
  event_reminder_customer: { label: 'Připomínka události', icon: <Calendar className="h-4 w-4" /> },
  event_cancelled: { label: 'Zrušení události', icon: <AlertCircle className="h-4 w-4" /> },
  lead_status_change: { label: 'Změna statusu leadu', icon: <TrendingUp className="h-4 w-4" /> },
  lead_level_upgrade: { label: 'Upgrade úrovně leadu', icon: <TrendingUp className="h-4 w-4" /> },
  milestone_reached: { label: 'Dosažení milníku', icon: <TrendingUp className="h-4 w-4" /> },
  new_contact_message: { label: 'Nová kontaktní zpráva', icon: <MessageSquare className="h-4 w-4" /> },
  brochure_request: { label: 'Žádost o brožuru', icon: <FileText className="h-4 w-4" /> },
  catalog_download: { label: 'Stažení katalogu', icon: <FileText className="h-4 w-4" /> },
};

const categoryLabels: Record<EmailTemplateCategory, { label: string; description: string }> = {
  system: { label: 'Systémové notifikace', description: 'Automatické systémové emaily (hesla, potvrzení)' },
  team: { label: 'Týmové notifikace', description: 'Interní notifikace pro tipaře a obchodníky' },
  customer: { label: 'Komunikace se zákazníkem', description: 'Emaily směřované k zákazníkům' },
};

export default function EmailTemplatesManager() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    subject: '',
    html_content: '',
    is_active: true,
    description: '',
    event_id: '' as string | null,
  });
  const [selectedCategory, setSelectedCategory] = useState<EmailTemplateCategory>('system');
  const [filterEventId, setFilterEventId] = useState<string>('all');

  useEffect(() => {
    fetchTemplates();
    fetchEvents();
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('category', { ascending: true })
        .order('trigger', { ascending: true });

      if (error) throw error;
      
      const parsedTemplates = (data || []).map(t => ({
        ...t,
        variables: Array.isArray(t.variables) ? t.variables : JSON.parse(t.variables as string || '[]')
      })) as EmailTemplate[];
      
      setTemplates(parsedTemplates);
    } catch (error: any) {
      toast({
        title: "Chyba",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('id, title')
        .order('title');

      if (error) throw error;
      setEvents(data || []);
    } catch (error: any) {
      console.error('Error fetching events:', error);
    }
  };

  const handleEdit = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setEditForm({
      name: template.name,
      subject: template.subject,
      html_content: template.html_content,
      is_active: template.is_active,
      description: template.description || '',
      event_id: template.event_id,
    });
    setIsEditing(true);
  };

  const handlePreview = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setIsPreviewing(true);
  };

  const handleSave = async () => {
    if (!selectedTemplate) return;

    try {
      const { error } = await supabase
        .from('email_templates')
        .update({
          name: editForm.name,
          subject: editForm.subject,
          html_content: editForm.html_content,
          is_active: editForm.is_active,
          description: editForm.description || null,
          event_id: editForm.event_id || null,
        })
        .eq('id', selectedTemplate.id);

      if (error) throw error;

      toast({
        title: "Uloženo",
        description: "Šablona byla úspěšně aktualizována.",
      });

      setIsEditing(false);
      fetchTemplates();
    } catch (error: any) {
      toast({
        title: "Chyba",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (template: EmailTemplate) => {
    try {
      const { error } = await supabase
        .from('email_templates')
        .update({ is_active: !template.is_active })
        .eq('id', template.id);

      if (error) throw error;

      toast({
        title: template.is_active ? "Deaktivováno" : "Aktivováno",
        description: `Šablona "${template.name}" byla ${template.is_active ? 'deaktivována' : 'aktivována'}.`,
      });

      fetchTemplates();
    } catch (error: any) {
      toast({
        title: "Chyba",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getFilteredTemplates = (category: EmailTemplateCategory) => {
    return templates.filter(t => {
      const categoryMatch = t.category === category;
      const eventMatch = filterEventId === 'all' || 
        (filterEventId === 'global' && !t.event_id) ||
        t.event_id === filterEventId;
      return categoryMatch && eventMatch;
    });
  };

  const renderPreviewContent = (template: EmailTemplate) => {
    let content = template.html_content;
    template.variables.forEach((variable) => {
      const regex = new RegExp(`{{${variable}}}`, 'g');
      content = content.replace(regex, `<span class="bg-primary/20 px-1 rounded">[${variable}]</span>`);
    });
    return DOMPurify.sanitize(content, {
      ALLOWED_TAGS: ['strong', 'em', 'br', 'b', 'i', 'p', 'span', 'div', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'table', 'tr', 'td', 'th', 'thead', 'tbody', 'img'],
      ALLOWED_ATTR: ['class', 'href', 'style', 'src', 'alt', 'width', 'height']
    });
  };

  const renderTemplateCard = (template: EmailTemplate) => (
    <Card key={template.id} className={`bg-card border-border/50 transition-all ${!template.is_active ? 'opacity-60' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {triggerLabels[template.trigger]?.icon}
            <div>
              <CardTitle className="text-sm font-medium">{template.name}</CardTitle>
              <CardDescription className="text-xs text-muted-foreground/70 mt-1">
                {triggerLabels[template.trigger]?.label}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {template.event_id && (
              <Badge variant="outline" className="text-xs">
                {events.find(e => e.id === template.event_id)?.title || 'Event'}
              </Badge>
            )}
            <Badge variant={template.is_active ? "default" : "secondary"}>
              {template.is_active ? 'Aktivní' : 'Neaktivní'}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-3">{template.description}</p>
        <div className="text-xs text-muted-foreground mb-3">
          <strong>Předmět:</strong> {template.subject}
        </div>
        {template.variables.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {template.variables.map((v: string) => (
              <Badge key={v} variant="outline" className="text-xs font-mono">
                {`{{${v}}}`}
              </Badge>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => handlePreview(template)}>
            <Eye className="h-3 w-3 mr-1" />
            Náhled
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleEdit(template)}>
            <Edit2 className="h-3 w-3 mr-1" />
            Upravit
          </Button>
          <Button 
            size="sm" 
            variant={template.is_active ? "ghost" : "default"}
            onClick={() => handleToggleActive(template)}
          >
            {template.is_active ? 'Deaktivovat' : 'Aktivovat'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-medium text-muted-foreground flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Emailové šablony
          </h2>
          <p className="text-xs text-muted-foreground/70">
            Správa emailových notifikací pro události a systémové zprávy
          </p>
        </div>
        <Select value={filterEventId} onValueChange={setFilterEventId}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filtrovat dle eventu" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všechny šablony</SelectItem>
            <SelectItem value="global">Pouze globální</SelectItem>
            {events.map(event => (
              <SelectItem key={event.id} value={event.id}>{event.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as EmailTemplateCategory)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="system" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            Systém
          </TabsTrigger>
          <TabsTrigger value="team" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Tým
          </TabsTrigger>
          <TabsTrigger value="customer" className="flex items-center gap-2">
            <UserCheck className="h-4 w-4" />
            Zákazník
          </TabsTrigger>
        </TabsList>

        {(['system', 'team', 'customer'] as EmailTemplateCategory[]).map(category => (
          <TabsContent key={category} value={category} className="mt-6">
            <Card className="mb-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{categoryLabels[category].label}</CardTitle>
                <CardDescription>{categoryLabels[category].description}</CardDescription>
              </CardHeader>
            </Card>
            
            <div className="grid gap-4 md:grid-cols-2">
              {getFilteredTemplates(category).map(renderTemplateCard)}
            </div>

            {getFilteredTemplates(category).length === 0 && (
              <Card className="p-8 text-center text-muted-foreground">
                <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Žádné šablony v této kategorii</p>
              </Card>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Upravit šablonu: {selectedTemplate?.name}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Název šablony</Label>
                  <Input
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Přiřadit k eventu (volitelné)</Label>
                  <Select 
                    value={editForm.event_id || 'global'} 
                    onValueChange={(v) => setEditForm({ ...editForm, event_id: v === 'global' ? null : v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Globální šablona" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="global">Globální šablona</SelectItem>
                      {events.map(event => (
                        <SelectItem key={event.id} value={event.id}>{event.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Předmět emailu</Label>
                <Input
                  value={editForm.subject}
                  onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Popis šablony</Label>
                <Input
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  placeholder="Interní popis pro správu"
                />
              </div>

              <div className="space-y-2">
                <Label>HTML obsah</Label>
                <Textarea
                  value={editForm.html_content}
                  onChange={(e) => setEditForm({ ...editForm, html_content: e.target.value })}
                  className="min-h-[300px] font-mono text-sm"
                />
              </div>

              {selectedTemplate?.variables && selectedTemplate.variables.length > 0 && (
                <div className="space-y-2">
                  <Label>Dostupné proměnné</Label>
                  <div className="flex flex-wrap gap-2">
                    {selectedTemplate.variables.map((v: string) => (
                      <Badge 
                        key={v} 
                        variant="secondary" 
                        className="cursor-pointer font-mono"
                        onClick={() => {
                          setEditForm({
                            ...editForm,
                            html_content: editForm.html_content + `{{${v}}}`
                          });
                        }}
                      >
                        {`{{${v}}}`}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">Kliknutím vložíte proměnnou do obsahu</p>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Switch
                  checked={editForm.is_active}
                  onCheckedChange={(checked) => setEditForm({ ...editForm, is_active: checked })}
                />
                <Label>Šablona aktivní</Label>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              <X className="h-4 w-4 mr-2" />
              Zrušit
            </Button>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Uložit změny
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={isPreviewing} onOpenChange={setIsPreviewing}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Náhled: {selectedTemplate?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted p-3 rounded-lg">
              <p className="text-sm"><strong>Předmět:</strong> {selectedTemplate?.subject}</p>
            </div>
            <ScrollArea className="h-[400px] border rounded-lg">
              <div 
                className="p-4 bg-white text-black"
                dangerouslySetInnerHTML={{ 
                  __html: selectedTemplate ? renderPreviewContent(selectedTemplate) : '' 
                }}
              />
            </ScrollArea>
            {selectedTemplate?.variables && selectedTemplate.variables.length > 0 && (
              <div className="text-sm text-muted-foreground">
                <strong>Proměnné:</strong> {selectedTemplate.variables.map(v => `{{${v}}}`).join(', ')}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
