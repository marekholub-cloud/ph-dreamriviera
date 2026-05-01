import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  UserPlus,
  Building2,
  CalendarPlus,
  CalendarClock,
  Mail,
} from "lucide-react";
import { AssignObchodnikDialog } from "./AssignObchodnikDialog";
import { ScheduleConsultationDialog } from "./ScheduleConsultationDialog";

interface LeadActionButtonsProps {
  leadId: string;
  leadName: string;
  hasConsultation: boolean;
  assignedObchodnikId: string | null;
  canEdit: boolean;
  onRefresh: () => void;
}

export function LeadActionButtons({
  leadId,
  leadName,
  hasConsultation,
  assignedObchodnikId,
  canEdit,
  onRefresh,
}: LeadActionButtonsProps) {
  const navigate = useNavigate();
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);

  if (!canEdit) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <MoreHorizontal className="h-4 w-4 mr-2" />
            Akce
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={() => setShowAssignDialog(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Přiřadit obchodníka
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={() => navigate(`/recommended-projects?lead=${leadId}`)}>
            <Building2 className="h-4 w-4 mr-2" />
            Vybrat doporučené projekty
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          {!hasConsultation ? (
            <DropdownMenuItem onClick={() => setShowScheduleDialog(true)}>
              <CalendarPlus className="h-4 w-4 mr-2" />
              Naplánovat konzultaci
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => setShowScheduleDialog(true)}>
              <CalendarClock className="h-4 w-4 mr-2" />
              Změnit termín konzultace
            </DropdownMenuItem>
          )}
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={() => navigate(`/events?invite=${leadId}`)}>
            <Mail className="h-4 w-4 mr-2" />
            Odeslat pozvánku na akci
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AssignObchodnikDialog
        open={showAssignDialog}
        onOpenChange={setShowAssignDialog}
        leadId={leadId}
        currentObchodnikId={assignedObchodnikId}
        onSuccess={onRefresh}
      />

      <ScheduleConsultationDialog
        open={showScheduleDialog}
        onOpenChange={setShowScheduleDialog}
        leadId={leadId}
        leadName={leadName}
        isReschedule={hasConsultation}
        onSuccess={onRefresh}
      />
    </>
  );
}
