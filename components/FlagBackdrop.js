import PakistanFlag from './PakistanFlag';

// Full-screen Pakistan flag behind the signed-in app, faded so tables and forms stay readable.
export default function FlagBackdrop() {
  return (
    <div className="flag-backdrop" aria-hidden="true">
      <PakistanFlag decorative slice className="flag-backdrop-art" />
    </div>
  );
}
