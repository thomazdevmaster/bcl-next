type Props = {
  url?: string | null;
  name?: string | null;
  className?: string;
};

/** Foto da pessoa (Google ou cadastro). Sem URL, mostra o ícone de conta. */
export function UserAvatar({ url, name, className = 'h-11 w-11' }: Props) {
  if (url) {
    return (
      // Foto do Google (lh*.googleusercontent.com): precisa de referrerPolicy e não passa pelo otimizador.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={name ? `Foto de ${name}` : ''}
        referrerPolicy="no-referrer"
        className={`rounded-full object-cover ${className}`}
      />
    );
  }
  return (
    <span className={`material-icons inline-flex items-center justify-center ${className}`} aria-hidden>
      account_circle
    </span>
  );
}
