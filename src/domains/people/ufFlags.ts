const UF_FLAG_FILES = {
  AC: "AC.svg",
  AL: "AL.svg",
  AP: "AP.svg",
  AM: "AM.svg",
  BA: "BA.svg",
  CE: "CE.svg",
  DF: "DF.svg",
  ES: "ES.svg",
  GO: "GO.svg",
  MA: "MA.svg",
  MT: "MT.svg",
  MS: "MS.svg",
  MG: "MG.svg",
  PA: "PA.svg",
  PB: "PB.svg",
  PR: "PR.svg",
  PE: "PE.svg",
  PI: "PI.svg",
  RJ: "RJ.svg",
  RN: "RN.svg",
  RS: "RS.svg",
  RO: "RO.svg",
  RR: "RR.svg",
  SC: "SC.svg",
  SP: "SP.svg",
  SE: "SE.svg",
  TO: "TO.svg",
} as const;

export type BrazilianUf = keyof typeof UF_FLAG_FILES;

export function getUfFlagSrc(uf: string): string | undefined {
  const file = UF_FLAG_FILES[uf.trim().toUpperCase() as BrazilianUf];
  return file ? `/assets/uf/${file}` : undefined;
}
