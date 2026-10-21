import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { PlaysProvider } from "@/lib/store";
import Home from "@/pages/Home";
import MyPlays from "@/pages/MyPlays";
import Library from "@/pages/Library";
import SearchPage from "@/pages/Search";
import SettingsPage from "@/pages/Settings";
import EditorPage from "@/pages/Editor";

function App() {
  return (
    <PlaysProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/schemi" element={<MyPlays />} />
          <Route path="/libreria" element={<Library />} />
          <Route path="/cerca" element={<SearchPage />} />
          <Route path="/impostazioni" element={<SettingsPage />} />
          <Route path="/editor/:id" element={<EditorPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster theme="dark" position="top-center" offset={60} richColors closeButton={false} />
    </PlaysProvider>
  );
}

export default App;
