# Imagen autocontenida de Inmuno Survivor
# nginx sirve los archivos estáticos del juego (copiados dentro de la imagen)
FROM nginx:alpine

# Copia todo el juego al directorio que sirve nginx
COPY . /usr/share/nginx/html

EXPOSE 80
