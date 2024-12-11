#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import chalk from "chalk"; // Usamos chalk para agregar color

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
 * Ejecuta el comando en forma asincrónica usando exec.
 * @param {string} command - El comando a ejecutar.
 * @returns {Promise<string>} - La salida del comando si se ejecuta correctamente.
 */
function execAsync(command) {
  return new Promise(function (resolve, reject) {
    exec(command, (error, stdout, stderr) => {
      if (stderr !== "") {
        reject(stderr);
      } else {
        resolve(stdout);
      }
    });
  });
}

/**
 * Ejecuta el comando para listar paquetes desactualizados.
 * @param {string} packageManager - El administrador de paquetes detectado.
 * @returns {Promise<Object|null>} - Una lista en formato JSON de los paquetes desactualizados o `null` si ocurre un error.
 */
async function getOutdatedPackages(packageManager) {
  let command;
  if (packageManager === "npm") {
    command = "npm outdated --json";
  } else if (packageManager === "yarn") {
    command = "yarn outdated --json";
  } else if (packageManager === "pnpm") {
    command = "pnpm outdated --json";
  } else {
    throw new Error("Administrador de paquetes desconocido o no soportado.");
  }

  try {
    const result = await execAsync(command); // Ejecutar el comando correspondiente según el administrador de paquetes
    const outdatedPackages = JSON.parse(result); // Parsear la salida JSON
    return outdatedPackages;
  } catch (err) {
    console.error(
      chalk.red(
        "Error al ejecutar el comando para obtener paquetes desactualizados:",
      ),
    );
    console.error(err); // Mostrar el error si ocurre
  }
}

/**
 * Muestra los paquetes desactualizados con colores.
 * @param {Object} outdatedPackages - Resultado de los paquetes desactualizados.
 */
function displayOutdatedPackages(outdatedPackages) {
  if (!outdatedPackages || Object.keys(outdatedPackages).length === 0) {
    console.log(chalk.yellow("No hay paquetes para actualizar."));
    process.exit(0);
  } else {
    console.log(chalk.blue("Paquetes desactualizados:"));
    for (const [pkg, details] of Object.entries(outdatedPackages)) {
      console.log(
        `${chalk.blue(pkg)} : ${chalk.yellow(details.current)} -> ${chalk.green(details.latest)}`,
      );
    }
  }
}

/**
 * Actualiza los paquetes desactualizados.
 * @param {string} packageManager - El administrador de paquetes.
 * @param {Object} outdatedPackages - Los paquetes desactualizados.
 */
async function updatePackages(packageManager, outdatedPackages) {
  if (!outdatedPackages || Object.keys(outdatedPackages).length === 0) {
    console.log(chalk.yellow("No hay paquetes para actualizar."));
    return;
  }

  console.log(chalk.green("Actualizando paquetes..."));
  for (const pkg of Object.keys(outdatedPackages)) {
    try {
      let updateCommand;
      if (packageManager === "npm") {
        updateCommand = `npm install ${pkg}@latest`;
      } else if (packageManager === "yarn") {
        updateCommand = `yarn add ${pkg}@latest`;
      } else if (packageManager === "pnpm") {
        updateCommand = `pnpm add ${pkg}@latest`;
      } else {
        throw new Error(
          "Administrador de paquetes desconocido o no soportado.",
        );
      }

      console.log(chalk.blue(`Ejecutando: ${updateCommand}`));
      const result = await execAsync(updateCommand);
      console.log(chalk.green(`Paquete actualizado: ${pkg}`));
    } catch (err) {
      console.error(chalk.red(`Error actualizando ${pkg}: ${err}`));
    }
  }
}

/**
 * Punto de entrada principal.
 */
async function main() {
  const packageManager = detectPackageManager();
  if (packageManager === "unknown") {
    console.error(
      chalk.red(
        "No se detectó un administrador de paquetes válido en el proyecto.",
      ),
    );
    process.exit(1);
  }

  console.log(
    chalk.green(`Administrador de paquetes detectado: ${packageManager}`),
  );

  const args = process.argv.slice(2);
  const shouldUpdate = args.includes("--update");

  const outdatedPackages = await getOutdatedPackages(packageManager);

  if (shouldUpdate) {
    await updatePackages(packageManager, outdatedPackages);
  } else {
    displayOutdatedPackages(outdatedPackages);
  }
}

main().catch((error) => {
  console.error(chalk.red(`Error inesperado: ${error.message}`));
  process.exit(1);
});
