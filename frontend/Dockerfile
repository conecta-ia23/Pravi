# Etapa 1: build
FROM node:20-alpine AS builder

WORKDIR /app

# Copia package files
COPY package*.json ./

# Instala dependencias
RUN npm install

# Copia el código fuente
COPY . .

# Declara los argumentos que recibirá desde docker-compose
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_WHATSAPP_API_URL
ARG VITE_WHATSAPP_API_TOKEN
ARG VITE_API_URL

# Los convierte en variables de entorno para el build
ENV VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
ENV VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY}
ENV VITE_WHATSAPP_API_URL=${VITE_WHATSAPP_API_URL}
ENV VITE_WHATSAPP_API_TOKEN=${VITE_WHATSAPP_API_TOKEN}
ENV VITE_API_URL=${VITE_API_URL}

# Construye la aplicación (aquí es donde Vite necesita las variables)
RUN npm run build

# Etapa 2: producción con nginx
FROM nginx:alpine

# Copia los archivos construidos
COPY --from=builder /app/dist /usr/share/nginx/html

# Copia la configuración de nginx para SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expone puerto 80
EXPOSE 80

# Inicia nginx
CMD ["nginx", "-g", "daemon off;"]