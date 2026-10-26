/** Where the light/dark choice is kept in the browser */
export const THEME_KEY = "sotechy-merchant-theme";

/** Runs in <head> before the page paints, so a dark-mode user never sees a light flash */
export const THEME_SCRIPT = `try{if(localStorage.getItem("${THEME_KEY}")==="dark")document.documentElement.dataset.theme="dark"}catch(e){}`;
