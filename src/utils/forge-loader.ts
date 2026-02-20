/**
 * Wrapper para node-forge que funciona con ESM y CommonJS
 * Usa createRequire() para forzar node-forge a cargarse como CommonJS
 */

// Cache para evitar múltiples cargas
let forgeInstance: any = null;

// Función async para cargar node-forge usando createRequire
async function loadForge() {
    if (forgeInstance) {
        return forgeInstance;
    }

    try {
        // Estrategia 1: Intentar require directo primero (CommonJS)
        if (typeof require !== "undefined") {
            forgeInstance = require("node-forge");
            return forgeInstance;
        }
    } catch (error) {
        // Si require falla, continuar con createRequire
    }

    try {
        // Estrategia 2: Usar createRequire para ESM
        const { createRequire } = await import("module");

        // Intentar diferentes URLs base (evitando import.meta para compatibilidad TS/Jest)
        const possibleUrls = [
            `file://${process.cwd()}/package.json`,
            process.cwd(),
        ];

        for (const url of possibleUrls) {
            if (url) {
                try {
                    const require = createRequire(url);
                    forgeInstance = require("node-forge");
                    return forgeInstance;
                } catch (urlError) {
                    // Continuar con el siguiente URL
                    continue;
                }
            }
        }

        throw new Error(
            "No se pudo encontrar un contexto válido para createRequire"
        );
    } catch (error) {
        throw new Error(`No se pudo cargar node-forge: ${error.message}`);
    }
}

// Función async para cargar node-forge
export async function getForge() {
    return await loadForge();
}

// Función síncrona para cargar node-forge (solo CommonJS)
export function getForgeSync() {
    if (forgeInstance) {
        return forgeInstance;
    }

    try {
        // En síncrono, solo funciona en CommonJS
        forgeInstance = require("node-forge");
        return forgeInstance;
    } catch (error) {
        throw new Error(
            `getForgeSync() solo funciona en CommonJS. Usa getForge() en ESM: ${error.message}`
        );
    }
}
