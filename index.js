#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { execa } from "execa";

/**
 * Detecta el administrador de paquetes en el proyecto actual.
 * @param {string} projectPath - Ruta del proyecto (por defecto, el directorio actual).
 * @returns {string} - El nombre del administrador de paquetes: 'npm', 'yarn', 'pnpm' o 'unknown'.
 */
function detectPackageManager(projectPath = process.cwd()) {
  const lockFiles = {
    npm: "package-lock.json",
    yarn: "yarn.lock",
    pnpm: "pnpm-lock.yaml",
  };

  for (const [manager, lockFile] of Object.entries(lockFiles)) {
    if (fs.existsSync(path.join(projectPath, lockFile))) {
      return manager;
    }
  }

  return "unknown";
}

/**
 * Ejecuta el comando para listar paquetes desactualizados.
 * @param {string} packageManager - El administrador de paquetes detectado.
 * @returns {Promise<Object|null>} - Una lista en formato JSON de los paquetes desactualizados o `null` si ocurre un error.
 */
async function getOutdatedPackages(packageManager) {
  try {
    let command;
    if (packageManager === "npm") {
      command = ["npm", "outdated", "--json"];
    } else if (packageManager === "yarn") {
      command = ["yarn", "outdated", "--json"];
    } else if (packageManager === "pnpm") {
      command = ["pnpm", "outdated", "--json"];
    } else {
      throw new Error("Administrador de paquetes desconocido o no soportado.");
    }

    const { stdout } = await execa(command[0], command.slice(1));
    return JSON.parse(stdout);
  } catch (error) {
    // Si el comando no genera salida JSON o hay un error, devolvemos `null`
    if (error.stdout && error.stdout.trim() === "") {
      return {};
    }
    console.error(`Error al ejecutar el comando: ${error.message}`);
    return null;
  }
}

/**
 * Verifica si hay paquetes desactualizados y muestra un mensaje adecuado.
 * @param {Object} outdatedPackages - Resultado de los paquetes desactualizados.
 */
function displayOutdatedPackages(outdatedPackages) {
  if (!outdatedPackages || Object.keys(outdatedPackages).length === 0) {
    console.log("No hay paquetes para actualizar.");
  } else {
    console.log("Paquetes desactualizados:");
    console.log(JSON.stringify(outdatedPackages, null, 2));
  }
}

/**
 * Punto de entrada principal.
 */
async function main() {
  const packageManager = detectPackageManager();
  if (packageManager === "unknown") {
    console.error(
      "No se detectó un administrador de paquetes válido en el proyecto.",
    );
    process.exit(1);
  }

  console.log(`Administrador de paquetes detectado: ${packageManager}`);
  const outdatedPackages = await getOutdatedPackages(packageManager);
  displayOutdatedPackages(outdatedPackages);
}

main().catch((error) => {
  console.error(`Error inesperado: ${error.message}`);
  process.exit(1);
});
