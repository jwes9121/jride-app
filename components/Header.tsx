interface HeaderProps {
  title: string;
}

export default function Header({ title }: HeaderProps) {
  return (
    <header className="p-4 bg-gray-100 border-b">
      <h1 className="text-xl font-bold">{title}</h1>
    </header>
  );
}


