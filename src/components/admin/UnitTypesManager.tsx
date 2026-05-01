import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Loader2, Home, Building2, Castle, Hotel, Search, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface UnitType {
  id: string;
  name: string;
  category: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const CATEGORIES = [
  { value: "Byty a apartmány", label: "Byty a apartmány", icon: Home },
  { value: "Prémiové a větší jednotky", label: "Prémiové a větší jednotky", icon: Building2 },
  { value: "Townhouse & vila segment", label: "Townhouse & vila segment", icon: Castle },
  { value: "Specifické a investiční typy", label: "Specifické a investiční typy", icon: Hotel },
];

const getCategoryIcon = (category: string) => {
  const cat = CATEGORIES.find(c => c.value === category);
  return cat?.icon || Home;
};

const getCategoryColor = (category: string) => {
  switch (category) {
    case "Byty a apartmány":
      return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    case "Prémiové a větší jednotky":
      return "bg-purple-500/10 text-purple-500 border-purple-500/20";
    case "Townhouse & vila segment":
      return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
    case "Specifické a investiční typy":
      return "bg-amber-500/10 text-amber-500 border-amber-500/20";
    default:
      return "bg-muted text-muted-foreground";
  }
};

export function UnitTypesManager() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<UnitType | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  
  const [formData, setFormData] = useState({
    name: "",
    category: CATEGORIES[0].value,
    sort_order: 0,
    is_active: true,
  });

  // Fetch unit types
  const { data: unitTypes = [], isLoading } = useQuery({
    queryKey: ['unit-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('unit_types')
        .select('*')
        .order('category')
        .order('sort_order');
      
      if (error) throw error;
      return data as UnitType[];
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase
        .from('unit_types')
        .insert([data]);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unit-types'] });
      toast({ title: "Typ jednotky vytvořen", description: "Nový typ jednotky byl úspěšně přidán." });
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Chyba",
        description: error.message || "Nepodařilo se vytvořit typ jednotky.",
        variant: "destructive",
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData> }) => {
      const { error } = await supabase
        .from('unit_types')
        .update(data)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unit-types'] });
      toast({ title: "Typ jednotky aktualizován", description: "Změny byly úspěšně uloženy." });
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Chyba",
        description: error.message || "Nepodařilo se aktualizovat typ jednotky.",
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('unit_types')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unit-types'] });
      toast({ title: "Typ jednotky smazán", description: "Typ jednotky byl úspěšně odstraněn." });
    },
    onError: (error: any) => {
      toast({
        title: "Chyba",
        description: error.message || "Nepodařilo se smazat typ jednotky.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      category: CATEGORIES[0].value,
      sort_order: 0,
      is_active: true,
    });
    setEditingUnit(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (unit: UnitType) => {
    setEditingUnit(unit);
    setFormData({
      name: unit.name,
      category: unit.category,
      sort_order: unit.sort_order,
      is_active: unit.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUnit) {
      updateMutation.mutate({ id: editingUnit.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleToggleActive = (unit: UnitType) => {
    updateMutation.mutate({
      id: unit.id,
      data: { is_active: !unit.is_active },
    });
  };

  // Filter unit types
  const filteredUnits = unitTypes.filter(unit => {
    const matchesSearch = unit.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || unit.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Group by category for display
  const groupedUnits = filteredUnits.reduce((acc, unit) => {
    if (!acc[unit.category]) {
      acc[unit.category] = [];
    }
    acc[unit.category].push(unit);
    return acc;
  }, {} as Record<string, UnitType[]>);

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="">Typy jednotek</CardTitle>
              <CardDescription>
                Správa typů nemovitostních jednotek ({unitTypes.length} celkem)
              </CardDescription>
            </div>
            
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              if (!open) resetForm();
              setIsDialogOpen(open);
            }}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Přidat typ
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                  <DialogHeader>
                    <DialogTitle>
                      {editingUnit ? "Upravit typ jednotky" : "Přidat typ jednotky"}
                    </DialogTitle>
                    <DialogDescription>
                      {editingUnit ? "Upravte údaje o typu jednotky." : "Vyplňte údaje pro nový typ jednotky."}
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name">Název</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="např. 2 Bedroom (2BR)"
                        required
                      />
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="category">Kategorie</Label>
                      <Select
                        value={formData.category}
                        onValueChange={(value) => setFormData({ ...formData, category: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map((cat) => (
                            <SelectItem key={cat.value} value={cat.value}>
                              <div className="flex items-center gap-2">
                                <cat.icon className="h-4 w-4" />
                                {cat.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="sort_order">Pořadí</Label>
                      <Input
                        id="sort_order"
                        type="number"
                        value={formData.sort_order}
                        onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                        min={0}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="is_active">Aktivní</Label>
                      <Switch
                        id="is_active"
                        checked={formData.is_active}
                        onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                      />
                    </div>
                  </div>
                  
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={resetForm}>
                      Zrušit
                    </Button>
                    <Button type="submit" disabled={isPending}>
                      {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {editingUnit ? "Uložit změny" : "Přidat"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          
          {/* Filters */}
          <div className="flex flex-col gap-4 sm:flex-row pt-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Hledat typy jednotek..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Všechny kategorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všechny kategorie</SelectItem>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    <div className="flex items-center gap-2">
                      <cat.icon className="h-4 w-4" />
                      {cat.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredUnits.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Home className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>Žádné typy jednotek nenalezeny</p>
            </div>
          ) : (
            <div className="space-y-8">
              {Object.entries(groupedUnits).map(([category, units]) => {
                const CategoryIcon = getCategoryIcon(category);
                return (
                  <div key={category}>
                    <div className="flex items-center gap-2 mb-4">
                      <CategoryIcon className="h-5 w-5 text-muted-foreground" />
                      <h3 className="font-semibold text-lg">{category}</h3>
                      <Badge variant="secondary" className="ml-2">
                        {units.length}
                      </Badge>
                    </div>
                    
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[50px]">#</TableHead>
                            <TableHead>Název</TableHead>
                            <TableHead className="w-[100px]">Stav</TableHead>
                            <TableHead className="w-[150px] text-right">Akce</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {units.map((unit) => (
                            <TableRow key={unit.id}>
                              <TableCell className="text-muted-foreground">
                                {unit.sort_order}
                              </TableCell>
                              <TableCell className="font-medium">
                                {unit.name}
                              </TableCell>
                              <TableCell>
                                <Badge 
                                  variant={unit.is_active ? "default" : "secondary"}
                                  className={cn(
                                    "cursor-pointer transition-colors",
                                    unit.is_active 
                                      ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20" 
                                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                                  )}
                                  onClick={() => handleToggleActive(unit)}
                                >
                                  {unit.is_active ? "Aktivní" : "Neaktivní"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleEdit(unit)}
                                    className="h-8 w-8"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => deleteMutation.mutate(unit.id)}
                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                    disabled={deleteMutation.isPending}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
