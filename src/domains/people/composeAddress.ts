/** Monta o endereço em uma linha, no mesmo formato da gestão de pessoas. */
export type StructuredAddress = {
  street: string;
  addressNumber: string;
  complement: string;
  unit: string;
  neighborhood: string;
  city: string;
  state: string;
  postalCode: string;
};

/** Interpreta endereço em linha única gerado por `composeAddress`. */
export function parseComposedAddress(
  address: string,
): Partial<StructuredAddress> | null {
  const trimmed = address.trim();
  if (!trimmed) return null;

  let working = trimmed;
  let postalCode = "";
  const cepTail = working.match(/,\s*CEP\s*(\d{5}-?\d{3})\s*$/i);
  if (cepTail) {
    const digits = cepTail[1].replace(/\D/g, "");
    if (digits.length === 8) {
      postalCode = `${digits.slice(0, 5)}-${digits.slice(5)}`;
    }
    working = working.slice(0, cepTail.index).trim();
  }

  const parts = working.split(/,\s*/).filter(Boolean);
  if (parts.length === 0) return null;

  let state = "";
  let city = "";
  const last = parts[parts.length - 1];
  const cityState = last.match(/^(.+?)\s*-\s*([A-Z]{2})$/);
  if (cityState) {
    city = cityState[1].trim();
    state = cityState[2];
    parts.pop();
  }

  let street = "";
  let addressNumber = "";
  let complement = "";
  let unit = "";
  let neighborhood = "";

  if (parts.length === 1) {
    const only = parts[0];
    const splitNumber = only.match(/^(.+?),\s*(\d+|S\/N)$/i);
    if (splitNumber) {
      street = splitNumber[1].trim();
      addressNumber = splitNumber[2].trim();
    } else {
      street = only;
    }
  } else if (parts.length >= 2) {
    street = parts[0];
    addressNumber = parts[1];
    if (parts.length === 3) {
      neighborhood = parts[2];
    } else if (parts.length === 4) {
      complement = parts[2];
      neighborhood = parts[3];
    } else if (parts.length >= 5) {
      complement = parts[2];
      unit = parts[3];
      neighborhood = parts[4];
    }
  }

  return {
    street,
    addressNumber,
    complement,
    unit,
    neighborhood,
    city,
    state,
    postalCode,
  };
}

export function hasStructuredAddress(values: Record<string, unknown>): boolean {
  return ["postalCode", "street", "addressNumber", "neighborhood", "city", "state"].some(
    (key) => String(values[key] ?? "").trim() !== "",
  );
}

export function mergeParsedAddressIntoValues(
  values: Record<string, unknown>,
): Record<string, unknown> {
  if (hasStructuredAddress(values)) return values;
  const legacy = String(values.address ?? "").trim();
  if (!legacy) return values;
  const parsed = parseComposedAddress(legacy);
  if (!parsed) return values;
  return {
    ...values,
    postalCode: parsed.postalCode ?? values.postalCode ?? "",
    street: parsed.street ?? values.street ?? "",
    addressNumber: parsed.addressNumber ?? values.addressNumber ?? "",
    complement: parsed.complement ?? values.complement ?? "",
    unit: parsed.unit ?? values.unit ?? "",
    neighborhood: parsed.neighborhood ?? values.neighborhood ?? "",
    city: parsed.city ?? values.city ?? "",
    state: parsed.state ?? values.state ?? "",
  };
}

export function composeAddress(values: StructuredAddress): string {
  const streetAndNumber = [values.street.trim(), values.addressNumber.trim()]
    .filter(Boolean)
    .join(", ");
  const cityAndState = [values.city.trim(), values.state]
    .filter(Boolean)
    .join(" - ");
  return [
    streetAndNumber,
    values.complement.trim(),
    values.unit.trim(),
    values.neighborhood.trim(),
    cityAndState,
    values.postalCode.trim() ? `CEP ${values.postalCode.trim()}` : "",
  ]
    .filter(Boolean)
    .join(", ");
}
