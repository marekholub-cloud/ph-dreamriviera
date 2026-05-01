import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, UserPlus } from "lucide-react";

interface Obchodnik {
  id: string;
  full_name: string | null;
  email: string;
}

interface AssignObchodnikDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  currentObchodnikId: string | null;
  onSuccess: () => void;
}

export function AssignObchodnikDialog({
  open,
  onOpenChange,
  leadId,
  currentObchodnikId,
  onSuccess,
}: AssignObchodnikDialogProps) {
  const [obchodnici, setObchodnici] = useState<Obchodnik[]>([]);
  const [selectedObchodnik, setSelectedObchodnik] = useState<string>(currentObchodnikId || "");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      fetchObchodnici();
      setSelectedObchodnik(currentObchodnikId || "");
    }
  }, [open, currentObchodnikId]);

  const fetchObchodnici = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("user_roles")
        .select("user_id, profiles!inner(id, full_name, email)")
        .in("role", ["obchodnik", "senior_obchodnik"]);

      if (data) {
        const unique = Array.from(
          new Map(data.map((d: any) => [d.profiles.id, d.profiles])).values()
        ) as Obchodnik[];
        setObchodnici(unique);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedObchodnik) {
      toast.error("Vyberte obchodníka");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("leads")
        .update({ assigned_obchodnik_id: selectedObchodnik })
        .eq("id", leadId);

      if (error) throw error;

      toast.success("Obchodník byl přiřazen");
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Error assigning obchodnik:", error);
      toast.error("Nepodařilo se přiřadit obchodníka");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Přiřadit obchodníka</DialogTitle>
          <DialogDescription>
            Vyberte obchodníka, který bude tento lead zpracovávat
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <Label className="mb-2 block">Obchodník</Label>
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <Select value={selectedObchodnik} onValueChange={setSelectedObchodnik}>
              <SelectTrigger>
                <SelectValue placeholder="Vyberte obchodníka" />
              </SelectTrigger>
              <SelectContent>
                {obchodnici.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.full_name || o.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Zrušit
          </Button>
          <Button onClick={handleAssign} disabled={saving || !selectedObchodnik}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <UserPlus className="h-4 w-4 mr-2" />
            )}
            Přiřadit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
