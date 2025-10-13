import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { supabase } from "../hooks/supabaseClients";

export default function Login() {
  const [usuario, setUsuario] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    // Validar que usuario y contraseña no estén vacíos
    if (!usuario.trim() || !contrasena) {
      setError("Por favor ingresa email y contraseña");
      setIsLoading(false);
      return;
    }

    try {
      // 1. Intentar login con Supabase
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email: usuario.trim(),
        password: contrasena,
      });

      if (loginError) {
        setError("Credenciales inválidas");
        setIsLoading(false);
        return;
      }
      console.log("User:", data.user);

      // 2. Consultar el profile según el email
      const { data: perfil, error: perfilError } = await supabase
        .from("user_profiles")
        .select("role")
        .eq("email", usuario.trim())
        .single();

      console.log("Perfil recibido:", perfil, "Error:", perfilError);

      if (perfilError) {
        setError("No fue posible obtener el perfil del usuario");
        setIsLoading(false);
        return;
      }

      if (!perfil) {
        setError("Perfil de usuario no encontrado");
        setIsLoading(false);
        return;
      }

      // 3. Redirección por rol
      if (perfil.role === "admin") {
        localStorage.setItem("role", "admin");
        navigate("/admin");
      } else {
        localStorage.setItem("role", "user");
        navigate("/Comercial");
      }
    } catch (err) {
      setError("Ocurrió un error inesperado");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden p-4">
      {/* Background Image with Overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: 'url(https://xqzhqfhotfxxqsbbvbjr.supabase.co/storage/v1/object/public/correo/fondo-pravi.png)',
          backgroundRepeat: "no-repeat",
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          fontFamily: "Poppins, sans-serif",
        }}
      >
      </div>

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header with Logo */}
          <div className="bg-gradient-to-br from-yellow-400 to-yellow-500 p-4 text-center">
            <div className="bg-cover bg-center"
              style={{
                backgroundImage: 'url(https://xqzhqfhotfxxqsbbvbjr.supabase.co/storage/v1/object/public/correo/pravi-png-original.png)',
                height: "100px",
                width: "100px",
                margin: "0 auto",
              }}>
            </div>
          </div>

          {/* Form Section */}
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center">Bienvenido</h2>
            <p className="text-gray-600 text-center mb-3">Ingrese sus credenciales</p>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-2 bg-red-50 border-l-4 border-red-500 rounded-r-lg">
                <p className="text-red-700 text-sm font-medium">{error}</p>
              </div>
            )}

            <div className="space-y-3">
              {/* Email Input */}
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                  Correo electrónico
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    value={usuario}
                    onChange={(e) => setUsuario(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition-all outline-none text-gray-900 placeholder-gray-400"
                    placeholder="tu@email.com"
                    required
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                  Contraseña
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={contrasena}
                    onChange={(e) => setContrasena(e.target.value)}
                    className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition-all outline-none text-gray-900 placeholder-gray-400"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center hover:scale-110 transition-transform"
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={isLoading}
                className="w-full bg-yellow-400 text-black font-bold py-3.5 px-4 rounded-xl hover:bg-yellow-500 focus:outline-none focus:ring-4 focus:ring-yellow-300 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg disabled:hover:scale-100 mt-2"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin h-5 w-5 mr-3 border-2 border-black border-t-transparent rounded-full" viewBox="0 0 24 24"></svg>
                    Iniciando sesión...
                  </div>
                ) : (
                  'Ingresar'
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <p className="text-center text-black text-sm mt-6 drop-shadow-lg">
          © 2024 Pravi Urban Home. Todos los derechos reservados.
        </p>
      </div>
    </div>
  );
}