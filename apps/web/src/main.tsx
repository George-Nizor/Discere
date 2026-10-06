import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import { shouldRetryQuery } from "./api/client.js";
import { CapabilityProvider } from "./capabilities/capability-context.js";
import { ExperienceProvider } from "./study/experience.js";
import { routes } from "./routes.js";
import { installNavigationMotion, withNavigationData } from "./shell/navigation.js";
// Bundled rather than fetched: the hub enforces script-src/style-src 'self', so a web font
// must ship from our own origin. The variable file covers every weight the design uses.
import "./styles/fonts/brand/fonts.css";
import "katex/dist/katex.min.css";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/shell.css";
import "./styles/stages.css";
import "./styles/notebook.css";
import "./styles/home.css";
import "./styles/library.css";
import "./styles/settings.css";
import "./styles/motion.css";
import "./styles/recovery.css";
import "./styles/recovery-questions.css";
import "./styles/recovery-essay.css";
import "./styles/recovery-review.css";
import "./styles/learning-diagram.css";
import "./styles/study.css";
import "./styles/brilliant.css";
import "./styles/course-checks.css";
import "./styles/geometry.css";
import "./styles/mechanics.css";
import "./styles/sql-projects.css";
import "./styles/python-projects.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 15_000, retry: shouldRetryQuery, refetchOnWindowFocus: false },
    mutations: { retry: 0 },
  },
});

const router = createBrowserRouter(withNavigationData(routes, queryClient));
installNavigationMotion(router);
const root = document.getElementById("root");
if (!root) throw new Error("The Discere root element is missing.");

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ExperienceProvider>
        <CapabilityProvider>
          <RouterProvider router={router} />
        </CapabilityProvider>
      </ExperienceProvider>
    </QueryClientProvider>
  </StrictMode>,
);

import "./styles/calculus.css";
import "./styles/engineering.css";
import "./styles/economics.css";
import "./styles/philosophy.css";
import "./styles/language.css";
import "./styles/astronomy.css";
import "./styles/psychology.css";

import "./styles/chemistry.css";
import "./styles/biology.css";

import "./styles/linear-algebra.css";

import "./styles/home-redesign.css";

import "./styles/navigation-motion.css";
import "./styles/game.css";
import "./styles/game-layer.css";
import "./styles/workbench.css";
import "./styles/mascot.css";
import "./styles/brand.css";
import "./styles/theme-light.generated.css";
import "./styles/theme.css";
