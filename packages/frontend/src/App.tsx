import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./App.css";
import { Toaster } from "./components/ui/toaster.tsx";
import EarlyAccessAuth from "./layouts/EarlyAccessAuth/index.tsx";
import EarlyAccessWrapper from "./layouts/EarlyAccessWrapper";
import Gen from "./layouts/Gen";
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

const queryClient = new QueryClient();

function App() {
  return (
    <>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        <Toaster />
      </QueryClientProvider>
    </>
  );
}

export default App;
