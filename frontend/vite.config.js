import path from "path" // Intha line kandaipa irukkanum
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"), // @-ah src folder-ku map pannudhu
        },
    },
    server: {
        // Namma munnadi discuss panna ngrok settings-aiyum inga sethukonga
        allowedHosts: true,
    }
})