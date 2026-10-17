import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Playfair_Display } from 'next/font/google';

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
  style: ['normal', 'italic'],
});

export const metadata: Metadata = {
  title: 'Sobre',
  description:
    'Fundada em 1894 em Luminárias (MG), a Banda Carmelitana Luminarense é patrimônio cultural vivo: mais de 130 anos de música, fé e formação gratuita de jovens músicos.',
};

const ADDRESS = {
  street: 'Rua Silva Pinto, 96',
  district: 'Centro',
  city: 'Luminárias – MG',
  zip: 'CEP 37240-000',
};

/** Dados institucionais. URL/telefone/e-mail vazios aparecem sem link. */
const CONTACT = {
  cnpj: '20.408.324/0001-70',
  phone: '(35) 99727-5401',
  whatsapp: '(35) 99727-5401',
  email: 'bandacarmelitanalms@gmail.com',
  instagram: 'https://www.instagram.com/carmelitana.luminarias/',
  facebook: 'https://www.facebook.com/bandacarmelitanalms',
  youtube: 'https://www.youtube.com/@bandacarmelitanaluminarens4347',
};

const MAP_QUERY = `${ADDRESS.street}, ${ADDRESS.district}, Luminárias, MG, 37240-000`;
const MAP_EMBED_URL = `https://maps.google.com/maps?q=${encodeURIComponent(MAP_QUERY)}&z=17&hl=pt-BR&output=embed`;

type SocialNetwork = 'instagram' | 'facebook' | 'youtube' | 'whatsapp';

const SOCIAL_LABEL: Record<SocialNetwork, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  youtube: 'YouTube',
  whatsapp: 'WhatsApp',
};

function SocialIcon({ network }: { network: SocialNetwork }) {
  if (network === 'instagram') {
    return (
      <svg aria-hidden viewBox="0 0 24 24" className="h-7 w-7">
        <defs>
          <radialGradient id="ig-fill" cx="30%" cy="110%" r="120%">
            <stop offset="0%" stopColor="#fdf497" />
            <stop offset="10%" stopColor="#fdf497" />
            <stop offset="50%" stopColor="#fd5949" />
            <stop offset="100%" stopColor="#d6249f" />
          </radialGradient>
        </defs>
        <rect x="2" y="2" width="20" height="20" rx="6" fill="url(#ig-fill)" />
        <circle cx="12" cy="12" r="4.2" fill="none" stroke="#fff" strokeWidth="1.8" />
        <circle cx="17.2" cy="6.8" r="1.15" fill="#fff" />
      </svg>
    );
  }
  if (network === 'facebook') {
    return (
      <svg aria-hidden viewBox="0 0 24 24" className="h-7 w-7">
        <circle cx="12" cy="12" r="11" fill="#1877F2" />
        <path fill="#fff" d="M13.4 20.2v-7.3h2.4l.4-2.8h-2.8V8.4c0-.8.2-1.4 1.4-1.4H16.4V4.5c-.3 0-1.2-.1-2.3-.1-2.3 0-3.8 1.4-3.8 3.9v2h-2.5v2.8h2.5v7.3h2.1z" />
      </svg>
    );
  }
  if (network === 'youtube') {
    return (
      <svg aria-hidden viewBox="0 0 24 24" className="h-7 w-7">
        <rect x="1" y="5" width="22" height="14" rx="4" fill="#FF0000" />
        <path fill="#fff" d="M10 9.2v5.6l5.2-2.8z" />
      </svg>
    );
  }
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-7 w-7">
      <circle cx="12" cy="12" r="11" fill="#25D366" />
      <path
        fill="#fff"
        d="M16.6 14.7c-.2.6-1.2 1.1-1.9 1.2-.5.1-1.2.2-3.5-.8-2.8-1.2-4.6-4.1-4.8-4.3-.2-.2-1.3-1.7-1.3-3.3 0-1.5.8-2.3 1.1-2.6.3-.3.6-.4.8-.4h.6c.2 0 .4 0 .6.5l.9 2.2c.1.2.1.4 0 .5l-.4.5c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1.9.8 1.9 1.3 2.3 1.4.3.1.5.1.7-.1l.6-.7c.2-.2.4-.2.7-.1l2.1 1.1c.2.1.3.2.4.4.1.3 0 .9-.2 1.4z"
      />
    </svg>
  );
}

