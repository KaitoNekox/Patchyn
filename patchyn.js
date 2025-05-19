const { execSync, spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

class PythonToExeConverter {
  constructor() {
    this.tempDir = path.join(__dirname, "py2exe_temp_" + crypto.randomBytes(4).toString("hex"));
    this.ensurePython();
  }

  ensurePython() {
    try {
      execSync("python --version", { stdio: "ignore" });
    } catch {
      throw new Error("Python no está instalado. Descárgalo desde python.org");
    }
  }

  async installPyInstaller() {
    try {
      execSync("pip install pyinstaller", { stdio: "inherit" });
    } catch {
      throw new Error("Falló la instalación de PyInstaller.");
    }
  }

  validatePythonFile(file) {
    if (!fs.existsSync(file)) throw new Error(`Archivo no encontrado: ${file}`);
    if (!file.endsWith(".py")) throw new Error("El archivo debe ser .py");
  }

  cleanTempFiles() {
    try {
      if (fs.existsSync(this.tempDir)) fs.rmSync(this.tempDir, { recursive: true });
      const buildDir = path.join(process.cwd(), "build");
      const specFile = path.join(process.cwd(), path.basename(this.inputFile, ".py") + ".spec");
      if (fs.existsSync(buildDir)) fs.rmSync(buildDir, { recursive: true });
      if (fs.existsSync(specFile)) fs.unlinkSync(specFile);
    } catch (err) {
      console.warn("[⚠] No se pudieron borrar archivos temporales:", err.message);
    }
  }

  async convert(inputFile, outputFile) {
    try {
      this.inputFile = inputFile;
      this.validatePythonFile(inputFile);

      if (!outputFile.endsWith(".exe")) outputFile += ".exe";

      console.log("[⚡] Instalando PyInstaller automáticamente...");
      await this.installPyInstaller();

      console.log("[🔧] Compilando Python a EXE...");
      const command = `pyinstaller --onefile --noconsole --distpath . --workpath "${this.tempDir}" --specpath "${this.tempDir}" --name "${path.basename(outputFile, ".exe")}" "${inputFile}"`;
      
      const result = spawnSync(command, { shell: true, stdio: "inherit" });
      if (result.status !== 0) throw new Error("Falló la compilación.");

      const generatedExe = path.join(process.cwd(), path.basename(outputFile));
      if (!fs.existsSync(generatedExe)) throw new Error("No se generó el EXE.");

      console.log(`[✅] ¡Éxito! Archivo generado: ${generatedExe}`);
      this.cleanTempFiles();
      return { success: true, exePath: generatedExe };

    } catch (error) {
      this.cleanTempFiles();
      console.error(`[❌] Error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}

function parseArgs() {
  const args = process.argv.slice(2);
  let inputFile = "";
  let outputFile = "";

  for (let i = 0; i < args.length; i++) {
    if ((args[i] === "-o" || args[i] === "-exe") && args[i + 1]) {
      outputFile = args[i + 1];
      i++;
    } else if (args[i].endsWith(".py")) {
      inputFile = args[i];
    }
  }

  if (!inputFile) throw new Error("Debes especificar un archivo .py");
  if (!outputFile) outputFile = path.basename(inputFile, ".py") + ".exe";

  return { inputFile, outputFile };
}

async function main() {
  try {
    const { inputFile, outputFile } = parseArgs();
    const converter = new PythonToExeConverter();
    await converter.convert(inputFile, outputFile);
  } catch (error) {
    console.error(`[❌] Error: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) main();
module.exports = PythonToExeConverter;
