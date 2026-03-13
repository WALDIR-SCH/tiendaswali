// app/reset-password/page.tsx
"use client";
import { useState, useEffect } from "react";
import { auth } from "@/lib/firebase";
import { confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [validCode, setValidCode] = useState(false);
  const [oobCode, setOobCode] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Obtener el código de la URL
    const code = searchParams.get("oobCode");
    if (code) {
      setOobCode(code);
      verifyResetCode(code);
    } else {
      setError("Enlace de restablecimiento inválido");
    }
  }, [searchParams]);

  const verifyResetCode = async (code: string) => {
    try {
      const email = await verifyPasswordResetCode(auth, code);
      setEmail(email);
      setValidCode(true);
    } catch (err) {
      setError("El enlace de restablecimiento ha expirado o es inválido");
      setValidCode(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (newPassword.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      setLoading(false);
      return;
    }

    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
      setSuccessMessage("¡Contraseña restablecida exitosamente!");
      
      // Redirigir al login después de 3 segundos
      setTimeout(() => {
        router.push("/login?reset=success");
      }, 3000);
    } catch (err: any) {
      console.error("Error al restablecer contraseña:", err);
      
      switch (err.code) {
        case "auth/weak-password":
          setError("La contraseña es muy débil");
          break;
        case "auth/expired-action-code":
          setError("El enlace ha expirado. Solicita uno nuevo.");
          break;
        case "auth/invalid-action-code":
          setError("El enlace es inválido o ya fue usado.");
          break;
        default:
          setError("Error al restablecer la contraseña");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-black p-4">
      <div className="w-full max-w-md">
        <div className="bg-gray-900/50 backdrop-blur-md border border-white/10 rounded-xl p-6 shadow-2xl">
          {validCode ? (
            <>
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">
                  Restablecer Contraseña
                </h2>
                <p className="text-gray-400 text-sm">
                  Para: <span className="text-emerald-300">{email}</span>
                </p>
              </div>

              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Nueva Contraseña
                  </label>
                  <input
                    type="password"
                    required
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
                    placeholder="Mínimo 6 caracteres"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Confirmar Contraseña
                  </label>
                  <input
                    type="password"
                    required
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
                    placeholder="Repite la contraseña"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>

                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                )}

                {successMessage && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                    <p className="text-emerald-400 text-sm">{successMessage}</p>
                    <p className="text-emerald-300/70 text-xs mt-1">
                      Redirigiendo al login...
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || successMessage !== ""}
                  className="w-full py-3 bg-gradient-to-r from-emerald-500 to-blue-500 text-white rounded-lg font-semibold hover:from-emerald-400 hover:to-blue-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Restableciendo..." : "Restablecer Contraseña"}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center">
              <h2 className="text-xl font-bold text-white mb-4">
                Enlace Inválido
              </h2>
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg mb-4">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}
              <Link
                href="/login"
                className="inline-block px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-400 transition"
              >
                Volver al Login
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}