function formatPhoneHref(phone: string): string {
  return `tel:+55${phone.replace(/\D/g, '')}`;
}

function formatWhatsAppHref(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits ? `https://wa.me/55${digits}` : '';
}

function socialHref(network: SocialNetwork): string {
  if (network === 'whatsapp') return formatWhatsAppHref(CONTACT.whatsapp);
  return CONTACT[network];
}

function displayOrDash(value: string): string {
  return value.trim() ? value : 'A informar';
}

function SocialLink({ network }: { network: SocialNetwork }) {
  const label = SOCIAL_LABEL[network];
  const href = socialHref(network);
  const className =
    'inline-flex min-h-11 min-w-11 items-center justify-center rounded-full bg-white shadow-sm transition hover:scale-105 hover:shadow-md';
  if (!href) {
    return (
      <span className={`${className} cursor-not-allowed`} aria-label={`${label} (em breve)`} title={`${label} em breve`}>
        <SocialIcon network={network} />
      </span>
    );
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label} title={label} className={`${className} no-underline hover:no-underline`}>
      <SocialIcon network={network} />
    </a>
  );
}

const HIGHLIGHTS = [
  { value: '1894', label: 'Ano de fundação' },
  { value: '130+', label: 'Anos de história ininterrupta' },
  { value: '1912', label: 'Primeiro estatuto da corporação' },
  { value: 'Gratuita', label: 'Formação musical para crianças e jovens' },
] as const;

type TimelineFrame = 'photo' | 'portrait' | 'tall' | 'wide';

const TIMELINE_FRAME: Record<TimelineFrame, string> = {
  photo: 'aspect-[16/10]',
  portrait: 'mx-auto aspect-[4/5] max-w-[15rem] sm:max-w-[17rem]',
  tall: 'mx-auto aspect-[2/3] w-full max-w-md',
  wide: 'aspect-[2/1]',
};

const TIMELINE_OBJECT: Record<TimelineFrame, string> = {
  photo: 'object-cover object-center',
  portrait: 'object-cover object-top',
  tall: 'object-cover object-center',
  wide: 'object-cover object-center',
};

