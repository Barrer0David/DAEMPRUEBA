import type { Empresa } from '../../../types';

export interface EmpresaSelectorProps {
  onSelect: (empresa: Empresa) => void;
}
