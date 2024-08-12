interface RunCfg {
  outlineCfg: OutlineCfg;
  writeArticleCfg: WriteArticleCfg;
  polishCfg: PolishCfg;
}

interface OutlineCfg {
  modelName: string;
  temperature: number;
  inputPrice: number;
  outputPrice: number;
}

interface WriteArticleCfg {
  modelName: string;
  temperature: number;
  inputPrice: number;
  outputPrice: number;
}

interface PolishCfg {
  modelName: string;
  temperature: number;
  inputPrice: number;
  outputPrice: number;
}
