// The app stores' marks, and where the apps are
export const APP_STORE_URL = "https://apps.apple.com/ng/app/sotechy/id6829889326";

export function AppleLogo({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M16.37 12.62c-.03-2.6 2.13-3.86 2.22-3.92-1.21-1.77-3.09-2.01-3.76-2.04-1.6-.16-3.12.94-3.93.94-.81 0-2.06-.92-3.39-.89-1.74.03-3.35 1.01-4.25 2.57-1.81 3.14-.46 7.79 1.3 10.34.86 1.25 1.89 2.65 3.23 2.6 1.3-.05 1.79-.84 3.36-.84 1.57 0 2.01.84 3.39.81 1.4-.02 2.28-1.27 3.13-2.52.99-1.45 1.4-2.85 1.42-2.92-.03-.01-2.72-1.04-2.72-4.13zM13.79 4.98c.71-.86 1.19-2.06 1.06-3.25-1.02.04-2.26.68-3 1.54-.66.76-1.24 1.98-1.08 3.15 1.14.09 2.31-.58 3.02-1.44z" />
    </svg>
  );
}

export function PlayLogo({ size = 22 }: { size?: number }) {
  return (
    <svg width={(size * 20) / 22} height={size} viewBox="0 0 20 22" aria-hidden>
      <path d="M1 1.2 11.4 11 1 20.8c-.3-.2-.5-.6-.5-1.1V2.3c0-.5.2-.9.5-1.1Z" fill="#00D7FE" />
      <path d="m14.9 7.6-3.5 3.4L1 1.2c.3-.2.8-.2 1.2 0l12.7 6.4Z" fill="#00F076" />
      <path d="m14.9 14.4-12.7 6.4c-.4.2-.9.2-1.2 0L11.4 11l3.5 3.4Z" fill="#F83A4B" />
      <path d="m18.6 12.3-3.7 2.1-3.5-3.4 3.5-3.4 3.7 2.1c.9.5.9 2.1 0 2.6Z" fill="#FFC900" />
    </svg>
  );
}