const TIMELINE = [
  {
    when: '1894',
    title: 'A fundação',
    text: 'Américo José da Costa chegou de São Tomé das Letras em 1893, como escrivão civil. Já era músico: reuniu quem no arraial tocava sopro e, em 1894, fundou a Corporação Musical Carmelitana Luminarense, em homenagem a Nossa Senhora do Carmo. Essa corporação é a BCL de hoje.',
    image: {
      src: '/imgs/historia-1894-americo.jpg',
      alt: 'Retrato de Américo José da Costa, fundador da Banda Carmelitana Luminarense',
      caption: 'Américo José da Costa, o fundador — mestre, maestro e instrumentista.',
      frame: 'portrait' as const,
    },
  },
  {
    when: '1908–1915',
    title: 'Os primeiros discípulos',
    text: 'Américo ensinou a primeira geração nascida no arraial — entre eles Dico Eduardo, Aristóbulo Silva e os irmãos Vitorinos. Em 1912 a corporação ganhou estatuto, impresso na tipografia do Ginásio de Lavras. Em 1915, dez músicos foram a cavalo tirar reis: doze dias, cerca de 200 km, e o dinheiro comprou um baixo novo.',
    image: {
      src: '/imgs/historia-1910-vitorinos.jpg',
      alt: 'Banda dos Vitorinos em 1910, com Américo Costa entre os músicos',
      caption: 'Banda dos Vitorinos, 1910. Américo Costa (clarinete) está entre os músicos que formou.',
      frame: 'photo' as const,
    },
  },
  {
    when: '1921–1924',
    title: 'A sede na Silva Pinto',
    text: 'Com o que se arrecadava tirando reis e com doações, o pedreiro Antonio Furtado construiu a sede na Rua Silva Pinto. Das três bandas do arraial — a Carmelitana, os Vitorinos e a Euterpe Aparecida — só a BCL chegou a ter patrimônio próprio.',
    image: {
      src: '/imgs/historia-sede-antes-1979.jpg',
      alt: 'Sede da Banda Carmelitana Luminarense na Rua Silva Pinto, antes da reforma de 1979',
      caption: 'A sede na Rua Silva Pinto, ainda antes da reforma de 1979.',
      frame: 'photo' as const,
    },
  },
  {
    when: '1926',
    title: 'As três bandas nas Cavalhadas',
    text: 'Na foto das Cavalhadas, onde hoje é a Praça dos Expedicionários, aparecem a BCL, a Euterpe Aparecida (com músicos dos Vitorinos) e o clube de cavalhadas. O livro a considera um dos maiores documentos da música luminarense.',
    image: {
      src: '/imgs/historia-1926-cavalhadas.jpg',
      alt: 'As três bandas de Luminárias e o clube de Cavalhadas reunidos em 1926',
      caption: 'Cavalhadas de 1926: BCL, Vitorinos/Euterpe e o clube, no antigo campo de futebol.',
      frame: 'wide' as const,
    },
  },
  {
    when: '1954',
    title: 'A Banda dos Meninos',
    text: 'Sinhô reuniu meninos de 7 a 14 anos. Em cerca de dez meses estrearam o Tantum Ergo na Matriz. Foi a formação mais famosa da BCL — a Bandinha do Sinhô —, que tocou em Lavras, Cruzília, Três Corações e São Lourenço.',
    image: {
      src: '/imgs/historia-banda-meninos.jpg',
      alt: 'Banda dos Meninos em uniforme, com o maestro Sinhô ao fundo',
      caption: 'A Banda dos Meninos, a formação mais famosa da BCL, ensaiada por Sinhô.',
      frame: 'tall' as const,
    },
  },
  {
    when: 'Hoje',
    title: 'Na mesma rua, a mesma corporação',
    text: 'A sede segue na Rua Silva Pinto, 96, a mesma rua da casa erguida nos anos 1920. A banda continua a tocar nas festas da padroeira, nas ruas e nas praças — e a formar novos músicos a cada geração.',
    image: {
      src: '/imgs/sede.jpg',
      alt: 'Sede da Banda Carmelitana Luminarense ao entardecer, na Rua Silva Pinto, 96',
      caption: 'A sede hoje, na Rua Silva Pinto, 96 — de onde a tradição segue viva.',
      frame: 'photo' as const,
    },
  },
] as const;

const ROLES = [
  {
    icon: 'church',
    title: 'Festas religiosas e cívicas',
    text: 'Figura central da identidade da cidade, a banda organiza e acompanha as celebrações de Nossa Senhora do Carmo, padroeira de Luminárias, além de eventos cívicos, desfiles e inaugurações.',
  },
  {
    icon: 'library_music',
    title: 'Do coreto à música popular',
    text: 'Fiel à tradição das bandas mineiras, o repertório transita entre dobrados clássicos, hinos, trilhas marcantes como “A Conquista do Paraíso” e arranjos da música popular brasileira.',
  },
  {
    icon: 'diversity_3',
    title: 'Encontro de Bandas de Luminárias',
    text: 'Anfitriã do município, a corporação é a grande estrela do tradicional Encontro de Bandas, que reúne centenas de músicos de corporações de todo o estado.',
  },
] as const;

const serif = 'font-[family-name:var(--font-playfair),var(--font-serif)]';

