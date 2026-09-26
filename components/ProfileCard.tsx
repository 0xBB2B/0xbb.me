import { useEffect, useRef } from 'react';
import type { Language } from '../data';
import { COPY } from '../copy';
import { ProfileContent } from './ProfileContent';
import './ProfileCard.css';

interface ProfileCardProps {
  open: boolean;
  mode: 'preview' | 'fault';
  language: Language;
  onLanguageChange: (language: Language) => void;
  onClose: () => void;
}

export function ProfileCard({ open, mode, language, onLanguageChange, onClose }: ProfileCardProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const copy = COPY[language];

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleCancel = (event: Event) => {
      event.preventDefault();
      if (mode === 'preview') onClose();
    };
    // Chromium 只允许用户每次交互后拦截第一个 cancel，连按 Esc 或返回手势仍会关闭对话框
    const handleClose = () => {
      if (!open) return;
      if (mode === 'fault') dialog.showModal();
      else onClose();
    };
    dialog.addEventListener('cancel', handleCancel);
    dialog.addEventListener('close', handleClose);
    return () => {
      dialog.removeEventListener('cancel', handleCancel);
      dialog.removeEventListener('close', handleClose);
    };
  }, [open, mode, onClose]);

  return (
    <dialog ref={dialogRef} className="profile-card">
      {mode === 'fault' ? (
        <p role="alert">{copy.sceneFailed}</p>
      ) : (
        <button type="button" className="profile-card-close" onClick={onClose}>
          {copy.closeCard}
        </button>
      )}
      <ProfileContent language={language} onLanguageChange={onLanguageChange} />
    </dialog>
  );
}
