import path from "path" //
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
        allowedHosts: true,
    }
})