"use client";

import { Playfair_Display } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useId, useState } from "react";

import { EntityDialog } from "@/components/shared/EntityDialog";
import {
  BAND_CONTACT,
  BOOK,
  BOOK_MASTERS,
  CORPORATIONS,
  GALLERY,
  type HistoriaPhoto,
  LATER_MASTERS,
  type MasterCard,
  PHYSICAL_BOOK_MAILTO,
  PHYSICAL_BOOK_WHATSAPP,
  SECTION_NAV,
  TIMELINE,
} from "@/domains/historia/content";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
  style: ["normal", "italic"],
});

const serif = "font-[family-name:var(--font-playfair),var(--font-serif)]";

export function HistoriaView() {
  return (
    <div className={playfair.variable}>
      <Hero />
      <ChapterNav />
      <SourceSection />
      <FoundationSection />
      <EarlyYearsSection />
      <CorporationsSection />
      <SedeSection />
      <BandinhaSection />
      <TimelineExplorer />
      <MastersSection />
      <GallerySection />
      <BookSection />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative isolate overflow-hidden bg-[var(--color-ink)] text-white">
      <Image
        src="/imgs/historia-1926-cavalhadas.jpg"
        alt=""
        fill
        preload
        sizes="100vw"
        className="-z-10 object-cover object-center opacity-30 grayscale"
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-b from-[rgba(11,28,44,0.55)] via-[rgba(11,28,44,0.78)] to-[var(--color-ink)]"
      />
      <div className="mx-auto max-w-6xl px-4 pb-12 pt-14 sm:pb-16 sm:pt-20">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-[var(--color-brand)]">
          Fonte: o livro de {BOOK.year}
        </p>
        <h1
          className={`${serif} mt-4 max-w-3xl text-4xl font-semibold leading-[1.1] text-white sm:text-5xl`}
        >
          A história da música em{" "}
          <span className="italic text-[var(--color-brand)]">Luminárias</span>
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/80 sm:text-lg">
          Este é um resumo público de{" "}
          <cite className="text-white">{BOOK.title}</cite>, de {BOOK.author}.
          Nada abaixo substitui o volume: o recorte do autor vai de{" "}
          {BOOK.period}.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <a
            href={BOOK.pdfHref}
            className="btn-primary inline-flex min-h-11 w-full items-center justify-center gap-2 px-5 no-underline sm:w-auto"
          >
            <span className="material-icons text-lg" aria-hidden>
              download
            </span>
            Baixar o PDF do livro
          </a>
          <a
            href="#livro"
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-white/50 px-5 text-white no-underline hover:bg-white/10 sm:w-auto"
          >
            Quero o livro físico
          </a>
        </div>
      </div>
    </section>
  );
}

function ChapterNav() {
  return (
    <nav
      aria-label="Capítulos desta página"
      className="sticky top-[calc(4rem+env(safe-area-inset-top))] z-40 border-b border-[var(--border)] bg-[var(--background)]/95 backdrop-blur-md"
    >
      <div className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 py-2 [scrollbar-width:thin]">
        {SECTION_NAV.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            className="inline-flex min-h-11 shrink-0 items-center rounded-full border border-[var(--border)] bg-[var(--card)] px-4 text-sm text-[var(--foreground)] no-underline hover:border-[var(--color-brand)] hover:text-[var(--color-brand-strong)]"
          >
            {item.label}
          </a>
        ))}
      </div>
    </nav>
  );
}

