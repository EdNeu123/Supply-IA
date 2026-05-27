import { ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps { isOpen: boolean; onClose: () => void; title: string; children: ReactNode; }

export const Modal = ({ isOpen, onClose, title, children }: ModalProps) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
      <div className="bg-surface w-full max-w-lg rounded-2xl shadow-xl border border-border">
        <div className="flex justify-between items-center p-6 border-b border-border">
          <h2 className="text-lg font-semibold text-text-1">{title}</h2>
          <button onClick={onClose} className="text-text-2 hover:text-text-1 transition-colors"><X size={20} /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};
