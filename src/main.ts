import "./styles/main.css";

import { renderApp } from "./app/app";

const root = document.querySelector<HTMLDivElement>("#app");

if (!root) {
    throw new Error('Missing "#app" root element.');
}

root.innerHTML = renderApp();
