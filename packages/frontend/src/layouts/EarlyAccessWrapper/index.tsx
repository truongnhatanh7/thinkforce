import { Toaster } from "@/components/ui/toaster";
import { supabase } from "@/supabase";
import { useCallback, useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

const EarlyAccessWrapper = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const fetchAuthState = useCallback(async () => {
    try {
      console.log("fetchAuthState");
      const { data, error } = await supabase.auth.getSession();
      if (error || data.session === null) {
        throw error;
      }
      console.log(data);
    } catch {
      navigate("/ea-auth");
    }
  }, [navigate]);

  useEffect(() => {
    fetchAuthState();
  }, [fetchAuthState, location]);

  return (
    <>
      <main className="w-screen h-full">{<Outlet />}</main>
      <Toaster />
    </>
  );
};

export default EarlyAccessWrapper;
