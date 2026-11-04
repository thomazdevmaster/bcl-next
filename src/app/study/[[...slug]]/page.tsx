import { redirect } from 'next/navigation';

/** O treino passou para o score playground. Links antigos de `/study` caem lá. */
export default function StudyRoutePage() {
  redirect('/score_playground');
}
