import { SchemeExplorer } from '@/components/explorer/SchemeExplorer';
import { getSchemeRepository } from '@/lib/schemes/repository';

export default function ExplorerPage() {
  const schemes = getSchemeRepository().getAll();
  return <SchemeExplorer initialSchemes={schemes} />;
}
