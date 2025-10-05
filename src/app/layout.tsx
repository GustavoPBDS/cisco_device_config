import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ScenarioContextProvider } from "@/contexts/scenario.context";
import { Toaster } from 'sonner';
const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "Cisco Config Generator",
    description: "Automate the creation of configuration scripts for Cisco routers and switches. Increase your agility and eliminate syntax errors.",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body
                className={`${geistSans.variable} ${geistMono.variable} antialiased`}
            >
                <ScenarioContextProvider>
                    <div className="w-screen h-screen">
                        {children}
                        <Toaster richColors />
                    </div>
                </ScenarioContextProvider>
            </body>
        </html>
    );
}
