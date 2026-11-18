import { SavedHub } from '@/components/saved/SavedHub';
import { getSchemeRepository } from '@/lib/schemes/repository';

export default function SavedPage() {
  const schemes = getSchemeRepository().getAll();
  return <SavedHub allSchemes={schemes} />;
}
