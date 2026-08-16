type Props = {
  name: string;
  photoURL?: string | null;
  size?: number;
  className?: string;
};

export default function Avatar({ name, photoURL, size = 48, className = '' }: Props) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  const dimension = { width: size, height: size, fontSize: size * 0.38 };

  if (photoURL) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- avatars are user-uploaded, external URLs unknown to next/image at build time
      <img
        src={photoURL}
        alt={name}
        style={dimension}
        className={`rounded-full object-cover bg-surface-alt ${className}`}
      />
    );
  }

  return (
    <div
      style={dimension}
      className={`flex items-center justify-center rounded-full bg-primary-muted text-text font-semibold ${className}`}
    >
      {initials || '?'}
    </div>
  );
}
