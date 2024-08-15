import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./App.css";
import EarlyAccessWrapper from "./layouts/EarlyAccessWrapper";
import Gen from "./layouts/Gen";

const router = createBrowserRouter([
  // {
  //   path: "/",
  //   element: <EarlyAccessWrapper />,
  //   children: [
  //     {
  //       path: "/",
  //       element: <Gen />,
  //     },
  //   ],
  // },
  {
    path: "/",
    element: <Gen />,
  },
]);

function App() {
  return (
    <>
      <RouterProvider router={router} />
    </>
  );
}

export default App;
