import { testHello } from "@thinkforce/triggerdotdev";
import { shared } from "@thinkforce/shared";
import "./App.css";

function App() {
  return (
    <>
      {testHello()}
      {shared}
    </>
  );
}

export default App;