function SourceSection() {
  return (
    <section
      id="fonte"
      className="scroll-mt-32 border-b border-[var(--border)] bg-[var(--card)]"
    >
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:py-16 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-center">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-[var(--color-brand-strong)]">
            A fonte
          </p>
          <div className="mt-3 flex items-start gap-4 sm:gap-5">
            <h2
              className={`${serif} min-w-0 flex-1 text-3xl leading-tight text-[var(--foreground)] sm:text-4xl`}
            >
              Tudo o que está nesta página veio do livro
            </h2>
            <figure className="w-[4.75rem] shrink-0 sm:w-24 lg:w-28">
              <Image
                src={BOOK.authorPhotoSrc}
                alt={`Retrato de ${BOOK.author}, autor do livro`}
                width={605}
                height={675}
                sizes="112px"
                className="h-auto w-full rounded-xl shadow-[var(--shadow-soft)]"
              />
              <figcaption className="mt-1.5 text-center text-[0.65rem] leading-snug text-[var(--muted)]">
                {BOOK.author}
              </figcaption>
            </figure>
          </div>
          <p className="mt-4 leading-relaxed text-[var(--muted)]">
            {BOOK.author} nasceu em Luminárias em 11 de janeiro de 1942. Músico
            da BCL (bombardino, trombone, sax), começou a pesquisa em novembro
            de 1976, com depoimentos de Sinhô, Aristóbulo Silva, Basílio,
            Heitor, Antônio H. Furtado, “Chico” Genoveva e Quinquim, além do
            livro-caixa da BCL (1920/1930).
          </p>
          <p className="mt-4 leading-relaxed text-[var(--muted)]">
            A organização final do volume é de {BOOK.organizer}, maestro da BCL
            à época da edição. {BOOK.edition}, {BOOK.publisher}, ©{BOOK.year}. O
            autor pede que a história a partir de 1978 seja escrita por outra
            pessoa
          </p>
          <p className="mt-4 text-sm leading-relaxed text-[var(--foreground)]">
            Fotos históricas desta página foram extraídas do próprio volume.
          </p>
        </div>
        <figure className="mx-auto w-full max-w-[18rem] sm:max-w-xs">
          <Image
            src={BOOK.coverSrc}
            alt={`Capa de ${BOOK.title}`}
            width={1097}
            height={1600}
            sizes="320px"
            className="h-auto w-full rounded-2xl shadow-[var(--shadow-soft)]"
          />
          <figcaption className="mt-3 text-center text-xs leading-relaxed text-[var(--muted)]">
            {BOOK.author}
            <br />
            <cite>{BOOK.title}</cite>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}

function FoundationSection() {
  return (
    <section
      id="fundacao"
      className="scroll-mt-32 mx-auto max-w-6xl px-4 py-14 sm:py-20"
    >
      <div className="grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-[var(--color-brand-strong)]">
            1893–1894
          </p>
          <h2 className={`${serif} mt-3 text-3xl leading-tight sm:text-4xl`}>
            A fundação
          </h2>
        </div>
        <div className="space-y-4 leading-relaxed text-[var(--muted)]">
          <p>
            O povoamento de Luminárias vem de exploradores de ouro no século
            XVIII. Dona Maria José do Espírito Santo mandou erguer uma capela;
            em volta nasceram as primeiras casas do arraial. Padroeira:{" "}
            <strong className="font-semibold text-[var(--foreground)]">
              Nossa Senhora do Carmo
            </strong>
            , festa em 16 de julho.
          </p>
          <p>
            Em 1893 chegou{" "}
            <strong className="font-semibold text-[var(--foreground)]">
              Américo José da Costa
            </strong>
            , de São Tomé das Letras, para o cargo de escrivão civil. Já era
            músico. Reuniu quem no arraial tocava sopro e, em{" "}
            <strong className="font-semibold text-[var(--foreground)]">
              1894
            </strong>
            , fundou a Corporação Musical Carmelitana Luminarense. Essa
            corporação é a mesma Banda Carmelitana Luminarense.
          </p>
          <p>
            Os primeiros nomes registrados pelo livro: Manoel Cruz (baixo),
            Honorato Marciliano da Silva (bombardino), José Bernardo (trombone),
            José Procópio (baixo), Manoel Garcia (bombardino e trombone) e o
            inglês Guilherme Mc Thyar (of-clyde e ocarina). Américo redistribuiu
            os instrumentos e improvisou a formação.
          </p>
        </div>
      </div>
      <figure className="mt-10 overflow-hidden rounded-2xl bg-[var(--card)] shadow-[var(--shadow-soft)] lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="relative mx-auto aspect-[4/5] w-full max-w-[16rem] lg:max-w-none">
          <Image
            src="/imgs/historia-1894-americo.jpg"
            alt="Retrato de Américo José da Costa"
            fill
            sizes="(max-width: 1024px) 16rem, 40vw"
            className="object-cover object-top"
          />
        </div>
        <figcaption className="flex flex-col justify-center p-6 sm:p-8">
          <p className={`${serif} text-2xl text-[var(--foreground)]`}>
            Américo José da Costa
          </p>
          <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
            O livro o chama de “pai” da música no arraial: mestre, maestro,
            pistom e depois clarineta. Ensinava de graça. Foto extraída de{" "}
            {BOOK.author}, {BOOK.year}.
          </p>
        </figcaption>
      </figure>
    </section>
  );
}

function EarlyYearsSection() {
  return (
    <section id="primeiros-anos" className="scroll-mt-32 bg-[var(--card)]">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-[var(--color-brand-strong)]">
          1908–1915
        </p>
        <h2 className={`${serif} mt-3 text-3xl leading-tight sm:text-4xl`}>
          Os primeiros discípulos
        </h2>
        <div className="mt-8 grid gap-10 lg:grid-cols-2">
          <div className="space-y-4 leading-relaxed text-[var(--muted)]">
            <p>
              Entre 1908 e 1911 Américo ensinou a primeira geração nascida no
              arraial: Aristóbulo Silva, Otaviano Miranda, Adelino Inácio de
              Oliveira (Dico Eduardo), Aureliano Coelho, Joaquim José Ferreira e
              Januário José Ferreira — os Vitorinos.
            </p>
            <p>
              Em 1912 veio o primeiro estatuto, da tipografia do Ginásio de
              Lavras. Em 1915, dez músicos foram a cavalo{" "}
              <strong className="font-semibold text-[var(--foreground)]">
                tirar reis
              </strong>
              : doze dias, cerca de 200 km por fazendas, 400 mil réis
              arrecadados. Compraram um baixo novo.
            </p>
          </div>
          <figure>
            <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-[var(--color-ink)] shadow-[var(--shadow-soft)]">
              <Image
                src="/imgs/historia-1910-vitorinos.jpg"
                alt="Banda dos Vitorinos em 1910"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
            <figcaption className="mt-2 text-xs leading-relaxed text-[var(--muted)]">
              Banda dos Vitorinos, 1910. Américo Costa (clarinete) está entre os
              músicos que formou. Foto do livro.
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}

function CorporationsSection() {
  const [active, setActive] =
    useState<(typeof CORPORATIONS)[number]["id"]>("bcl");
  const tabPrefix = useId();
  const current =
    CORPORATIONS.find((item) => item.id === active) ?? CORPORATIONS[0];

  return (
    <section
      id="tres-bandas"
      className="scroll-mt-32 mx-auto max-w-6xl px-4 py-14 sm:py-20"
    >
      <p className="text-xs font-medium uppercase tracking-[0.3em] text-[var(--color-brand-strong)]">
        Três corporações
      </p>
      <h2 className={`${serif} mt-3 text-3xl leading-tight sm:text-4xl`}>
        Não foram a mesma banda
      </h2>
      <p className="mt-4 max-w-2xl leading-relaxed text-[var(--muted)]">
        O livro distingue três grupos. Toque uma corporação para ler o que
        Biavati registrou sobre ela.
      </p>

      <div
        role="tablist"
        aria-label="As três corporações musicais"
        className="mt-8 flex flex-col gap-2 sm:flex-row"
      >
        {CORPORATIONS.map((item) => {
          const selected = item.id === active;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`${tabPrefix}-${item.id}`}
              aria-selected={selected}
              aria-controls={`${tabPrefix}-panel`}
              className={`min-h-11 flex-1 rounded-2xl border px-4 py-3 text-left transition ${
                selected
                  ? "border-[var(--color-brand)] bg-[var(--accent)] text-[var(--foreground)]"
                  : "border-[var(--border)] bg-[var(--card)] text-[var(--muted)]"
              }`}
              onClick={() => setActive(item.id)}
            >
              <span className="block text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-[var(--color-brand-strong)]">
                {item.year}
              </span>
              <span className={`${serif} mt-1 block text-lg leading-snug`}>
                {item.name}
              </span>
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`${tabPrefix}-panel`}
        aria-labelledby={`${tabPrefix}-${current.id}`}
        className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 leading-relaxed text-[var(--muted)] shadow-[var(--shadow-soft)]"
      >
        {current.text}
      </div>
    </section>
  );
}

function SedeSection() {
  return (
    <section id="sede" className="scroll-mt-32 bg-[var(--card)]">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:py-20 lg:grid-cols-2">
        <figure>
          <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-[var(--color-ink)] shadow-[var(--shadow-soft)]">
            <Image
              src="/imgs/historia-sede-antes-1979.jpg"
              alt="Sede da BCL antes da reforma de 1979"
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
          <figcaption className="mt-2 text-xs text-[var(--muted)]">
            A sede na Rua Silva Pinto, antes da reforma de 1979. Foto do livro.
          </figcaption>
        </figure>
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-[var(--color-brand-strong)]">
            1921–1979
          </p>
          <h2 className={`${serif} mt-3 text-3xl leading-tight sm:text-4xl`}>
            A casa na Silva Pinto
          </h2>
          <p className="mt-5 leading-relaxed text-[var(--muted)]">
            A sede foi erguida entre 1921 e 1924 pelo pedreiro Antonio Furtado,
            com arrecadação de reis e doações. O livro a descreve como pequena —
            cerca de 28 m² — em terreno grande e bom, na rua mais antiga da
            cidade.
          </p>
          <p className="mt-4 leading-relaxed text-[var(--muted)]">
            Em 12 de janeiro de 1978 o telhado desmoronou. José Roberto Ferreira
            (“Zé Chico”), presidente, reconstruiu e pediu usucapião: a
            corporação não tinha documento de posse. A reforma de 1979 pôs laje,
            banheiro, depósito de acervo, elétrica, piso, reboco e janelas.
          </p>
        </div>
      </div>
    </section>
  );
}

function BandinhaSection() {
  return (
    <section
      id="bandinha"
      className="scroll-mt-32 mx-auto max-w-6xl px-4 py-14 sm:py-20"
    >
      <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,6fr)_minmax(0,6fr)]">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-[var(--color-brand-strong)]">
            1954–1960
          </p>
          <h2 className={`${serif} mt-3 text-3xl leading-tight sm:text-4xl`}>
            A Banda dos Meninos
          </h2>
          <p className="mt-5 leading-relaxed text-[var(--muted)]">
            Sinhô reuniu meninos de 7 a 14 anos. Em cerca de dez meses estrearam
            o <cite>Tantum Ergo</cite> na Matriz. O livro chama essa formação —
            Banda Infantil, Banda dos Meninos ou Bandinha do Sinhô — de a mais
            famosa da BCL.
          </p>
          <p className="mt-4 leading-relaxed text-[var(--muted)]">
            Tocaram em São Bento Abade, Ingaí, Itumirim, Cruzília, Lavras (Rádio
            Cultura, estádio, 8º Batalhão), Três Corações, São Lourenço e
            fazendas. Uniforme branco com lira dourada no casquete, em Lavras,
            1958. Em 1956 fundou-se a Escola Luminarense de Música, capítulo à
            parte, regular até 1962.
          </p>
        </div>
        <figure>
          <div className="relative mx-auto aspect-[2/3] max-h-[32rem] w-full max-w-md overflow-hidden rounded-2xl bg-[var(--color-ink)] shadow-[var(--shadow-soft)]">
            <Image
              src="/imgs/historia-banda-meninos.jpg"
              alt="Banda dos Meninos em uniforme, com Sinhô ao fundo"
              fill
              sizes="(max-width: 1024px) 100vw, 28rem"
              className="object-cover object-center"
            />
          </div>
          <figcaption className="mt-2 text-xs text-[var(--muted)]">
            A Bandinha do Sinhô. Foto do livro.
          </figcaption>
        </figure>
      </div>
    </section>
  );
}

function TimelineExplorer() {
  const [index, setIndex] = useState(0);
  const beat = TIMELINE[index];

  return (
    <section className="scroll-mt-32 border-y border-[var(--border)] bg-[var(--card-secondary)]">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-[var(--color-brand-strong)]">
          Linha do tempo
        </p>
        <h2 className={`${serif} mt-3 text-3xl leading-tight sm:text-4xl`}>
          Dez marcos do livro
        </h2>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">
          Escolha um ano. Os fatos são os que Biavati registrou entre{" "}
          {BOOK.period}.
        </p>

        <div
          className="mt-8 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:thin]"
          role="radiogroup"
          aria-label="Anos da linha do tempo"
        >
          {TIMELINE.map((item, i) => {
            const selected = i === index;
            return (
              <button
                key={item.when}
                type="button"
                role="radio"
                aria-checked={selected}
                className={`inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full px-4 text-sm font-semibold ${
                  selected
                    ? "bg-[var(--color-brand)] text-[var(--color-ink)]"
                    : "bg-[var(--card)] text-[var(--foreground)] ring-1 ring-[var(--border)]"
                }`}
                onClick={() => setIndex(i)}
              >
                {item.when}
              </button>
            );
          })}
        </div>

        <article className="mt-6 grid items-start gap-8 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-[var(--shadow-soft)] sm:p-8 lg:grid-cols-[minmax(0,6fr)_minmax(0,6fr)]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-brand-strong)]">
              {beat.when}
            </p>
            <h3 className={`${serif} mt-2 text-2xl sm:text-3xl`}>
              {beat.title}
            </h3>
            <p className="mt-4 leading-relaxed text-[var(--muted)]">
              {beat.text}
            </p>
          </div>
          {beat.image ? (
            <figure>
              <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-[var(--color-ink)]">
                <Image
                  src={beat.image.src}
                  alt={beat.image.alt}
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover"
                />
              </div>
              <figcaption className="mt-2 text-xs text-[var(--muted)]">
                {beat.image.caption}
              </figcaption>
            </figure>
          ) : (
            <p className="rounded-xl bg-[var(--card-secondary)] p-5 text-sm leading-relaxed text-[var(--muted)]">
              O livro não traz foto deste marco. O relato escrito é a fonte.
            </p>
          )}
        </article>
      </div>
    </section>
  );
}

function MastersSection() {
  return (
    <section
      id="mestres"
      className="scroll-mt-32 mx-auto max-w-6xl px-4 py-14 sm:py-20"
    >
      <p className="text-xs font-medium uppercase tracking-[0.3em] text-[var(--color-brand-strong)]">
        Mestres
      </p>
      <h2 className={`${serif} mt-3 text-3xl leading-tight sm:text-4xl`}>
        Quem ensinou Luminárias a tocar
      </h2>
      <p className="mt-4 max-w-2xl leading-relaxed text-[var(--muted)]">
        Os cinco primeiros cards vêm do capítulo “Os maestros de Luminárias”. O
        período de regência (ou o possível, quando o livro não fecha a data)
        aparece em cada um.
      </p>
      <ul className="mt-8 space-y-3">
        {BOOK_MASTERS.map((master) => (
          <li key={master.id}>
            <MasterCardItem master={master} />
          </li>
        ))}
      </ul>

      <div className="mt-14 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card-secondary)] p-5 sm:p-7">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-[var(--color-brand-strong)]">
          Não relatados no livro
        </p>
        <h3 className={`${serif} mt-3 text-2xl leading-tight sm:text-3xl`}>
          Maestros da BCL a partir de 2002
        </h3>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">
          O volume de Biavati relata os maestros até a morte de Nem, em 2002.
          <br /> A sucessão abaixo{" "}
          <strong className="font-semibold text-[var(--foreground)]">
            não está no livro
          </strong>
        </p>
      </div>

      <ul className="mt-6 space-y-3">
        {LATER_MASTERS.map((master) => (
          <li key={master.id}>
            <MasterCardItem master={master} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function MasterCardItem({ master }: { master: MasterCard }) {
  const tenureLabel =
    master.tenureKind === "possible"
      ? "Período possível de regência"
      : "Regência";

  return (
    <details className="group rounded-2xl border border-[var(--border)] bg-[var(--card)] open:shadow-[var(--shadow-soft)]">
      <summary className="flex min-h-14 cursor-pointer list-none items-center gap-4 px-4 py-3 [-webkit-details-marker:none] sm:px-5 [&::-webkit-details-marker]:hidden">
        <MasterPhoto master={master} variant="avatar" />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span
              className={`${serif} text-lg leading-tight text-[var(--foreground)]`}
            >
              {master.name}
            </span>
            {master.fromBook ? null : (
              <span className="rounded-full bg-[var(--card-secondary)] px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-[0.12em] text-[var(--muted)]">
                Fora do livro
              </span>
            )}
          </span>
          <span className="mt-0.5 block text-xs text-[var(--muted)]">
            {master.role}
          </span>
          <span className="mt-1 block text-sm font-medium text-[var(--color-brand-strong)]">
            {tenureLabel}: {master.tenure}
          </span>
        </span>
        <span
          className="material-icons text-[var(--muted)] transition group-open:rotate-180"
          aria-hidden
        >
          expand_more
        </span>
      </summary>
      <div className="grid gap-4 border-t border-[var(--border)] px-4 py-4 sm:grid-cols-[8rem_minmax(0,1fr)] sm:px-5">
        <MasterPhoto master={master} variant="card" />
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--color-brand-strong)]">
            {tenureLabel}: {master.tenure}
          </p>
          {master.fromBook ? null : (
            <p className="mt-2 text-xs font-medium text-[var(--muted)]">
              Não consta do livro de Biavati (1894–1978).
            </p>
          )}
          <p className="mt-2 leading-relaxed text-[var(--muted)]">
            {master.text}
          </p>
        </div>
      </div>
    </details>
  );
}

function MasterPhoto({
  master,
  variant,
}: {
  master: MasterCard;
  variant: "avatar" | "card";
}) {
  if (variant === "avatar") {
    if (master.photo) {
      return (
        <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-[var(--card-secondary)]">
          <Image
            src={master.photo.src}
            alt=""
            fill
            sizes="48px"
            className="object-cover object-top"
          />
        </span>
      );
    }
    return (
      <span
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--card-secondary)] text-[var(--color-brand-strong)]"
        aria-hidden
      >
        <span className="material-icons">person</span>
      </span>
    );
  }

  if (master.photo) {
    return (
      <div className="relative mx-auto aspect-[3/4] w-28 overflow-hidden rounded-xl sm:w-full">
        <Image
          src={master.photo.src}
          alt={master.photo.alt}
          fill
          sizes="128px"
          className="object-cover object-top"
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex aspect-[3/4] w-28 flex-col items-center justify-center rounded-xl bg-[var(--card-secondary)] px-2 text-center sm:w-full">
      <span className="material-icons text-3xl text-[var(--muted)]" aria-hidden>
        add_a_photo
      </span>
      <p className="mt-2 text-[0.65rem] leading-snug text-[var(--muted)]">
        Foto a incluir
      </p>
    </div>
  );
}

function GallerySection() {
  const [open, setOpen] = useState<HistoriaPhoto | null>(null);
  const close = useCallback(() => setOpen(null), []);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  return (
    <section id="galeria" className="scroll-mt-32 bg-[var(--card)]">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-[var(--color-brand-strong)]">
          Arquivo
        </p>
        <h2 className={`${serif} mt-3 text-3xl leading-tight sm:text-4xl`}>
          Fotos extraídas do livro
        </h2>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">
          Toque uma imagem para ampliá-la. As legendas seguem as identificações
          de Biavati.
        </p>
        <ul className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          {GALLERY.map((photo) => (
            <li key={photo.src}>
              <button
                type="button"
                className="group w-full overflow-hidden rounded-2xl text-left"
                onClick={() => setOpen(photo)}
                aria-label={`Ampliar: ${photo.caption}`}
              >
                <span className="relative block aspect-[4/3] bg-[var(--color-ink)]">
                  <Image
                    src={photo.src}
                    alt={photo.alt}
                    fill
                    sizes="(max-width: 1024px) 50vw, 33vw"
                    className="object-cover"
                  />
                </span>
                <span className="mt-2 block min-h-11 text-xs leading-snug text-[var(--muted)]">
                  {photo.caption}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {open ? (
        <EntityDialog open title="Imagem histórica" size="xl" onClose={close}>
          <figure className="max-h-[min(82dvh,52rem)] overflow-y-auto bg-[var(--color-ink)] p-3 text-white sm:p-4">
            <div className="relative mx-auto aspect-[16/10] w-full">
              <Image
                src={open.src}
                alt={open.alt}
                fill
                sizes="56rem"
                className="object-contain"
              />
            </div>
            <figcaption className="mt-3 px-2 pb-2 text-sm leading-relaxed text-white/80">
              {open.caption}{" "}
              {open.fromBook ? `Fonte: ${BOOK.author}, ${BOOK.year}.` : null}
            </figcaption>
          </figure>
        </EntityDialog>
      ) : null}
    </section>
  );
}

function BookSection() {
  return (
    <section
      id="livro"
      className="scroll-mt-32 mx-auto max-w-6xl px-4 py-14 sm:py-20"
    >
      <div className="overflow-hidden rounded-3xl bg-[var(--color-ink)] text-white shadow-[var(--shadow-soft)] lg:grid lg:grid-cols-[minmax(14rem,22rem)_minmax(0,1fr)]">
        <Image
          src={BOOK.coverSrc}
          alt={`Capa de ${BOOK.title}`}
          width={1097}
          height={1600}
          sizes="(max-width: 1024px) 100vw, 22rem"
          className="h-auto w-full object-cover object-top lg:h-full lg:min-h-full"
        />
        <div className="p-6 sm:p-10">
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-[var(--color-brand)]">
            O volume
          </p>
          <h2 className={`${serif} mt-3 text-3xl leading-tight sm:text-4xl`}>
            Leia o livro, ou peça o exemplar
          </h2>
          <p className="mt-4 leading-relaxed text-white/80">
            O PDF completo de <cite className="text-white">{BOOK.title}</cite>{" "}
            pode ser baixado aqui. {BOOK.edition}, {BOOK.publisher}, ©
            {BOOK.year}.
          </p>
          <p className="mt-4 leading-relaxed text-white/80">
            Quem quiser o{" "}
            <strong className="font-semibold text-white">livro físico</strong>{" "}
            deve entrar em contato com a banda — não vendemos o exemplar por
            esta página.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <a
              href={BOOK.pdfHref}
              className="btn-primary inline-flex min-h-11 items-center justify-center gap-2 px-5 no-underline"
            >
              <span className="material-icons text-lg" aria-hidden>
                download
              </span>
              Baixar o PDF
            </a>
            <a
              href={BOOK.pdfInlineHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-white/30 px-5 text-white no-underline hover:bg-white/10"
            >
              Ler no navegador
            </a>
          </div>

          <div className="mt-8 rounded-2xl border border-white/15 bg-white/5 p-5">
            <p className="text-sm font-semibold text-white">Livro físico</p>
            <p className="mt-2 text-sm leading-relaxed text-white/75">
              Fale com a banda pelo WhatsApp, e-mail ou na sede. Diga que o
              interesse é o livro de {BOOK.author}.
            </p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <a
                href={PHYSICAL_BOOK_WHATSAPP}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[#25D366] px-4 text-sm font-medium text-white no-underline"
              >
                WhatsApp {BAND_CONTACT.phone}
              </a>
              <a
                href={PHYSICAL_BOOK_MAILTO}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-white/30 px-4 text-sm text-white no-underline hover:bg-white/10"
              >
                {BAND_CONTACT.email}
              </a>
              <Link
                href={BAND_CONTACT.sobreHref}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-white/30 px-4 text-sm text-white no-underline hover:bg-white/10"
              >
                Ver contatos
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
