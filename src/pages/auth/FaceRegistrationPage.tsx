import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, ArrowRight } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { FaceScanner } from "@/components/auth/FaceScanner";
import { Button } from "@/components/ui";

export default function FaceRegistrationPage() {
  const navigate = useNavigate();
  const { updateProfile } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const handleScanComplete = async (embedding: number[], photoBase64: string, liveness: any) => {
    setLoading(true);
    try {
      await updateProfile({
        face_registered: true,
        face_embedding: embedding,
      });
      navigate("/app/dashboard");
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  const handleError = (err: string) => {
    console.error("Scanner error:", err);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-bg px-4 py-8">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex w-16 h-16 rounded-2xl gradient-accent items-center justify-center shadow-glow mb-4">
            <Shield className="w-8 h-8 text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-bold text-white">Face Registration</h1>
          <p className="text-sm text-muted mt-2">
            Look directly at the camera to setup your digital guardian.
          </p>
        </div>

        <FaceScanner
          mode="register"
          onComplete={handleScanComplete}
          onError={handleError}
        />

        {loading && (
          <div className="mt-4 text-center text-sm text-accent animate-pulse">
            Encrypting and saving your digital guardian profile...
          </div>
        )}
      </div>
    </div>
  );
}
