// src/components/OAuthSuccess.jsx
import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { ROUTES } from "../../config/routes";

const OAuthSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get("token");
    const userId = searchParams.get("user_id");

    if (token && userId) {
      localStorage.setItem("access_token", token);
      localStorage.setItem("user_id", userId);
      toast.success("Logged in successfully!");
      navigate(ROUTES.DASHBOARD);
    } else {
      toast.error("Authentication failed. Please try again.");
      navigate(ROUTES.LOGIN);
    }
  }, [searchParams, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="p-8 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-semibold mb-4">Authenticating...</h2>
        <p>Please wait while we verify your account.</p>
      </div>
    </div>
  );
};

export default OAuthSuccess;
