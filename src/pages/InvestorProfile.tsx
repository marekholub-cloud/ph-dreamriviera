import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SupertipForm } from "@/components/tipar/SupertipForm";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const InvestorProfile = () => {
  const navigate = useNavigate();

  const handleComplete = () => {
    // Optional: navigate somewhere after completion
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-24 pb-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <SupertipForm onComplete={handleComplete} />
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default InvestorProfile;
