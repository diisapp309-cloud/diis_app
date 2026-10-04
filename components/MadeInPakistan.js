import PakistanFlag from './PakistanFlag';

function Heart() {
  return (
    <svg className="heart" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M12 21s-7.5-4.6-9.6-9.1C.9 8.6 2.9 4.5 6.6 4.5c2.3 0 4 1.3 5.4 3.2 1.4-1.9 3.1-3.2 5.4-3.2 3.7 0 5.7 4.1 4.2 7.4C19.5 16.4 12 21 12 21z" />
    </svg>
  );
}

export default function MadeInPakistan({ urdu = false, className = '' }) {
  return (
    <div className={`made-in ${className}`}>
      <p className="made-in-line">
        <PakistanFlag className="flag-mini" />
        <span>Built in Pakistan, for Pakistan — with love</span>
        <Heart />
      </p>
      {urdu && (
        <p className="made-in-urdu" lang="ur" dir="rtl">پاکستان میں بنایا گیا، پاکستان کے لیے، محبت کے ساتھ</p>
      )}
    </div>
  );
}
