import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./App.css";
import EarlyAccessWrapper from "./layouts/EarlyAccessWrapper";
import Gen from "./layouts/Gen";
import EarlyAccessAuth from "./layouts/EarlyAccessAuth/index.tsx";
import { Toaster } from "./components/ui/toaster.tsx";
import MainForm from "./layouts/Gen/MainForm/index.tsx";
import Viewer, { viewerDocLoader } from "./layouts/Gen/Viewer/index.tsx";

const router = createBrowserRouter([
  {
    path: "/",
    element: <EarlyAccessWrapper />,
    children: [
      {
        path: "",
        element: <Gen />,
        children: [
          {
            path: "",
            element: <MainForm />,
          },
          {
            path: "viewer/:fileName",
            loader: viewerDocLoader,
            element: <Viewer />,
          },
        ],
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
