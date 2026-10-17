import type { Metadata } from 'next';
import { HistoriaView } from '@/components/historia/HistoriaView';
import { BOOK } from '@/domains/historia/content';

export const metadata: Metadata = {
  title: 'História',
  description: `Resumo público de ${BOOK.title}, de ${BOOK.author} (${BOOK.year}). A fonte é o livro; o volume cobre ${BOOK.period}.`,
};

export default function HistoriaPage() {
  return <HistoriaView />;
}



