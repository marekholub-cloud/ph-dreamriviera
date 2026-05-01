import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { BecomeHostDialog } from "@/components/BecomeHostDialog";

const BecomeHost = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [open, setOpen] = useState(true);

  // If already logged in, send straight to host dashboard
  useEffect(() => {
    if (user) navigate("/admin?section=my-rentals", { replace: true });
  }, [user, navigate]);

  // If user closes the dialog, go home
  const handleOpenChange = (o: boolean) => {
    setOpen(o);
    if (!o) navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      <BecomeHostDialog open={open} onOpenChange={handleOpenChange} />
    </div>
  );
};

export default BecomeHost;
