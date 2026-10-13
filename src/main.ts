import { mount } from "svelte";
import "./app.css";

const target = document.getElementById("app");

function showStartupError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const fallback = document.createElement("main");
  fallback.setAttribute("role", "alert");
  fallback.className = "startup-error";
  const heading = document.createElement("h1");
  heading.textContent = "Mythras Chargen could not start";
  const explanation = document.createElement("p");
  explanation.textContent = "Your saved characters have not been changed. Reload the page to try again; if the problem continues, save this error and contact support.";
  const details = document.createElement("pre");
  details.textContent = message;
  fallback.append(heading, explanation, details);
  target?.replaceChildren(fallback);
  console.error("Mythras Chargen startup failed", error);
}

if (!target) {
  showStartupError(new Error("The application root element was not found."));
} else {
  // Keep module initialization failures (including malformed persisted state)
  // inside the same visible startup fallback as mount-time failures.
  try {
    const { default: App } = await import("./App.svelte");
    mount(App, { target });
  } catch (error) {
    showStartupError(error);
  }
}
