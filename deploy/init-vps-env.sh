#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
if [ -e .env.vps ]; then
  echo '.env.vps já existe; nenhuma configuração foi alterada.'
  exit 1
fi
command -v openssl >/dev/null
umask 077
# Valores hexadecimais podem ser usados na URL PostgreSQL sem codificação extra.
db_password=$(openssl rand -hex 32)
jwt_secret=$(openssl rand -hex 48)
refresh_secret=$(openssl rand -hex 48)
cat > .env.vps <<EOF
POSTGRES_PASSWORD=$db_password
JWT_SECRET=$jwt_secret
JWT_REFRESH_SECRET=$refresh_secret
WEB_BIND_IP=0.0.0.0
WEB_PORT=3001
# Somente para acesso temporário por HTTP. Com HTTPS, use true.
COOKIE_SECURE=false
# Ative depois de preencher o token e o nome do bot (sem @).
TELEGRAM_ENABLED=false
TELEGRAM_BOT_TOKEN=
TELEGRAM_BOT_USERNAME=
EOF
echo '.env.vps criado com senhas aleatórias. Guarde esse arquivo sem publicá-lo.'
