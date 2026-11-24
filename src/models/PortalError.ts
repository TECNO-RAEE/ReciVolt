type ErrorLike = {
  message?: unknown;
  code?: unknown;
  status?: unknown;
  statusCode?: unknown;
  name?: unknown;
};

const SPANISH_MARKERS =
  /[áéíóúüñ¿¡]|\b(?:el|la|los|las|un|una|unos|unas|no|ya|de|del|para|con|por|en|al|se|es|son|está|están|tenés|podés|debe|deben|falta|faltan|revisá|completá|ingresá|elegí|seleccioná|indicá|usá|esperá|volvé|iniciá|confirmá|solicitá|agregá|guardá|cambiá|registrá|verificá)\b/i;

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function readStatus(error: ErrorLike): number | undefined {
  if (typeof error.status === 'number' && Number.isFinite(error.status)) return error.status;
  if (typeof error.statusCode === 'number' && Number.isFinite(error.statusCode)) {
    return error.statusCode;
  }
  if (typeof error.statusCode === 'string') {
    const parsed = Number(error.statusCode);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function looksSpanish(message: string): boolean {
  return SPANISH_MARKERS.test(message);
}

/** Translates technical Supabase, PostgREST, Postgres, JWT, and network errors into plain Spanish while preserving Spanish domain messages. */
export function humanizePortalError(cause: unknown, fallback: string): string {
  let raw = '';
  let code = '';
  let name = '';
  let status: number | undefined;

  if (typeof cause === 'string') {
    raw = cause.trim();
  } else if (cause && typeof cause === 'object') {
    const err = cause as ErrorLike;
    raw = readString(err.message);
    code = readString(err.code);
    name = readString(err.name);
    status = readStatus(err);
  }

  if (!raw && !code && status == null) return fallback;

  if (
    name === 'AuthRetryableFetchError' ||
    status === 0 ||
    (status !== undefined && status >= 500) ||
    /failed to fetch|network request failed|networkerror|load failed|fetch failed|econnrefused|econnreset|etimedout|enotfound|err_network|socket hang up|request timed out|timed out|internet connection appears to be offline|could not connect to the server/i.test(
      raw
    )
  ) {
    return 'No pudimos conectarnos con el servicio. Verificá tu conexión e intentá nuevamente.';
  }

  if (
    code === 'PGRST301' ||
    code === 'PGRST302' ||
    code === 'PGRST303' ||
    code === 'session_not_found' ||
    code === 'refresh_token_not_found' ||
    code === 'bad_jwt' ||
    /\bjwt\b|invalid refresh token|refresh_token_not_found|session_not_found|auth session missing|invalid claim|token has expired|not authenticated|bad_jwt/i.test(
      raw
    ) ||
    (status === 401 && (!raw || !looksSpanish(raw)))
  ) {
    return 'Tu sesión venció o no es válida. Volvé a iniciar sesión e intentá nuevamente.';
  }

  if (/invalid point time zone/i.test(raw)) {
    return 'La zona horaria del punto no es válida.';
  }

  if (
    code === 'PGRST116' ||
    /\bPGRST116\b|the result contains 0 rows|multiple \(or no\) rows returned/i.test(raw)
  ) {
    return 'No encontramos el registro solicitado.';
  }

  if (
    /^PGRST\d+/i.test(code) ||
    /\bPGRST\d+\b|could not find the (?:function|table)|could not find the '.*' column|schema cache/i.test(
      raw
    )
  ) {
    return 'No pudimos completar la operación con el servidor. Intentá nuevamente.';
  }

  if (
    /permission denied|insufficient_privilege|row-level security/i.test(raw) ||
    (code === '42501' && (!raw || !looksSpanish(raw)))
  ) {
    return 'No tenés permisos para realizar esta acción.';
  }

  if (
    /duplicate key|unique constraint|already exists/i.test(raw) ||
    (code === '23505' && (!raw || !looksSpanish(raw)))
  ) {
    return 'Ya existe un registro con estos datos.';
  }

  if (
    /invalid input syntax|invalid input value|cannot cast|value too long for type|out of range|invalid uuid|\bviolates\b|null value in column/i.test(
      raw
    ) ||
    ((code === '22P02' ||
      code === '22001' ||
      code === '22003' ||
      code === '23502' ||
      code === '23503' ||
      code === '23514') &&
      (!raw || !looksSpanish(raw)))
  ) {
    return 'Los datos ingresados no son válidos. Revisalos e intentá nuevamente.';
  }

  if (status === 429 || /too many requests|rate limit/i.test(raw)) {
    return 'Hiciste demasiados intentos. Esperá un momento e intentá nuevamente.';
  }

  if (/payload too large|entity too large/i.test(raw) || status === 413) {
    return 'El archivo supera el tamaño permitido.';
  }

  if (!raw) return fallback;

  if (
    !looksSpanish(raw) &&
    (/(?:something went wrong|unknown error|unexpected error|database error|server error|storage error|invalid (?:credentials|token|request|parameter|parameters|argument|arguments|id|uuid|email|password|payload)|unable to|failed to|cannot |could not |not found|does not exist|syntax error|unexpected token|unexpected end of|json parse|cannot read propert|undefined is not an object|is not a function|bucket not found|object not found|internal server error|bad gateway|service unavailable|gateway timeout|unauthorized|forbidden|bad request)/i.test(
      raw
    ) ||
      /^(?:TypeError|SyntaxError|ReferenceError|RangeError|Error):/i.test(raw) ||
      (/\b(?:failed|failure|invalid|unexpected|unable|cannot|timeout|expired|denied)\b/i.test(
        raw
      ) &&
        /\b(?:the|is|are|for|with|from|to|of|in|on)\b/i.test(raw)))
  ) {
    return fallback;
  }

  return raw;
}
