export default function NotFound() {
  return (
    <div className="max-w-5xl mx-auto py-20 text-center">
      <h1 className="text-3xl font-bold mb-3">Сторінку не знайдено (404)</h1>
      <p className="opacity-80">Перевірте адресу або поверніться на головну.</p>
      <a href="/" className="inline-block mt-6 px-4 py-2 rounded-xl bg-black/80 text-white">На головну</a>
    </div>
  );
}