export default function SobrePage() {
  return (
    <div className={playfair.variable}>
      {/* Abertura */}
      <section className="relative isolate overflow-hidden bg-[var(--color-ink)] text-white">
        <Image
          src="/imgs/img1.jpg"
          alt="Músicos da Banda Carmelitana tocando na praça de Luminárias em foto histórica"
          fill
          preload
          sizes="100vw"
          className="-z-10 object-cover object-center opacity-45 grayscale"
        />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-b from-[rgba(11,28,44,0.55)] via-[rgba(11,28,44,0.7)] to-[var(--color-ink)]"
        />
        <div className="mx-auto max-w-6xl px-4 pb-14 pt-16 sm:pb-20 sm:pt-24 md:pt-28">
          <div className="grid items-center gap-8 md:grid-cols-[minmax(0,1fr)_auto] md:gap-10 lg:gap-16">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.3em] text-[var(--color-brand)]">
                Desde 1894 · Luminárias, Minas Gerais
              </p>
              <h1 className={`${serif} mb-0 mt-4 max-w-3xl text-4xl font-semibold leading-[1.1] text-white sm:text-5xl md:text-6xl`}>
                Banda Carmelitana <span className="italic text-[var(--color-brand)]">Luminarense</span>
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-relaxed text-white/80 sm:text-lg">
                Uma das corporações musicais mais tradicionais e antigas da região. Há mais de 130 anos, sem interrupção,
                levamos música às igrejas, ruas e praças de Luminárias — um patrimônio cultural vivo que une gerações pela
                música e pela educação.
              </p>
            </div>
            <Image
              src="/assets/logo.png"
              alt="Brasão da Banda Carmelitana Luminarense"
              width={306}
              height={270}
              preload
              className="mx-auto h-auto w-44 object-contain mix-blend-screen drop-shadow-lg sm:w-56 md:mx-0 md:w-64 lg:w-80"
            />
          </div>

          <dl className="mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 md:grid-cols-4">
            {HIGHLIGHTS.map((item) => (
              <div key={item.label} className="flex flex-col bg-[rgba(11,28,44,0.75)] p-4 backdrop-blur-sm sm:p-6">
                <dt className="text-xs leading-snug text-white/65 sm:text-sm">{item.label}</dt>
                <dd className={`${serif} order-first mt-1 text-2xl text-white sm:text-3xl`}>{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* História */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:py-20" aria-labelledby="historia">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <p className="text-xs font-medium uppercase tracking-[0.3em] text-[var(--color-brand-strong)]">
              Um pouco da nossa história
            </p>
            <h2 id="historia" className={`${serif} mt-3 text-3xl leading-tight text-[var(--foreground)] sm:text-4xl`}>
              A corporação de 1894
            </h2>
            <p className="mt-5 text-base leading-relaxed text-[var(--muted)]">
              Américo José da Costa fundou a Corporação Musical Carmelitana Luminarense em 1894. Daí em diante a banda
              atravessou mais de um século — mestres sem remuneração, viagens a cavalo, uma sede erguida com doações —
              sem nunca deixar de tocar.
            </p>
            <Link
              href="/historia"
              className="btn-primary mt-6 inline-flex min-h-11 items-center justify-center gap-2 px-5 no-underline"
            >
              <span className="material-icons text-lg" aria-hidden>
                auto_stories
              </span>
              Ler a história completa
            </Link>
          </div>

          <div>
            <ol className="relative border-l border-[var(--border)] pl-6 sm:pl-8">
              {TIMELINE.map((item) => (
                <li key={item.title} className="relative pb-10 last:pb-2">
                  <span
                    aria-hidden
                    className="absolute -left-[31px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-[var(--color-brand)] bg-[var(--background)] sm:-left-[39px]"
                  />
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-brand-strong)]">{item.when}</p>
                  <h3 className={`${serif} mt-1 text-xl text-[var(--foreground)] sm:text-2xl`}>{item.title}</h3>
                  <p className="mt-2 leading-relaxed text-[var(--muted)]">{item.text}</p>
                  <figure className="mt-4">
                    <div
                      className={`relative overflow-hidden rounded-2xl bg-[var(--color-ink)] shadow-[var(--shadow-soft)] ${TIMELINE_FRAME[item.image.frame]}`}
                    >
                      <Image
                        src={item.image.src}
                        alt={item.image.alt}
                        fill
                        sizes="(max-width: 1024px) 100vw, 50vw"
                        className={item.when === 'Hoje' ? 'object-cover object-[center_65%]' : TIMELINE_OBJECT[item.image.frame]}
                      />
                    </div>
                    <figcaption className="mt-2 text-xs leading-relaxed text-[var(--muted)]">{item.image.caption}</figcaption>
                  </figure>
                </li>
              ))}
            </ol>
            <p className="mt-4 pl-6 text-[0.7rem] leading-relaxed text-[var(--muted)] sm:pl-8">
              Fotos históricas extraídas de Hugo Nicodemos Biavati,{' '}
              <cite>A Presença da Música na História Luminarense (1894 a 1978)</cite>, 2023. A sede de hoje é foto atual
              da corporação.{' '}
              <Link href="/historia" className="text-[var(--color-brand-strong)]">
                História completa, com o PDF do livro
              </Link>
              .
            </p>
          </div>
        </div>
      </section>

      {/* Citação */}
      <section className="border-y border-[var(--border)] bg-[var(--card)]">
        <figure className="mx-auto max-w-4xl px-4 py-14 text-center sm:py-20">
          <span aria-hidden className={`${serif} block text-6xl leading-none text-[var(--color-brand)]`}>
            “
          </span>
          <blockquote className={`${serif} mt-2 text-2xl italic leading-snug text-[var(--foreground)] sm:text-3xl md:text-4xl`}>
            Um patrimônio cultural vivo, que conecta gerações por meio da música e da educação.
          </blockquote>
          <figcaption className="mt-6 text-xs font-medium uppercase tracking-[0.3em] text-[var(--muted)]">
            Banda Carmelitana Luminarense · 1894
          </figcaption>
        </figure>
      </section>

      {/* Atuação cultural */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:py-20" aria-labelledby="atuacao">
        <div className="max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-[var(--color-brand-strong)]">Atuação cultural</p>
          <h2 id="atuacao" className={`${serif} mt-3 text-3xl leading-tight text-[var(--foreground)] sm:text-4xl`}>
            Na vida e na memória de Luminárias
          </h2>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {ROLES.map((role) => (
            <article
              key={role.title}
              className="flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-[var(--shadow-soft)] sm:p-7"
            >
              <span className="material-icons flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent)] text-2xl text-[var(--color-brand-strong)]" aria-hidden>
                {role.icon}
              </span>
              <h3 className={`${serif} mt-5 text-xl text-[var(--foreground)]`}>{role.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-[var(--muted)] sm:text-base">{role.text}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Escola */}
      <section className="bg-[var(--card-secondary)]" aria-labelledby="escola">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:py-20 lg:grid-cols-2 lg:items-center lg:gap-16">
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl shadow-[var(--shadow-soft)]">
            <Image
              src="/imgs/img3.jpg"
              alt="Jovens clarinetistas da banda tocando à noite na praça, regidos pelo maestro"
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.3em] text-[var(--color-brand-strong)]">Papel social e educacional</p>
            <h2 id="escola" className={`${serif} mt-3 text-3xl leading-tight text-[var(--foreground)] sm:text-4xl`}>
              Formação gratuita, tradição que se renova
            </h2>
            <p className="mt-5 leading-relaxed text-[var(--muted)]">
              Hoje a banda pertence e é mantida pela <strong className="font-semibold text-[var(--foreground)]">Escola Luminarense de Música</strong>.
              Além de se apresentar, a instituição oferece formação musical gratuita para crianças e jovens da
              comunidade.
            </p>
            <p className="mt-4 leading-relaxed text-[var(--muted)]">
              É assim que a corporação renova seus integrantes a cada geração e mantém viva uma tradição que já
              ultrapassa um século.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/agenda" className="btn-primary inline-flex min-h-11 items-center justify-center gap-2 px-5 no-underline">
                <span className="material-icons text-lg" aria-hidden>
                  event
                </span>
                Ver a agenda
              </Link>
              <Link href="/blog" className="btn-outline-primary inline-flex min-h-11 items-center justify-center gap-2 px-5 no-underline">
                <span className="material-icons text-lg" aria-hidden>
                  article
                </span>
                Acompanhar o blog
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Onde nos encontrar */}
      <section className="mx-auto w-[85%] py-10 sm:py-12" aria-labelledby="contato">
        <div className="relative overflow-hidden rounded-3xl bg-[var(--color-ink)] text-white shadow-[var(--shadow-soft)] lg:flex lg:min-h-[36rem] lg:flex-col lg:justify-end xl:min-h-[42rem]">
          <Image
            src="/imgs/sede.jpg"
            alt="Fachada da sede da Banda Carmelitana Luminarense, na Rua Silva Pinto, 96, ao entardecer"
            fill
            sizes="85vw"
            className="object-cover object-[center_70%] lg:object-[center_42%]"
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-t from-[var(--color-ink)] from-[12%] via-[var(--color-ink)]/75 via-55% to-[var(--color-ink)]/30 lg:from-[18%] lg:via-[var(--color-ink)]/80 lg:via-45% lg:to-transparent"
          />
          <div className="relative z-10 flex flex-col gap-6 p-5 sm:p-6 lg:flex-row lg:items-end lg:justify-between lg:gap-10 lg:p-8">
            <div className="min-w-0 max-w-xl">
              <p className="text-xs font-medium uppercase tracking-[0.3em] text-[var(--color-brand)]">Onde nos encontrar</p>
              <h2 id="contato" className={`${serif} mt-2 text-2xl leading-tight text-white sm:text-3xl`}>
                Sede da banda
              </h2>
              <address className="mt-3 not-italic text-base leading-relaxed text-white/90 sm:text-lg">
                {ADDRESS.street} · {ADDRESS.district}
                <br />
                {ADDRESS.city} · {ADDRESS.zip}
              </address>

              <dl className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-x-8 sm:gap-y-3">
                <div>
                  <dt className="text-[0.65rem] font-medium uppercase tracking-[0.18em] text-white/50">CNPJ</dt>
                  <dd className="mt-0.5 font-mono text-sm tracking-wide text-white/90">{displayOrDash(CONTACT.cnpj)}</dd>
                </div>
                <div>
                  <dt className="text-[0.65rem] font-medium uppercase tracking-[0.18em] text-white/50">Telefone</dt>
                  <dd className="mt-0.5 text-sm text-white/90">
                    {CONTACT.phone ? (
                      <a href={formatPhoneHref(CONTACT.phone)} className="text-white no-underline hover:text-[var(--color-brand)] hover:underline">
                        {CONTACT.phone}
                      </a>
                    ) : (
                      displayOrDash('')
                    )}
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-[0.65rem] font-medium uppercase tracking-[0.18em] text-white/50">E-mail</dt>
                  <dd className="mt-0.5 truncate text-sm text-white/90">
                    {CONTACT.email ? (
                      <a href={`mailto:${CONTACT.email}`} className="text-white no-underline hover:text-[var(--color-brand)] hover:underline">
                        {CONTACT.email}
                      </a>
                    ) : (
                      displayOrDash('')
                    )}
                  </dd>
                </div>
              </dl>

              <ul className="mt-5 flex flex-wrap gap-2">
                {(['instagram', 'facebook', 'youtube', 'whatsapp'] as const).map((network) => (
                  <li key={network}>
                    <SocialLink network={network} />
                  </li>
                ))}
              </ul>
            </div>

            <div className="w-full shrink-0 lg:w-64 xl:w-72">
              <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-white/15 shadow-lg sm:aspect-[16/9] lg:aspect-[4/3]">
                <iframe
                  title="Mapa da sede da Banda Carmelitana Luminarense"
                  src={MAP_EMBED_URL}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="absolute inset-0 h-full w-full border-0"
                  allowFullScreen
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
