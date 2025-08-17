export type ProxyConfig = {
  targetCommand: string[];
  serverName: string;
  serverVersion: string;
};

export type TargetServerProcess = {
  process: Bun.Subprocess;
  stdin: Bun.FileSink;
  stdout: ReadableStream<Uint8Array>;
};