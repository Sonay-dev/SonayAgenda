import Link from "next/link";

export default function AdminPage() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-16">
      <span
        className="block h-2 w-12 rounded-full"
        style={{ backgroundColor: "var(--nicho-personal)" }}
      />
      <h1 className="mt-4 text-3xl font-semibold">Administracao</h1>
      <p className="mt-3 max-w-xl opacity-75">
        Aqui o admin (Sonay) vai listar profissionais, ver vencimento do plano e
        ativar, desconectar ou excluir contas. (Em construcao.)
      </p>
      <Link href="/" className="mt-8 inline-block text-sm underline opacity-70">
        &larr; Voltar
      </Link>
    </main>
  );
}
