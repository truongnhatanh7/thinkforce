import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./App.css";
import EarlyAccessWrapper from "./layouts/EarlyAccessWrapper";
import Gen from "./layouts/Gen";
import EarlyAccessAuth from "./layouts/EarlyAccessAuth/index.tsx";
import { Toaster } from "./components/ui/toaster.tsx";

const router = createBrowserRouter([
  {
    path: "/",
    element: <EarlyAccessWrapper />,
    children: [
      {
        path: "",
        element: <Gen />,
      },
    ],
  },
  {
    path: "/ea-auth",
    element: <EarlyAccessAuth />,
  },
]);

function App() {
  return (
    <>
      <RouterProvider router={router} />
      <Toaster />
    </>
  );
}

export default App;
