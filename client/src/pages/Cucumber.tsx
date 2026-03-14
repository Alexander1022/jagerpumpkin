export default function Cucumber() {
  return (
    <div className="flex h-[calc(100svh-7rem)] w-full items-center justify-center overflow-hidden bg-white px-6 py-4 md:px-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <h1 className="text-2xl font-bold">Cucumber Page</h1>
        <p>
          This is the Cucumber page. It is protected and requires authentication
          to access.
        </p>
      </div>
    </div>
  )
}
