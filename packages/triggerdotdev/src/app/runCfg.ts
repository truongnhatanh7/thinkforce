interface RunCfg {
  runId: string;
  outlineCfg: OutlineCfg;
  writeArticleCfg: WriteArticleCfg;
  polishCfg: PolishCfg;
}

interface OutlineCfg {
  modelName: string;
  temperature: number;
}

interface WriteArticleCfg {
  modelName: string;
  temperature: number;
}

interface PolishCfg {
  modelName: string;
  temperature: number;
}
