/** Standalone entry for the same explicitly labeled inspection routes registered in the app. */
import { createRoot } from "react-dom/client";
import { App } from "@qa-app/App";
import {
  screens,
  InspectionMainMap,
} from "../../../src/features/plugins/screens";
if (new URLSearchParams(location.search).has("font200"))
  document.documentElement.style.fontSize = "32px";
createRoot(document.getElementById("root")!).render(
  <App
    screens={screens}
    MapRenderer={InspectionMainMap}
    scopeKey="plugins-ui-fixture:demo"
    dataMode="demo"
  />,
);
