import { LoginForm } from "@/components/login-form"
export default function LoginPage() {
  return (
    <div className="flex h-[calc(100svh-7rem)] w-full items-center justify-center overflow-hidden bg-white px-6 py-4 md:px-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <LoginForm />
      </div>
    </div>
  )
}
