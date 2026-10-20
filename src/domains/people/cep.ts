export type CepAddress = {
  postalCode: string;
  street: string;
  complement: string;
  unit: string;
  neighborhood: string;
  city: string;
  state: string;
};

type ViaCepResponse = {
  cep?: unknown;
  logradouro?: unknown;
  complemento?: unknown;
  unidade?: unknown;
  bairro?: unknown;
  localidade?: unknown;
  uf?: unknown;
  erro?: unknown;
};

export function formatPostalCode(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
}

export async function lookupCep(value: string, signal?: AbortSignal): Promise<CepAddress> {
  const digits = value.replace(/\D/g, "");
  if (!/^\d{8}$/.test(digits)) {
    throw new Error("Informe um CEP com 8 números.");
  }

  const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`, {
    signal,
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("Não foi possível consultar o CEP agora.");
  }

  const result = (await response.json()) as ViaCepResponse;
  if (result.erro === true) {
    throw new Error("CEP não encontrado.");
  }

  return {
    postalCode: typeof result.cep === "string" ? result.cep : formatPostalCode(digits),
    street: typeof result.logradouro === "string" ? result.logradouro : "",
    complement: typeof result.complemento === "string" ? result.complemento : "",
    unit: typeof result.unidade === "string" ? result.unidade : "",
    neighborhood: typeof result.bairro === "string" ? result.bairro : "",
    city: typeof result.localidade === "string" ? result.localidade : "",
    state: typeof result.uf === "string" ? result.uf : "",
  };
}
