import chalk from "chalk";

export interface LogData {
  [key: string]: any;
}

class Logger {
  private formatTimestamp(): string {
    const now = new Date();
    const date = now.toLocaleDateString("uz-UZ");
    const time = now.toLocaleTimeString("uz-UZ");
    return chalk.gray(`[${date} ${time}]`);
  }

  private formatData(data?: LogData): string {
    if (!data) return "";

    const formatted = Object.entries(data)
      .map(([key, value]) => {
        const coloredKey = chalk.cyan(key);
        let coloredValue: string;

        if (typeof value === "string") {
          coloredValue = chalk.yellow(`"${value}"`);
        } else if (typeof value === "number") {
          coloredValue = chalk.magenta(value.toString());
        } else if (typeof value === "boolean") {
          coloredValue = value ? chalk.green("true") : chalk.red("false");
        } else {
          coloredValue = chalk.white(JSON.stringify(value));
        }

        return `${coloredKey}: ${coloredValue}`;
      })
      .join(", ");

    return chalk.gray(`{${formatted}}`);
  }

  info(message: string, data?: LogData): void {
    const timestamp = this.formatTimestamp();
    const icon = chalk.blue("ℹ");
    const msg = chalk.white(message);
    const dataStr = this.formatData(data);

    console.log(`${timestamp} ${icon} ${msg} ${dataStr}`.trim());
  }

  success(message: string, data?: LogData): void {
    const timestamp = this.formatTimestamp();
    const icon = chalk.green("✓");
    const msg = chalk.green(message);
    const dataStr = this.formatData(data);

    console.log(`${timestamp} ${icon} ${msg} ${dataStr}`.trim());
  }

  warning(message: string, data?: LogData): void {
    const timestamp = this.formatTimestamp();
    const icon = chalk.yellow("⚠");
    const msg = chalk.yellow(message);
    const dataStr = this.formatData(data);

    console.log(`${timestamp} ${icon} ${msg} ${dataStr}`.trim());
  }

  error(message: string, data?: LogData): void {
    const timestamp = this.formatTimestamp();
    const icon = chalk.red("✗");
    const msg = chalk.red(message);
    const dataStr = this.formatData(data);

    console.log(`${timestamp} ${icon} ${msg} ${dataStr}`.trim());
  }

  user(message: string, data?: LogData): void {
    const timestamp = this.formatTimestamp();
    const icon = chalk.blue("👤");
    const msg = chalk.blue(message);
    const dataStr = this.formatData(data);

    console.log(`${timestamp} ${icon} ${msg} ${dataStr}`.trim());
  }

  admin(message: string, data?: LogData): void {
    const timestamp = this.formatTimestamp();
    const icon = chalk.magenta("👑");
    const msg = chalk.magenta(message);
    const dataStr = this.formatData(data);

    console.log(`${timestamp} ${icon} ${msg} ${dataStr}`.trim());
  }

  ai(message: string, data?: LogData): void {
    const timestamp = this.formatTimestamp();
    const icon = chalk.cyan("🤖");
    const msg = chalk.cyan(message);
    const dataStr = this.formatData(data);

    console.log(`${timestamp} ${icon} ${msg} ${dataStr}`.trim());
  }

  broadcast(message: string, data?: LogData): void {
    const timestamp = this.formatTimestamp();
    const icon = chalk.yellow("📢");
    const msg = chalk.yellow(message);
    const dataStr = this.formatData(data);

    console.log(`${timestamp} ${icon} ${msg} ${dataStr}`.trim());
  }

  database(message: string, data?: LogData): void {
    const timestamp = this.formatTimestamp();
    const icon = chalk.green("💾");
    const msg = chalk.green(message);
    const dataStr = this.formatData(data);

    console.log(`${timestamp} ${icon} ${msg} ${dataStr}`.trim());
  }

  system(message: string, data?: LogData): void {
    const timestamp = this.formatTimestamp();
    const icon = chalk.gray("⚙️");
    const msg = chalk.gray(message);
    const dataStr = this.formatData(data);

    console.log(`${timestamp} ${icon} ${msg} ${dataStr}`.trim());
  }

  // Startup banner
  banner(): void {
    console.log("\n" + chalk.cyan("═".repeat(60)));
    console.log(chalk.cyan.bold("🤖 TELEGRAM AI CHATBOT"));
    console.log(
      chalk.gray("Professional AI Assistant with OpenRouter Integration")
    );
    console.log(chalk.cyan("═".repeat(60)) + "\n");
  }

  // Separator
  separator(): void {
    console.log(chalk.gray("─".repeat(60)));
  }
}

export const logger = new Logger();
