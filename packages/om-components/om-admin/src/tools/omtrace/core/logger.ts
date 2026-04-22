// Timestamped logging system for OMTRACE

export interface Logger {
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
  debug(message: string, ...args: any[]): void;
}

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

const LOG_LEVELS: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

export class ConsoleLogger implements Logger {
  constructor(
    private logLevel: LogLevel = 'warn',
    private timestamps: boolean = false
  ) {}

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] <= LOG_LEVELS[this.logLevel];
  }

  private timestamp(): string {
    return new Date().toISOString();
  }

  private format(level: string, message: string, args: any[]): string {
    const ts = this.timestamps ? `[${this.timestamp()}] ` : '';
    const formattedArgs = args.length > 0 ? ` ${args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ')}` : '';
    return `${ts}${level}: ${message}${formattedArgs}`;
  }

  info(message: string, ...args: any[]): void {
    if (this.shouldLog('info')) {
      console.log(this.format('INFO', message, args));
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.shouldLog('warn')) {
      console.warn(this.format('WARN', message, args));
    }
  }

  error(message: string, ...args: any[]): void {
    if (this.shouldLog('error')) {
      console.error(this.format('ERROR', message, args));
    }
  }

  debug(message: string, ...args: any[]): void {
    if (this.shouldLog('debug')) {
      console.log(this.format('DEBUG', message, args));
    }
  }

  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }
}

export class FileLogger implements Logger {
  constructor(
    private filePath: string,
    private verbose: boolean = false
  ) {}

  private timestamp(): string {
    return new Date().toISOString();
  }

  private write(level: string, message: string, args: any[]): void {
    const fs = require('fs');
    const ts = this.timestamp();
    const formattedArgs = args.length > 0 ? ` ${args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ')}` : '';
    const logEntry = `[${ts}] ${level}: ${message}${formattedArgs}\n`;
    
    try {
      fs.appendFileSync(this.filePath, logEntry);
    } catch (err) {
      // Fallback to console if file write fails
      console.error(`Failed to write to log file ${this.filePath}:`, err);
      console.log(logEntry.trim());
    }
  }

  info(message: string, ...args: any[]): void {
    this.write('INFO', message, args);
  }

  warn(message: string, ...args: any[]): void {
    this.write('WARN', message, args);
  }

  error(message: string, ...args: any[]): void {
    this.write('ERROR', message, args);
  }

  debug(message: string, ...args: any[]): void {
    if (this.verbose) {
      this.write('DEBUG', message, args);
    }
  }
}

// Global logger instance - default to warn level (quiet)
let globalLogger: Logger = new ConsoleLogger('warn');

export function setLogger(logger: Logger): void {
  globalLogger = logger;
}

export function getLogger(): Logger {
  return globalLogger;
}

export function setLogLevel(level: LogLevel): void {
  if (globalLogger instanceof ConsoleLogger) {
    globalLogger.setLogLevel(level);
  }
}

export function setVerbose(verbose: boolean): void {
  const level = verbose ? 'debug' : 'warn';
  setLogLevel(level);
}

export function setQuiet(quiet: boolean): void {
  if (quiet) {
    setLogLevel('error');
  }
}

// Convenience functions
export const log = {
  info: (message: string, ...args: any[]) => globalLogger.info(message, ...args),
  warn: (message: string, ...args: any[]) => globalLogger.warn(message, ...args),
  error: (message: string, ...args: any[]) => globalLogger.error(message, ...args),
  debug: (message: string, ...args: any[]) => globalLogger.debug(message, ...args),
};
