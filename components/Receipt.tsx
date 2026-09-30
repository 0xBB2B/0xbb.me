import { forwardRef, useEffect, useRef, useState, type ReactNode } from 'react';
import { APP_DATA, type Language } from '../data';
import { COPY, AVATAR_FALLBACK, locationLine } from '../copy';
import './Receipt.css';

interface ReceiptProps {
  language: Language;
  onAvatarClick: () => void;
  assetBase?: string;
}

const ReceiptAvatar = forwardRef<HTMLButtonElement, ReceiptProps>(function ReceiptAvatar(
  { language, onAvatarClick, assetBase = './' },
  ref,
) {
  const [broken, setBroken] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  // 预渲染页被 hydrate 接管前发生的图片 error 不会再触发 onError，只能挂载时主动检查
  useEffect(() => {
    const img = imgRef.current;
    if (img?.complete && img.naturalWidth === 0) setBroken(true);
  }, []);
  return (
    <button type="button" className="receipt-avatar-btn" aria-haspopup="dialog" onClick={onAvatarClick} ref={ref}>
      {broken ? (
        <span className="receipt-avatar receipt-avatar--fallback">{AVATAR_FALLBACK}</span>
      ) : (
        <img
          ref={imgRef}
          className="receipt-avatar"
          src={`${assetBase}profile.jpg`}
          alt={COPY[language].avatarAlt}
          loading="lazy"
          onError={() => setBroken(true)}
        />
      )}
      <span className="receipt-cam" aria-hidden="true">
        📷
      </span>
    </button>
  );
});

function ReceiptRow({ name, children }: { name: string; children: ReactNode }) {
  return (
    <div className="receipt-item">
      <span className="receipt-name">{name}</span>
      <span className="receipt-fill" />
      <span className="receipt-val">{children}</span>
    </div>
  );
}

export const Receipt = forwardRef<HTMLButtonElement, ReceiptProps>(function Receipt(
  { language, onAvatarClick, assetBase },
  avatarRef,
) {
  const copy = COPY[language];
  return (
    <article className="receipt">
      <div className="receipt-center">
        <p className="receipt-store">{copy.receiptStore}</p>
        <ReceiptAvatar ref={avatarRef} language={language} onAvatarClick={onAvatarClick} assetBase={assetBase} />
        <p className="receipt-tap-hint">{copy.tapPhotoHint}</p>
        <h1 tabIndex={-1}>FUBUKI_BB</h1>
        {APP_DATA.profile.roles[language].map((role) => (
          <p className="receipt-sub" key={role}>
            {role}
          </p>
        ))}
      </div>
      <hr className="receipt-cut" />
      <ReceiptRow name={copy.locationLabel}>{locationLine()}</ReceiptRow>
      <hr className="receipt-cut" />
      <p className="receipt-sec">02 · ABOUT</p>
      <h2>{copy.aboutTitle}</h2>
      <p className="receipt-bio">{APP_DATA.profile.bio[language]}</p>
      <hr className="receipt-cut" />
      <p className="receipt-sec">{copy.focusLabel}</p>
      {APP_DATA.profile.directions.map((direction) => (
        <ReceiptRow key={direction.id} name={direction[language]}>
          ×1
        </ReceiptRow>
      ))}
      <hr className="receipt-cut" />
      <p className="receipt-sec">{copy.receiptLinksLabel}</p>
      {APP_DATA.socialLinks.map((link) => (
        <ReceiptRow key={link.name} name={link.name}>
          <a
            href={link.url}
            {...(link.url.startsWith('mailto:') ? {} : { target: '_blank', rel: 'noopener' })}
          >
            {link.label}
          </a>
        </ReceiptRow>
      ))}
      <hr className="receipt-cut" />
      <p className="receipt-total">
        <span>{copy.linksTitle}</span>
        <span>→</span>
      </p>
      <div className="receipt-barcode" />
      <p className="receipt-thanks">{copy.receiptThanks}</p>
    </article>
  );
});
