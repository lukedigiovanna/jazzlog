import "./styles/main.css";
import { renderApp } from "./app/app";
import { initializeNavigation } from "./app/navigation";
import { initializeApp } from "./app/controller";
import { initializeMobileHeader } from "./components/header";

const root = document.querySelector<HTMLDivElement>("#app");
if (!root) throw new Error('Missing "#app" root element.');
root.innerHTML = renderApp();
const renderNavigationPage = initializeApp();
initializeMobileHeader();

initializeNavigation(renderNavigationPage);
