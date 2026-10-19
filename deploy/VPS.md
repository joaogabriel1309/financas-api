# Financeiro na VPS pelo IP

Esta configuração usa containers e volume do projeto `financas-vps`. Somente
o front publica a porta 3001. API e PostgreSQL não publicam portas. Não é
necessário alterar o Nginx ou os containers do NexusOS para este acesso.

O banco da VPS começa vazio. Este procedimento não transfere os dados do seu
banco local. As migrations criam as tabelas; depois você pode criar seu usuário
pela tela de cadastro.

## 1. No seu computador: enviar os projetos

Execute em um terminal local, fora da conexão SSH:

```bash
cd /home/joao/Projetos
tar --exclude-vcs --exclude=node_modules --exclude=.next --exclude=dist \
  --exclude=generated --exclude='.env*' --exclude=.aws --exclude=.codex \
  --exclude=.agents --exclude=coverage \
  -czf /tmp/financas-vps.tar.gz financas-api financas-web
scp /tmp/financas-vps.tar.gz root@179.197.224.82:/root/
ssh root@179.197.224.82
```

O arquivo enviado não contém os arquivos `.env` locais nem dependências.

## 2. Na VPS: configurar e iniciar

Antes, confirme que a porta está livre:

```bash
ss -ltnp 'sport = :3001'
```

Se houver um serviço nessa porta, escolha outra porta livre e ajuste `WEB_PORT`
no `.env.vps` após a geração. Não encerre o serviço existente.

```bash
mkdir -p /root/financas
tar -xzf /root/financas-vps.tar.gz -C /root/financas
cd /root/financas/financas-api
if [ ! -f .env.vps ]; then sh deploy/init-vps-env.sh; fi
nano .env.vps
docker compose --env-file .env.vps -f compose.vps.yml up -d --build
docker compose --env-file .env.vps -f compose.vps.yml ps -a
```

O script gera senhas aleatórias, com permissões restritas. Preserve `.env.vps`
nas próximas atualizações; não o publique. A API espera o banco ficar saudável
e as migrations terminarem. O serviço `migrate` deve aparecer como `Exited (0)`:
ele é uma tarefa, não um servidor permanente.

Antes de subir os containers, preencha no `.env.vps` as configurações do bot:

```dotenv
TELEGRAM_ENABLED=true
TELEGRAM_BOT_TOKEN=token_do_BotFather
TELEGRAM_BOT_USERNAME=nome_do_bot_sem_arroba
```

Se o arquivo já existia, acrescente essas três variáveis, sem substituir as
senhas do banco e do JWT. Não envie o token pelo chat ou publique o arquivo.
Para o acesso por IP com HTTP, mantenha `COOKIE_SECURE=false`.

O bot usa polling. Pare o back local que usa esse mesmo token antes de ativar
a API na VPS, para não haver dois processos consumindo as mensagens do bot.
Depois de subir, acesse **Integrações → Conectar Telegram** no front.

Se alguma etapa falhar:

```bash
docker compose --env-file .env.vps -f compose.vps.yml logs --tail=100 migrate api web
```

## 3. Acessar

Abra `http://179.197.224.82:3001` e crie seu usuário.

Para conferir na própria VPS:

```bash
curl -I http://127.0.0.1:3001/login
```

Se funcionar na VPS e não no seu computador, verifique se existe um firewall
de rede no painel da Hostinger bloqueando TCP/3001. Não é necessário abrir
3000, 5432 ou 8080 para o financeiro.

O modo HTTP usa `COOKIE_SECURE=false` explicitamente; os cookies continuam
HttpOnly, mas a conexão não é criptografada. Use esse acesso para testes.
Quando configurar HTTPS, troque para `COOKIE_SECURE=true` e recrie o front.
Se o Nginx do host passar a encaminhar o tráfego ao front, configure
`WEB_BIND_IP=127.0.0.1` para não publicar a porta diretamente na internet.

## Atualizações

Envie uma nova versão do arquivo, extraia em `/root/financas` e preserve o
`.env.vps` existente. Na pasta `financas-api`, execute:

```bash
docker compose --env-file .env.vps -f compose.vps.yml build
docker compose --env-file .env.vps -f compose.vps.yml run --rm migrate
docker compose --env-file .env.vps -f compose.vps.yml up -d
```

Se as migrations falharem, resolva o erro antes de executar o último comando.

## Backup

Antes de atualizar, guarde uma cópia do banco:

```bash
docker compose --env-file .env.vps -f compose.vps.yml exec -T postgres \
  pg_dump -U financas -d financas > /root/financas-backup.sql
```

Copie o backup também para fora da VPS. O volume persiste quando os containers
são recriados. Não use `down -v`, pois isso apaga o volume do banco.
