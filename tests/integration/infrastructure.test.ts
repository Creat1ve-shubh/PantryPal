import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Infrastructure Configuration", () => {
    it("should have a valid NGINX configuration", () => {
        const nginxPath = path.resolve(process.cwd(), "nginx", "nginx.conf");
        expect(fs.existsSync(nginxPath)).toBe(true);

        const config = fs.readFileSync(nginxPath, "utf-8");
        expect(config).toContain("worker_processes auto;");
        expect(config).toContain("proxy_pass http://app:5000;");
        expect(config).toContain("location /sw.js");
    });

    it("should have NGINX service in docker-compose.yml", () => {
        const dockerComposePath = path.resolve(process.cwd(), "docker-compose.yml");
        expect(fs.existsSync(dockerComposePath)).toBe(true);

        const content = fs.readFileSync(dockerComposePath, "utf-8");
        expect(content).toContain("nginx:");
        expect(content).toContain("image: nginx:alpine");
        expect(content).toContain("static-content:/usr/share/nginx/html:ro");
    });

    it("should have PWA configuration in vite.config.ts", () => {
        const viteConfigPath = path.resolve(process.cwd(), "vite.config.ts");
        expect(fs.existsSync(viteConfigPath)).toBe(true);

        const content = fs.readFileSync(viteConfigPath, "utf-8");
        expect(content).toContain("VitePWA(");
        expect(content).toContain("registerType: \"autoUpdate\"");
        expect(content).toContain("manifest:");
    });
});
