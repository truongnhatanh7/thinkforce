import { useState } from "react";
import { Outlet } from "react-router-dom";
import EarlyAccessAuth from "./EarlyAccessAuth";
import { Toaster } from "@/components/ui/toaster";

const EarlyAccessWrapper = () => {
  const [isAuth, setIsAuth] = useState(false);

  return (
    <>
      <main className="w-screen h-full">
        {isAuth ? <Outlet /> : <EarlyAccessAuth setIsAuth={setIsAuth} />}
      </main>
      <Toaster />
    </>
  );
};

export default EarlyAccessWrapper;
