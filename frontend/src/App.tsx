import { Routes, Route, Navigate } from "react-router-dom";
import Comercial from "./components/Comercial";
import Home from "./components/Home";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/comercial" element={<Comercial />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App;
