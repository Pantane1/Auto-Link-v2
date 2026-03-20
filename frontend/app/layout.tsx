"use client";
import "./globals.css";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { GoogleReCaptchaProvider } from "react-google-recaptcha-v3";
import { Toaster } from "react-hot-toast";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!}>
          <GoogleReCaptchaProvider reCaptchaKey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!}>
            {children}
            <Toaster
              position="top-right"
              toastOptions={{
                style: {
                  background: "#0e1118",
                  color: "#e8eaf0",
                  border: "1px solid rgba(255,255,255,0.07)",
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: "13px",
                },
                success: { iconTheme: { primary: "#00e676", secondary: "#000" } },
                error: { iconTheme: { primary: "#ff4d6d", secondary: "#fff" } },
              }}
            />
          </GoogleReCaptchaProvider>
        </GoogleOAuthProvider>
      </body>
    </html>
  );
}