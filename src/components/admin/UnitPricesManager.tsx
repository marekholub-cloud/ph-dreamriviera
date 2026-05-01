import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface UnitPrice {
  id: string;
  property_id: string;
  unit_type: string;
  price_from: number | null;
  price_formatted: string | null;
  area_sqm_from: string | null;
  area_sqm_to: string | null;
  sort_order: number | null;
}

interface Property {
  id: string;
  name: string;
}

const UNIT_TYPES = [
  "Studio",
  "1 Bedroom",
  "2 Bedroom",
  "3 Bedroom",
  "4 Bedroom",
  "5 Bedroom",
  "Penthouse",
  "Townhouse",
  "Villa",
  "Duplex",
];

export function UnitPricesManager() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<UnitPrice | null>(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");
  const [formData, setFormData] = useState({
    property_id: "",
    unit_type: "",
    price_from: "",
    price_formatted: "",
    area_sqm_from: "",
    area_sqm_to: "",
    sort_order: "0",
  });

  // Fetch properties for dropdown
  const { data: properties = [] } = useQuery({
    queryKey: ["admin-properties-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data as Property[];
    },
  });

  // Fetch unit prices for selected property
  const { data: unitPrices = [], isLoading } = useQuery({
    queryKey: ["unit-prices", selectedPropertyId],
    queryFn: async () => {
      if (!selectedPropertyId) return [];
      const { data, error } = await supabase
        .from("property_unit_prices")
        .select("*")
        .eq("property_id", selectedPropertyId)
        .order("sort_order");
      if (error) throw error;
      return data as UnitPrice[];
    },
    enabled: !!selectedPropertyId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("property_unit_prices").insert({
        property_id: data.property_id,
        unit_type: data.unit_type,
        price_from: data.price_from ? parseFloat(data.price_from) : null,
        price_formatted: data.price_formatted || null,
        area_sqm_from: data.area_sqm_from || null,
        area_sqm_to: data.area_sqm_to || null,
        sort_order: parseInt(data.sort_order) || 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unit-prices"] });
      toast.success("Cenová položka přidána");
      resetForm();
    },
    onError: (error: Error) => {
      toast.error("Chyba: " + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData & { id: string }) => {
      const { error } = await supabase
        .from("property_unit_prices")
        .update({
          unit_type: data.unit_type,
          price_from: data.price_from ? parseFloat(data.price_from) : null,
          price_formatted: data.price_formatted || null,
          area_sqm_from: data.area_sqm_from || null,
          area_sqm_to: data.area_sqm_to || null,
          sort_order: parseInt(data.sort_order) || 0,
        })
        .eq("id", data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unit-prices"] });
      toast.success("Cenová položka aktualizována");
      resetForm();
    },
    onError: (error: Error) => {
      toast.error("Chyba: " + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("property_unit_prices")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unit-prices"] });
      toast.success("Cenová položka smazána");
    },
    onError: (error: Error) => {
      toast.error("Chyba: " + error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      property_id: selectedPropertyId,
      unit_type: "",
      price_from: "",
      price_formatted: "",
      area_sqm_from: "",
      area_sqm_to: "",
      sort_order: "0",
    });
    setEditingUnit(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (unit: UnitPrice) => {
    setEditingUnit(unit);
    setFormData({
      property_id: unit.property_id,
      unit_type: unit.unit_type,
      price_from: unit.price_from?.toString() || "",
      price_formatted: unit.price_formatted || "",
      area_sqm_from: unit.area_sqm_from || "",
      area_sqm_to: unit.area_sqm_to || "",
      sort_order: unit.sort_order?.toString() || "0",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.unit_type) {
      toast.error("Vyberte typ jednotky");
      return;
    }
    if (editingUnit) {
      updateMutation.mutate({ ...formData, id: editingUnit.id });
    } else {
      createMutation.mutate({ ...formData, property_id: selectedPropertyId });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ceny typů jednotek</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Property selector */}
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium whitespace-nowrap">
            Vyberte nemovitost:
          </label>
          <Select
            value={selectedPropertyId}
            onValueChange={setSelectedPropertyId}
          >
            <SelectTrigger className="w-full max-w-md">
              <SelectValue placeholder="Vyberte nemovitost..." />
            </SelectTrigger>
            <SelectContent>
              {properties.map((property) => (
                <SelectItem key={property.id} value={property.id}>
                  {property.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedPropertyId && (
          <>
            {/* Add button and table */}
            <div className="flex justify-end">
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    onClick={() => {
                      resetForm();
                      setFormData((prev) => ({
                        ...prev,
                        property_id: selectedPropertyId,
                      }));
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Přidat cenovou položku
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingUnit
                        ? "Upravit cenovou položku"
                        : "Nová cenová položka"}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">
                        Typ jednotky *
                      </label>
                      <Select
                        value={formData.unit_type}
                        onValueChange={(value) =>
                          setFormData((prev) => ({ ...prev, unit_type: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Vyberte typ..." />
                        </SelectTrigger>
                        <SelectContent>
                          {UNIT_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">
                          Cena od (číslo)
                        </label>
                        <Input
                          type="number"
                          value={formData.price_from}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              price_from: e.target.value,
                            }))
                          }
                          placeholder="1500000"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">
                          Cena formátovaná
                        </label>
                        <Input
                          value={formData.price_formatted}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              price_formatted: e.target.value,
                            }))
                          }
                          placeholder="od 1 500 000 USD"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">
                          Plocha od (m²)
                        </label>
                        <Input
                          value={formData.area_sqm_from}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              area_sqm_from: e.target.value,
                            }))
                          }
                          placeholder="45"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">
                          Plocha do (m²)
                        </label>
                        <Input
                          value={formData.area_sqm_to}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              area_sqm_to: e.target.value,
                            }))
                          }
                          placeholder="65"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium">Pořadí</label>
                      <Input
                        type="number"
                        value={formData.sort_order}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            sort_order: e.target.value,
                          }))
                        }
                        placeholder="0"
                      />
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={resetForm}
                      >
                        Zrušit
                      </Button>
                      <Button type="submit">
                        {editingUnit ? "Uložit" : "Přidat"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : unitPrices.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Žádné cenové položky pro tuto nemovitost
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Typ jednotky</TableHead>
                    <TableHead>Cena od</TableHead>
                    <TableHead>Plocha</TableHead>
                    <TableHead>Pořadí</TableHead>
                    <TableHead className="w-24">Akce</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unitPrices.map((unit) => (
                    <TableRow key={unit.id}>
                      <TableCell className="font-medium">
                        {unit.unit_type}
                      </TableCell>
                      <TableCell>
                        {unit.price_formatted ||
                          (unit.price_from
                            ? `${unit.price_from.toLocaleString()} USD`
                            : "-")}
                      </TableCell>
                      <TableCell>
                        {unit.area_sqm_from && unit.area_sqm_to
                          ? `${unit.area_sqm_from} - ${unit.area_sqm_to} m²`
                          : unit.area_sqm_from
                          ? `od ${unit.area_sqm_from} m²`
                          : "-"}
                      </TableCell>
                      <TableCell>{unit.sort_order || 0}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(unit)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteMutation.mutate(unit.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
