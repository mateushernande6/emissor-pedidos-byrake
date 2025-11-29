import { app } from "electron";
import * as fs from "fs";
import * as path from "path";
import { AppConfig } from "./types";

const CONFIG_FILE_NAME = "config.json";

export class ConfigStore {
  private configPath: string;
  private config: Partial<AppConfig>;

  constructor() {
    const userDataPath = app.getPath("userData");
    this.configPath = path.join(userDataPath, CONFIG_FILE_NAME);
    this.config = this.load();
  }

  private load(): Partial<AppConfig> {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, "utf-8");
        return JSON.parse(data);
      }
    } catch (error) {
      console.error("Erro ao carregar configuração:", error);
    }
    return {};
  }

  private save(): void {
    try {
      const dir = path.dirname(this.configPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(
        this.configPath,
        JSON.stringify(this.config, null, 2),
        "utf-8"
      );
    } catch (error) {
      console.error("Erro ao salvar configuração:", error);
      throw error;
    }
  }

  get(): Partial<AppConfig> {
    return { ...this.config };
  }

  set(config: Partial<AppConfig>): void {
    this.config = { ...this.config, ...config };
    this.save();
  }

  isConfigured(): boolean {
    // Apenas verifica se o token da estação está configurado
    // URL e chave do Supabase vêm do .env
    return !!this.config.stationToken;
  }

  clear(): void {
    this.config = {};
    this.save();
  }
}
