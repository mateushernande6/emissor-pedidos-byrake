import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { LogEntry } from './types';

export class LogService {
  private logFilePath: string;
  private logListeners: ((log: LogEntry) => void)[] = [];

  constructor() {
    const userDataPath = app.getPath('userData');
    const logsDir = path.join(userDataPath, 'logs');
    
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    this.logFilePath = path.join(logsDir, 'app.log');
  }

  private writeToFile(entry: LogEntry): void {
    try {
      const logLine = `[${entry.timestamp.toISOString()}] [${entry.level.toUpperCase()}] ${entry.message}\n`;
      fs.appendFileSync(this.logFilePath, logLine, 'utf-8');
    } catch (error) {
      console.error('Erro ao escrever log em arquivo:', error);
    }
  }

  private notify(entry: LogEntry): void {
    this.logListeners.forEach(listener => {
      try {
        listener(entry);
      } catch (error) {
        console.error('Erro ao notificar listener de log:', error);
      }
    });
  }

  private log(level: LogEntry['level'], message: string): void {
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
    };

    console.log(`[${level.toUpperCase()}]`, message);
    this.writeToFile(entry);
    this.notify(entry);
  }

  info(message: string): void {
    this.log('info', message);
  }

  warning(message: string): void {
    this.log('warning', message);
  }

  error(message: string): void {
    this.log('error', message);
  }

  success(message: string): void {
    this.log('success', message);
  }

  onLog(listener: (log: LogEntry) => void): () => void {
    this.logListeners.push(listener);
    return () => {
      this.logListeners = this.logListeners.filter(l => l !== listener);
    };
  }
}
