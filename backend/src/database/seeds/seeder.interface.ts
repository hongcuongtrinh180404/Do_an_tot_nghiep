export interface ISeederOptions {
  refresh?: boolean;
}

export interface ISeeder {
  readonly name: string;
  run(options?: ISeederOptions): Promise<void>;
}
