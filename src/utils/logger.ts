import { invoke } from '@tauri-apps/api/core';

type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'trace';

class Logger {
  private static instance: Logger;

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private formatMessage(message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] ${message}`;
  }

  async log(level: LogLevel, message: string): Promise<void> {
    const formattedMessage = this.formatMessage(message);
    try {
      await invoke('log_message', { level, message: formattedMessage });
    } catch (error) {
      console.error('Failed to log to file:', error);
    }
  }

  async error(message: string): Promise<void> {
    await this.log('error', message);
    console.error(message);
  }

  async warn(message: string): Promise<void> {
    await this.log('warn', message);
    console.warn(message);
  }

  async info(message: string): Promise<void> {
    await this.log('info', message);
    console.log(message);
  }

  async debug(message: string): Promise<void> {
    await this.log('debug', message);
    console.debug(message);
  }

  async trace(message: string): Promise<void> {
    await this.log('trace', message);
    console.trace(message);
  }
}

export const logger = Logger.getInstance();
