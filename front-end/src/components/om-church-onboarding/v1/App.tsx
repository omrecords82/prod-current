import { CustomizerContext } from "@/context/CustomizerContext";
import { useContext, useState } from "react";
import { Landing } from "./components/views/Landing";
import { Onboarding } from "./components/views/Onboarding";
import "./styles/theme.css";

type View = "landing" | "onboarding" | "complete";

export default function App() {
  const [view, setView] = useState<View>("landing");
  const { activeMode, setActiveMode } = useContext(CustomizerContext);
  const theme: "light" | "dark" = activeMode === "dark" ? "dark" : "light";

  const toggleTheme = () => setActiveMode(activeMode === "dark" ? "light" : "dark");

  return (
    <div className={`om-cornerstone-scope min-h-screen ${theme === "dark" ? "dark" : ""}`}>
      {view === "landing" && (
        <Landing
          theme={theme}
          onToggleTheme={toggleTheme}
          onStart={() => setView("onboarding")}
          onAdmin={() => {
            window.location.href = "/auth/login";
          }}
        />
      )}

      {view === "onboarding" && (
        <Onboarding
          theme={theme}
          onToggleTheme={toggleTheme}
          onCancel={() => setView("landing")}
          onComplete={() => setView("complete")}
        />
      )}

      {view === "complete" && (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground px-6">
          <div className="max-w-xl text-center space-y-4">
            <h1 className="font-['Georgia'] text-3xl text-[#2a1450] dark:text-[#c9a14a]">
              Thank you — your provision request is in.
            </h1>
            <p className="text-muted-foreground">
              Orthodox Metrics staff will review your submission and reach out
              within one business day to schedule onboarding.
            </p>
            <div className="pt-2">
              <a
                href="/frontend-pages/homepage"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-[#3a1d6e] hover:bg-[#2a1450] text-white text-sm font-medium no-underline transition-colors"
              >
                Back to homepage
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
