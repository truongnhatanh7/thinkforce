import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

const Gen = () => {
  return (
    <div className="w-screen h-full flex">
      <Sidebar />
      <div className="w-full h-full">
        <Outlet />
      </div>
    </div>
  );
};

export default Gen;
