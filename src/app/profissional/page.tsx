import Link from "next/link";

export default function ProfissionalPage() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-16">
      <span
        className="block h-2 w-12 rounded-full"
        style={{ backgroundColor: "var(--nicho-estetica)" }}
      />
      <h1 className="mt-4 text-3xl font-semibold">Area do Profissional</h1>
      <p className="mt-3 max-w-xl opacity-75">
        Aqui o profissional vai gerenciar a propria agenda, horarios de
        atendimento e ver os dias agendados. (Em construcao.)
      </p>
      <Link href="/" className="mt-8 inline-block text-sm underline opacity-70">
        &larr; Voltar
      </Link>
    </main>
  );
}
